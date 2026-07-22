const express = require('express');
const upload = require('../middleware/upload');
const { requireAdmin, requireReadAccess } = require('../middleware/authorize');
const {
    getAll,
    getById,
    create,
    update,
    remove,
} = require('../controllers/machineryContactsController');
const { uploadExcel } = require('../controllers/machineryContactsUploadController');

const router = express.Router();

router.get('/machinery-contacts', requireReadAccess, getAll);
router.get('/machinery-contacts/:id', requireReadAccess, getById);
router.post('/machinery-contacts', requireAdmin, create);
router.post('/machinery-contacts/upload-excel', requireAdmin, upload.single('file'), uploadExcel);
router.put('/machinery-contacts/:id', requireAdmin, update);
router.delete('/machinery-contacts/:id', requireAdmin, remove);

module.exports = router;
