const express = require('express');
const { requireAdmin, requireReadAccess } = require('../middleware/authorize');
const { getAll, getById, create, update, remove } = require('../controllers/personnelContactsController');

const router = express.Router();

router.get('/personnel-contacts', requireReadAccess, getAll);
router.get('/personnel-contacts/:id', requireReadAccess, getById);
router.post('/personnel-contacts', requireAdmin, create);
router.put('/personnel-contacts/:id', requireAdmin, update);
router.delete('/personnel-contacts/:id', requireAdmin, remove);

module.exports = router;
