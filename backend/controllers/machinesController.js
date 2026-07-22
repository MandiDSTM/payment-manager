const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');

const getAll = async (req, res) => {
    try {
        const machines = await db('machines').select('*').orderBy('name', 'asc');
        res.json({ status: 'Success', count: machines.length, data: machines });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت لیست ماشین‌ها', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const name = normalizeText(req.body.name || '');
        if (!name) {
            return res.status(400).json({ message: 'نام ماشین اجباری است' });
        }

        const existing = await db('machines').where({ name }).first();
        if (existing) {
            return res.status(409).json({ message: 'این نام ماشین قبلاً ثبت شده است' });
        }

        const [id] = await db('machines').insert({ name });
        res.status(201).json({ message: 'ماشین با موفقیت ثبت شد', id });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ثبت ماشین', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const machine = await db('machines').where({ id }).first();
        if (!machine) {
            return res.status(404).json({ message: 'ماشین یافت نشد' });
        }

        const name = normalizeText(req.body.name || '');
        if (!name) {
            return res.status(400).json({ message: 'نام ماشین اجباری است' });
        }

        const duplicate = await db('machines').where({ name }).whereNot({ id }).first();
        if (duplicate) {
            return res.status(409).json({ message: 'این نام ماشین قبلاً ثبت شده است' });
        }

        await db('machines').where({ id }).update({ name, updated_at: db.fn.now() });
        res.json({ message: 'ماشین با موفقیت بروزرسانی شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در بروزرسانی ماشین', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const linked = await db('machinery_contacts').where({ machine_id: id }).first();
        if (linked) {
            return res.status(409).json({ message: 'این ماشین به مخاطبین متصل است و قابل حذف نیست' });
        }

        const deleted = await db('machines').where({ id }).del();
        if (!deleted) {
            return res.status(404).json({ message: 'ماشین یافت نشد' });
        }

        res.json({ message: 'ماشین با موفقیت حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف ماشین', error: error.message });
    }
};

module.exports = { getAll, create, update, remove };
