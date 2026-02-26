import React from 'react';
import axios from 'axios';

const PaymentTable = ({ data, isLocked, fetchData, selectedIds, setSelectedIds }) => {
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === data.length ? [] : data.map(item => item.id));
  };

  const handleCellEdit = async (id, field, value) => {
    try {
      await axios.patch(`http://localhost:5000/api/payments/${id}/update-field`, { field, value });
      fetchData(); 
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  // --- منطق حرکت با کیبورد ---
  const handleKeyDown = (e, rowIndex, colIndex) => {
    const rowCount = data.length;
    const colCount = 8; // تعداد ستون‌های قابل ویرایش ما

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'Enter': // اینتر هم مثل فلش پایین عمل کند
        nextRow = Math.min(rowIndex + 1, rowCount - 1);
        break;
      case 'ArrowUp':
        nextRow = Math.max(rowIndex - 1, 0);
        break;
      case 'ArrowRight': // در حالت RTL، راست یعنی ستون قبلی
        nextCol = Math.max(colIndex - 1, 0);
        break;
      case 'ArrowLeft': // در حالت RTL، چپ یعنی ستون بعدی
        nextCol = Math.min(colIndex + 1, colCount - 1);
        break;
      default:
        return; // بقیه کلیدها (مثل حروف) کار خودشان را بکنند
    }

    e.preventDefault(); // جلوگیری از اسکرول صفحه با کلیدهای فلش
    const nextInput = document.getElementById(`input-${nextRow}-${nextCol}`);
    if (nextInput) {
      nextInput.focus();
      nextInput.select(); // متن داخل سلول را انتخاب کن تا آماده تایپ باشد
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right border-collapse">
        <thead className="bg-slate-100 text-slate-600 border-b border-slate-300">
          <tr>
            <th className="p-3 w-10 text-center">
              <input type="checkbox" onChange={toggleSelectAll} checked={data.length > 0 && selectedIds.length === data.length} />
            </th>
            <th className="p-3 border-l text-center">کد پرسنلی</th>
            <th className="p-3 border-l text-center">نام</th>
            <th className="p-3 border-l text-center">نام خانوادگی</th>
            <th className="p-3 border-l text-center">تاریخ</th>
            <th className="p-3 border-l text-center">مبلغ (ریال)</th>
            <th className="p-3 border-l text-center">سریال</th>
            <th className="p-3 border-l text-center">شبا</th>
            <th className="p-3 border-l text-center">بابت</th>
            <th className="p-3 text-center">وضعیت</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((item, rowIndex) => (
            <tr key={item.id} className={`${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
              <td className="p-2 text-center border-l">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
              </td>

              {[
                { field: 'personnel_code', value: item.personnel_code, type: 'text' },
                { field: 'first_name', value: item.first_name, type: 'text' },
                { field: 'last_name', value: item.last_name, type: 'text' },
                { field: 'date_shamsi', value: item.date_shamsi, type: 'text' },
                { field: 'amount', value: item.amount, type: 'number', className: 'font-bold text-blue-700' },
                { field: 'serial', value: item.serial, type: 'text' },
                { field: 'sheba', value: item.sheba, type: 'text', className: 'font-mono text-[10px]' },
                { field: 'subject', value: item.subject, type: 'text' }
              ].map((cell, colIndex) => (
                <td key={cell.field} className={`p-1 border-l text-center ${cell.className || ''}`}>
                  {isLocked ? (
                    <span className="px-2">{cell.field === 'amount' ? Number(cell.value).toLocaleString() : (cell.value || '---')}</span>
                  ) : (
                    <input
                      id={`input-${rowIndex}-${colIndex}`} // آدرس‌دهی سلول برای ناوبری
                      type={cell.type}
                      defaultValue={cell.value}
                      onBlur={(e) => handleCellEdit(item.id, cell.field, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      className="w-full bg-white border border-transparent hover:border-blue-200 rounded px-1 py-1 text-center focus:bg-blue-50 focus:border-blue-500 outline-none transition-all"
                    />
                  )}
                </td>
              ))}

              <td className="p-2 text-center">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.status === 'تکمیل شده' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable;