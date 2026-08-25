const db = require('../config/db-config');

const splitName = (full) => {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first_name: '—', last_name: '—' };
    if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
};

const DEFAULT_PROJECTS = ['دیزج ۲', 'جلفا', 'دفتر', 'عمومی'];

const migrateLookups = async () => {
    const hasExecutors = await db.schema.hasTable('executors');
    if (hasExecutors) {
        const hasFirst = await db.schema.hasColumn('executors', 'first_name');
        if (!hasFirst) {
            await db.schema.alterTable('executors', (table) => {
                table.string('first_name');
                table.string('last_name');
            });
            const rows = await db('executors').select('id', 'name');
            for (const row of rows) {
                const parts = splitName(row.name);
                await db('executors').where({ id: row.id }).update(parts);
            }
            console.log('ℹ️ ستون نام و نام خانوادگی به جدول مجری‌ها اضافه شد.');
        }
    }

    const hasProjects = await db.schema.hasTable('projects');
    if (hasProjects) {
        for (const name of DEFAULT_PROJECTS) {
            const exists = await db('projects').where({ name }).first();
            if (!exists) await db('projects').insert({ name });
        }
    }

    const hasSalary = await db.schema.hasTable('salary_payments');
    if (hasSalary) {
        const moved = await db('salary_payments')
            .where({ status: 'ثبت نشده' })
            .update({ status: 'در انتظار پرداخت' });
        if (moved) {
            console.log(`ℹ️ ${moved} پرداخت حقوق از «ثبت نشده» به «در انتظار پرداخت» منتقل شد.`);
        }
    }
};

module.exports = migrateLookups;
