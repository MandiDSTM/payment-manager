import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';

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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadTemplate}
          className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg">
          📥 دانلود قالب
        </button>
        <label className={`text-sm px-3 py-2 rounded-lg cursor-pointer text-white ${uploading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {uploading ? 'در حال پردازش...' : '📤 آپلود فایل'}
          <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {result && (
        <div className={`text-sm rounded-xl p-3 ${result.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="font-bold">{result.message}</p>
          {result.errors?.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-red-600 text-xs space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>سطر {err.row}: {err.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
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
    <button type="button" onClick={handleExport} disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold">
      {loading ? '...' : `📥 ${label}`}
    </button>
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">ورود و خروج Excel</h2>
        <p className="text-sm text-slate-500">اعتبارسنجی ستون‌ها، شبا و شماره پرسنلی هنگام ورود انجام می‌شود.</p>
      </div>

      {isAdmin() && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700">ورود داده‌ها</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImportCard title="ورود پرسنل" endpoint="/excel/import/personnel"
              templateType="personnel" onDone={fetchLogs} />
            <ImportCard title="ویرایش گروهی پرسنل" endpoint="/excel/import/personnel-bulk-update"
              templateType="personnel" onDone={fetchLogs} />
            <ImportCard title="ورود ماشین‌آلات (مخاطبین)" endpoint="/excel/import/machinery-contacts"
              templateType="machinery-contacts" onDone={fetchLogs} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-700">خروجی گزارش‌ها</h3>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-3">
          <ExportButton label="لیست پرداخت‌ها" endpoint="/excel/export/payments" />
          <ExportButton label="گزارش بر اساس پروژه" endpoint="/excel/export/by-project" />
          <ExportButton label="گزارش بر اساس ماه" endpoint="/excel/export/by-month" />
          <ExportButton label="گزارش بر اساس مجری" endpoint="/excel/export/by-executor" />
          <ExportButton label="گزارش بر اساس سریال" endpoint="/excel/export/by-serial" />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-700">لاگ رویدادها</h3>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-right">عملیات</th>
                <th className="p-3 text-right">فایل</th>
                <th className="p-3 text-right">موفق</th>
                <th className="p-3 text-right">خطا</th>
                <th className="p-3 text-right">زمان</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">لاگی ثبت نشده</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">{log.operation_type}</td>
                    <td className="p-3">{log.file_name || '—'}</td>
                    <td className="p-3 text-green-600">{log.imported}</td>
                    <td className="p-3 text-red-600">{log.failed}</td>
                    <td className="p-3 text-xs">{log.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ExcelOperationsPage;
