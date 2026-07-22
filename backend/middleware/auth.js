const jwt = require('jsonwebtoken');
const db = require('../config/db-config');
const { jwtSecret } = require('../config/auth-config');

const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'لطفاً وارد سیستم شوید' });
    }

    try {
        const payload = jwt.verify(token, jwtSecret);
        const user = await db('users')
            .where({ id: payload.userId })
            .select('id', 'name', 'username', 'role', 'is_blocked')
            .first();

        if (!user) {
            return res.status(401).json({ message: 'کاربر یافت نشد' });
        }

        if (user.is_blocked) {
            return res.status(403).json({ message: 'حساب کاربری مسدود شده است' });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: 'نشست نامعتبر است، دوباره وارد شوید' });
    }
};

module.exports = { requireAuth };
