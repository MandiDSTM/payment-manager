const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'تعداد تلاش ورود بیش از حد است. کمی بعد دوباره تلاش کنید.' },
});

router.post('/auth/login', loginLimiter, login);
router.get('/auth/me', requireAuth, me);

module.exports = router;
