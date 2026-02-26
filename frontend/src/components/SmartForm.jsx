import React, { useRef, useState } from 'react';

const fields = [
  { name: 'personnel_code', label: 'کد پرسنلی' },
  { name: 'first_name', label: 'نام' },
  { name: 'last_name', label: 'نام خانوادگی' },
  { name: 'date_shamsi', label: 'تاریخ (شمسی)' },
  { name: 'amount', label: 'مبلغ' },
  { name: 'serial', label: 'سریال' }, // چک کنید نام حتما serial باشد
  { name: 'sheba', label: 'شماره شبا' }, // اضافه شد
  { name: 'subject', label: 'بابت' },
  { name: 'description', label: 'توضیحات (اختیاری)' }
];

const SmartForm = ({ onSave }) => {
    const [formData, setFormData] = useState({});
    const inputRefs = useRef([]);

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (index < fields.length - 1) {
                // رفتن به اینپوت بعدی
                inputRefs.current[index + 1].focus();
            } else {
                // ثبت نهایی در اینپوت آخر
                submitForm();
            }
        } else if (e.key === 'Backspace' && !formData[fields[index].name] && index > 0) {
            // برگشت به قبلی اگر خالی بود
            e.preventDefault();
            inputRefs.current[index - 1].focus();
        }
    };

    const handleChange = (e, name) => {
        setFormData({ ...formData, [name]: e.target.value });
    };

    const submitForm = async () => {
        console.log("Submitting this data to App.jsx:", formData); // لاگ برای عیب‌یابی

        // اعتبارسنجی اولیه: حداقل نام و تاریخ پر باشد
        if (!formData.first_name || !formData.date_shamsi) {
            alert("لطفاً فیلدهای اجباری (نام و تاریخ) را پر کنید.");
            return;
        }

        try {
            await onSave(formData); // صدا زدن تابعی که در App.jsx است
            setFormData({}); // پاکسازی فرم بعد از موفقیت
            inputRefs.current[0].focus(); // بازگشت به اینپوت اول
        } catch (error) {
            console.error("Error in SmartForm submit:", error);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fields.map((field, index) => (
                <div key={field.name} className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1">{field.label}</label>
                    <input
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(e, field.name)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                        placeholder={field.label}
                    />
                </div>
            ))}
            <div className="col-span-full mt-4">
                <button
                    onClick={submitForm}
                    className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700 transition"
                >
                    ثبت نهایی (Enter)
                </button>
            </div>
        </div>
    );
};

export default SmartForm;