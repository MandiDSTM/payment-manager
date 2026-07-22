import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api, { canCreatePayment, isAdmin } from '../api';
import SmartForm from '../components/SmartForm';
import PaymentTable from '../components/PaymentTable';

function PaymentsPage() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLocked, setIsLocked] = useState(true);

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = allData.filter((item) => {
      const fullName = `${item.first_name || ''} ${item.last_name || ''}`;
      const serial = String(item.serial || '');
      const sheba = String(item.sheba || '');
      return (
        fullName.includes(searchTerm) ||
        serial.includes(searchTerm) ||
        sheba.includes(searchTerm)
      );
    });
    setFilteredData(filtered);
  }, [searchTerm, allData]);

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

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'][0] = { RTL: true };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, `Report_${Date.now()}.xlsx`);
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-slate-700">پرداخت‌ها</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAdmin() && selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkComplete}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg animate-pulse"
              >
                ✅ تایید پرداخت ({selectedIds.length} مورد)
              </button>
            )}
            {isAdmin() && (
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                  isLocked
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-600 text-white border-green-700'
                }`}
              >
                {isLocked ? '🔒 دیتابیس قفل است' : '🔓 ویرایش آزاد'}
              </button>
            )}
            <button
              type="button"
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-sm"
            >
              📥 خروجی اکسل
            </button>
            {canCreatePayment() && (
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-pointer transition-all shadow-sm ${
                  uploading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <span>{uploading ? 'در حال پردازش...' : '📤 آپلود فایل'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
            {isAdmin() && (
              <button
                type="button"
                onClick={clearAllData}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                🗑️ پاکسازی
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          placeholder="جستجو در بین نام‌ها، سریال‌ها یا شماره شبا..."
          className="w-full border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {canCreatePayment() && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full" />
            ثبت رکورد جدید
          </h3>
          <SmartForm onSave={saveManualRecord} />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <PaymentTable
          data={filteredData}
          isLocked={isLocked || !isAdmin()}
          fetchData={fetchData}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          canSelect={isAdmin()}
        />
      </div>
    </div>
  );
}

export default PaymentsPage;
