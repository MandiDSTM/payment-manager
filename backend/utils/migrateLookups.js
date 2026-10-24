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

    await rotateLegacyDefaultPasswords();
};

const rotateLegacyDefaultPasswords = async () => {
    const hasUsers = await db.schema.hasTable('users');
    const hasHash = hasUsers && await db.schema.hasColumn('users', 'password_hash');
    if (!hasHash) return;

    const bcrypt = require('bcryptjs');
    const nextPassword = require('../config/default-password');
    const nextHash = await bcrypt.hash(nextPassword, 10);
    const users = await db('users').select('id', 'username', 'password_hash');
    let updated = 0;

    for (const user of users) {
        if (!user.password_hash) continue;
        const alreadyNew = await bcrypt.compare(nextPassword, user.password_hash);
        if (alreadyNew) continue;
        const isLegacy = await bcrypt.compare('123456', user.password_hash);
        if (!isLegacy && user.username !== 'admin') continue;
        await db('users').where({ id: user.id }).update({ password_hash: nextHash });
        updated += 1;
    }

    if (updated) {
        console.log(`ℹ️ رمز ${updated} کاربر پیش‌فرض به‌روز شد.`);
    }
};

module.exports = migrateLookups;
