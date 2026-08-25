const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../utils/validateSheba');

const isValidNationalId = (value) => /^\d{10}$/.test(String(value || ''));

const REQUIRED_FIELDS = ['first_name', 'last_name', 'sheba', 'account_holder_name'];

const MERGEABLE_FIELDS = [
    'national_id',
    'first_name',
    'last_name',
    'father_name',
    'sheba',
    'account_holder_name',
    'mobile',
    'city',
    'description',
];

const filledCount = (contact) => MERGEABLE_FIELDS.reduce((count, field) => (
    contact[field] ? count + 1 : count
), 0);

const nameKey = (contact) => [
    normalizeText(String(contact.first_name || '')),
    normalizeText(String(contact.last_name || '')),
].join('|').toLowerCase();

const pickDefaultKeeper = (members) => {
    const ranked = [...members].sort((a, b) => {
        const fillDiff = filledCount(b) - filledCount(a);
        if (fillDiff !== 0) return fillDiff;
        return a.id - b.id;
    });
    return ranked[0];
};

const summarizeContact = (contact) => ({
    id: contact.id,
    personnel_code: contact.personnel_code,
    national_id: contact.national_id || null,
    first_name: contact.first_name,
    last_name: contact.last_name,
    father_name: contact.father_name || null,
    sheba: contact.sheba || '',
    account_holder_name: contact.account_holder_name,
    mobile: contact.mobile || null,
    city: contact.city || null,
    description: contact.description || null,
});

const FIELD_LABELS = {
    personnel_code: 'کد پرسنلی',
    national_id: 'کد ملی',
    first_name: 'نام',
    last_name: 'نام خانوادگی',
    father_name: 'نام پدر',
    sheba: 'شماره شبا',
    account_holder_name: 'نام صاحب حساب',
    mobile: 'موبایل',
    city: 'شهر',
    description: 'توضیحات',
};

const MERGE_MODES = ['union', 'keep_first', 'keep_second'];
const CHOICE_FIELDS = ['personnel_code', ...MERGEABLE_FIELDS];

const fieldValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const normalizeFieldChoices = (raw) => {
    const choices = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return choices;
    CHOICE_FIELDS.forEach((field) => {
        const pick = raw[field];
        if (pick === 'first' || pick === 'second') choices[field] = pick;
    });
    return choices;
};

const buildUnionPatch = (first, second, choices = {}) => {
    const patch = {};
    const conflicts = [];
    let personnelCodeFromSecond = false;

    const leftCode = fieldValue(first.personnel_code);
    const rightCode = fieldValue(second.personnel_code);
    if (leftCode && rightCode && leftCode !== rightCode) {
        const pick = choices.personnel_code;
        if (pick === 'second') personnelCodeFromSecond = true;
        else if (pick !== 'first') {
            conflicts.push({
                field: 'personnel_code',
                label: FIELD_LABELS.personnel_code,
                first: first.personnel_code || '',
                second: second.personnel_code || '',
            });
        }
    } else if (!leftCode && rightCode) {
        personnelCodeFromSecond = true;
    }

    MERGEABLE_FIELDS.forEach((field) => {
        const left = field === 'sheba' ? normalizeSheba(first[field]) : fieldValue(first[field]);
        const right = field === 'sheba' ? normalizeSheba(second[field]) : fieldValue(second[field]);
        if (left && right && left !== right) {
            const pick = choices[field];
            if (pick === 'second') {
                patch[field] = second[field];
                return;
            }
            if (pick === 'first') return;
            conflicts.push({
                field,
                label: FIELD_LABELS[field] || field,
                first: first[field] || '',
                second: second[field] || '',
            });
            return;
        }
        if (!left && right) patch[field] = second[field];
    });
    return { patch, conflicts, personnelCodeFromSecond };
};

const allocatePersonnelCode = async (preferred = '') => {
    let code = normalizeText(preferred || '');
    if (code) {
        const exists = await db('personnel_contacts').where({ personnel_code: code }).first();
        if (!exists) return code;
        throw Object.assign(new Error('شماره پرسنلی تکراری است'), { status: 409 });
    }

    const existing = await db('personnel_contacts').select('personnel_code');
    const used = new Set(existing.map((r) => r.personnel_code));
    let n = 1;
    while (used.has(`AUTO-${String(n).padStart(5, '0')}`)) n += 1;
    return `AUTO-${String(n).padStart(5, '0')}`;
};

const normalizeContact = (body) => {
    const sheba = normalizeSheba(body.sheba || '');
    return {
        personnel_code: normalizeText(body.personnel_code || ''),
        national_id: normalizeText(body.national_id || '') || null,
        first_name: normalizeText(body.first_name || ''),
        last_name: normalizeText(body.last_name || ''),
        father_name: normalizeText(body.father_name || '') || null,
        sheba: sheba || '',
        sheba_needs_review: body.sheba_needs_review === true || body.sheba_needs_review === 1
            ? true
            : !isValidSheba(sheba),
        account_holder_name: normalizeText(body.account_holder_name || ''),
        mobile: normalizeText(body.mobile || '') || null,
        city: normalizeText(body.city || '') || null,
        description: normalizeText(body.description || '') || null,
    };
};

const validateContact = (contact) => {
    const missing = REQUIRED_FIELDS.filter((field) => !contact[field]);
    if (missing.length > 0) {
        return `فیلدهای اجباری خالی هستند: ${missing.join(', ')}`;
    }
    if (contact.national_id && !isValidNationalId(contact.national_id)) {
        return 'کد ملی معتبر نیست (باید ۱۰ رقم باشد)';
    }
    return null;
};

const getAll = async (req, res) => {
    try {
        const contacts = await db('personnel_contacts').select('*').orderBy('id', 'desc');
        res.json({ status: 'Success', count: contacts.length, data: contacts });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرسنل', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const contact = await db('personnel_contacts').where({ id: req.params.id }).first();
        if (!contact) return res.status(404).json({ message: 'پرسنل یافت نشد' });
        res.json({ status: 'Success', data: contact });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرسنل', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const contact = normalizeContact(req.body);
        const validationError = validateContact(contact);
        if (validationError) return res.status(400).json({ message: validationError });

        contact.personnel_code = await allocatePersonnelCode(contact.personnel_code);

        if (contact.national_id) {
            const existingNationalId = await db('personnel_contacts').where({ national_id: contact.national_id }).first();
            if (existingNationalId) return res.status(409).json({ message: 'کد ملی تکراری است' });
        }

        const [id] = await db('personnel_contacts').insert(contact);
        res.status(201).json({ message: 'پرسنل با موفقیت ثبت شد', id, personnel_code: contact.personnel_code });
    } catch (error) {
        if (error.status === 409) return res.status(409).json({ message: error.message });
        res.status(500).json({ message: 'خطا در ثبت پرسنل', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('personnel_contacts').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'پرسنل یافت نشد' });

        const { id: _ignored, ...bodyWithoutId } = req.body;
        const contact = normalizeContact({ ...existing, ...bodyWithoutId });
        // Keep existing code if form left it blank
        if (!contact.personnel_code) contact.personnel_code = existing.personnel_code;

        const validationError = validateContact(contact);
        if (validationError) return res.status(400).json({ message: validationError });

        const duplicateCode = await db('personnel_contacts')
            .where({ personnel_code: contact.personnel_code })
            .whereNot({ id })
            .first();
        if (duplicateCode) return res.status(409).json({ message: 'شماره پرسنلی تکراری است' });

        if (contact.national_id) {
            const duplicateNationalId = await db('personnel_contacts')
                .where({ national_id: contact.national_id })
                .whereNot({ id })
                .first();
            if (duplicateNationalId) return res.status(409).json({ message: 'کد ملی تکراری است' });
        }

        // Clear review flag automatically when sheba becomes valid
        if (isValidSheba(contact.sheba)) contact.sheba_needs_review = false;

        await db('personnel_contacts').where({ id }).update({ ...contact, updated_at: db.fn.now() });
        res.json({ message: 'پرسنل با موفقیت بروزرسانی شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در بروزرسانی پرسنل', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const linkedPayment = await db('salary_payments').where({ personnel_contact_id: id }).first();
        if (linkedPayment) {
            return res.status(409).json({ message: 'حذف مجاز نیست؛ پرداخت حقوق به این پرسنل متصل است' });
        }

        const deleted = await db('personnel_contacts').where({ id }).del();
        if (!deleted) return res.status(404).json({ message: 'پرسنل یافت نشد' });
        res.json({ message: 'پرسنل با موفقیت حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف پرسنل', error: error.message });
    }
};

const bulkRemove = async (req, res) => {
    try {
        const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const ids = [...new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
        if (ids.length === 0) {
            return res.status(400).json({ message: 'هیچ رکوردی انتخاب نشده است' });
        }

        const linked = await db('salary_payments')
            .whereIn('personnel_contact_id', ids)
            .distinct('personnel_contact_id');
        const blocked = new Set(linked.map((row) => Number(row.personnel_contact_id)));
        const deletable = ids.filter((id) => !blocked.has(id));

        if (deletable.length > 0) {
            await db('personnel_contacts').whereIn('id', deletable).del();
        }

        res.json({
            message: blocked.size > 0
                ? `${deletable.length} پرسنل حذف شد؛ ${blocked.size} مورد به‌خاطر پرداخت حقوق متصل حذف نشد`
                : `${deletable.length} پرسنل حذف شد`,
            deleted: deletable.length,
            blocked: [...blocked],
        });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف گروهی', error: error.message });
    }
};

const getDuplicateGroups = async (_req, res) => {
    try {
        const contacts = await db('personnel_contacts').select('*').orderBy('id', 'asc');
        const nameGroups = new Map();
        const shebaGroups = new Map();

        contacts.forEach((contact) => {
            const nKey = nameKey(contact);
            if (nKey !== '|') {
                if (!nameGroups.has(nKey)) nameGroups.set(nKey, []);
                nameGroups.get(nKey).push(contact);
            }
            const sheba = normalizeSheba(contact.sheba || '');
            if (sheba) {
                if (!shebaGroups.has(sheba)) shebaGroups.set(sheba, []);
                shebaGroups.get(sheba).push(contact);
            }
        });

        const groups = [];
        nameGroups.forEach((members, key) => {
            if (members.length < 2) return;
            const keeper = pickDefaultKeeper(members);
            groups.push({
                key: `name:${key}`,
                matchType: 'name',
                label: `${members[0].first_name} ${members[0].last_name}`,
                keepId: keeper.id,
                members: members.map(summarizeContact),
            });
        });

        shebaGroups.forEach((members, sheba) => {
            if (members.length < 2) return;
            const alreadyNamed = groups.some((g) => (
                g.matchType === 'name'
                && members.every((m) => g.members.some((gm) => gm.id === m.id))
            ));
            if (alreadyNamed) return;
            const keeper = pickDefaultKeeper(members);
            groups.push({
                key: `sheba:${sheba}`,
                matchType: 'sheba',
                label: `شبا ${sheba}`,
                keepId: keeper.id,
                members: members.map(summarizeContact),
            });
        });

        res.json({ status: 'Success', count: groups.length, data: groups });
    } catch (error) {
        res.status(500).json({ message: 'خطا در یافتن موارد مشابه', error: error.message });
    }
};

const mergeDuplicates = async (req, res) => {
    try {
        const firstId = Number(req.body?.firstId);
        const secondId = Number(req.body?.secondId);
        const mode = req.body?.mode;
        if (!Number.isInteger(firstId) || !Number.isInteger(secondId) || firstId <= 0 || secondId <= 0) {
            return res.status(400).json({ message: 'دو رکورد برای ادغام انتخاب کنید' });
        }
        if (firstId === secondId) {
            return res.status(400).json({ message: 'رکورد اول و دوم نباید یکی باشند' });
        }
        if (!MERGE_MODES.includes(mode)) {
            return res.status(400).json({ message: 'نوع ادغام نامعتبر است' });
        }

        const first = await db('personnel_contacts').where({ id: firstId }).first();
        const second = await db('personnel_contacts').where({ id: secondId }).first();
        if (!first || !second) {
            return res.status(404).json({ message: 'یکی از رکوردهای انتخاب‌شده یافت نشد' });
        }

        const keepId = mode === 'keep_second' ? secondId : firstId;
        const absorbId = keepId === firstId ? secondId : firstId;

        let patch = {};
        let personnelCodeFromSecond = false;
        if (mode === 'union') {
            const fieldChoices = normalizeFieldChoices(req.body?.fieldChoices);
            const result = buildUnionPatch(first, second, fieldChoices);
            if (result.conflicts.length > 0) {
                return res.status(409).json({
                    message: 'برای فیلدهایی که در هر دو رکورد مقدار متفاوت دارند، مقدار اصلی را انتخاب کنید.',
                    conflicts: result.conflicts,
                });
            }
            patch = result.patch;
            personnelCodeFromSecond = result.personnelCodeFromSecond;
        }

        const takenPersonnelCode = personnelCodeFromSecond
            ? normalizeText(second.personnel_code || '')
            : '';

        await db.transaction(async (trx) => {
            if (mode === 'union' && Object.keys(patch).length > 0) {
                if (patch.national_id) {
                    const duplicate = await trx('personnel_contacts')
                        .where({ national_id: patch.national_id })
                        .whereNot({ id: keepId })
                        .whereNot({ id: absorbId })
                        .first();
                    if (duplicate) {
                        throw Object.assign(new Error('کد ملی تجمیع‌شده متعلق به پرسنل دیگری است'), { status: 409 });
                    }
                }
                if (patch.sheba) patch.sheba_needs_review = !isValidSheba(patch.sheba);
                await trx('personnel_contacts').where({ id: keepId }).update({
                    ...patch,
                    updated_at: trx.fn.now(),
                });
            }

            await trx('salary_payments')
                .where({ personnel_contact_id: absorbId })
                .update({ personnel_contact_id: keepId, updated_at: trx.fn.now() });
            await trx('personnel_contacts').where({ id: absorbId }).del();

            if (personnelCodeFromSecond && takenPersonnelCode) {
                const clash = await trx('personnel_contacts')
                    .where({ personnel_code: takenPersonnelCode })
                    .whereNot({ id: keepId })
                    .first();
                if (clash) {
                    throw Object.assign(new Error('کد پرسنلی انتخاب‌شده متعلق به پرسنل دیگری است'), { status: 409 });
                }
                await trx('personnel_contacts').where({ id: keepId }).update({
                    personnel_code: takenPersonnelCode,
                    updated_at: trx.fn.now(),
                });
            }
        });

        const kept = await db('personnel_contacts').where({ id: keepId }).first();
        const modeLabel = {
            union: 'تجمیع',
            keep_first: 'انتخاب رکورد اول',
            keep_second: 'انتخاب رکورد دوم',
        }[mode];

        res.json({
            message: `ادغام با حالت «${modeLabel}» انجام شد. کد پرسنلی باقی‌مانده: ${kept.personnel_code}`,
            kept: summarizeContact(kept),
            deletedId: absorbId,
            keepId,
            mode,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        res.status(500).json({ message: 'خطا در ادغام پرسنل', error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    bulkRemove,
    getDuplicateGroups,
    mergeDuplicates,
};
