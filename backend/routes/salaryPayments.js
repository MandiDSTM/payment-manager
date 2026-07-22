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
} = require('../controllers/salaryPaymentsController');

const router = express.Router();

router.get('/salary-payments', requireReadAccess, getAll);
router.get('/salary-payments/:id', requireReadAccess, getById);
router.post('/salary-payments', requireCommercialPaymentWrite, create);
router.put('/salary-payments/:id', requireCommercialPaymentWrite, update);
router.delete('/salary-payments/:id', requireAdmin, remove);
router.post(
    '/salary-payments/:id/receipt',
    requireCommercialPaymentWrite,
    uploadReceipt.single('file'),
    uploadReceiptHandler,
);

module.exports = router;
