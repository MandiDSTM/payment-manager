const app = require('./app');
const migrateLookups = require('./utils/migrateLookups');

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('>>> [ERROR] JWT_SECRET is required in production');
    process.exit(1);
}

migrateLookups()
    .then(() => {
        app.listen(PORT, HOST, () => {
            console.log(`>>> [INFO] Server started on http://${HOST}:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('>>> [ERROR] migrate lookups:', error.message);
        process.exit(1);
    });
