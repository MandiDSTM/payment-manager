const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../utils/validateSheba');

const REQUIRED_FIELDS = ['first_name', 'last_name', 'sheba', 'account_holder_name'];

const isValidNationalId = (value) => /^\d{10}$/.test(String(value || ''));

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

module.exports = { getAll, getById, create, update, remove };
