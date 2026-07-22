const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db-config');
const { jwtSecret, jwtExpiresIn } = require('../config/auth-config');
const { ROLE_LABELS } = require('../constants/users');

const toPublicUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    is_blocked: Boolean(user.is_blocked),
});

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password) {
            return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });
        }

        const user = await db('users')
            .where({ username: username.trim() })
            .first();

        if (!user || !user.password_hash) {
            return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ message: 'حساب کاربری مسدود شده است' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            jwtSecret,
            { expiresIn: jwtExpiresIn },
        );

        res.json({
            status: 'Success',
            token,
            user: toPublicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const me = async (req, res) => {
    res.json({ status: 'Success', user: toPublicUser(req.user) });
};

module.exports = { login, me };
