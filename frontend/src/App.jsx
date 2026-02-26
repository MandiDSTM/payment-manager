import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import SmartForm from './components/SmartForm';
import PaymentTable from './components/PaymentTable';

function App() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLocked, setIsLocked] = useState(true); // استیت قفل دیتابیس


  const clearAllData = async () => {
    if (window.confirm("آیا از حذف تمامی اطلاعات دیتابیس اطمینان دارید؟ این عمل غیرقابل بازگشت است.")) {
      try {
        const res = await axios.delete('http://localhost:5000/api/clear-all-data');
        alert(res.data.message);
        fetchData(); // جدول را خالی کن
      } catch (err) {
        alert("خطا در پاکسازی: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // ۱. دریافت داده‌ها از سرور
  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/debug-all');
      if (res.data && res.data.status === "Success") {
        const data = res.data.data || [];
        setAllData(data);
        setFilteredData(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return alert("لطفاً ابتدا ردیف‌های مورد نظر را انتخاب کنید.");
    try {
      await axios.post('http://localhost:5000/api/payments/bulk-status', {
        ids: selectedIds,
        status: 'تکمیل شده'
      });
      setSelectedIds([]); // خالی کردن لیست انتخاب پس از عملیات
      fetchData(); // تازه‌سازی جدول
    } catch (err) {
      alert("خطا در عملیات گروهی");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ۲. فیلتر لحظه‌ای
  useEffect(() => {
    if (allData) {
      const filtered = allData.filter(item => {
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
    }
  }, [searchTerm, allData]);

  // ۳. خروجی اکسل با تنظیم RTL
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("دیتایی برای خروجی گرفتن وجود ندارد.");
      return;
    }
    const excelData = filteredData.map(item => ({
      "کد پرسنلی": item.personnel_code,
      "نام": item.first_name,
      "نام خانوادگی": item.last_name,
      "تاریخ": item.date_shamsi,
      "مبلغ (ریال)": item.amount,
      "سریال": item.serial,
      "شماره شبا": item.sheba,
      "بابت": item.subject,
      "وضعیت": item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'][0] = { RTL: true };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `Report_${new Date().getTime()}.xlsx`);
  };

  // ۴. ثبت دستی
  const saveManualRecord = async (data) => {
    try {
      const response = await axios.post('http://localhost:5000/api/payments', data);
      if (response.status === 200 || response.status === 201) {
        alert("ذخیره شد!");
        fetchData();
      }
    } catch (err) {
      alert("خطا در ارسال: " + (err.response?.data?.message || err.message));
    }
  };

  // ۵. آپلود اکسل
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert("خطا در آپلود: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

 return (
  <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-right" dir="rtl">
    <div className="max-w-6xl mx-auto space-y-6">

      {/* بخش هدر و ابزارها */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-slate-800 border-r-4 border-blue-600 pr-3">مدیریت مالی</h1>

          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* ۱. دکمه تایید گروهی (فقط زمانی که موردی انتخاب شده باشد ظاهر می‌شود) */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkComplete}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 animate-pulse"
              >
                ✅ تایید پرداخت ({selectedIds.length} مورد)
              </button>
            )}

            {/* ۲. دکمه قفل دیتابیس */}
            <button 
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                isLocked 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-green-600 text-white border-green-700'
              }`}
            >
              {isLocked ? '🔒 دیتابیس قفل است' : '🔓 ویرایش آزاد'}
            </button>

            {/* ۳. دکمه خروجی اکسل */}
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2"
            >
              📥 خروجی اکسل
            </button>

            {/* ۴. دکمه آپلود فایل */}
            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-pointer transition-all shadow-sm ${uploading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
              <span>{uploading ? 'در حال پردازش...' : '📤 آپلود فایل'}</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={uploading} />
            </label>

            {/* ۵. دکمه پاکسازی کلی */}
            <button
              onClick={clearAllData}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              🗑️ پاکسازی
            </button>
          </div>
        </div>

        {/* فیلتر جستجو */}
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو در بین نام‌ها، سریال‌ها یا شماره شبا..."
            className="w-full border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* فرم ثبت دستی */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          ثبت رکورد جدید
        </h2>
        <SmartForm onSave={saveManualRecord} />
      </div>

      {/* جدول داده‌ها - تمام پروپ‌های جدید را اینجا پاس دادیم */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <PaymentTable 
          data={filteredData} 
          isLocked={isLocked} 
          fetchData={fetchData}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      </div>

    </div>
  </div>
);
}

export default App;