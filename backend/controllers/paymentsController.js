const db = require('../config/db-config');

const createPayment = async (req, res) => {
    try {
        const {
            personnel_code, first_name, last_name, date_shamsi,
            amount, serial, sheba, subject, description,
        } = req.body;

        const newRecord = {
            personnel_code,
            first_name,
            last_name,
            date_shamsi,
            amount: amount ? Number(amount) : 0,
            serial: serial || null,
            sheba: sheba || null,
            subject: subject || null,
            description: description || null,
            status: 'در انتظار پرداخت',
            app_log: 'Manual Entry',
        };

        const [id] = await db('payments').insert(newRecord);
        res.json({ message: 'Saved', id });
    } catch (error) {
        console.error('Manual save error:', error.message);
        res.status(500).json({ message: 'Failed to save record', error: error.message });
    }
};

const getAllPayments = async (req, res) => {
    console.log('>>> [LOG] Debug request: Fetching all records');

    try {
        const allPayments = await db('payments').select('*').orderBy('id', 'desc');

        if (allPayments.length === 0) {
            return res.json({
                status: 'Success',
                message: 'Database is connected but empty.',
                count: 0,
                data: [],
            });
        }

        res.json({
            status: 'Success',
            count: allPayments.length,
            data: allPayments,
        });
    } catch (error) {
        console.error('>>> [ERROR] Debug route failed:', error.message);
        res.status(500).json({
            status: 'Error',
            message: 'Could not fetch data from database',
            error: error.message,
        });
    }
};

const clearAllData = async (req, res) => {
    console.log('>>> [WARN] Incoming request: Clear ALL Data');

    try {
        await db('payments').truncate();
        res.json({ message: 'تمامی داده‌ها با موفقیت پاکسازی شدند.' });
    } catch (error) {
        console.error('Clear data error:', error.message);
        res.status(500).json({ message: 'خطا در پاکسازی دیتابیس', error: error.message });
    }
};

const bulkUpdateStatus = async (req, res) => {
    const { ids, status } = req.body;

    try {
        await db('payments').whereIn('id', ids).update({ status });
        res.json({ message: 'وضعیت موارد انتخاب شده بروزرسانی شد.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateField = async (req, res) => {
    const { id } = req.params;
    const { field, value } = req.body;

    try {
        await db('payments').where({ id }).update({ [field]: value });
        res.json({ message: 'تغییرات ذخیره شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createPayment,
    getAllPayments,
    clearAllData,
    bulkUpdateStatus,
    updateField,
};
