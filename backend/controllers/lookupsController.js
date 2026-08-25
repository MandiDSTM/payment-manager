const db = require('../config/db-config');
const { PERSIAN_MONTHS } = require('../constants/machineryPayments');

const PAYMENT_TABLES = ['commercial_payments', 'salary_payments', 'machinery_payments'];

const fullName = (first, last) => `${String(first || '').trim()} ${String(last || '').trim()}`.trim();

const sqliteUnique = (error) => /UNIQUE/i.test(error.message || '');

const isLinked = async (column, id) => {
    for (const table of PAYMENT_TABLES) {
        const row = await db(table).where({ [column]: id }).first();
        if (row) return true;
    }
    return false;
};

const makeCategoryHandlers = (table, paymentTable, label) => ({
    list: async (_req, res) => {
        try {
            const data = await db(table).select('*').orderBy('id');
            res.json({ status: 'Success', data });
        } catch (error) {
            res.status(500).json({ message: `خطا در دریافت ${label}`, error: error.message });
        }
    },
    create: async (req, res) => {
        try {
            const name = String(req.body.name || '').trim();
            if (!name) return res.status(400).json({ message: `نام ${label} اجباری است` });
            const [id] = await db(table).insert({ name });
            res.status(201).json({ message: `${label} ثبت شد`, id });
        } catch (error) {
            if (sqliteUnique(error)) return res.status(409).json({ message: `این ${label} تکراری است` });
            res.status(500).json({ message: `خطا در ثبت ${label}`, error: error.message });
        }
    },
    update: async (req, res) => {
        try {
            const name = String(req.body.name || '').trim();
            if (!name) return res.status(400).json({ message: `نام ${label} اجباری است` });
            const updated = await db(table).where({ id: req.params.id }).update({ name });
            if (!updated) return res.status(404).json({ message: `${label} یافت نشد` });
            res.json({ message: `${label} بروزرسانی شد` });
        } catch (error) {
            if (sqliteUnique(error)) return res.status(409).json({ message: `این ${label} تکراری است` });
            res.status(500).json({ message: `خطا در بروزرسانی ${label}`, error: error.message });
        }
    },
    remove: async (req, res) => {
        try {
            const linked = await db(paymentTable).where({ category_id: req.params.id }).first();
            if (linked) return res.status(409).json({ message: `${label} به پرداخت متصل است و قابل حذف نیست` });
            const deleted = await db(table).where({ id: req.params.id }).del();
            if (!deleted) return res.status(404).json({ message: `${label} یافت نشد` });
            res.json({ message: `${label} حذف شد` });
        } catch (error) {
            res.status(500).json({ message: `خطا در حذف ${label}`, error: error.message });
        }
    },
});

const commercialCategories = makeCategoryHandlers(
    'commercial_payment_categories',
    'commercial_payments',
    'نوع پرداخت تجاری',
);
const salaryCategories = makeCategoryHandlers(
    'salary_payment_categories',
    'salary_payments',
    'نوع پرداخت حقوق',
);
const machineryCategories = makeCategoryHandlers(
    'machinery_payment_categories',
    'machinery_payments',
    'نوع پرداخت ماشین‌آلات',
);

const getPersianMonths = async (_req, res) => {
    res.json({ status: 'Success', data: PERSIAN_MONTHS });
};

const getExecutors = async (_req, res) => {
    try {
        const data = await db('executors').select('*').orderBy('last_name').orderBy('first_name');
        res.json({ status: 'Success', data });
    } catch (error) {
        res.status(500).json({ message: 'خطا در دریافت مجری‌ها', error: error.message });
    }
};

const createExecutor = async (req, res) => {
    try {
        const first_name = String(req.body.first_name || '').trim();
        const last_name = String(req.body.last_name || '').trim();
        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'نام و نام خانوادگی مجری اجباری است' });
        }
        const name = fullName(first_name, last_name);
        const [id] = await db('executors').insert({ first_name, last_name, name });
        res.status(201).json({ message: 'مجری ثبت شد', id });
    } catch (error) {
        if (sqliteUnique(error)) return res.status(409).json({ message: 'این مجری تکراری است' });
        res.status(500).json({ message: 'خطا در ثبت مجری', error: error.message });
    }
};

const updateExecutor = async (req, res) => {
    try {
        const first_name = String(req.body.first_name || '').trim();
        const last_name = String(req.body.last_name || '').trim();
        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'نام و نام خانوادگی مجری اجباری است' });
        }
        const name = fullName(first_name, last_name);
        const updated = await db('executors').where({ id: req.params.id }).update({
            first_name,
            last_name,
            name,
            updated_at: db.fn.now(),
        });
        if (!updated) return res.status(404).json({ message: 'مجری یافت نشد' });
        res.json({ message: 'مجری بروزرسانی شد' });
    } catch (error) {
        if (sqliteUnique(error)) return res.status(409).json({ message: 'این مجری تکراری است' });
        res.status(500).json({ message: 'خطا در بروزرسانی مجری', error: error.message });
    }
};

const deleteExecutor = async (req, res) => {
    try {
        if (await isLinked('executor_id', req.params.id)) {
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
        if (sqliteUnique(error)) return res.status(409).json({ message: 'این پروژه تکراری است' });
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
        if (sqliteUnique(error)) return res.status(409).json({ message: 'این پروژه تکراری است' });
        res.status(500).json({ message: 'خطا در بروزرسانی پروژه', error: error.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        if (await isLinked('project_id', req.params.id)) {
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
    getCategories: commercialCategories.list,
    createCommercialCategory: commercialCategories.create,
    updateCommercialCategory: commercialCategories.update,
    deleteCommercialCategory: commercialCategories.remove,
    getSalaryCategories: salaryCategories.list,
    createSalaryCategory: salaryCategories.create,
    updateSalaryCategory: salaryCategories.update,
    deleteSalaryCategory: salaryCategories.remove,
    getMachineryCategories: machineryCategories.list,
    createMachineryCategory: machineryCategories.create,
    updateMachineryCategory: machineryCategories.update,
    deleteMachineryCategory: machineryCategories.remove,
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
