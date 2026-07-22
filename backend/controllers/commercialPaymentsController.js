const db = require('../config/db-config');
const { PAYMENT_STATUSES } = require('../constants/commercialPayments');
const {
    buildDescription,
    loadPaymentContext,
    consumeSerial,
    releaseSerial,
    resolveRecordedByUserId,
} = require('../services/commercialPaymentService');

const paymentSelect = () =>
    db('commercial_payments as cp')
        .leftJoin('business_contacts as bc', 'cp.business_contact_id', 'bc.id')
        .leftJoin('commercial_payment_categories as cat', 'cp.category_id', 'cat.id')
        .leftJoin('executors as ex', 'cp.executor_id', 'ex.id')
        .leftJoin('projects as pr', 'cp.project_id', 'pr.id')
        .leftJoin('payment_permission_serials as ps', 'cp.permission_serial_id', 'ps.id')
        .leftJoin('users as u', 'cp.recorded_by_user_id', 'u.id')
        .select(
            'cp.*',
            'bc.business_name',
            'bc.account_code as contact_account_code',
            'cat.name as category_name',
            'ex.name as executor_name',
            'pr.name as project_name',
            'ps.serial_number',
            'u.name as recorded_by_name',
        );

const normalizePayload = (body) => ({
    business_contact_id: body.business_contact_id ? Number(body.business_contact_id) : null,
    amount: body.amount ? Number(body.amount) : 0,
    category_id: body.category_id ? Number(body.category_id) : null,
    executor_id: body.executor_id ? Number(body.executor_id) : null,
    project_id: body.project_id ? Number(body.project_id) : null,
    permission_serial_id: body.permission_serial_id ? Number(body.permission_serial_id) : null,
    status: body.status || PAYMENT_STATUSES[0],
});

const validatePayload = (payload) => {
    const required = [
        'business_contact_id',
        'amount',
        'category_id',
        'executor_id',
        'project_id',
        'permission_serial_id',
    ];
    const missing = required.filter((field) => !payload[field]);
    if (missing.length > 0) {
        return `فیلدهای اجباری خالی هستند: ${missing.join(', ')}`;
    }
    if (payload.amount <= 0) {
        return 'مبلغ باید بزرگ‌تر از صفر باشد';
    }
    if (!PAYMENT_STATUSES.includes(payload.status)) {
        return 'وضعیت پرداخت نامعتبر است';
    }
    return null;
};

const getAll = async (req, res) => {
    try {
        const { status } = req.query;
        const query = paymentSelect().orderBy('cp.id', 'desc');
        if (status) query.where('cp.status', status);

        const data = await query;
        res.json({ status: 'Success', count: data.length, data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرداخت‌ها', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const data = await paymentSelect().where('cp.id', req.params.id).first();
        if (!data) {
            return res.status(404).json({ message: 'پرداخت یافت نشد' });
        }
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرداخت', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const context = await loadPaymentContext(payload);
        if (!context.contact || !context.executor || !context.project || !context.serial) {
            return res.status(400).json({ message: 'اطلاعات مرجع (مخاطب، مجری، پروژه یا سریال) نامعتبر است' });
        }

        const description = buildDescription({
            businessName: context.contact.business_name,
            executorName: context.executor.name,
            serialNumber: context.serial.serial_number,
            projectName: context.project.name,
        });

        const id = await db.transaction(async (trx) => {
            await consumeSerial(payload.permission_serial_id, trx);

            const [newId] = await trx('commercial_payments').insert({
                ...payload,
                description,
                recorded_by_user_id: resolveRecordedByUserId(req),
                receipt_file_path: null,
            });

            return newId;
        });

        res.status(201).json({ message: 'پرداخت تجاری با موفقیت ثبت شد', id, description });
    } catch (error) {
        if (error.message === 'SERIAL_NOT_AVAILABLE') {
            return res.status(409).json({ message: 'سریال مجوز پرداخت قبلاً مصرف شده است' });
        }
        if (error.message === 'SERIAL_NOT_FOUND') {
            return res.status(404).json({ message: 'سریال مجوز پرداخت یافت نشد' });
        }
        res.status(500).json({ message: 'خطا در ثبت پرداخت', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('commercial_payments').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ message: 'پرداخت یافت نشد' });
        }

        const { id: _ignored, description: _desc, ...bodyWithoutId } = req.body;
        const payload = normalizePayload({ ...existing, ...bodyWithoutId });
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const context = await loadPaymentContext(payload);
        if (!context.contact || !context.executor || !context.project || !context.serial) {
            return res.status(400).json({ message: 'اطلاعات مرجع (مخاطب، مجری، پروژه یا سریال) نامعتبر است' });
        }

        const description = buildDescription({
            businessName: context.contact.business_name,
            executorName: context.executor.name,
            serialNumber: context.serial.serial_number,
            projectName: context.project.name,
        });

        await db.transaction(async (trx) => {
            if (existing.permission_serial_id !== payload.permission_serial_id) {
                await releaseSerial(existing.permission_serial_id, trx);
                await consumeSerial(payload.permission_serial_id, trx);
            }

            await trx('commercial_payments').where({ id }).update({
                ...payload,
                description,
                updated_at: trx.fn.now(),
            });
        });

        res.json({ message: 'پرداخت با موفقیت بروزرسانی شد', description });
    } catch (error) {
        if (error.message === 'SERIAL_NOT_AVAILABLE') {
            return res.status(409).json({ message: 'سریال مجوز پرداخت قبلاً مصرف شده است' });
        }
        res.status(500).json({ message: 'خطا در بروزرسانی پرداخت', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('commercial_payments').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ message: 'پرداخت یافت نشد' });
        }

        await db.transaction(async (trx) => {
            await releaseSerial(existing.permission_serial_id, trx);
            await trx('commercial_payments').where({ id }).del();
        });

        res.json({ message: 'پرداخت با موفقیت حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف پرداخت', error: error.message });
    }
};

const uploadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'فایلی انتخاب نشده است' });
        }

        const existing = await db('commercial_payments').where({ id }).first();
        if (!existing) {
            return res.status(404).json({ message: 'پرداخت یافت نشد' });
        }

        const receiptPath = `uploads/receipts/${req.file.filename}`;
        await db('commercial_payments').where({ id }).update({
            receipt_file_path: receiptPath,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'فیش واریزی ذخیره شد', receipt_file_path: receiptPath });
    } catch (error) {
        res.status(500).json({ message: 'خطا در آپلود فیش', error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    uploadReceipt,
};
