const bcrypt = require('bcryptjs');
const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { VALID_ROLES, ROLE_LABELS } = require('../constants/users');

const toPublicUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    is_blocked: Boolean(user.is_blocked),
    created_at: user.created_at,
});

const validateUserInput = ({ name, username, password, role }, isCreate) => {
    if (!normalizeText(name || '')) return 'نام نمایشی الزامی است';
    if (!normalizeText(username || '')) return 'نام کاربری الزامی است';
    if (isCreate && (!password || password.length < 6)) return 'رمز عبور باید حداقل ۶ کاراکتر باشد';
    if (!VALID_ROLES.includes(role)) return 'نقش کاربر معتبر نیست';
    return null;
};

const getAll = async (_req, res) => {
    try {
        const users = await db('users')
            .select('id', 'name', 'username', 'role', 'is_blocked', 'created_at')
            .orderBy('id');

        res.json({ status: 'Success', data: users.map(toPublicUser) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const create = async (req, res) => {
    try {
        const name = normalizeText(req.body.name || '');
        const username = normalizeText(req.body.username || '');
        const role = req.body.role;
        const password = req.body.password || '';

        const validationError = validateUserInput({ name, username, password, role }, true);
        if (validationError) return res.status(400).json({ message: validationError });

        const existing = await db('users').where({ username }).first();
        if (existing) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده' });

        const password_hash = await bcrypt.hash(password, 10);
        const [id] = await db('users').insert({
            name,
            username,
            password_hash,
            role,
            is_blocked: false,
        });

        const user = await db('users').where({ id }).first();
        res.status(201).json({ status: 'Success', data: toPublicUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db('users').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'کاربر یافت نشد' });

        const name = normalizeText(req.body.name ?? existing.name);
        const username = normalizeText(req.body.username ?? existing.username);
        const role = req.body.role ?? existing.role;
        const password = req.body.password;

        const validationError = validateUserInput({ name, username, password, role }, false);
        if (validationError) return res.status(400).json({ message: validationError });

        const duplicate = await db('users').where({ username }).whereNot({ id }).first();
        if (duplicate) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده' });

        const patch = { name, username, role, updated_at: db.fn.now() };
        if (password) {
            if (password.length < 6) return res.status(400).json({ message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
            patch.password_hash = await bcrypt.hash(password, 10);
        }

        await db('users').where({ id }).update(patch);
        const user = await db('users').where({ id }).first();
        res.json({ status: 'Success', data: toPublicUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setBlocked = async (req, res) => {
    try {
        const { id } = req.params;
        const is_blocked = Boolean(req.body.is_blocked);

        if (Number(id) === req.user.id) {
            return res.status(400).json({ message: 'نمی‌توانید حساب خود را مسدود کنید' });
        }

        const existing = await db('users').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'کاربر یافت نشد' });

        if (existing.role === 'admin' && is_blocked) {
            const adminCount = await db('users').where({ role: 'admin', is_blocked: false }).count('id as c').first();
            if (Number(adminCount.c) <= 1) {
                return res.status(400).json({ message: 'حداقل یک مدیر فعال باید وجود داشته باشد' });
            }
        }

        await db('users').where({ id }).update({ is_blocked, updated_at: db.fn.now() });
        const user = await db('users').where({ id }).first();
        res.json({
            status: 'Success',
            message: is_blocked ? 'کاربر مسدود شد' : 'مسدودیت کاربر برداشته شد',
            data: toPublicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) === req.user.id) {
            return res.status(400).json({ message: 'نمی‌توانید حساب خود را حذف کنید' });
        }

        const existing = await db('users').where({ id }).first();
        if (!existing) return res.status(404).json({ message: 'کاربر یافت نشد' });

        if (existing.role === 'admin') {
            const adminCount = await db('users').where({ role: 'admin' }).count('id as c').first();
            if (Number(adminCount.c) <= 1) {
                return res.status(400).json({ message: 'حداقل یک مدیر باید در سیستم باقی بماند' });
            }
        }

        const refs = await Promise.all([
            db('payment_permission_serials').where({ recipient_user_id: id }).count('id as c').first(),
            db('commercial_payments').where({ recorded_by_user_id: id }).count('id as c').first(),
            db('machinery_payments').where({ recorded_by_user_id: id }).count('id as c').first(),
            db('salary_payments').where({ recorded_by_user_id: id }).count('id as c').first(),
        ]);

        const totalRefs = refs.reduce((sum, row) => sum + Number(row.c), 0);
        if (totalRefs > 0) {
            return res.status(400).json({
                message: 'این کاربر در سوابق سیستم استفاده شده و قابل حذف نیست. می‌توانید آن را مسدود کنید.',
            });
        }

        await db('users').where({ id }).delete();
        res.json({ status: 'Success', message: 'کاربر حذف شد' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAll, create, update, setBlocked, remove };
