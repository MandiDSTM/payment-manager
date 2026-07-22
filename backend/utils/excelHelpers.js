const xlsx = require('xlsx');

const findColumnIndex = (headers, keywords, { exact = false } = {}) =>
    headers.findIndex((h) => {
        const lower = String(h || '').toLowerCase().trim();
        return keywords.some((k) => {
            const key = k.toLowerCase();
            return exact ? lower === key : lower.includes(key);
        });
    });

const getCellValue = (row, idx) => (idx !== -1 && row[idx] !== undefined && row[idx] !== null)
    ? row[idx]
    : null;

const readSheetRows = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
        throw new Error('EMPTY_OR_NO_HEADER');
    }

    const headers = rows[0].map((h) => String(h || '').trim());
    return { headers, dataRows: rows.slice(1) };
};

const validateRequiredColumns = (headers, columnMap) => {
    const missing = [];
    Object.entries(columnMap).forEach(([label, keywords]) => {
        if (findColumnIndex(headers, keywords) === -1) {
            missing.push(label);
        }
    });
    return missing;
};

const buildWorkbookBuffer = (sheetName, rows) => {
    const worksheet = xlsx.utils.json_to_sheet(rows);
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'][0] = { RTL: true };
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const sendExcelBuffer = (res, buffer, filename) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
};

module.exports = {
    findColumnIndex,
    getCellValue,
    readSheetRows,
    validateRequiredColumns,
    buildWorkbookBuffer,
    sendExcelBuffer,
};
