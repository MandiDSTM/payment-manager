const db = require('../../config/db-config');
const { normalizeSheba, isValidSheba } = require('../../utils/validateSheba');
const {
    findColumnIndex,
    getCellValue,
    readSheetRows,
    validateRequiredColumns,
    buildWorkbookBuffer,
} = require('../../utils/excelHelpers');
const { insertInChunks, describeSqliteWriteError } = require('../../utils/dbBatch');
const {
    cellText,
    isEmptyRow,
    parseAmount,
    finalizePreviewRows,
} = require('./excelImportUtils');
const normalizeText = require('../../utils/normalizeText');

const COLUMN_MAP = {
    personnel: ['کد پرسنلی', 'شماره پرسنلی', 'کدپرسنلی', 'personnel'],
    firstName: ['نام'],
    lastName: ['نام خانوادگی', 'خانوادگی'],
    fullName: ['نام و نام خانوادگی', 'نام کامل', 'full name'],
    date: ['تاریخ', 'تاریخ شمسی', 'date'],
    amount: ['مبلغ', 'amount', 'هزینه'],
    serial: ['سریال', 'serial'],
    sheba: ['شبا', 'شماره شبا', 'sheba', 'iban'],
    subject: ['بابت', 'موضوع', 'subject'],
    description: ['توضیحات', 'description', 'شرح'],
};

const HEADER_MATCHERS = [
    COLUMN_MAP.amount,
    COLUMN_MAP.date,
    COLUMN_MAP.personnel,
    COLUMN_MAP.fullName,
    COLUMN_MAP.firstName,
];

const splitFullName = (fullName) => {
    const parts = normalizeText(String(fullName || '')).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first_name: '', last_name: '' };
    if (parts.length === 1) return { first_name: parts[0], last_name: '' };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
};

const identifyColumns = (headers) => {
    const fullName = findColumnIndex(headers, COLUMN_MAP.fullName);
    const firstName = findColumnIndex(headers, ['نام'], { exact: true });
    const lastName = findColumnIndex(headers, ['نام خانوادگی', 'خانوادگی']);
    return {
        personnel: findColumnIndex(headers, COLUMN_MAP.personnel),
        fullName,
        firstName: firstName === fullName ? -1 : firstName,
        lastName: lastName === fullName ? -1 : lastName,
        date: findColumnIndex(headers, COLUMN_MAP.date),
        amount: findColumnIndex(headers, COLUMN_MAP.amount),
        serial: findColumnIndex(headers, COLUMN_MAP.serial),
        sheba: findColumnIndex(headers, COLUMN_MAP.sheba),
        subject: findColumnIndex(headers, COLUMN_MAP.subject),
        description: findColumnIndex(headers, COLUMN_MAP.description),
    };
};

const normalizeRow = (row, colIdx) => {
    let firstName = '';
    let lastName = '';
    if (colIdx.fullName !== -1) {
        const split = splitFullName(getCellValue(row, colIdx.fullName));
        firstName = split.first_name;
        lastName = split.last_name;
    } else {
        firstName = cellText(row, colIdx.firstName);
        lastName = cellText(row, colIdx.lastName);
    }

    const amountParsed = parseAmount(getCellValue(row, colIdx.amount));
    const sheba = normalizeSheba(String(getCellValue(row, colIdx.sheba) ?? ''));

    return {
        personnel_code: cellText(row, colIdx.personnel),
        first_name: firstName,
        last_name: lastName,
        date_shamsi: cellText(row, colIdx.date),
        amount: amountParsed.invalid ? null : amountParsed.value,
        amountEmpty: amountParsed.empty,
        amountInvalid: amountParsed.invalid,
        serial: cellText(row, colIdx.serial) || null,
        sheba: sheba || null,
        subject: cellText(row, colIdx.subject) || null,
        description: cellText(row, colIdx.description) || null,
        status: 'در انتظار پرداخت',
        app_log: 'Excel Import',
    };
};

const assessRow = (record) => {
    const errors = [];
    const warnings = [];
    const infos = [];

    if (!record.first_name && !record.personnel_code) {
        errors.push('نام یا کد پرسنلی الزامی است');
    }
    if (!record.date_shamsi) errors.push('تاریخ خالی است');
    if (record.amountEmpty) errors.push('مبلغ خالی است');
    else if (record.amountInvalid || !record.amount || record.amount <= 0) {
        errors.push('مبلغ باید بزرگ‌تر از صفر باشد');
    }

    const shebaNeedsReview = Boolean(record.sheba) && !isValidSheba(record.sheba);
    if (shebaNeedsReview) {
        warnings.push('شماره شبا نامعتبر است — ثبت می‌شود ولی نیاز به اصلاح دارد');
    } else if (!record.sheba) {
        infos.push('شماره شبا خالی است');
    }

    return { errors, warnings, infos, sheba_needs_review: shebaNeedsReview };
};

const parseWorkbook = (filePath, { softMissingColumns = false } = {}) => {
    const { headers, dataRows, headerRowNumber } = readSheetRows(filePath, {
        headerMatchers: HEADER_MATCHERS,
        minHeaderScore: 1,
    });

    const requiredMap = {
        مبلغ: COLUMN_MAP.amount,
        تاریخ: COLUMN_MAP.date,
    };
    const missingCols = validateRequiredColumns(headers, requiredMap);
    const hasName = findColumnIndex(headers, COLUMN_MAP.fullName) !== -1
        || findColumnIndex(headers, ['نام'], { exact: true }) !== -1
        || findColumnIndex(headers, COLUMN_MAP.personnel) !== -1;
    if (!hasName) missingCols.push('نام یا کد پرسنلی');

    if (missingCols.length > 0 && !softMissingColumns) {
        throw new Error(`MISSING_COLUMNS:${missingCols.join(', ')}`);
    }

    return {
        headers,
        dataRows,
        headerRowNumber,
        colIdx: identifyColumns(headers),
        missingCols,
    };
};

const parsePreview = async (filePath) => {
    const { dataRows, headerRowNumber, colIdx, missingCols, headers } = parseWorkbook(filePath, {
        softMissingColumns: true,
    });
    const rows = [];
    const columnWarnings = missingCols.length > 0
        ? [`ستون‌های یافت‌نشده: ${missingCols.join('، ')}`]
        : [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (isEmptyRow(row)) continue;

        const excelRow = headerRowNumber + i + 1;
        const record = normalizeRow(row, colIdx);
        const assessment = assessRow(record);
        const { amountEmpty, amountInvalid, ...data } = record;

        rows.push({
            row: excelRow,
            data,
            display: {
                personnel_code: data.personnel_code || '—',
                full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || '—',
                date_shamsi: data.date_shamsi || '—',
                amount: data.amount,
                serial: data.serial || '—',
                sheba: data.sheba || '—',
                subject: data.subject || '—',
            },
            errors: assessment.errors,
            warnings: assessment.warnings,
            infos: assessment.infos,
            sheba_needs_review: assessment.sheba_needs_review,
        });
    }

    return {
        headers,
        missingColumns: missingCols,
        warnings: columnWarnings,
        rows: finalizePreviewRows(rows),
    };
};

const hardValidate = (record) => {
    const { errors } = assessRow({
        ...record,
        amountEmpty: record.amount === null || record.amount === undefined || record.amount === '',
        amountInvalid: record.amount !== null && record.amount !== undefined && Number.isNaN(Number(record.amount)),
    });
    return errors;
};

const confirmImport = async (records, { onlyFullyValid = false } = {}) => {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('NO_RECORDS_SELECTED');
    }

    let selected = records.map((item) => {
        const data = { ...(item.data || item) };
        const shebaNeedsReview = data.sheba_needs_review === true
            || (Boolean(data.sheba) && !isValidSheba(data.sheba));
        return {
            row: item.row,
            data: {
                personnel_code: data.personnel_code || '',
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                date_shamsi: data.date_shamsi || '',
                amount: Number(data.amount) || 0,
                serial: data.serial || null,
                sheba: data.sheba || null,
                subject: data.subject || null,
                description: data.description || null,
                status: data.status || 'در انتظار پرداخت',
                app_log: 'Excel Import',
                sheba_needs_review: shebaNeedsReview,
            },
            warnings: item.warnings || [],
        };
    });

    if (onlyFullyValid) {
        selected = selected.filter((item) => (
            hardValidate(item.data).length === 0 && !item.data.sheba_needs_review
        ));
        if (selected.length === 0) throw new Error('NO_FULLY_VALID_RECORDS');
    }

    const errors = [];
    selected.forEach((item) => {
        hardValidate(item.data).forEach((message) => {
            errors.push({ row: item.row, message });
        });
    });
    if (errors.length > 0) {
        return { inserted: 0, errors, aborted: true };
    }

    const payload = selected.map((item) => {
        const { sheba_needs_review: _flag, ...row } = item.data;
        return row;
    });

    try {
        await insertInChunks(db, 'payments', payload);
    } catch (error) {
        const described = describeSqliteWriteError(error);
        if (described) {
            return {
                inserted: 0,
                errors: [{ row: '—', message: described.message }],
                aborted: true,
            };
        }
        throw error;
    }
    return { inserted: payload.length, errors: [], aborted: false };
};

const getTemplateBuffer = () => buildWorkbookBuffer('پرداخت عمومی', [{
    'کد پرسنلی': 'P-001',
    'نام': 'علی',
    'نام خانوادگی': 'رضایی',
    'تاریخ': '1403/01/15',
    'مبلغ': 15000000,
    'سریال': 'SER-1001',
    'شماره شبا': 'IR123456789012345678901234',
    'بابت': 'مساعده',
    'توضیحات': '',
}], {
    title: 'قالب ورود پرداخت‌های عمومی',
    showMeta: false,
    textColumns: ['کد پرسنلی', 'سریال', 'شماره شبا', 'تاریخ'],
});

module.exports = {
    parsePreview,
    confirmImport,
    getTemplateBuffer,
};
