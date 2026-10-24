const path = require('path');
const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/authorize');
const {
  downloadBackup,
  getBackupInfo,
  restoreBackup,
} = require('../controllers/backupController');

const router = express.Router();

const uploadBackup = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.sqlite') || ext.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های .sqlite یا .db مجاز هستند'));
    }
  },
});

router.get('/backup/info', requireAdmin, getBackupInfo);
router.get('/backup/download', requireAdmin, downloadBackup);
router.post('/backup/restore', requireAdmin, uploadBackup.single('file'), restoreBackup);

module.exports = router;
