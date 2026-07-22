const db = require('../config/db-config');

const logExcelEvent = async ({
    operationType,
    fileName = null,
    userId = null,
    imported = 0,
    failed = 0,
    errors = [],
    message = null,
}) => {
    const payload = {
        operation_type: operationType,
        file_name: fileName,
        user_id: userId || null,
        imported,
        failed,
        errors: JSON.stringify(errors),
        message,
    };

    console.log(`>>> [EXCEL] ${operationType}: imported=${imported}, failed=${failed}`, message || '');

    try {
        const hasTable = await db.schema.hasTable('excel_logs');
        if (hasTable) {
            await db('excel_logs').insert(payload);
        }
    } catch (err) {
        console.error('>>> [EXCEL LOG ERROR]:', err.message);
    }

    return payload;
};

const getRecentLogs = async (limit = 50) => {
    const hasTable = await db.schema.hasTable('excel_logs');
    if (!hasTable) return [];

    return db('excel_logs').select('*').orderBy('id', 'desc').limit(limit);
};

module.exports = { logExcelEvent, getRecentLogs };
