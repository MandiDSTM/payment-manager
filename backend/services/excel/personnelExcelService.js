const db = require('../../config/db-config');
const normalizeText = require('../../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../../utils/validateSheba');
const {
    findColumnIndex,
    getCellValue,
    readSheetRows,
    validateRequiredColumns,
    buildWorkbookBuffer,
} = require('../../utils/excelHelpers');

const COLUMN_MAP = {
    'شماره پرسنلی': ['شماره پرسنلی', 'کد پرسنلی', 'personnel'],
    'نام': ['نام'],
    'نام خانوادگی': ['نام خانوادگی', 'خانوادگی'],
    'شماره شبا': ['شبا', 'sheba'],
    'نام صاحب حساب': ['نام صاحب حساب', 'صاحب حساب'],
    'موبایل': ['موبایل', 'mobile'],
    'شهر': ['شهر', 'city'],
    'توضیحات': ['توضیحات', 'description'],
};

const identifyColumns = (headers) => ({
    personnelCode: findColumnIndex(headers, COLUMN_MAP['شماره پرسنلی']),
    firstName: findColumnIndex(headers, ['نام'], { exact: true }),
    lastName: findColumnIndex(headers, COLUMN_MAP['نام خانوادگی']),
    sheba: findColumnIndex(headers, COLUMN_MAP['شماره شبا']),
    accountHolder: findColumnIndex(headers, COLUMN_MAP['نام صاحب حساب']),
    mobile: findColumnIndex(headers, COLUMN_MAP['موبایل']),
    city: findColumnIndex(headers, COLUMN_MAP['شهر']),
    description: findColumnIndex(headers, COLUMN_MAP['توضیحات']),
});

const normalizeRow = (row, colIdx) => ({
    personnel_code: normalizeText(String(getCellValue(row, colIdx.personnelCode) || '')),
    first_name: normalizeText(String(getCellValue(row, colIdx.firstName) || '')),
    last_name: normalizeText(String(getCellValue(row, colIdx.lastName) || '')),
    sheba: normalizeSheba(String(getCellValue(row, colIdx.sheba) || '')),
    account_holder_name: normalizeText(String(getCellValue(row, colIdx.accountHolder) || '')),
    mobile: normalizeText(String(getCellValue(row, colIdx.mobile) || '')) || null,
    city: normalizeText(String(getCellValue(row, colIdx.city) || '')) || null,
    description: normalizeText(String(getCellValue(row, colIdx.description) || '')) || null,
});

const validateRow = (contact) => {
    if (!contact.personnel_code) return 'شماره پرسنلی خالی است';
    if (!contact.first_name || !contact.last_name) return 'نام یا نام خانوادگی خالی است';
    if (!contact.account_holder_name) return 'نام صاحب حساب خالی است';
    if (!isValidSheba(contact.sheba)) return 'شماره شبا معتبر نیست';
    return null;
};

const parseImport = async (filePath) => {
    const { headers, dataRows } = readSheetRows(filePath);
    const missingCols = validateRequiredColumns(headers, {
        'شماره پرسنلی': COLUMN_MAP['شماره پرسنلی'],
        'نام': ['نام'],
        'نام خانوادگی': COLUMN_MAP['نام خانوادگی'],
        'شماره شبا': COLUMN_MAP['شماره شبا'],
        'نام صاحب حساب': COLUMN_MAP['نام صاحب حساب'],
    });

    if (missingCols.length > 0) {
        throw new Error(`MISSING_COLUMNS:${missingCols.join(', ')}`);
    }

    const colIdx = identifyColumns(headers);
    const records = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;

        const rowNum = i + 2;
        const contact = normalizeRow(row, colIdx);
        const validationError = validateRow(contact);

        if (validationError) {
            errors.push({ row: rowNum, message: validationError });
            continue;
        }

        const existing = await db('personnel_contacts').where({ personnel_code: contact.personnel_code }).first();
        if (existing) {
            errors.push({ row: rowNum, message: `شماره پرسنلی ${contact.personnel_code} قبلاً ثبت شده` });
            continue;
        }

        records.push(contact);
    }

    return { records, errors };
};

const parseBulkUpdate = async (filePath) => {
    const { headers, dataRows } = readSheetRows(filePath);
    const missingCols = validateRequiredColumns(headers, {
        'شماره پرسنلی': COLUMN_MAP['شماره پرسنلی'],
    });

    if (missingCols.length > 0) {
        throw new Error(`MISSING_COLUMNS:${missingCols.join(', ')}`);
    }

    const colIdx = identifyColumns(headers);
    const updates = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;

        const rowNum = i + 2;
        const personnelCode = normalizeText(String(getCellValue(row, colIdx.personnelCode) || ''));
        if (!personnelCode) {
            errors.push({ row: rowNum, message: 'شماره پرسنلی خالی است' });
            continue;
        }

        const existing = await db('personnel_contacts').where({ personnel_code: personnelCode }).first();
        if (!existing) {
            errors.push({ row: rowNum, message: `پرسنل با کد ${personnelCode} یافت نشد` });
            continue;
        }

        const patch = normalizeRow(row, colIdx);
        const merged = { ...existing, ...patch, personnel_code: personnelCode };
        const validationError = validateRow(merged);

        if (validationError) {
            errors.push({ row: rowNum, message: validationError });
            continue;
        }

        updates.push({ id: existing.id, data: patch });
    }

    return { updates, errors };
};

const getTemplateBuffer = () => buildWorkbookBuffer('پرسنل', [{
    'شماره پرسنلی': 'P-001',
    'نام': 'علی',
    'نام خانوادگی': 'رضایی',
    'شماره شبا': 'IR123456789012345678901234',
    'نام صاحب حساب': 'علی رضایی',
    'موبایل': '09121234567',
    'شهر': 'تهران',
    'توضیحات': '',
}], {
    title: 'قالب ورود پرسنل',
    showMeta: false,
});

module.exports = {
    parseImport,
    parseBulkUpdate,
    getTemplateBuffer,
};
