const express = require('express');
const { requireAdmin } = require('../middleware/authorize');
const { getAll, create, update, setBlocked, remove } = require('../controllers/usersController');

const router = express.Router();

router.get('/users', requireAdmin, getAll);
router.post('/users', requireAdmin, create);
router.put('/users/:id', requireAdmin, update);
router.patch('/users/:id/block', requireAdmin, setBlocked);
router.delete('/users/:id', requireAdmin, remove);

module.exports = router;
