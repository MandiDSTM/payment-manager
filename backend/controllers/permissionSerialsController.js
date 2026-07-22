const db = require('../config/db-config');
const {
    PERMIT_STATUSES,
    SELECTABLE_STATUSES,
} = require('../constants/permissionSerials');
const { findLinkedPayment } = require('../services/serialService');

const serialSelect = () =>
    db('payment_permission_serials as ps')
        .leftJoin('users as u', 'ps.recipient_user_id', 'u.id')
        .select(
            'ps.*',
            'u.name as recipient_name',
        );

const getAll = async (req, res) => {
    try {
        const { status, usage_location, selectable } = req.query;
        const query = serialSelect().orderBy('ps.id', 'desc');

        if (status) query.where('ps.status', status);
        if (usage_location) query.where('ps.usage_location', usage_location);
        if (selectable === 'true') {
            query.whereIn('ps.status', SELECTABLE_STATUSES);
        }

        const data = await query;
        res.json({ status: 'Success', count: data.length, data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت مجوزها', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const data = await serialSelect().where('ps.id', req.params.id).first();
        if (!data) return res.status(404).json({ message: 'مجوز یافت نشد' });
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت مجوز', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const serialNumber = String(req.body.serial_number || '').trim();
        const recipientUserId = Number(req.body.recipient_user_id);

        if (!serialNumber) {
            return res.status(400).json({ message: 'شماره سریال اجباری است' });
        }
        if (!recipientUserId) {
            return res.status(400).json({ message: 'تحویل‌گیرنده اجباری است' });
        }

        const user = await db('users').where({ id: recipientUserId }).first();
        if (!user) {
            return res.status(400).json({ message: 'کاربر تحویل‌گیرنده یافت نشد' });
        }

        const [id] = await db('payment_permission_serials').insert({
            serial_number: serialNumber,
            recipient_user_id: recipientUserId,
            status: PERMIT_STATUSES.RAW_FORM,
            usage_location: null,
        });

        res.status(201).json({ message: 'مجوز پرداخت با موفقیت ثبت شد', id });
    } catch (error) {
        if (error.message?.includes('UNIQUE')) {
            return res.status(409).json({ message: 'شماره سریال تکراری است' });
        }
        res.status(500).json({ message: 'خطا در ثبت مجوز', error: error.message });
    }
};

const markAwaitingPayment = async (req, res) => {
    try {
        const serial = await db('payment_permission_serials').where({ id: req.params.id }).first();
        if (!serial) return res.status(404).json({ message: 'مجوز یافت نشد' });

        if (serial.status !== PERMIT_STATUSES.RAW_FORM) {
            return res.status(409).json({ message: 'فقط مجوز با وضعیت فرم خام قابل انتقال به در انتظار پرداخت است' });
        }

        await db('payment_permission_serials').where({ id: req.params.id }).update({
            status: PERMIT_STATUSES.AWAITING_PAYMENT,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'وضعیت مجوز به «در انتظار پرداخت» تغییر کرد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در تغییر وضعیت', error: error.message });
    }
};

const voidPermit = async (req, res) => {
    try {
        const serial = await db('payment_permission_serials').where({ id: req.params.id }).first();
        if (!serial) return res.status(404).json({ message: 'مجوز یافت نشد' });

        if (serial.status === PERMIT_STATUSES.VOIDED) {
            return res.status(409).json({ message: 'مجوز قبلاً باطل شده است' });
        }
        if (serial.status === PERMIT_STATUSES.PAID) {
            return res.status(409).json({ message: 'مجوز پرداخت‌شده قابل باطل‌کردن نیست' });
        }

        if (serial.status === PERMIT_STATUSES.AWAITING_PAYMENT) {
            const linked = await findLinkedPayment(serial.id);
            if (linked) {
                return res.status(409).json({ message: 'مجوز به پرداخت متصل است و قابل باطل‌کردن نیست' });
            }
        }

        if (serial.status !== PERMIT_STATUSES.RAW_FORM && serial.status !== PERMIT_STATUSES.AWAITING_PAYMENT) {
            return res.status(409).json({ message: 'باطل‌کردن این مجوز مجاز نیست' });
        }

        await db('payment_permission_serials').where({ id: req.params.id }).update({
            status: PERMIT_STATUSES.VOIDED,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'مجوز با موفقیت باطل شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در باطل‌کردن مجوز', error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    markAwaitingPayment,
    voidPermit,
};
