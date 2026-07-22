const express = require('express');
const {
    requireReadAccess,
    requireAdmin,
    requirePaymentCreate,
    requirePaymentApprove,
} = require('../middleware/authorize');
const {
    createPayment,
    getAllPayments,
    clearAllData,
    bulkUpdateStatus,
    updateField,
} = require('../controllers/paymentsController');

const router = express.Router();

router.get('/debug-all', requireReadAccess, getAllPayments);
router.post('/payments', requirePaymentCreate, createPayment);
router.patch('/payments/:id/update-field', requireAdmin, updateField);
router.post('/payments/bulk-status', requirePaymentApprove, bulkUpdateStatus);
router.delete('/clear-all-data', requireAdmin, clearAllData);

module.exports = router;
