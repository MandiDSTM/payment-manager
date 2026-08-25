/** SQLite rejects Knex batch inserts larger than ~500 UNION ALL terms. */
const SQLITE_INSERT_CHUNK = 80;

const collectErrorText = (error) => [
    error?.message,
    error?.code,
    error?.errno != null ? String(error.errno) : '',
    error?.nativeError?.message,
    error?.cause?.message,
    error?.sql,
].filter(Boolean).join('\n');

const isSqlDump = (text) => /^insert into/i.test(String(text || '').trim())
    || /union all select/i.test(String(text || ''));

const describeSqliteWriteError = (error) => {
    const text = collectErrorText(error);
    const dump = isSqlDump(error?.message);

    if (/too many terms in compound SELECT/i.test(text)) {
        return {
            status: 500,
            message: 'تعداد ردیف‌های انتخاب‌شده برای ثبت یکجا زیاد است. فایل را در چند مرحله وارد کنید.',
        };
    }
    if (/UNIQUE constraint failed:\s*personnel_contacts\.personnel_code/i.test(text)
        || (/UNIQUE/i.test(text) && /personnel_code/i.test(text))) {
        return { status: 409, message: 'کد پرسنلی تکراری است؛ یک یا چند ردیف از قبل ثبت شده است.' };
    }
    if (/UNIQUE constraint failed:\s*personnel_contacts\.national_id/i.test(text)
        || (/UNIQUE/i.test(text) && /national_id/i.test(text))) {
        return { status: 409, message: 'کد ملی تکراری است؛ یک یا چند ردیف از قبل ثبت شده است.' };
    }
    if (/UNIQUE constraint failed/i.test(text) || error?.errno === 19 || /SQLITE_CONSTRAINT/i.test(text)) {
        return { status: 409, message: 'اطلاعات تکراری است و ثبت انجام نشد.' };
    }
    if (dump) {
        return { status: 500, message: 'خطا در ثبت اطلاعات در پایگاه داده.' };
    }
    return null;
};

const insertInChunks = async (queryable, table, rows, chunkSize = SQLITE_INSERT_CHUNK) => {
    if (!rows?.length) return;
    for (let i = 0; i < rows.length; i += chunkSize) {
        await queryable(table).insert(rows.slice(i, i + chunkSize));
    }
};

module.exports = {
    SQLITE_INSERT_CHUNK,
    collectErrorText,
    describeSqliteWriteError,
    insertInChunks,
};
