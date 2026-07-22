const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../utils/validateSheba');

const REQUIRED_FIELDS = [
    'business_name',
    'sheba',
    'account_holder_name',
    'account_code',
    'service_category',
];

const normalizeContact = (body) => ({
    first_name: normalizeText(body.first_name || '') || null,
    last_name: normalizeText(body.last_name || '') || null,
    business_name: normalizeText(body.business_name || ''),
    sheba: normalizeSheba(body.sheba || ''),
    account_holder_name: normalizeText(body.account_holder_name || ''),
    account_code: normalizeText(body.account_code || ''),
    mobile: normalizeText(body.mobile || '') || null,
    phone: normalizeText(body.phone || '') || null,
    city: normalizeText(body.city || '') || null,
    service_category: normalizeText(body.service_category || ''),
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
        const contacts = await db('business_contacts').select('*').orderBy('id', 'desc');

        res.json({
            status: 'Success',
            count: contacts.length,
            data: contacts,
        });
    } catch (error) {
        console.error('Fetch business contacts error:', error.message);
        res.status(500).json({ message: 'خطا در دریافت مخاطبین', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const contact = await db('business_contacts').where({ id: req.params.id }).first();

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
        const validationError = validateContact(contact);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const existing = await db('business_contacts').where({ account_code: contact.account_code }).first();
        if (existing) {
            return res.status(409).json({ message: 'کد طرف حساب تکراری است' });
        }

        const [id] = await db('business_contacts').insert(contact);
        res.status(201).json({ message: 'مخاطب با موفقیت ثبت شد', id });
    } catch (error) {
        console.error('Create business contact error:', error.message);
        res.status(500).json({ message: 'خطا در ثبت مخاطب', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('business_contacts').where({ id }).first();

        if (!existing) {
            return res.status(404).json({ message: 'مخاطب یافت نشد' });
        }

        const { id: _ignored, ...bodyWithoutId } = req.body;
        const contact = normalizeContact({ ...existing, ...bodyWithoutId });
        const validationError = validateContact(contact);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const duplicate = await db('business_contacts')
            .where({ account_code: contact.account_code })
            .whereNot({ id })
            .first();

        if (duplicate) {
            return res.status(409).json({ message: 'کد طرف حساب تکراری است' });
        }

        await db('business_contacts').where({ id }).update({
            ...contact,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'مخاطب با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Update business contact error:', error.message);
        res.status(500).json({ message: 'خطا در بروزرسانی مخاطب', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const linkedPayment = await db('commercial_payments')
            .where({ business_contact_id: id })
            .first();

        if (linkedPayment) {
            return res.status(409).json({
                message: 'حذف مجاز نیست؛ پرداخت تجاری به این مخاطب متصل است',
            });
        }

        const deleted = await db('business_contacts').where({ id }).del();

        if (!deleted) {
            return res.status(404).json({ message: 'مخاطب یافت نشد' });
        }

        res.json({ message: 'مخاطب با موفقیت حذف شد' });
    } catch (error) {
        console.error('Delete business contact error:', error.message);
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
