const express = require('express');
const { login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);

module.exports = router;
