import React, { useState, useEffect } from 'react';
import api from '../api';
import { Alert, Button, Card, PageHeader } from '../components/ui';

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

function BackupPage() {
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  const fetchInfo = async () => {
    setLoadingInfo(true);
    try {
      const res = await api.get('/backup/info');
      setInfo(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/backup/download', { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(res.data, `payment-manager-backup-${date}.sqlite`);
    } catch (err) {
      alert('خطا در دانلود: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = null;

    const confirmed = window.confirm(
      'با بازیابی، تمام داده‌های فعلی با محتوای فایل پشتیبان جایگزین می‌شود.\n\nادامه می‌دهید؟',
    );
    if (!confirmed) return;

    setRestoring(true);
    setRestoreResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await api.post('/backup/restore', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreResult({ variant: 'success', message: res.data.message });
      await fetchInfo();
    } catch (err) {
      setRestoreResult({
        variant: 'error',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="پشتیبان‌گیری دیتابیس"
        description="دانلود کل دیتابیس یا بازیابی از فایل پشتیبان (.sqlite)"
      />

      <Card className="p-5 space-y-4">
        <h3 className="font-bold" style={{ color: 'var(--text)' }}>وضعیت فعلی</h3>
        {loadingInfo ? (
          <p className="ui-muted text-sm">در حال بارگذاری...</p>
        ) : info ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="ui-muted">حجم فایل</p>
              <p className="font-bold">{info.fileSizeFormatted}</p>
            </div>
            <div>
              <p className="ui-muted">آخرین تغییر</p>
              <p className="font-bold">{formatDate(info.lastModified)}</p>
            </div>
            <div>
              <p className="ui-muted">تعداد جداول</p>
              <p className="font-bold">{info.tableCount}</p>
            </div>
            <div>
              <p className="ui-muted">کل رکوردها</p>
              <p className="font-bold">{info.totalRecords?.toLocaleString('fa-IR')}</p>
            </div>
          </div>
        ) : (
          <p className="ui-muted text-sm">اطلاعات دیتابیس در دسترس نیست</p>
        )}
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-bold" style={{ color: 'var(--text)' }}>دانلود پشتیبان</h3>
          <p className="text-sm ui-muted">
            یک کپی کامل از فایل دیتابیس SQLite دانلود می‌شود. این فایل شامل تمام داده‌های برنامه است.
          </p>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? 'در حال آماده‌سازی...' : 'دانلود دیتابیس'}
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-bold" style={{ color: 'var(--text)' }}>بازیابی از فایل</h3>
          <p className="text-sm ui-muted">
            فایل پشتیبان (.sqlite) را انتخاب کنید تا جایگزین دیتابیس فعلی شود.
            قبل از جایگزینی، یک نسخه پشتیبان از دیتابیس فعلی ذخیره می‌شود.
          </p>
          <label className={`ui-btn ui-btn-secondary cursor-pointer inline-block ${restoring ? 'opacity-50' : ''}`}>
            {restoring ? 'در حال بازیابی...' : 'انتخاب فایل و بازیابی'}
            <input
              type="file"
              className="hidden"
              accept=".sqlite,.db"
              onChange={handleRestore}
              disabled={restoring}
            />
          </label>
        </Card>
      </section>

      {restoreResult && (
        <Alert variant={restoreResult.variant}>
          <p>{restoreResult.message}</p>
          {restoreResult.variant === 'success' && (
            <p className="text-sm mt-2 ui-muted">
              برای اعمال کامل تغییرات، صفحه را یک‌بار رفرش کنید.
            </p>
          )}
        </Alert>
      )}

      {info?.tableCounts && (
        <Card className="p-5 space-y-3">
          <h3 className="font-bold" style={{ color: 'var(--text)' }}>جزئیات جداول</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {Object.entries(info.tableCounts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([table, count]) => (
                <div
                  key={table}
                  className="rounded-lg px-3 py-2 border"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                >
                  <p className="ui-muted text-xs truncate">{table}</p>
                  <p className="font-bold">{Number(count).toLocaleString('fa-IR')}</p>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default BackupPage;
