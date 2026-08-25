# Backend Controllers — هر کنترلر چه می‌کند؟

این فایل نقش‌محور است: برای پیدا کردن «منطق» لازم است بدانید هر endpoint به کدام کنترلر اشاره می‌کند.

---

## `backend/controllers/authController.js`
- `login`
  - یافتن کاربر با `username`
  - مقایسه password با `bcryptjs`
  - تولید JWT
- `me`
  - برگرداندن اطلاعات کاربر از `req.user`

---

## `backend/controllers/usersController.js`
- `getAll`: لیست کاربران
- `create`: ایجاد کاربر (role + password hash)
- `update`: ویرایش کاربر (در صورت ارسال password جدید، hash جدید)
- `setBlocked`: block/unblock (با شرط اینکه خودتان را مسدود نکنید و adminها حداقل یک admin فعال داشته باشند)
- `remove`: حذف کاربر (اگر در سوابق پرداخت استفاده شده باشد، حذف ممنوع)

---

## `backend/controllers/uploadController.js` (payments عمومی/legacy)
- `uploadExcel`
  - دریافت فایل با `multer`
  - parse با `services/excelService.js`
  - insert در جدول `payments`

---

## `backend/controllers/paymentsController.js` (legacy عمومی)
- `createPayment`: ثبت دستی در `payments`
- `getAllPayments`: خروجی کامل (برای UI debug)
- `clearAllData`: truncate/پاکسازی `payments`
- `bulkUpdateStatus`: آپدیت status گروهی
- `updateField`: آپدیت یک field مشخص (سلولی از UI)

---

## `backend/controllers/businessContactsController.js`
- CRUD مخاطب تجاری
- validation:
  - شبا با `normalizeSheba` + `isValidSheba`
  - یکتایی `account_code`

---

## `backend/controllers/machineryContactsController.js`
- CRUD مخاطب ماشین‌آلات
- validation:
  - شبا
  - یکتایی `account_code`
  - وجود `machine_id` در `machines`

---

## `backend/controllers/machinesController.js`
- CRUD ماشین‌ها
- حذف ماشین وقتی مخاطب متصل باشد ممنوع است (`machinery_contacts` وجود داشته باشد)

---

## `backend/controllers/machineryContactsUploadController.js`
- `uploadExcel`
  - parse اکسل با `services/machineryContactsExcelService.js`
  - insert در `machinery_contacts`

---

## پرداخت‌های تجاری
### `backend/controllers/commercialPaymentsController.js`
- `getAll`, `getById`
  - list و details با join به referenceها (contact/category/executor/project/serial/...)
- `create`
  - validate payload (مبلغ>0، status معتبر و فیلدهای مرجع)
  - `commercialPaymentService.loadPaymentContext` برای لود مرجع‌ها
  - در `db.transaction`:
    - `serialService.consumeSerial(permission_serial_id, trx)` مصرف مجوز + ثبت `status/usage_location`
    - insert در `commercial_payments`
- `update`
  - اگر `permission_serial_id` تغییر کند:
    - serial قبلی release
    - serial جدید consume
- `remove`
  - release مجوز + حذف پرداخت
- `uploadReceipt`
  - آپلود فایل فیش و ذخیره در `receipt_file_path`

---

## پرداخت‌های ماشین‌آلات
### `backend/controllers/machineryPaymentsController.js`
- مشابه تجاری، با قوانین اضافی:
  - اگر status `'پرداخت شده'` باشد ویرایش مجاز نیست
  - اگر `accounting_document_registered` ثبت شده باشد حذف مجاز نیست

---

## پرداخت‌های حقوق
### `backend/controllers/salaryPaymentsController.js`
- مشابه ماشین‌آلات/تجاری، با منطق و جدول `salary_payments`
- وضعیت‌ها: در انتظار پرداخت / در جریان پرداخت / پرداخت شده (بدون «ثبت نشده»)
- `bulkUpdateStatus` (admin): فقط انتقال گروهی بین `'در انتظار پرداخت'` و `'در جریان پرداخت'`
- آپلود رسید: ذخیره در `receipt_file_path`

---

## `backend/controllers/personnelContactsController.js`
- CRUD پرسنل (`personnel_code` یکتا؛ `national_id` اختیاری و در صورت پر بودن یکتا؛ فیلد `father_name`)
- حذف پرسنل اگر به `salary_payments` لینک باشد ممنوع است
- `bulkRemove`: حذف گروهی (admin)؛ موارد متصل به حقوق رد می‌شوند
- `getDuplicateGroups`: گروه‌های هم‌نام یا هم‌شبا
- `mergeDuplicates`: ادغام جفت‌به‌جفت با سه حالت تجمیع / نگه‌داشتن اول / نگه‌داشتن دوم؛ در تجمیع تعارض فیلد (از جمله کد پرسنلی) با انتخاب مقدار اصلی (`fieldChoices`) حل می‌شود. اگر کد پرسنلی رکورد دوم انتخاب شود، بعد از حذف رکورد دوم روی رکورد باقی‌مانده نوشته می‌شود.

---

## `backend/controllers/permissionSerialsController.js`
- `getAll` و `getById`
  - فیلتر با params:
    - `status`, `usage_location`, `selectable=true`, `recipient_user_id`
  - join برای نمایش `recipient_name`
- `create`
  - ساخت batch مجوزهای پشت‌سرهم:
    - prefix/عدد انتهایی از `serial_number` استخراج می‌شود
    - تا `quantity` ردیف insert می‌شود
  - در صورت تکراری بودن serialها: `409`
- `markAwaitingPayment`
  - فقط مجوزهای وضعیت `'فرم خام'` -> `'در انتظار پرداخت'`
- `voidPermit`
  - باطل کردن مجوز:
    - اگر به payment وصل باشد و یا status نامعتبر باشد، خطا برمی‌گرداند

---

## Excel
### `backend/controllers/excelController.js`
- `previewPersonnel`, `confirmPersonnel`
  - پیش‌نمایش ردیف‌ها بدون insert؛ سپس ثبت انتخاب‌شده‌ها
  - در صورت تکراری بودن `کد پرسنلی` یا `کد ملی`: هیچ ردیفی ثبت نمی‌شود و خطا برمی‌گردد
- `previewPayments` / `confirmPayments`
  - ورود پرداخت‌های عمومی با پیش‌نمایش و انتخاب ردیف (مثل پرسنل)
- `previewCommercialPayments` / `confirmCommercialPayments`
- `previewMachineryPayments` / `confirmMachineryPayments`
- `previewSalaryPayments` / `confirmSalaryPayments`
  - resolve کردن مخاطب/دسته/مجری/پروژه/سریال از روی متن ستون‌ها
  - سریال تکراری در فایل یا غیرقابل‌مصرف: ردیف غیرقابل انتخاب
  - در confirm: داخل `db.transaction` سریال مصرف و پرداخت insert می‌شود
  - اگر خطای مرجع/سریال باشد کل ثبت abort می‌شود (`409`)
- `importPersonnel`, `importPersonnelBulkUpdate`, `importMachineryContacts`
  - parse با سرویس‌های اکسل
  - insert در جدول‌های مقصد
  - ثبت لاگ در `excel_logs`
  - پاک کردن فایل با `fs.unlink`
- `downloadTemplate`
  - ساخت workbook قالب (با `utils/excelHelpers.js`) برای انواع import شامل پرداخت‌ها
- `exportPayments` و گزارش‌های grouped
  - خروجی ترکیبی همه انواع پرداخت از `services/excel/paymentExportService.js`
- `exportGeneralPayments` / `exportCommercialPayments` / `exportMachineryPayments` / `exportSalaryPayments`
  - خروجی جداگانه همه رکوردهای همان نوع (ستون وضعیت در فایل است؛ فیلتر تب صفحه اعمال نمی‌شود)
- `getLogs`
  - برگرداندن لاگ‌های اخیر

---

## Lookups
### `backend/controllers/lookupsController.js`
- دسته‌بندی‌ها/ماه‌ها/مجری‌ها/پروژه‌ها/کاربران؛ CRUD ادمین برای پروژه، مجری (نام + نام خانوادگی) و نوع پرداخت سه گانه
- دراپ‌داون فرم‌های پرداخت از همین جداول پر می‌شود

---

## Backup
### `backend/controllers/backupController.js`
- `getBackupInfo`: آمار جدول‌ها + حجم فایل
- `downloadBackup`: ایجاد فایل موقت و دانلود
- `restoreBackup`: جایگزینی دیتابیس با فایل آپلود شده

