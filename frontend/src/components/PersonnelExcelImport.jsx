import React, { useState } from 'react';
import api from '../api';
import { Alert, Button, Card } from './ui';

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

function PersonnelImportModal({
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="ui-card w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b space-y-1" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            پیش‌نمایش ورود پرسنل
          </h3>
          <p className="text-sm ui-muted">
            {fileName || 'فایل اکسل'} — کد پرسنلی خالی خودکار ساخته می‌شود. شبا نامعتبر با فلگ «نیاز به اصلاح» قابل ثبت است.
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
                    <li key={i}>سطر {err.row}: {err.message}</li>
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
                  <th>سطر</th>
                  <th>نام</th>
                  <th>کد ملی</th>
                  <th>کد پرسنلی</th>
                  <th>شبا</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}><div className="ui-empty">ردیفی یافت نشد</div></td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const hasError = item.errors?.length > 0;
                    const hasWarning = !hasError && (item.warnings?.length > 0 || item.sheba_needs_review);
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
                        <td>{item.row}</td>
                        <td>{item.full_name || `${item.data?.first_name || ''} ${item.data?.last_name || ''}`}</td>
                        <td className="font-mono text-xs">{item.data?.national_id}</td>
                        <td className="font-mono text-xs">
                          {item.data?.personnel_code}
                          {item.code_generated ? <span className="ui-muted"> (خودکار)</span> : null}
                        </td>
                        <td className="font-mono text-xs">
                          {item.data?.sheba || '—'}
                          {item.sheba_needs_review ? (
                            <div className="text-xs" style={{ color: '#b45309' }}>نیاز به اصلاح شبا</div>
                          ) : null}
                        </td>
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
            <span className="ui-muted">(ردیف‌های با شبا نامعتبر رد می‌شوند)</span>
          </label>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={confirming}>انصراف</Button>
            <Button onClick={onConfirm} disabled={confirming || selectedCount === 0}>
              {confirming ? 'در حال ثبت...' : `ثبت ${selectedCount} نفر`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {'card' | 'toolbar'} variant
 */
export default function PersonnelExcelImport({ onDone, variant = 'card' }) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [confirmError, setConfirmError] = useState(null);
  const [onlyFullyValid, setOnlyFullyValid] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setConfirmError(null);
    setOnlyFullyValid(false);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/excel/preview/personnel', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const previewRows = (res.data.rows || []).map((row) => ({
        ...row,
        selected: row.selectable !== false && (!row.errors || row.errors.length === 0),
        selectable: row.selectable !== false && (!row.errors || row.errors.length === 0),
      }));
      setFileName(res.data.fileName || file.name);
      setRows(previewRows);
      if (res.data.warnings?.length) {
        setConfirmError({
          message: res.data.warnings.join(' — '),
          errors: [],
        });
      } else {
        setConfirmError(null);
      }
      setModalOpen(true);
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
    const res = await api.get('/excel/template/personnel', { responseType: 'blob' });
    downloadBlob(res.data, 'template-personnel.xlsx');
  };

  const applyConfirmErrors = (errors = []) => {
    const byRow = new Map();
    errors.forEach((err) => {
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
      const res = await api.post('/excel/confirm/personnel', {
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
            <li key={i}>سطر {err.row}: {err.message}</li>
          ))}
        </ul>
      )}
    </Alert>
  );

  const modal = (
    <PersonnelImportModal
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
        <h3 className="font-bold">ورود پرسنل</h3>
        <p className="text-xs ui-muted">
          کد پرسنلی خالی خودکار ساخته می‌شود. شبا نامعتبر با فلگ قابل ثبت است.
        </p>
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
