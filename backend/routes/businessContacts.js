const express = require('express');
const { requireAdmin, requireReadAccess } = require('../middleware/authorize');
const {
    getAll,
    getById,
    create,
    update,
    remove,
} = require('../controllers/businessContactsController');

const router = express.Router();

router.get('/business-contacts', requireReadAccess, getAll);
router.get('/business-contacts/:id', requireReadAccess, getById);
router.post('/business-contacts', requireAdmin, create);
router.put('/business-contacts/:id', requireAdmin, update);
router.delete('/business-contacts/:id', requireAdmin, remove);

module.exports = router;
