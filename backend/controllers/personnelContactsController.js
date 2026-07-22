const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../utils/validateSheba');

const REQUIRED_FIELDS = ['personnel_code', 'first_name', 'last_name', 'sheba', 'account_holder_name'];

const normalizeContact = (body) => ({
    personnel_code: normalizeText(body.personnel_code || ''),
    first_name: normalizeText(body.first_name || ''),
    last_name: normalizeText(body.last_name || ''),
    sheba: normalizeSheba(body.sheba || ''),
    account_holder_name: normalizeText(body.account_holder_name || ''),
    mobile: normalizeText(body.mobile || '') || null,
    city: normalizeText(body.city || '') || null,
    description: normalizeText(body.description || '') || null,
});

const validateContact = (contact) => {
    const missing = REQUIRED_FIELDS.filter((field) => !contact[field]);
    if (missing.length > 0) {
        return `فیلدهای اجباری خالی هستند: ${missing.join(', ')}`;
    }
    if (!isValidSheba(contact.sheba)) {
        return 'شماره شبا معتبر نیست (فرمت: IR + 24 رقم)';
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

        const existing = await db('personnel_contacts').where({ personnel_code: contact.personnel_code }).first();
        if (existing) return res.status(409).json({ message: 'شماره پرسنلی تکراری است' });

        const [id] = await db('personnel_contacts').insert(contact);
        res.status(201).json({ message: 'پرسنل با موفقیت ثبت شد', id });
    } catch (error) {
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
        const validationError = validateContact(contact);
        if (validationError) return res.status(400).json({ message: validationError });

        const duplicate = await db('personnel_contacts')
            .where({ personnel_code: contact.personnel_code })
            .whereNot({ id })
            .first();
        if (duplicate) return res.status(409).json({ message: 'شماره پرسنلی تکراری است' });

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
