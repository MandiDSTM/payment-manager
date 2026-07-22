const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: 'uploads/receipts/',
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const uploadReceipt = multer({ storage });

module.exports = uploadReceipt;
