const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const db = require('../config/db-config');

const SQLITE_HEADER = Buffer.from('SQLite format 3\0');
const REQUIRED_TABLE = 'users';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

async function createBackupFile() {
  const tempPath = path.join(os.tmpdir(), `payment-manager-backup-${Date.now()}.sqlite`);
  const rawDb = await db.client.acquireRawConnection();
  await rawDb.backup(tempPath);
  return tempPath;
}

async function getBackupInfo() {
  const dbPath = db.getDbPath();
  const stat = fs.statSync(dbPath);

  const tables = await db
    .select('name')
    .from('sqlite_master')
    .where('type', 'table')
    .whereRaw("name NOT LIKE 'sqlite_%'");

  const tableCounts = {};
  for (const { name } of tables) {
    const row = await db(name).count('* as count').first();
    tableCounts[name] = Number(row.count);
  }

  const totalRecords = Object.values(tableCounts).reduce((sum, n) => sum + n, 0);

  return {
    fileSize: stat.size,
    fileSizeFormatted: formatBytes(stat.size),
    lastModified: stat.mtime.toISOString(),
    tableCounts,
    totalRecords,
    tableCount: tables.length,
  };
}

function validateSqliteFile(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    if (!header.equals(SQLITE_HEADER)) {
      throw new Error('فایل انتخاب‌شده یک دیتابیس SQLite معتبر نیست');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function validateAppDatabase(filePath) {
  let testDb;
  try {
    testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name);

    if (!tables.includes(REQUIRED_TABLE)) {
      throw new Error('فایل دیتابیس معتبر برنامه نیست (جدول users یافت نشد)');
    }
  } finally {
    testDb?.close();
  }
}

async function restoreDatabase(uploadedFilePath) {
  validateSqliteFile(uploadedFilePath);
  validateAppDatabase(uploadedFilePath);

  const dbPath = db.getDbPath();
  const preRestorePath = `${dbPath}.pre-restore-${Date.now()}`;

  fs.copyFileSync(dbPath, preRestorePath);

  await db.destroy();

  try {
    fs.copyFileSync(uploadedFilePath, dbPath);
    await db.reconnect();
  } catch (err) {
    if (fs.existsSync(preRestorePath)) {
      fs.copyFileSync(preRestorePath, dbPath);
    }
    await db.reconnect();
    throw err;
  }

  return {
    preRestorePath: path.basename(preRestorePath),
    message: 'دیتابیس با موفقیت بازیابی شد',
  };
}

module.exports = {
  createBackupFile,
  getBackupInfo,
  restoreDatabase,
};
