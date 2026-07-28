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

const formatExportDate = (date = new Date()) =>
    new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);

const displayLength = (value) => {
    const text = String(value ?? '');
    let length = 0;
    for (const char of text) {
        length += /[^\x00-\xff]/.test(char) ? 1.6 : 1;
    }
    return length;
};

const calcColumnWidth = (values, { min = 10, max = 48 } = {}) => {
    const maxLen = values.reduce((maxValue, value) => {
        const len = displayLength(value);
        return len > maxValue ? len : maxValue;
    }, 0);
    return Math.min(max, Math.max(min, Math.ceil(maxLen) + 2));
};

const buildWorkbookBuffer = (sheetName, rows, options = {}) => {
    const title = options.title || sheetName;
    const exportDate = options.exportDate ?? formatExportDate();
    const showMeta = options.showMeta !== false;
    const columns = options.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
    const colCount = Math.max(columns.length, 1);

    const metaRows = showMeta
        ? [
            [title],
            [`تاریخ خروجی: ${exportDate}`],
            [`تعداد رکورد: ${rows.length}`],
            [],
        ]
        : [];

    const tableHeaderRow = columns.length > 0 ? [columns] : [];
    const dataRows = rows.map((row) => columns.map((col) => row[col] ?? ''));
    const aoa = [...metaRows, ...tableHeaderRow, ...dataRows];

    const worksheet = xlsx.utils.aoa_to_sheet(aoa);

    if (showMeta && columns.length > 0) {
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
        ];
        worksheet['!rows'] = [
            { hpt: 28 },
            { hpt: 20 },
            { hpt: 20 },
            { hpt: 10 },
        ];
    }

    if (columns.length > 0) {
        worksheet['!cols'] = columns.map((col, colIdx) => {
            const values = [col, ...rows.map((row) => row[col])];
            if (showMeta && colIdx === 0) {
                values.unshift(title, `تاریخ خروجی: ${exportDate}`, `تعداد رکورد: ${rows.length}`);
            }
            return { wch: calcColumnWidth(values) };
        });
    }

    worksheet['!views'] = [{ RTL: true, rightToLeft: true }];

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
    formatExportDate,
    calcColumnWidth,
    buildWorkbookBuffer,
    sendExcelBuffer,
};
