import React, { useState, useEffect, useRef } from 'react';
import api, { canCreatePayment, isAdmin } from '../api';
import SmartForm from '../components/SmartForm';
import PaymentTable from '../components/PaymentTable';
import { downloadFormattedExcel, formatExportDate } from '../utils/excelExport';
import { Button, Card, PageHeader, SearchInput } from '../components/ui';

function PaymentsPage() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const searchRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/debug-all');
      if (res.data?.status === 'Success') {
        const data = res.data.data || [];
        setAllData(data);
        setFilteredData(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const filtered = allData.filter((item) => {
      const fullName = `${item.first_name || ''} ${item.last_name || ''}`;
      const serial = String(item.serial || '');
      const sheba = String(item.sheba || '');
      return fullName.includes(searchTerm) || serial.includes(searchTerm) || sheba.includes(searchTerm);
    });
    setFilteredData(filtered);
  }, [searchTerm, allData]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearAllData = async () => {
    if (!window.confirm('آیا از حذف تمامی اطلاعات دیتابیس اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
    try {
      const res = await api.delete('/clear-all-data');
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert('خطا در پاکسازی: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return alert('لطفاً ابتدا ردیف‌های مورد نظر را انتخاب کنید.');
    try {
      await api.post('/payments/bulk-status', { ids: selectedIds, status: 'تکمیل شده' });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('خطا در عملیات گروهی: ' + (err.response?.data?.message || err.message));
    }
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert('دیتایی برای خروجی گرفتن وجود ندارد.');
      return;
    }
    const excelData = filteredData.map((item) => ({
      'کد پرسنلی': item.personnel_code,
      نام: item.first_name,
      'نام خانوادگی': item.last_name,
      تاریخ: item.date_shamsi,
      'مبلغ (ریال)': item.amount,
      سریال: item.serial,
      'شماره شبا': item.sheba,
      بابت: item.subject,
      وضعیت: item.status,
    }));
    const exportStamp = formatExportDate().replace(/[/:]/g, '-').replace(/\s+/g, '_');
    downloadFormattedExcel('پرداخت‌ها', excelData, `Report_${exportStamp}.xlsx`, {
      title: 'گزارش پرداخت‌های عمومی',
    });
  };

  const saveManualRecord = async (data) => {
    try {
      const response = await api.post('/payments', data);
      if (response.status === 200 || response.status === 201) {
        alert('ذخیره شد!');
        fetchData();
      }
    } catch (err) {
      alert('خطا در ارسال: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert('خطا در آپلود: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="پرداخت‌های عمومی"
        description="جستجو با Ctrl+K · ویرایش جدول با فلش‌ها و Enter"
        actions={(
          <>
            {isAdmin() && selectedIds.length > 0 && (
              <Button onClick={handleBulkComplete}>تایید پرداخت ({selectedIds.length})</Button>
            )}
            {isAdmin() && (
              <Button variant={isLocked ? 'secondary' : 'primary'} onClick={() => setIsLocked(!isLocked)}>
                {isLocked ? 'قفل است' : 'ویرایش آزاد'}
              </Button>
            )}
            <Button variant="secondary" onClick={exportToExcel}>خروجی اکسل</Button>
            {canCreatePayment() && (
              <label className={`ui-btn ui-btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? 'در حال پردازش...' : 'آپلود فایل'}
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
            {isAdmin() && (
              <Button variant="danger" onClick={clearAllData}>پاکسازی</Button>
            )}
          </>
        )}
      >
        <SearchInput
          inputRef={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در نام‌ها، سریال‌ها یا شماره شبا..."
        />
      </PageHeader>

      {canCreatePayment() && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>ثبت رکورد جدید</h3>
          <SmartForm onSave={saveManualRecord} />
        </Card>
      )}

      <PaymentTable
        data={filteredData}
        isLocked={isLocked || !isAdmin()}
        fetchData={fetchData}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        canSelect={isAdmin()}
      />
    </div>
  );
}

export default PaymentsPage;
