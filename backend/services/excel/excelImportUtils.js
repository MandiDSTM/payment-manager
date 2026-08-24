const normalizeText = require('../../utils/normalizeText');
const { findColumnIndex, getCellValue } = require('../../utils/excelHelpers');

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const lookupKey = (value) => normalizeText(String(value ?? ''))
    .replace(/[\u200C\u200B\u00A0]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const toEnglishDigits = (value) => String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));

const cellText = (row, idx) => {
    const raw = getCellValue(row, idx);
    if (raw === null || raw === undefined) return '';
    return normalizeText(toEnglishDigits(raw)).trim();
};

const isEmptyRow = (row) => !row || row.every((c) => c === undefined || c === null || String(c).trim() === '');

const parseAmount = (raw) => {
    const text = toEnglishDigits(raw).replace(/[,،\s]/g, '').trim();
    if (!text) return { value: 0, empty: true, invalid: false };
    const num = Number(text);
    if (!Number.isFinite(num)) return { value: NaN, empty: false, invalid: true };
    return { value: Math.round(num), empty: false, invalid: false };
};

const identifyColumns = (headers, columnMap) => {
    const colIdx = {};
    Object.entries(columnMap).forEach(([key, keywords]) => {
        colIdx[key] = findColumnIndex(headers, keywords, keywords.exact ? { exact: true } : {});
    });
    return colIdx;
};

const indexRecords = (rows, fields) => {
    const map = new Map();
    rows.forEach((row) => {
        fields.forEach((field) => {
            const k = lookupKey(row[field]);
            if (!k) return;
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(row);
        });
    });
    return map;
};

const pickOne = (map, value, label) => {
    const k = lookupKey(value);
    if (!k) return { error: `${label} خالی است` };
    const matches = map.get(k) || [];
    if (matches.length === 0) return { error: `${label} «${value}» یافت نشد` };
    if (matches.length > 1) {
        return { error: `چند مورد برای ${label} «${value}» یافت شد؛ مقدار یکتا وارد کنید` };
    }
    return { record: matches[0] };
};

const markDuplicateFieldErrors = (rows, field, label, getValue) => {
    const seen = new Map();
    rows.forEach((item) => {
        const value = getValue ? getValue(item) : item.data?.[field];
        if (!value) return;
        if (!seen.has(value)) seen.set(value, [item]);
        else seen.get(value).push(item);
    });

    seen.forEach((group, value) => {
        if (group.length < 2) return;
        group.forEach((item) => {
            const message = `${label} ${value} در فایل تکراری است`;
            if (!item.errors.includes(message)) item.errors.push(message);
        });
    });
};

const uniqueErrorList = (errors) => {
    const unique = [];
    const seen = new Set();
    errors.forEach((err) => {
        const key = `${err.row}|${err.message}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(err);
    });
    return unique;
};

const finalizePreviewRows = (rows) => rows.map((item) => {
    const hasHardError = (item.errors || []).length > 0;
    return {
        ...item,
        selectable: !hasHardError,
        is_fully_valid: !hasHardError && (item.warnings || []).length === 0,
    };
});

module.exports = {
    lookupKey,
    toEnglishDigits,
    cellText,
    isEmptyRow,
    parseAmount,
    identifyColumns,
    indexRecords,
    pickOne,
    markDuplicateFieldErrors,
    uniqueErrorList,
    finalizePreviewRows,
};
