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
} = require('../controllers/machineryPaymentsController');

const router = express.Router();

router.get('/machinery-payments', requireReadAccess, getAll);
router.get('/machinery-payments/:id', requireReadAccess, getById);
router.post('/machinery-payments', requireCommercialPaymentWrite, create);
router.put('/machinery-payments/:id', requireCommercialPaymentWrite, update);
router.delete('/machinery-payments/:id', requireAdmin, remove);
router.post(
    '/machinery-payments/:id/receipt',
    requireCommercialPaymentWrite,
    uploadReceipt.single('file'),
    uploadReceiptHandler,
);

module.exports = router;
