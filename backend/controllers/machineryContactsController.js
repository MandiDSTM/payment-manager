const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../utils/validateSheba');

const REQUIRED_FIELDS = [
    'account_code',
    'first_name',
    'last_name',
    'machine_id',
    'sheba',
    'account_holder_name',
];

const selectWithMachine = () =>
    db('machinery_contacts')
        .leftJoin('machines', 'machinery_contacts.machine_id', 'machines.id')
        .select(
            'machinery_contacts.*',
            'machines.name as machine_name',
        );

const normalizeContact = (body) => ({
    account_code: normalizeText(body.account_code || ''),
    first_name: normalizeText(body.first_name || ''),
    last_name: normalizeText(body.last_name || ''),
    machine_id: body.machine_id ? Number(body.machine_id) : null,
    plate: normalizeText(body.plate || '') || null,
    sheba: normalizeSheba(body.sheba || ''),
    account_holder_name: normalizeText(body.account_holder_name || ''),
    mobile: normalizeText(body.mobile || '') || null,
    city: normalizeText(body.city || '') || null,
    description: normalizeText(body.description || '') || null,
});

const validateContact = async (contact, { excludeId } = {}) => {
    const missing = REQUIRED_FIELDS.filter((field) => !contact[field]);
    if (missing.length > 0) {
        return `فیلدهای اجباری خالی هستند: ${missing.join(', ')}`;
    }

    if (!isValidSheba(contact.sheba)) {
        return 'شماره شبا معتبر نیست (فرمت: IR + 24 رقم)';
    }

    const machine = await db('machines').where({ id: contact.machine_id }).first();
    if (!machine) {
        return 'نام ماشین در لیست ماشین‌ها یافت نشد';
    }

    const duplicateQuery = db('machinery_contacts').where({ account_code: contact.account_code });
    if (excludeId) duplicateQuery.whereNot({ id: excludeId });
    const duplicate = await duplicateQuery.first();
    if (duplicate) {
        return 'کد طرف حساب تکراری است';
    }

    return null;
};

const getAll = async (req, res) => {
    try {
        const contacts = await selectWithMachine().orderBy('machinery_contacts.id', 'desc');
        res.json({ status: 'Success', count: contacts.length, data: contacts });
    } catch (error) {
        console.error('Fetch machinery contacts error:', error.message);
        res.status(500).json({ message: 'خطا در دریافت مخاطبین ماشین‌آلات', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const contact = await selectWithMachine()
            .where('machinery_contacts.id', req.params.id)
            .first();

        if (!contact) {
            return res.status(404).json({ message: 'مخاطب یافت نشد' });
        }

        res.json({ status: 'Success', data: contact });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت مخاطب', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const contact = normalizeContact(req.body);
        const validationError = await validateContact(contact);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const [id] = await db('machinery_contacts').insert(contact);
        res.status(201).json({ message: 'مخاطب ماشین‌آلات با موفقیت ثبت شد', id });
    } catch (error) {
        console.error('Create machinery contact error:', error.message);
        res.status(500).json({ message: 'خطا در ثبت مخاطب', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('machinery_contacts').where({ id }).first();

        if (!existing) {
            return res.status(404).json({ message: 'مخاطب یافت نشد' });
        }

        const { id: _ignored, ...bodyWithoutId } = req.body;
        const contact = normalizeContact({ ...existing, ...bodyWithoutId });
        const validationError = await validateContact(contact, { excludeId: id });

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        await db('machinery_contacts').where({ id }).update({
            ...contact,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'مخاطب با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Update machinery contact error:', error.message);
        res.status(500).json({ message: 'خطا در بروزرسانی مخاطب', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const linkedPayment = await db('machinery_payments')
            .where({ machinery_contact_id: id })
            .first();

        if (linkedPayment) {
            return res.status(409).json({
                message: 'حذف مجاز نیست؛ پرداختی به این مخاطب متصل است',
            });
        }

        const deleted = await db('machinery_contacts').where({ id }).del();
        if (!deleted) {
            return res.status(404).json({ message: 'مخاطب یافت نشد' });
        }

        res.json({ message: 'مخاطب با موفقیت حذف شد' });
    } catch (error) {
        console.error('Delete machinery contact error:', error.message);
        res.status(500).json({ message: 'خطا در حذف مخاطب', error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    normalizeContact,
    validateContact,
};
