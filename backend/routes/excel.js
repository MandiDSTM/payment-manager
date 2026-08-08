const express = require('express');
const upload = require('../middleware/upload');
const { requireAdmin, requireReadAccess } = require('../middleware/authorize');
const {
    importPersonnel,
    previewPersonnel,
    confirmPersonnel,
    importPersonnelBulkUpdate,
    importMachineryContacts,
    downloadTemplate,
    exportPayments,
    exportByProject,
    exportByMonth,
    exportByExecutor,
    exportBySerial,
    exportPersonnel,
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

router.get('/excel/export/payments', requireReadAccess, exportPayments);
router.get('/excel/export/by-project', requireReadAccess, exportByProject);
router.get('/excel/export/by-month', requireReadAccess, exportByMonth);
router.get('/excel/export/by-executor', requireReadAccess, exportByExecutor);
router.get('/excel/export/by-serial', requireReadAccess, exportBySerial);
router.get('/excel/export/personnel', requireReadAccess, exportPersonnel);

module.exports = router;
