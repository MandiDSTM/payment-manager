# Backend Services & Utils — منطق‌های کمکی

این فایل برای فهم «منطق اصلی» است، نه مسئولیت هر endpoint.

---

## Middleware (آپلودها و مجوزها)
- `backend/middleware/upload.js`
  - `multer` ساده با مقصد `uploads/`
- `backend/middleware/uploadReceipt.js`
  - ذخیره رسیدها در `uploads/receipts/`
  - نام فایل: `timestamp-random` + پسوند اصلی

---

## Services (Core Business Logic)
### `backend/services/serialService.js`
- `consumeSerial(serialId, usageLocation, trx)`
  - فقط serialهایی با وضعیت قابل مصرف (`SELECTABLE_STATUSES`) را قبول می‌کند
  - status را به `'پرداخت شده'` و `usage_location` را ست می‌کند
- `releaseSerial(serialId, trx)`
  - برگرداندن مجوز به `'فرم خام'` و `usage_location=null`
- `findLinkedPayment(serialId, trx)`
  - بررسی اینکه این مجوز به کدام جدول payment وصل شده است (تجاری/حقوق/ماشین‌آلات)

### `backend/services/commercialPaymentService.js`
- `loadPaymentContext`
  - contact/executor/project/serial را لود می‌کند
- `buildDescription`
  - ساخت string توضیحات بر اساس مرجعها
- `consumeSerial` wrapper با `USAGE_LOCATIONS.COMMERCIAL`

### `backend/services/machineryPaymentService.js`
- `loadPaymentContext`
  - join مخاطب ماشین‌آلات و `machines` برای گرفتن `machine_name`
- `buildDescription`
  - با توجه به `MONTHLY_WORK_CATEGORY` شکل توضیحات را تغییر می‌دهد
- `consumeSerial` wrapper با `USAGE_LOCATIONS.MACHINERY`

### `backend/services/salaryPaymentService.js`
- `loadPaymentContext`
  - پرسنل + category + executor + project + serial
- `buildDescription`
  - اگر category برابر `کارکرد ماهانه` باشد، فرمت خاص می‌دهد

### Services مربوط به Excel
- `backend/services/excelService.js`
  - parse اکسل برای `payments` عمومی/legacy (تشخیص ستون‌ها و ساخت رکورد)
- `backend/services/excel/personnelExcelService.js`
  - import پرسنل (validation دقیق + check تکراری بودن personnel_code)
- `backend/services/machineryContactsExcelService.js`
  - import مخاطبین ماشین‌آلات (resolve کردن `machine_id` از روی `machine name`)
- `backend/services/excel/paymentExportService.js`
  - ساخت workbook:
    - `exportPaymentsList`
    - `exportByProject`
    - `exportByMonth`
    - `exportByExecutor`
    - `exportBySerial`

### `backend/services/backupService.js`
- `createBackupFile`
  - با `better-sqlite3` backup می‌گیرد در مسیر temp
- `getBackupInfo`
  - اندازه فایل و تعداد رکوردهای هر جدول
- `restoreDatabase`
  - validate اینکه فایل SQLite معتبر باشد و جدول `users` وجود داشته باشد
  - بکاپ فعلی را pre-restore می‌گیرد و سپس دیتابیس را جایگزین می‌کند

---

## Utils
- `backend/utils/validateSheba.js`
  - normalize و اعتبارسنجی شبا (`IR` + 24 رقم)
- `backend/utils/normalizeText.js`
  - حذف کاراکترهای bidirectional و trim
- `backend/utils/excelLog.js`
  - ثبت و خواندن لاگ import/exportها در `excel_logs`
- `backend/utils/excelHelpers.js`
  - ساخت workbook با RTL و تنظیم width ستون‌ها

