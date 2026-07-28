import * as XLSX from 'xlsx';

export const formatExportDate = (date = new Date()) =>
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

export const buildFormattedWorkbook = (sheetName, rows, options = {}) => {
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

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
};

export const downloadFormattedExcel = (sheetName, rows, filename, options = {}) => {
  const workbook = buildFormattedWorkbook(sheetName, rows, options);
  XLSX.writeFile(workbook, filename);
};
