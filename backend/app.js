const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');

fs.mkdirSync(path.join(uploadsDir, 'receipts'), { recursive: true });

app.set('trust proxy', 1);
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
}));
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/uploads', express.static(uploadsDir));
app.use('/api', routes);

module.exports = app;
