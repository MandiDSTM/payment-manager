const express = require('express');
const { requireReadAccess } = require('../middleware/authorize');
const { serveReceipt } = require('../controllers/filesController');

const router = express.Router();

router.get('/files/receipts/:filename', requireReadAccess, serveReceipt);

module.exports = router;
