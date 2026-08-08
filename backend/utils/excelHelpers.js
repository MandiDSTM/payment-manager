const xlsx = require('xlsx');

/** Normalize Persian/Arabic text for header matching */
const normalizeHeader = (value) => String(value ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0\u200C\u200B]/g, '') // bidi + NBSP + ZWNJ + ZWSP
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const compactHeader = (value) => normalizeHeader(value).replace(/\s+/g, '');

const findColumnIndex = (headers, keywords, { exact = false } = {}) =>
    headers.findIndex((h) => {
        const normalized = normalizeHeader(h);
        const compact = compactHeader(h);
        if (!normalized && !compact) return false;
        return keywords.some((k) => {
            const keyNorm = normalizeHeader(k);
            const keyCompact = compactHeader(k);
            if (exact) {
                return normalized === keyNorm || compact === keyCompact;
            }
            return normalized.includes(keyNorm) || compact.includes(keyCompact);
        });
    });

const getCellValue = (row, idx) => (idx !== -1 && row[idx] !== undefined && row[idx] !== null)
    ? row[idx]
    : null;

const scoreHeaderRow = (headers, headerMatchers) => {
    if (!headerMatchers?.length) return 0;
    return headerMatchers.reduce((score, keywords) => (
        findColumnIndex(headers, keywords) !== -1 ? score + 1 : score
    ), 0);
};

const readSheetRows = (filePath, { headerMatchers = null, minHeaderScore = 1 } = {}) => {
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    if (rows.length < 2) {
        throw new Error('EMPTY_OR_NO_HEADER');
    }

    let headerRowIndex = 0;
    let bestScore = -1;

    if (headerMatchers && headerMatchers.length > 0) {
        const searchLimit = Math.min(rows.length, 20);
        for (let i = 0; i < searchLimit; i++) {
            const candidate = (rows[i] || []).map((h) => normalizeHeader(h) ? String(h).trim() : '');
            const score = scoreHeaderRow(candidate, headerMatchers);
            if (score > bestScore) {
                bestScore = score;
                headerRowIndex = i;
            }
            // Perfect match — stop early
            if (score === headerMatchers.length) break;
        }

        if (bestScore < minHeaderScore) {
            throw new Error('EMPTY_OR_NO_HEADER');
        }
    }

    if (headerRowIndex >= rows.length - 1) {
        throw new Error('EMPTY_OR_NO_HEADER');
    }

    const headers = (rows[headerRowIndex] || []).map((h) => String(h ?? '').trim());
    return {
        headers,
        dataRows: rows.slice(headerRowIndex + 1),
        headerRowIndex,
        headerRowNumber: headerRowIndex + 1,
        headerScore: bestScore,
    };
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
    const textColumns = new Set(options.textColumns || []);
    const colCount = Math.max(columns.length, 1);
    const headerRowIndex = showMeta ? 4 : 0;

    const metaRows = showMeta
        ? [
            [title],
            [`تاریخ خروجی: ${exportDate}`],
            [`تعداد رکورد: ${rows.length}`],
            [],
        ]
        : [];

    const tableHeaderRow = columns.length > 0 ? [columns] : [];
    const dataRows = rows.map((row) => columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (textColumns.has(col)) return String(value);
        return value;
    }));
    const aoa = [...metaRows, ...tableHeaderRow, ...dataRows];

    const worksheet = xlsx.utils.aoa_to_sheet(aoa);

    // Force text format for sensitive ID / sheba columns (avoid scientific notation)
    if (columns.length > 0 && rows.length > 0) {
        columns.forEach((col, colIdx) => {
            if (!textColumns.has(col)) return;
            for (let r = headerRowIndex + 1; r < aoa.length; r += 1) {
                const addr = xlsx.utils.encode_cell({ r, c: colIdx });
                const cell = worksheet[addr];
                if (!cell) continue;
                cell.t = 's';
                cell.v = String(cell.v ?? '');
                cell.z = '@';
            }
        });
    }

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
            { hpt: 22 },
        ];
    } else if (columns.length > 0) {
        worksheet['!rows'] = [{ hpt: 22 }];
    }

    if (columns.length > 0) {
        worksheet['!cols'] = columns.map((col, colIdx) => {
            const values = [col, ...rows.map((row) => row[col])];
            if (showMeta && colIdx === 0) {
                values.unshift(title, `تاریخ خروجی: ${exportDate}`, `تعداد رکورد: ${rows.length}`);
            }
            return { wch: calcColumnWidth(values) };
        });
        worksheet['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1, topLeftCell: xlsx.utils.encode_cell({ r: headerRowIndex + 1, c: 0 }), activePane: 'bottomLeft', state: 'frozen' };
    }

    worksheet['!views'] = [{
        RTL: true,
        rightToLeft: true,
        state: 'frozen',
        ySplit: headerRowIndex + 1,
        topLeftCell: xlsx.utils.encode_cell({ r: headerRowIndex + 1, c: 0 }),
        activePane: 'bottomLeft',
    }];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
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
