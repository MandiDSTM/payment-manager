const fs = require('fs');
const path = require('path');

const receiptsDir = path.resolve(__dirname, '../uploads/receipts');

const serveReceipt = (req, res) => {
    const filename = path.basename(req.params.filename || '');
    if (!filename || filename === '.' || filename === '..') {
        return res.status(400).json({ message: 'نام فایل نامعتبر است' });
    }

    const resolved = path.resolve(receiptsDir, filename);
    if (!resolved.startsWith(receiptsDir + path.sep)) {
        return res.status(400).json({ message: 'مسیر نامعتبر است' });
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        return res.status(404).json({ message: 'فایل یافت نشد' });
    }

    res.sendFile(resolved);
};

module.exports = { serveReceipt };
