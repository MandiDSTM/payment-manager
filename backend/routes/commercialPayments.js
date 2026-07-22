const express = require('express');
const {
    requireReadAccess,
    requireCommercialPaymentWrite,
    requireAdmin,
} = require('../middleware/authorize');
const uploadReceipt = require('../middleware/uploadReceipt');
const {
    getAll,
    getById,
    create,
    update,
    remove,
    uploadReceipt: uploadReceiptHandler,
} = require('../controllers/commercialPaymentsController');

const router = express.Router();

router.get('/commercial-payments', requireReadAccess, getAll);
router.get('/commercial-payments/:id', requireReadAccess, getById);
router.post('/commercial-payments', requireCommercialPaymentWrite, create);
router.put('/commercial-payments/:id', requireCommercialPaymentWrite, update);
router.delete('/commercial-payments/:id', requireAdmin, remove);
router.post(
    '/commercial-payments/:id/receipt',
    requireCommercialPaymentWrite,
    uploadReceipt.single('file'),
    uploadReceiptHandler,
);

module.exports = router;
