const fs = require('fs');
const backupService = require('../services/backupService');

const downloadBackup = async (req, res) => {
  let tempPath;
  try {
    tempPath = await backupService.createBackupFile();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `payment-manager-backup-${date}.sqlite`;

    res.download(tempPath, filename, (err) => {
      fs.unlink(tempPath, () => {});
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'خطا در دانلود پشتیبان' });
      }
    });
  } catch (err) {
    if (tempPath) fs.unlink(tempPath, () => {});
    res.status(500).json({ message: err.message || 'خطا در ایجاد پشتیبان' });
  }
};

const getBackupInfo = async (req, res) => {
  try {
    const info = await backupService.getBackupInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ message: err.message || 'خطا در خواندن اطلاعات دیتابیس' });
  }
};

const restoreBackup = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'فایل دیتابیس ارسال نشده است' });
  }

  const uploadedPath = req.file.path;

  try {
    const result = await backupService.restoreDatabase(uploadedPath);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || 'خطا در بازیابی دیتابیس' });
  } finally {
    fs.unlink(uploadedPath, () => {});
  }
};

module.exports = {
  downloadBackup,
  getBackupInfo,
  restoreBackup,
};
