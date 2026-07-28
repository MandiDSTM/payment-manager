import React, { useState } from 'react';
import { Button, TextInput } from './ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

const fields = [
  { name: 'personnel_code', label: 'کد پرسنلی' },
  { name: 'first_name', label: 'نام' },
  { name: 'last_name', label: 'نام خانوادگی' },
  { name: 'date_shamsi', label: 'تاریخ (شمسی)' },
  { name: 'amount', label: 'مبلغ' },
  { name: 'serial', label: 'سریال' },
  { name: 'sheba', label: 'شماره شبا' },
  { name: 'subject', label: 'بابت' },
  { name: 'description', label: 'توضیحات (اختیاری)' },
];

const SmartForm = ({ onSave }) => {
  const [formData, setFormData] = useState({});

  const submitForm = async () => {
    if (!formData.first_name || !formData.date_shamsi) {
      alert('لطفاً فیلدهای اجباری (نام و تاریخ) را پر کنید.');
      return;
    }

    try {
      await onSave(formData);
      setFormData({});
      focusFirst();
    } catch (error) {
      console.error('Error in SmartForm submit:', error);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: fields.length,
    onSubmitLast: submitForm,
  });

  const handleChange = (e, name) => {
    setFormData({ ...formData, [name]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {fields.map((field, index) => (
        <TextInput
          key={field.name}
          label={field.label}
          inputRef={setRef(index)}
          type="text"
          value={formData[field.name] || ''}
          onChange={(e) => handleChange(e, field.name)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          placeholder={field.label}
        />
      ))}
      <div className="col-span-full mt-2">
        <Button onClick={submitForm}>ثبت نهایی (Enter)</Button>
      </div>
    </div>
  );
};

export default SmartForm;
