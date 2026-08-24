# Frontend Components — کامپوننت‌ها و هوک‌ها

این فایل بخش مشترک UI و منطق UI/Keyboard را توضیح می‌دهد.

---

## Hook: `useFormKeyboardNav`
`frontend/src/hooks/useFormKeyboardNav.js`
- سازوکار navigation در فرم‌ها:
  - Enter -> رفتن به field بعدی
  - Shift+Enter -> field قبلی
  - اگر روی آخرین field باشید:
    - `onSubmitLast()` اجرا می‌شود

---

## کامپوننت‌های UI مشترک
`frontend/src/components/ui/index.jsx`
- `Card`, `PageHeader`
- `Button` (variant: `primary/secondary/danger/ghost`)
- `TextInput`, `SelectField`
- `SearchInput`
- `StatusTabs`
- `DataTable`
- `Alert`

این‌ها برای ساخت سریع فرم/جدول در همه Pageها استفاده شده‌اند.

---

## کامپوننت‌های اختصاصی
### `SmartForm`
`frontend/src/components/SmartForm.jsx`
- فرم «ثبت رکورد جدید» برای `PaymentsPage` عمومی
- با `useFormKeyboardNav`:
  - Enter بین فیلدها حرکت می‌کند
  - در آخر submit انجام می‌شود

### `PersonnelExcelImport`
`frontend/src/components/PersonnelExcelImport.jsx`
- ورود گروهی پرسنل با پیش‌نمایش، انتخاب ردیف و تأیید
- `GET /excel/template/personnel` + `POST /excel/preview/personnel` + `POST /excel/confirm/personnel`

### `PaymentExcelImport`
`frontend/src/components/PaymentExcelImport.jsx`
- همان جریان پرسنل برای چهار نوع پرداخت (`kind`: `general` | `commercial` | `machinery` | `salary`)
- دانلود قالب، آپلود، مودال پیش‌نمایش با چک‌باکس، ثبت انتخاب‌شده‌ها
- برای حقوق: اگر فیلدهای مشترک خالی باشد، قبل از پیش‌نمایش ویزارد مرحله‌ای باز می‌شود

### `SalaryImportDefaultsWizard`
`frontend/src/components/SalaryImportDefaultsWizard.jsx`
- پرسش مرحله‌ای دسته‌بندی، ماه، مجری، پروژه و سریال مجوز
- مقدار انتخاب‌شده روی همه ردیف‌های فایل اعمال می‌شود
- برای چند ردیف، سریال انتخابی نقطه شروع است و سریال‌های آزاد بعدی به ردیف‌های معتبر اختصاص داده می‌شود

### `PaymentTable`
`frontend/src/components/PaymentTable.jsx`
- جدول `payments` (legacy عمومی)
- قابلیت‌ها:
  - checkbox انتخاب ردیف‌ها (برای bulk actions)
  - اگر `isLocked` true باشد فقط نمایش می‌دهد
  - اگر editable باشد:
    - در `onBlur` تغییرات را به backend ارسال می‌کند:
      - `PATCH /payments/:id/update-field`

---

## Theme
`frontend/src/components/ui/ThemePicker.jsx`
- UI انتخاب theme (light/slate/ocean)

`frontend/src/theme/ThemeContext.jsx`
- theme را با `pm-theme` در `localStorage` ذخیره می‌کند
- با `data-theme` روی `html` اعمال می‌کند

---

## Utils (خروجی اکسل در فرانت)
`frontend/src/utils/excelExport.js`
- ساخت workbook برای exportهای client-side
- استفاده‌شده در:
  - `PaymentsPage` (خروجی اکسل)
  - `PermissionSerialsPage` (خروجی اکسل مجوزها)

`frontend/src/utils/format.js`
- `formatAmount` و `statusBadgeClass` برای نمایش UI

