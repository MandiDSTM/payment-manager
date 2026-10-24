const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const routes = require('./routes');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');

fs.mkdirSync(path.join(uploadsDir, 'receipts'), { recursive: true });

const corsOrigin = () => {
    const configured = process.env.CORS_ORIGIN;
    if (configured === '*') return true;
    if (configured) {
        return configured.split(',').map((value) => value.trim()).filter(Boolean);
    }
    if (process.env.NODE_ENV === 'production') return false;
    return true;
};

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({ origin: corsOrigin() }));
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api', routes);

app.use((err, _req, res, next) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'حجم فایل بیش از حد مجاز است' });
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'آپلود فایل نامعتبر است' });
    }
    if (typeof err.message === 'string' && err.message.includes('مجاز')) {
        return res.status(400).json({ message: err.message });
    }
    return next(err);
});

module.exports = app;
