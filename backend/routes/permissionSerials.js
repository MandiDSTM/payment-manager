const express = require('express');
const { requireReadAccess, requireAdmin } = require('../middleware/authorize');
const {
    getAll,
    getById,
    create,
    markAwaitingPayment,
    voidPermit,
} = require('../controllers/permissionSerialsController');

const router = express.Router();

router.get('/permission-serials', requireReadAccess, getAll);
router.get('/permission-serials/:id', requireReadAccess, getById);
router.post('/permission-serials', requireAdmin, create);
router.patch('/permission-serials/:id/awaiting', requireAdmin, markAwaitingPayment);
router.patch('/permission-serials/:id/void', requireAdmin, voidPermit);

// مسیرهای سازگار با نسخه قبل
router.get('/payment-permission-serials', requireReadAccess, getAll);
router.get('/payment-permission-serials/:id', requireReadAccess, getById);

module.exports = router;
