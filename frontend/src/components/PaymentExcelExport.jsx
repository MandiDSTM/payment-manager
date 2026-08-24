import React, { useState } from 'react';
import api from '../api';
import { Button } from './ui';

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export default function PaymentExcelExport({
  endpoint,
  filenamePrefix,
  label = 'خروجی اکسل',
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      downloadBlob(res.data, `${filenamePrefix}-${Date.now()}.xlsx`);
    } catch (err) {
      let message = err.message || 'خطا در خروجی اکسل';
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (parsed.message) message = parsed.message;
        } catch { /* ignore non-JSON blob */ }
      } else if (data?.message) {
        message = data.message;
      }
      alert(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleExport} disabled={exporting}>
      {exporting ? 'در حال آماده‌سازی...' : label}
    </Button>
  );
}
