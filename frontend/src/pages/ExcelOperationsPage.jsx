import React, { useState, useEffect, useMemo } from 'react';
import api, { isAdmin, canCreatePayment } from '../api';
import { Alert, Button, Card, DataTable, PageHeader } from '../components/ui';
import PersonnelExcelImport from '../components/PersonnelExcelImport';
import PaymentExcelImport from '../components/PaymentExcelImport';

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

function ImportCard({ title, endpoint, templateType, onDone }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      onDone?.();
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
    const res = await api.get(`/excel/template/${templateType}`, { responseType: 'blob' });
    downloadBlob(res.data, `template-${templateType}.xlsx`);
  };

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-bold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={downloadTemplate}>دانلود قالب</Button>
        <label className={`ui-btn ui-btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
          {uploading ? 'در حال پردازش...' : 'آپلود فایل'}
          <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {result && (
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
      )}
    </Card>
  );
}

function ExportButton({ label, endpoint }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      downloadBlob(res.data, `${endpoint.split('/').pop()}-${Date.now()}.xlsx`);
    } catch (err) {
      alert('خطا در خروجی: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      {loading ? '...' : label}
    </Button>
  );
}

function ExcelOperationsPage() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/excel/logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const logColumns = useMemo(() => [
    { key: 'operation_type', header: 'عملیات' },
    { key: 'file_name', header: 'فایل', render: (log) => log.file_name || '—' },
    { key: 'imported', header: 'موفق', render: (log) => <span style={{ color: 'var(--success)' }}>{log.imported}</span> },
    { key: 'failed', header: 'خطا', render: (log) => <span style={{ color: 'var(--danger)' }}>{log.failed}</span> },
    { key: 'created_at', header: 'زمان', render: (log) => <span className="text-xs">{log.created_at}</span> },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ورود و خروج Excel"
        description="ورود پرداخت‌ها و پرسنل با پیش‌نمایش، انتخاب ردیف و اعتبارسنجی ستون‌ها انجام می‌شود."
      />

      {canCreatePayment() && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>ورود پرداخت‌ها</h3>
          <p className="text-sm ui-muted">پس از آپلود، پیش‌نمایش باز می‌شود و می‌توانید ردیف‌ها را انتخاب کنید.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <PaymentExcelImport kind="general" onDone={fetchLogs} />
            <PaymentExcelImport kind="commercial" onDone={fetchLogs} />
            <PaymentExcelImport kind="machinery" onDone={fetchLogs} />
            <PaymentExcelImport kind="salary" onDone={fetchLogs} />
          </div>
        </section>
      )}

      {isAdmin() && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>ورود مخاطبین</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PersonnelExcelImport onDone={fetchLogs} />
            <ImportCard title="ویرایش گروهی پرسنل" endpoint="/excel/import/personnel-bulk-update"
              templateType="personnel" onDone={fetchLogs} />
            <ImportCard title="ورود ماشین‌آلات (مخاطبین)" endpoint="/excel/import/machinery-contacts"
              templateType="machinery-contacts" onDone={fetchLogs} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>خروجی گزارش‌ها</h3>
        <Card className="p-5 flex flex-wrap gap-3">
          <ExportButton label="خروجی پرسنل" endpoint="/excel/export/personnel" />
          <ExportButton label="لیست پرداخت‌ها" endpoint="/excel/export/payments" />
          <ExportButton label="گزارش بر اساس پروژه" endpoint="/excel/export/by-project" />
          <ExportButton label="گزارش بر اساس ماه" endpoint="/excel/export/by-month" />
          <ExportButton label="گزارش بر اساس مجری" endpoint="/excel/export/by-executor" />
          <ExportButton label="گزارش بر اساس سریال" endpoint="/excel/export/by-serial" />
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>لاگ رویدادها</h3>
        <DataTable columns={logColumns} rows={logs} emptyText="لاگی ثبت نشده" />
      </section>
    </div>
  );
}

export default ExcelOperationsPage;
