const express = require('express');
const upload = require('../middleware/upload');
const {
    requireAdmin,
    requireReadAccess,
    requirePaymentCreate,
    requireCommercialPaymentWrite,
} = require('../middleware/authorize');
const {
    importPersonnel,
    previewPersonnel,
    confirmPersonnel,
    importPersonnelBulkUpdate,
    importMachineryContacts,
    previewPayments,
    confirmPayments,
    previewCommercialPayments,
    confirmCommercialPayments,
    previewMachineryPayments,
    confirmMachineryPayments,
    previewSalaryPayments,
    confirmSalaryPayments,
    downloadTemplate,
    exportPayments,
    exportByProject,
    exportByMonth,
    exportByExecutor,
    exportBySerial,
    exportPersonnel,
    exportGeneralPayments,
    exportCommercialPayments,
    exportMachineryPayments,
    exportSalaryPayments,
    exportSalaryPaystar,
    getLogs,
} = require('../controllers/excelController');

const router = express.Router();

router.get('/excel/logs', requireReadAccess, getLogs);
router.get('/excel/template/:type', requireReadAccess, downloadTemplate);

router.post('/excel/preview/personnel', requireAdmin, upload.single('file'), previewPersonnel);
router.post('/excel/confirm/personnel', requireAdmin, confirmPersonnel);
router.post('/excel/import/personnel', requireAdmin, upload.single('file'), importPersonnel);
router.post('/excel/import/personnel-bulk-update', requireAdmin, upload.single('file'), importPersonnelBulkUpdate);
router.post('/excel/import/machinery-contacts', requireAdmin, upload.single('file'), importMachineryContacts);

router.post('/excel/preview/payments', requirePaymentCreate, upload.single('file'), previewPayments);
router.post('/excel/confirm/payments', requirePaymentCreate, confirmPayments);
router.post('/excel/preview/commercial-payments', requireCommercialPaymentWrite, upload.single('file'), previewCommercialPayments);
router.post('/excel/confirm/commercial-payments', requireCommercialPaymentWrite, confirmCommercialPayments);
router.post('/excel/preview/machinery-payments', requireCommercialPaymentWrite, upload.single('file'), previewMachineryPayments);
router.post('/excel/confirm/machinery-payments', requireCommercialPaymentWrite, confirmMachineryPayments);
router.post('/excel/preview/salary-payments', requireCommercialPaymentWrite, upload.single('file'), previewSalaryPayments);
router.post('/excel/confirm/salary-payments', requireCommercialPaymentWrite, confirmSalaryPayments);

router.get('/excel/export/payments', requireReadAccess, exportPayments);
router.get('/excel/export/payments/general', requireReadAccess, exportGeneralPayments);
router.get('/excel/export/payments/commercial', requireReadAccess, exportCommercialPayments);
router.get('/excel/export/payments/machinery', requireReadAccess, exportMachineryPayments);
router.get('/excel/export/payments/salary', requireReadAccess, exportSalaryPayments);
router.get('/excel/export/payments/salary-paystar', requireReadAccess, exportSalaryPaystar);
router.get('/excel/export/by-project', requireReadAccess, exportByProject);
router.get('/excel/export/by-month', requireReadAccess, exportByMonth);
router.get('/excel/export/by-executor', requireReadAccess, exportByExecutor);
router.get('/excel/export/by-serial', requireReadAccess, exportBySerial);
router.get('/excel/export/personnel', requireReadAccess, exportPersonnel);

module.exports = router;
