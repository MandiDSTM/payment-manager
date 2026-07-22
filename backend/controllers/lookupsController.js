const db = require('../config/db-config');
const { PERSIAN_MONTHS } = require('../constants/machineryPayments');

const getSalaryCategories = async (_req, res) => {
    try {
        const data = await db('salary_payment_categories').select('*').orderBy('id');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت دسته‌بندی‌ها', error: error.message });
    }
};

const getMachineryCategories = async (_req, res) => {
    try {
        const data = await db('machinery_payment_categories').select('*').orderBy('id');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت دسته‌بندی‌ها', error: error.message });
    }
};

const getPersianMonths = async (_req, res) => {
    res.json({ status: 'Success', data: PERSIAN_MONTHS });
};

const getCategories = async (_req, res) => {
    try {
        const data = await db('commercial_payment_categories').select('*').orderBy('id');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت دسته‌بندی‌ها', error: error.message });
    }
};

const getExecutors = async (_req, res) => {
    try {
        const data = await db('executors').select('*').orderBy('name');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت مجری‌ها', error: error.message });
    }
};

const createExecutor = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'نام مجری اجباری است' });

        const [id] = await db('executors').insert({ name });
        res.status(201).json({ message: 'مجری ثبت شد', id });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ثبت مجری', error: error.message });
    }
};

const updateExecutor = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'نام مجری اجباری است' });

        const updated = await db('executors').where({ id: req.params.id }).update({ name, updated_at: db.fn.now() });
        if (!updated) return res.status(404).json({ message: 'مجری یافت نشد' });
        res.json({ message: 'مجری بروزرسانی شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در بروزرسانی مجری', error: error.message });
    }
};

const deleteExecutor = async (req, res) => {
    try {
        const linked = await db('commercial_payments').where({ executor_id: req.params.id }).first();
        if (linked) {
            return res.status(409).json({ message: 'مجری به پرداخت متصل است و قابل حذف نیست' });
        }
        const deleted = await db('executors').where({ id: req.params.id }).del();
        if (!deleted) return res.status(404).json({ message: 'مجری یافت نشد' });
        res.json({ message: 'مجری حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف مجری', error: error.message });
    }
};

const getProjects = async (_req, res) => {
    try {
        const data = await db('projects').select('*').orderBy('name');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت پروژه‌ها', error: error.message });
    }
};

const createProject = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'نام پروژه اجباری است' });

        const [id] = await db('projects').insert({ name });
        res.status(201).json({ message: 'پروژه ثبت شد', id });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ثبت پروژه', error: error.message });
    }
};

const updateProject = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'نام پروژه اجباری است' });

        const updated = await db('projects').where({ id: req.params.id }).update({ name, updated_at: db.fn.now() });
        if (!updated) return res.status(404).json({ message: 'پروژه یافت نشد' });
        res.json({ message: 'پروژه بروزرسانی شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در بروزرسانی پروژه', error: error.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const linked = await db('commercial_payments').where({ project_id: req.params.id }).first();
        if (linked) {
            return res.status(409).json({ message: 'پروژه به پرداخت متصل است و قابل حذف نیست' });
        }
        const deleted = await db('projects').where({ id: req.params.id }).del();
        if (!deleted) return res.status(404).json({ message: 'پروژه یافت نشد' });
        res.json({ message: 'پروژه حذف شد' });
    } catch (error) {
        res.status(500).json({ message: 'خطا در حذف پروژه', error: error.message });
    }
};

const getUsers = async (_req, res) => {
    try {
        const data = await db('users').select('id', 'name', 'role').orderBy('id');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت کاربران', error: error.message });
    }
};

module.exports = {
    getCategories,
    getSalaryCategories,
    getMachineryCategories,
    getPersianMonths,
    getExecutors,
    createExecutor,
    updateExecutor,
    deleteExecutor,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getUsers,
};
