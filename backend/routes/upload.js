const express = require('express');
const upload = require('../middleware/upload');
const { requirePaymentCreate } = require('../middleware/authorize');
const { uploadExcel } = require('../controllers/uploadController');

const router = express.Router();

router.post('/upload-excel', requirePaymentCreate, upload.single('file'), uploadExcel);

module.exports = router;
