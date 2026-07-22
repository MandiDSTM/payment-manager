const xlsx = require('xlsx');
const db = require('../config/db-config');
const normalizeText = require('../utils/normalizeText');
const { normalizeContact, validateContact } = require('../controllers/machineryContactsController');

const findColumnIndex = (headers, keywords, { exact = false } = {}) =>
    headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return keywords.some(k => {
            const key = k.toLowerCase();
            return exact ? lower === key : lower.includes(key);
        });
    });

const identifyColumns = (headers) => ({
    accountCode: findColumnIndex(headers, ['کد طرف حساب', 'کد بهین', 'account code']),
    firstName: findColumnIndex(headers, ['نام'], { exact: true }),
    lastName: findColumnIndex(headers, ['نام خانوادگی', 'خانوادگی', 'last name']),
    machineName: findColumnIndex(headers, ['نام ماشین', 'machine name', 'machine']),
    plate: findColumnIndex(headers, ['پلاک', 'plate']),
    sheba: findColumnIndex(headers, ['شبا', 'sheba', 'iban']),
    accountHolder: findColumnIndex(headers, ['نام صاحب حساب', 'صاحب حساب', 'account holder']),
    mobile: findColumnIndex(headers, ['موبایل', 'mobile']),
    city: findColumnIndex(headers, ['شهر', 'city']),
    description: findColumnIndex(headers, ['توضیحات', 'description']),
});

const getValue = (row, idx) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : null;

const resolveMachineId = async (machineName) => {
    const name = normalizeText(String(machineName || ''));
    if (!name) return null;

    const machine = await db('machines').where({ name }).first();
    return machine ? machine.id : null;
};

const parseExcelFile = async (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
        throw new Error('EMPTY_OR_NO_HEADER');
    }

    const headers = rows[0].map(h => String(h || '').trim());
    const colIdx = identifyColumns(headers);
    const dataRows = rows.slice(1);
    const records = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        const machineId = await resolveMachineId(getValue(row, colIdx.machineName));
        const raw = {
            account_code: getValue(row, colIdx.accountCode),
            first_name: getValue(row, colIdx.firstName),
            last_name: getValue(row, colIdx.lastName),
            machine_id: machineId,
            plate: getValue(row, colIdx.plate),
            sheba: getValue(row, colIdx.sheba),
            account_holder_name: getValue(row, colIdx.accountHolder),
            mobile: getValue(row, colIdx.mobile),
            city: getValue(row, colIdx.city),
            description: getValue(row, colIdx.description),
        };

        const contact = normalizeContact(raw);
        const validationError = await validateContact(contact);

        if (validationError) {
            errors.push({ row: rowNum, message: validationError });
            continue;
        }

        records.push(contact);
    }

    return { records, errors };
};

module.exports = { parseExcelFile };
