const path = require('path');
const multer = require('multer');

const EXCEL_EXTS = new Set(['.xlsx', '.xls']);

const upload = multer({
    dest: path.join(__dirname, '../uploads'),
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (EXCEL_EXTS.has(ext)) {
            cb(null, true);
            return;
        }
        cb(new Error('فقط فایل اکسل (.xlsx یا .xls) مجاز است'));
    },
});

module.exports = upload;
