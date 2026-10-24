const path = require('path');
const multer = require('multer');

const RECEIPT_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads/receipts'),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = RECEIPT_EXTS.has(ext) ? ext : '';
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${safeExt}`);
    },
});

const uploadReceipt = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (RECEIPT_EXTS.has(ext)) {
            cb(null, true);
            return;
        }
        cb(new Error('فقط تصویر یا PDF مجاز است'));
    },
});

module.exports = uploadReceipt;
