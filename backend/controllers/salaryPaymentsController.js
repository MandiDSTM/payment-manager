const db = require('../config/db-config');
const {
    PAYMENT_STATUSES,
    PERSIAN_MONTHS,
    DEFAULT_STATUS,
    STATUS,
    WORKFLOW_STATUSES,
} = require('../constants/salaryPayments');
const { USAGE_LOCATIONS } = require('../constants/permissionSerials');
const { consumeSerial, releaseSerial } = require('../services/serialService');
const {
    buildDescription,
    loadPaymentContext,
    resolveRecordedByUserId,
} = require('../services/salaryPaymentService');

const USAGE_LOCATION = USAGE_LOCATIONS.PERSONNEL;
const FINAL_STATUS = 'پرداخت شده';

const paymentSelect = () =>
    db('salary_payments as sp')
        .leftJoin('personnel_contacts as pc', 'sp.personnel_contact_id', 'pc.id')
        .leftJoin('salary_payment_categories as cat', 'sp.category_id', 'cat.id')
        .leftJoin('executors as ex', 'sp.executor_id', 'ex.id')
        .leftJoin('projects as pr', 'sp.project_id', 'pr.id')
        .leftJoin('payment_permission_serials as ps', 'sp.permission_serial_id', 'ps.id')
        .leftJoin('users as u', 'sp.recorded_by_user_id', 'u.id')
        .select(
            'sp.*',
            'pc.personnel_code',
            'pc.first_name',
            'pc.last_name',
            'cat.name as category_name',
            'ex.name as executor_name',
            'pr.name as project_name',
            'ps.serial_number',
            'u.name as recorded_by_name',
        );

const normalizePayload = (body) => ({
    personnel_contact_id: body.personnel_contact_id ? Number(body.personnel_contact_id) : null,
    amount: body.amount ? Number(body.amount) : 0,
    category_id: body.category_id ? Number(body.category_id) : null,
    month: body.month ? String(body.month).trim() : null,
    executor_id: body.executor_id ? Number(body.executor_id) : null,
    project_id: body.project_id ? Number(body.project_id) : null,
    permission_serial_id: body.permission_serial_id ? Number(body.permission_serial_id) : null,
    status: body.status || DEFAULT_STATUS,
});

const validatePayload = (payload) => {
    const required = [
        'personnel_contact_id',
        'amount',
        'category_id',
        'month',
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
    if (!PERSIAN_MONTHS.includes(payload.month)) {
        return 'ماه انتخاب‌شده نامعتبر است';
    }
    if (!PAYMENT_STATUSES.includes(payload.status)) {
        return 'وضعیت پرداخت نامعتبر است';
    }
    return null;
};

const getAll = async (req, res) => {
    try {
        const { status } = req.query;
        const query = paymentSelect().orderBy('sp.id', 'desc');
        if (status) query.where('sp.status', status);
        const data = await query;
        res.json({ status: 'Success', count: data.length, data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرداخت‌ها', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const data = await paymentSelect().where('sp.id', req.params.id).first();
        if (!data) return res.status(404).json({ message: 'پرداخت یافت نشد' });
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پرداخت', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        const validationError = validatePayload(payload);
        if (validationError) return res.status(400).json({ message: validationError });

        const context = await loadPaymentContext(payload);
        if (!context.contact || !context.category || !context.executor || !context.project || !context.serial) {
            return res.status(400).json({ message: 'اطلاعات مرجع نامعتبر است' });
        }

        const description = buildDescription({
            categoryName: context.category.name,
            month: payload.month,
            personnelName: `${context.contact.first_name || ''} ${context.contact.last_name || ''}`.trim(),
            personnelCode: context.contact.personnel_code,
            executorName: context.executor.name,
            serialNumber: context.serial.serial_number,
            projectName: context.project.name,
        });

        const id = await db.transaction(async (trx) => {
            await consumeSerial(payload.permission_serial_id, USAGE_LOCATION, trx);
            const [newId] = await trx('salary_payments').insert({
                ...payload,
                description,
                recorded_by_user_id: resolveRecordedByUserId(req),
                receipt_file_path: null,
                accounting_document_registered: false,
            });
            return newId;
        });

        res.status(201).json({ message: 'پرداخت حقوق با موفقیت ثبت شد', id, description });
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
        const existing = await db('salary_payments').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'پرداخت یافت نشد' });
        if (existing.status === FINAL_STATUS) {
            return res.status(409).json({ message: 'پرداخت انجام‌شده قابل ویرایش نیست' });
        }

        const { id: _ignored, description: _desc, ...bodyWithoutId } = req.body;
        const payload = normalizePayload({ ...existing, ...bodyWithoutId });
        const validationError = validatePayload(payload);
        if (validationError) return res.status(400).json({ message: validationError });

        const context = await loadPaymentContext(payload);
        if (!context.contact || !context.category || !context.executor || !context.project || !context.serial) {
            return res.status(400).json({ message: 'اطلاعات مرجع نامعتبر است' });
        }

        const description = buildDescription({
            categoryName: context.category.name,
            month: payload.month,
            personnelName: `${context.contact.first_name || ''} ${context.contact.last_name || ''}`.trim(),
            personnelCode: context.contact.personnel_code,
            executorName: context.executor.name,
            serialNumber: context.serial.serial_number,
            projectName: context.project.name,
        });

        await db.transaction(async (trx) => {
            if (existing.permission_serial_id !== payload.permission_serial_id) {
                await releaseSerial(existing.permission_serial_id, trx);
                await consumeSerial(payload.permission_serial_id, USAGE_LOCATION, trx);
            }
            await trx('salary_payments').where({ id }).update({
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
        const existing = await db('salary_payments').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'پرداخت یافت نشد' });
        if (existing.status === FINAL_STATUS) {
            return res.status(409).json({ message: 'حذف پرداخت انجام‌شده مجاز نیست' });
        }
        if (existing.accounting_document_registered) {
            return res.status(409).json({ message: 'حذف مجاز نیست؛ سند حسابداری ثبت شده است' });
        }

        await db.transaction(async (trx) => {
            await releaseSerial(existing.permission_serial_id, trx);
            await trx('salary_payments').where({ id }).del();
        });

        res.json({ message: 'پرداخت با موفقیت حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف پرداخت', error: error.message });
    }
};

const bulkRemove = async (req, res) => {
    try {
        const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const ids = [...new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
        if (ids.length === 0) {
            return res.status(400).json({ message: 'هیچ رکوردی انتخاب نشده است' });
        }

        const rows = await db('salary_payments').whereIn('id', ids);
        const blocked = [];
        const deletable = [];
        rows.forEach((row) => {
            if (row.status === FINAL_STATUS) {
                blocked.push({ id: row.id, reason: 'پرداخت شده' });
                return;
            }
            if (row.accounting_document_registered) {
                blocked.push({ id: row.id, reason: 'سند حسابداری' });
                return;
            }
            deletable.push(row);
        });

        if (deletable.length > 0) {
            await db.transaction(async (trx) => {
                for (const row of deletable) {
                    await releaseSerial(row.permission_serial_id, trx);
                    await trx('salary_payments').where({ id: row.id }).del();
                }
            });
        }

        res.json({
            message: blocked.length > 0
                ? `${deletable.length} پرداخت حذف شد؛ ${blocked.length} مورد به‌خاطر پرداخت‌شده یا سند حسابداری حذف نشد`
                : `${deletable.length} پرداخت حذف شد`,
            deleted: deletable.length,
            blocked: blocked.map((item) => item.id),
        });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف گروهی', error: error.message });
    }
};

const bulkUpdateStatus = async (req, res) => {
    try {
        const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const ids = [...new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
        const status = req.body?.status;

        if (ids.length === 0) {
            return res.status(400).json({ message: 'هیچ رکوردی انتخاب نشده است' });
        }
        if (!WORKFLOW_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'وضعیت مقصد نامعتبر است' });
        }

        const rows = await db('salary_payments').whereIn('id', ids);
        if (rows.length !== ids.length) {
            return res.status(404).json({ message: 'یک یا چند پرداخت یافت نشد' });
        }

        const requiredCurrent = status === STATUS.IN_PROGRESS
            ? STATUS.AWAITING_PAYMENT
            : STATUS.IN_PROGRESS;
        const invalid = rows.filter((row) => row.status !== requiredCurrent);
        if (invalid.length > 0) {
            return res.status(409).json({
                message: `فقط پرداخت‌های «${requiredCurrent}» قابل انتقال به «${status}» هستند`,
            });
        }

        await db('salary_payments').whereIn('id', ids).update({
            status,
            updated_at: db.fn.now(),
        });

        res.json({
            message: `${ids.length} پرداخت به «${status}» منتقل شد`,
            count: ids.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'خطا در تغییر وضعیت', error: error.message });
    }
};

const uploadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const existing = await db('salary_payments').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'پرداخت یافت نشد' });

        const receiptPath = `uploads/receipts/${req.file.filename}`;
        await db('salary_payments').where({ id }).update({
            receipt_file_path: receiptPath,
            updated_at: db.fn.now(),
        });

        res.json({ message: 'فیش واریزی ذخیره شد', receipt_file_path: receiptPath });
    } catch (error) {
        res.status(500).json({ message: 'خطا در آپلود فیش', error: error.message });
    }
};

module.exports = { getAll, getById, create, update, remove, bulkRemove, bulkUpdateStatus, uploadReceipt };
