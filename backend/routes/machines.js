const express = require('express');
const { requireAdmin, requireReadAccess } = require('../middleware/authorize');
const { getAll, create, update, remove } = require('../controllers/machinesController');

const router = express.Router();

router.get('/machines', requireReadAccess, getAll);
router.post('/machines', requireAdmin, create);
router.put('/machines/:id', requireAdmin, update);
router.delete('/machines/:id', requireAdmin, remove);

module.exports = router;
