const xlsx = require('xlsx');
const normalizeText = require('../utils/normalizeText');

const findColumnIndex = (headers, keywords) =>
    headers.findIndex(h =>
        keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
    );

const identifyColumns = (headers) => ({
    personnel: findColumnIndex(headers, ['پرسنلی', 'کد']),
    firstName: findColumnIndex(headers, ['نام', 'first name']),
    lastName: findColumnIndex(headers, ['خانوادگی', 'last name']),
    fullName: findColumnIndex(headers, ['نام و نام خانوادگی', 'full name']),
    date: findColumnIndex(headers, ['تاریخ', 'date']),
    amount: findColumnIndex(headers, ['مبلغ', 'amount', 'هزینه']),
    serial: findColumnIndex(headers, ['سریال', 'serial']),
    sheba: findColumnIndex(headers, ['شبا', 'sheba', 'iban']),
    subject: findColumnIndex(headers, ['بابت', 'موضوع', 'subject']),
    description: findColumnIndex(headers, ['توضیحات', 'description', 'شرح']),
});

const parseName = (row, colIdx) => {
    if (colIdx.fullName !== -1 && row[colIdx.fullName]) {
        const parts = String(row[colIdx.fullName]).trim().split(/\s+/);
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }

    return {
        firstName: colIdx.firstName !== -1 ? row[colIdx.firstName] : '',
        lastName: colIdx.lastName !== -1 ? row[colIdx.lastName] : '',
    };
};

const getValue = (row, idx) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : null;

const parseRow = (row, colIdx, index) => {
    try {
        const { firstName, lastName } = parseName(row, colIdx);

        const record = {
            personnel_code: normalizeText(String(getValue(row, colIdx.personnel) || '')),
            first_name: normalizeText(String(firstName || '')),
            last_name: normalizeText(String(lastName || '')),
            date_shamsi: normalizeText(String(getValue(row, colIdx.date) || '')),
            serial: normalizeText(String(getValue(row, colIdx.serial) || '')),
            sheba: normalizeText(String(getValue(row, colIdx.sheba) || '')),
            amount: getValue(row, colIdx.amount) ? Number(getValue(row, colIdx.amount)) : 0,
            subject: normalizeText(String(getValue(row, colIdx.subject) || '')),
            description: normalizeText(String(getValue(row, colIdx.description) || '')),
            status: 'در انتظار پرداخت',
            app_log: 'Smart Header Mapping',
        };

        if (!record.first_name && !record.personnel_code) return null;

        return record;
    } catch (innerError) {
        console.error(`>>> [ERROR] Parsing error at row ${index + 2}:`, innerError.message);
        return null;
    }
};

const parseExcelFile = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
        throw new Error('EMPTY_OR_NO_HEADER');
    }

    const headers = rows[0].map(h => String(h || '').trim());
    const colIdx = identifyColumns(headers);
    const dataRows = rows.slice(1);

    console.log(`>>> [LOG] Analyzing ${dataRows.length} rows with identified columns`);

    return dataRows
        .map((row, index) => parseRow(row, colIdx, index))
        .filter(r => r !== null);
};

module.exports = { parseExcelFile };
