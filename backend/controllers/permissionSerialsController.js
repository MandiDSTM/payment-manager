const db = require('../config/db-config');
const {
    PERMIT_STATUSES,
    SELECTABLE_STATUSES,
} = require('../constants/permissionSerials');
const { findLinkedPayment } = require('../services/serialService');

const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

const generateSerialNumbers = (startSerialNumber, quantity) => {
    const start = String(startSerialNumber || '').trim();
    if (quantity === 1) return [start];

    // We support serials like: "1000" or "SER-1000"
    // by taking everything up to the last numeric suffix as prefix.
    const match = start.match(/^(.*?)(\d+)$/);
    if (!match) {
        const err = new Error('INVALID_SERIAL_PATTERN');
        err.statusCode = 400;
        throw err;
    }

    const prefix = match[1];
    const numericStr = match[2];
    const width = numericStr.length; // keep leading zeros

    const startNum = BigInt(numericStr);
    const result = [];
    for (let i = 0; i < quantity; i++) {
        const current = startNum + BigInt(i);
        result.push(`${prefix}${current.toString().padStart(width, '0')}`);
    }
    return result;
};

const findExistingSerialNumbers = async (serialNumbers) => {
    if (serialNumbers.length === 0) return [];
    const existing = [];
    const CHUNK_SIZE = 900; // avoid SQLite variable limits in some cases

    for (const chunk of chunkArray(serialNumbers, CHUNK_SIZE)) {
        const rows = await db('payment_permission_serials')
            .whereIn('serial_number', chunk)
            .select('serial_number');
        existing.push(...rows.map((r) => r.serial_number));
    }

    return existing;
};

const serialSelect = () =>
    db('payment_permission_serials as ps')
        .leftJoin('users as u', 'ps.recipient_user_id', 'u.id')
        .select(
            'ps.*',
            'u.name as recipient_name',
        );

const getAll = async (req, res) => {
    try {
        const { status, usage_location, selectable, recipient_user_id } = req.query;
        const query = serialSelect().orderBy('ps.id', 'desc');

        if (status) query.where('ps.status', status);
        if (usage_location) query.where('ps.usage_location', usage_location);
        if (selectable === 'true') {
            query.whereIn('ps.status', SELECTABLE_STATUSES);
        }
        if (recipient_user_id) {
            const id = Number(recipient_user_id);
            if (Number.isFinite(id) && id > 0) {
                query.where('ps.recipient_user_id', id);
            }
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
        const quantityRaw = req.body.quantity;
        const quantity = quantityRaw === undefined || quantityRaw === null
            ? 1
            : Number(quantityRaw);

        if (!serialNumber) {
            return res.status(400).json({ message: 'شماره سریال اجباری است' });
        }
        if (!recipientUserId) {
            return res.status(400).json({ message: 'تحویل‌گیرنده اجباری است' });
        }
        if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'تعداد باید یک عدد صحیح ۱ یا بیشتر باشد' });
        }
        const MAX_QUANTITY = 2000;
        if (quantity > MAX_QUANTITY) {
            return res.status(400).json({ message: `تعداد نباید بیشتر از ${MAX_QUANTITY} باشد` });
        }

        const user = await db('users').where({ id: recipientUserId }).first();
        if (!user) {
            return res.status(400).json({ message: 'کاربر تحویل‌گیرنده یافت نشد' });
        }

        let serialNumbers;
        try {
            serialNumbers = generateSerialNumbers(serialNumber, quantity);
        } catch (err) {
            if (err.message === 'INVALID_SERIAL_PATTERN') {
                return res.status(400).json({
                    message: 'برای ایجاد چند سریال پشت‌سرهم، شماره سریال باید به عدد ختم شود (مثلاً "1000" یا "SER-1000").',
                });
            }
            throw err;
        }

        // Pre-check duplicates for better UX (and to avoid partial insert issues).
        const existing = await findExistingSerialNumbers(serialNumbers);
        if (existing.length > 0) {
            const preview = existing.slice(0, 10).join(', ');
            return res.status(409).json({
                message: `شماره سریال تکراری وجود دارد. موارد: ${preview}${existing.length > 10 ? ` ... (+${existing.length - 10} مورد)` : ''}`,
                duplicatesCount: existing.length,
            });
        }

        const records = serialNumbers.map((sn) => ({
            serial_number: sn,
            recipient_user_id: recipientUserId,
            status: PERMIT_STATUSES.RAW_FORM,
            usage_location: null,
        }));

        await db.transaction(async (trx) => {
            await trx('payment_permission_serials').insert(records);
        });

        res.status(201).json({
            message: 'مجوزهای پرداخت با موفقیت ثبت شد',
            count: records.length,
            first_serial_number: records[0].serial_number,
            last_serial_number: records[records.length - 1].serial_number,
        });
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
