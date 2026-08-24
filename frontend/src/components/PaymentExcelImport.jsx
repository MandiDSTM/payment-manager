import React, { useState } from 'react';
import api from '../api';
import { Alert, Button, Card } from './ui';
import { formatAmount } from '../utils/format';
import SalaryImportDefaultsWizard, {
  applySalarySharedDefaults,
  countSalaryAssignableRows,
} from './SalaryImportDefaultsWizard';

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

function StatusCell({ item }) {
  const errors = item.errors || [];
  const warnings = item.warnings || [];
  const infos = item.infos || [];

  if (errors.length > 0) {
    return (
      <span className="text-xs" style={{ color: 'var(--danger)' }}>
        {errors.join(' · ')}
      </span>
    );
  }

  return (
    <div className="text-xs space-y-1">
      {warnings.map((w, i) => (
        <div key={`w-${i}`} style={{ color: '#b45309' }}>{w}</div>
      ))}
      {infos.map((info, i) => (
        <div key={`i-${i}`} className="ui-muted">{info}</div>
      ))}
      {warnings.length === 0 && (
        <span style={{ color: 'var(--success)' }}>آماده ثبت</span>
      )}
    </div>
  );
}

const COLUMNS = {
  general: [
    { header: 'سطر', render: (r) => r.row },
    { header: 'نام', render: (r) => r.display?.full_name || '—' },
    { header: 'کد پرسنلی', render: (r) => r.display?.personnel_code || '—' },
    { header: 'تاریخ', render: (r) => r.display?.date_shamsi || '—' },
    { header: 'مبلغ', render: (r) => formatAmount(r.display?.amount ?? r.data?.amount) },
    { header: 'سریال', render: (r) => r.display?.serial || '—' },
    { header: 'شبا', render: (r) => r.display?.sheba || '—' },
  ],
  commercial: [
    { header: 'سطر', render: (r) => r.row },
    { header: 'مخاطب', render: (r) => r.display?.contact || '—' },
    { header: 'مبلغ', render: (r) => formatAmount(r.display?.amount ?? r.data?.amount) },
    { header: 'دسته', render: (r) => r.display?.category || '—' },
    { header: 'مجری', render: (r) => r.display?.executor || '—' },
    { header: 'پروژه', render: (r) => r.display?.project || '—' },
    { header: 'سریال', render: (r) => r.display?.serial || '—' },
    { header: 'وضعیت', render: (r) => r.display?.status || '—' },
  ],
  machinery: [
    { header: 'سطر', render: (r) => r.row },
    { header: 'مخاطب', render: (r) => r.display?.contact || '—' },
    { header: 'مبلغ', render: (r) => formatAmount(r.display?.amount ?? r.data?.amount) },
    { header: 'دسته', render: (r) => r.display?.category || '—' },
    { header: 'ماه', render: (r) => r.display?.month || '—' },
    { header: 'مجری', render: (r) => r.display?.executor || '—' },
    { header: 'پروژه', render: (r) => r.display?.project || '—' },
    { header: 'سریال', render: (r) => r.display?.serial || '—' },
  ],
  salary: [
    { header: 'سطر', render: (r) => r.row },
    { header: 'پرسنل', render: (r) => r.display?.contact || '—' },
    { header: 'مبلغ', render: (r) => formatAmount(r.display?.amount ?? r.data?.amount) },
    { header: 'دسته', render: (r) => r.display?.category || '—' },
    { header: 'ماه', render: (r) => r.display?.month || '—' },
    { header: 'مجری', render: (r) => r.display?.executor || '—' },
    { header: 'پروژه', render: (r) => r.display?.project || '—' },
    { header: 'سریال', render: (r) => r.display?.serial || '—' },
  ],
};

export const PAYMENT_IMPORT_KINDS = {
  general: {
    title: 'ورود پرداخت‌های عمومی',
    previewTitle: 'پیش‌نمایش ورود پرداخت‌های عمومی',
    hint: 'ردیف‌ها را بررسی و انتخاب کنید. شبا نامعتبر با هشدار قابل ثبت است.',
    columnsHint: 'ستون‌ها: کد پرسنلی، نام، نام خانوادگی، تاریخ، مبلغ، سریال، شبا، بابت، توضیحات',
    previewPath: '/excel/preview/payments',
    confirmPath: '/excel/confirm/payments',
    templateType: 'payments',
    confirmNoun: 'پرداخت',
    onlyFullyValidHint: '(ردیف‌های با شبا نامعتبر رد می‌شوند)',
    columns: COLUMNS.general,
  },
  commercial: {
    title: 'ورود پرداخت‌های تجاری',
    previewTitle: 'پیش‌نمایش ورود پرداخت‌های تجاری',
    hint: 'مخاطب با کد طرف حساب یا نام تجاری، و سریال مجوز باید در سیستم موجود و قابل مصرف باشد.',
    columnsHint: 'ستون‌ها: کد طرف حساب / نام تجاری، مبلغ، دسته‌بندی، مجری، پروژه، سریال مجوز، وضعیت',
    previewPath: '/excel/preview/commercial-payments',
    confirmPath: '/excel/confirm/commercial-payments',
    templateType: 'commercial-payments',
    confirmNoun: 'پرداخت',
    onlyFullyValidHint: '(ردیف‌های دارای هشدار رد می‌شوند)',
    columns: COLUMNS.commercial,
  },
  machinery: {
    title: 'ورود پرداخت ماشین‌آلات',
    previewTitle: 'پیش‌نمایش ورود پرداخت ماشین‌آلات',
    hint: 'مخاطب با کد طرف حساب و سریال مجوز باید در سیستم موجود و قابل مصرف باشد.',
    columnsHint: 'ستون‌ها: کد طرف حساب، مبلغ، دسته‌بندی، ماه، مجری، پروژه، سریال مجوز، وضعیت',
    previewPath: '/excel/preview/machinery-payments',
    confirmPath: '/excel/confirm/machinery-payments',
    templateType: 'machinery-payments',
    confirmNoun: 'پرداخت',
    onlyFullyValidHint: '(ردیف‌های دارای هشدار رد می‌شوند)',
    columns: COLUMNS.machinery,
  },
  salary: {
    title: 'ورود پرداخت حقوق',
    previewTitle: 'پیش‌نمایش ورود پرداخت حقوق',
    hint: 'در اکسل فقط کد پرسنلی و مبلغ اجباری است. دسته‌بندی، ماه، مجری، پروژه و سریال بعد از آپلود پرسیده و روی همه ردیف‌ها اعمال می‌شود.',
    columnsHint: 'ستون‌های اجباری اکسل: کد پرسنلی و مبلغ. بقیه فیلدها مرحله‌به‌مرحله از شما پرسیده می‌شود.',
    previewPath: '/excel/preview/salary-payments',
    confirmPath: '/excel/confirm/salary-payments',
    templateType: 'salary-payments',
    confirmNoun: 'پرداخت',
    onlyFullyValidHint: '(ردیف‌های دارای هشدار رد می‌شوند)',
    columns: COLUMNS.salary,
  },
};

function PaymentImportModal({
  config,
  open,
  fileName,
  rows,
  confirming,
  confirmError,
  onlyFullyValid,
  onOnlyFullyValidChange,
  onClose,
  onConfirm,
  onToggle,
  onToggleAll,
  onSelectFullyValid,
}) {
  if (!open) return null;

  const selectableRows = rows.filter((r) => r.selectable);
  const fullyValidRows = rows.filter((r) => r.is_fully_valid);
  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelectableChecked = selectableRows.length > 0
    && selectableRows.every((r) => r.selected);
  const columns = config.columns;
  const colSpan = columns.length + 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="ui-card w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b space-y-1" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {config.previewTitle}
          </h3>
          <p className="text-sm ui-muted">
            {fileName || 'فایل اکسل'} — {config.hint}
          </p>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allSelectableChecked}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            انتخاب همهٔ قابل ثبت ({selectableRows.length})
          </label>
          <Button variant="ghost" onClick={onSelectFullyValid} disabled={fullyValidRows.length === 0}>
            انتخاب فقط کاملاً معتبر ({fullyValidRows.length})
          </Button>
          <span className="text-sm ui-muted">انتخاب‌شده: {selectedCount}</span>
        </div>

        {confirmError && (
          <div className="px-5 pt-3">
            <Alert variant="error">
              <p className="font-bold">{confirmError.message}</p>
              {confirmError.errors?.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-y-auto text-xs space-y-1">
                  {confirmError.errors.map((err, i) => (
                    <li key={i}>{err.row != null ? `سطر ${err.row}: ` : ''}{err.message}</li>
                  ))}
                </ul>
              )}
            </Alert>
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>انتخاب</th>
                  {columns.map((col) => (
                    <th key={col.header}>{col.header}</th>
                  ))}
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan}><div className="ui-empty">ردیفی یافت نشد</div></td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const hasError = item.errors?.length > 0;
                    const hasWarning = !hasError && item.warnings?.length > 0;
                    let rowBg;
                    if (hasError) rowBg = 'var(--danger-soft)';
                    else if (hasWarning) rowBg = 'color-mix(in srgb, #f59e0b 18%, transparent)';

                    return (
                      <tr key={item.row} style={rowBg ? { background: rowBg } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={!item.selectable}
                            checked={!!item.selected}
                            onChange={() => onToggle(item.row)}
                          />
                        </td>
                        {columns.map((col) => (
                          <td key={col.header} className={col.header === 'مبلغ' ? 'ui-amount' : ''}>
                            {col.render(item)}
                          </td>
                        ))}
                        <td><StatusCell item={item} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={onlyFullyValid}
              onChange={(e) => onOnlyFullyValidChange(e.target.checked)}
            />
            فقط گزینه‌های معتبر را ذخیره کن
            <span className="ui-muted">{config.onlyFullyValidHint}</span>
          </label>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={confirming}>انصراف</Button>
            <Button onClick={onConfirm} disabled={confirming || selectedCount === 0}>
              {confirming ? 'در حال ثبت...' : `ثبت ${selectedCount} ${config.confirmNoun}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {'general' | 'commercial' | 'machinery' | 'salary'} kind
 * @param {'card' | 'toolbar'} variant
 */
export default function PaymentExcelImport({ kind, onDone, variant = 'card' }) {
  const config = PAYMENT_IMPORT_KINDS[kind];
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [confirmError, setConfirmError] = useState(null);
  const [onlyFullyValid, setOnlyFullyValid] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [neededFields, setNeededFields] = useState([]);

  if (!config) return null;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setConfirmError(null);
    setOnlyFullyValid(false);
    setWizardOpen(false);
    setNeededFields([]);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post(config.previewPath, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const neededRaw = kind === 'salary' ? [...(res.data.sharedFieldsNeeded || [])] : [];
      const previewRows = (res.data.rows || []).map((row) => {
        const baseSelectable = row.selectable !== false && (!row.errors || row.errors.length === 0);
        const selectable = baseSelectable && neededRaw.length === 0;
        return { ...row, selected: selectable, selectable };
      });
      const assignableCount = countSalaryAssignableRows(previewRows);
      const needed = assignableCount === 0
        ? neededRaw.filter((field) => field !== 'serial')
        : neededRaw;
      setFileName(res.data.fileName || file.name);
      setRows(previewRows);
      setConfirmError(res.data.warnings?.length ? {
        message: res.data.warnings.join(' — '),
        errors: [],
      } : null);
      if (needed.length > 0) {
        setNeededFields(needed);
        setWizardOpen(true);
      } else {
        setModalOpen(true);
      }
    } catch (err) {
      setResult({
        message: err.response?.data?.message || err.message,
        errors: err.response?.data?.errors || [],
        failed: 1,
      });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const downloadTemplate = async () => {
    const res = await api.get(`/excel/template/${config.templateType}`, { responseType: 'blob' });
    downloadBlob(res.data, `template-${config.templateType}.xlsx`);
  };

  const applyConfirmErrors = (errors = []) => {
    const byRow = new Map();
    errors.forEach((err) => {
      if (err.row == null) return;
      if (!byRow.has(err.row)) byRow.set(err.row, []);
      byRow.get(err.row).push(err.message);
    });

    setRows((prev) => prev.map((item) => {
      const extra = byRow.get(item.row);
      if (!extra) return item;
      const merged = [...new Set([...(item.errors || []), ...extra])];
      return {
        ...item,
        errors: merged,
        selectable: false,
        selected: false,
        is_fully_valid: false,
      };
    }));
  };

  const handleConfirm = async () => {
    let selected = rows.filter((r) => r.selected);
    if (onlyFullyValid) {
      selected = selected.filter((r) => r.is_fully_valid);
    }
    if (selected.length === 0) {
      setConfirmError({
        message: onlyFullyValid
          ? 'هیچ ردیف کاملاً معتبری در انتخاب‌ها نیست'
          : 'هیچ ردیفی انتخاب نشده است',
        errors: [],
      });
      return;
    }

    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await api.post(config.confirmPath, {
        fileName,
        onlyFullyValid,
        records: selected.map((r) => ({
          row: r.row,
          data: r.data,
          warnings: r.warnings,
        })),
      });
      setModalOpen(false);
      setRows([]);
      setResult(res.data);
      onDone?.();
    } catch (err) {
      const payload = err.response?.data || {};
      setConfirmError({
        message: payload.message || err.message,
        errors: payload.errors || [],
      });
      if (payload.aborted && payload.errors?.length) {
        applyConfirmErrors(payload.errors);
      }
    } finally {
      setConfirming(false);
    }
  };

  const uploadLabel = (
    <label className={`ui-btn ui-btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
      {uploading ? 'در حال خواندن...' : 'آپلود اکسل'}
      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} />
    </label>
  );

  const resultAlert = result && (
    <Alert variant={result.failed > 0 ? 'error' : 'success'}>
      <p className="font-bold">{result.message}</p>
      {result.errors?.length > 0 && (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
          {result.errors.map((err, i) => (
            <li key={i}>{err.row != null ? `سطر ${err.row}: ` : ''}{err.message}</li>
          ))}
        </ul>
      )}
    </Alert>
  );

  const modal = (
    <>
      <SalaryImportDefaultsWizard
        open={wizardOpen}
        fileName={fileName}
        neededFields={neededFields}
        assignableCount={countSalaryAssignableRows(rows)}
        onCancel={() => {
          setWizardOpen(false);
          setRows([]);
          setNeededFields([]);
        }}
        onApply={(defaults) => {
          setRows((prev) => applySalarySharedDefaults(prev, defaults));
          setWizardOpen(false);
          setModalOpen(true);
        }}
      />
      <PaymentImportModal
        config={config}
        open={modalOpen}
        fileName={fileName}
        rows={rows}
        confirming={confirming}
        confirmError={confirmError}
        onlyFullyValid={onlyFullyValid}
        onOnlyFullyValidChange={setOnlyFullyValid}
        onClose={() => !confirming && setModalOpen(false)}
        onConfirm={handleConfirm}
        onSelectFullyValid={() => {
          setRows((prev) => prev.map((r) => ({
            ...r,
            selected: !!r.is_fully_valid,
          })));
          setOnlyFullyValid(true);
        }}
        onToggle={(rowNum) => {
          setRows((prev) => prev.map((r) => (
            r.row === rowNum && r.selectable ? { ...r, selected: !r.selected } : r
          )));
        }}
        onToggleAll={(checked) => {
          setRows((prev) => prev.map((r) => (
            r.selectable ? { ...r, selected: checked } : r
          )));
        }}
      />
    </>
  );

  if (variant === 'toolbar') {
    return (
      <>
        <Button variant="secondary" onClick={downloadTemplate}>دانلود قالب</Button>
        {uploadLabel}
        {modal}
        {resultAlert ? <div className="basis-full w-full mt-1">{resultAlert}</div> : null}
      </>
    );
  }

  return (
    <>
      <Card className="p-5 space-y-3">
        <h3 className="font-bold">{config.title}</h3>
        <p className="text-xs ui-muted">{config.hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadTemplate}>دانلود قالب</Button>
          {uploadLabel}
        </div>
        {resultAlert}
      </Card>
      {modal}
    </>
  );
}
