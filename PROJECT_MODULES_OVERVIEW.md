# پروژه مدیریت پرداخت‌ها — نقشه ماژول‌ها (Backend / Frontend)

این سند یک راهنمای «نقشه‌ای» است تا سریع بفهمید هر ماژول/کامپوننت چه کاری انجام می‌دهد و از کجا باید منطق را پیدا کنید.

> نکته: همه مسیرها و نام‌ها دقیقا مطابق ساختار همین ریپو هستند.

---

## 1) Backend (Node.js + Express + SQLite/Knex)

### 1.1) نقطه شروع برنامه (Entry Points)
- `backend/server.js`
  - سرور اکسپرس را روی پورت `5000` راه‌اندازی می‌کند.
- `backend/app.js`
  - middleware ها را ست می‌کند:
    - `cors`
    - `express.json()`
    - سرویس‌دهی فایل‌های آپلود شده از مسیر `uploads/` با URL پایه `/uploads`
  - روت‌ها را زیر `/api` سوار می‌کند (`app.use('/api', routes)`).
- `backend/setup-db.js`
  - ساخت دیتابیس و جدول‌ها (با `knex.schema`) و seed کردن برخی داده‌های ثابت (مثل categories ها).

### 1.2) دیتابیس و مدل داده (SQLite Tables)
دیتابیس: `backend/database.sqlite` (از طریق `backend/config/db-config.js`).

جدول‌های اصلی که در `setup-db.js` ساخته می‌شوند:
- `users` (کاربران/نقش‌ها، شامل `is_blocked`)
- مخاطبین:
  - `business_contacts`
  - `personnel_contacts` (`national_id` اختیاری، `father_name`)
  - `machines`
  - `machinery_contacts`
- پرداخت‌ها (هرکدام یک نوع پرداخت جدا):
  - `payments` (عمومی/legacy UI در صفحه Payments)
  - `commercial_payments` (تجاری)
  - `machinery_payments` (ماشین‌آلات)
  - `salary_payments` (حقوق/پرسنل)
- دسته‌بندی‌ها/مرجع‌ها:
  - `commercial_payment_categories`
  - `machinery_payment_categories`
  - `salary_payment_categories`
  - `executors` (مجری‌ها)
  - `projects` (پروژه‌ها)
- مجوزهای پرداخت:
  - `payment_permission_serials`

لاگ اکسل:
- `excel_logs` (برای ثبت import/export ها و خطاها)

پشتیبانی‌های فایل:
- رسیدهای پرداخت با مسیر ذخیره می‌شوند (مثلا `uploads/receipts/`).

### 1.3) احراز هویت و مجوزها (Auth & Authorization)
- `backend/middleware/auth.js`
  - JWT را از header `Authorization: Bearer <token>` می‌گیرد.
  - payload را با `jwtSecret` چک می‌کند.
  - کاربر را از جدول `users` با `payload.userId` لود می‌کند و در `req.user` قرار می‌دهد.
  - اگر کاربر `is_blocked` باشد، `403` برمی‌گرداند.
- `backend/middleware/authorize.js`
  - قوانین نقش‌ها:
    - `requireReadAccess`: برای خواندن همه جداول (admin/accountant/viewer)
    - `requireAdmin`: فقط مدیر
    - `requirePaymentCreate`: مدیر + حسابدار (فقط ایجاد ردیف‌های پرداخت‌ها)
    - `requirePaymentApprove`: فقط مدیر (مثلا در `/payments/bulk-status`)
    - `requireCommercialPaymentWrite`: مدیر + حسابدار (برای create/update پرداخت‌های تجاری و همچنین مسیرهای مرتبط با رسید)

> در نتیجه: در فرانت، نقش‌ها (admin/accountant/viewer) مستقیم روی نمایش دکمه‌ها و فرم‌ها اثر می‌گذارند، و در بک‌اند هم دوباره با middleware های بالا محدود می‌شوند.

### 1.4) مسیرها (Routes) و کنترلرها (Controllers)
روت‌های اصلی در `backend/routes/*` تعریف شده‌اند و از `backend/routes/index.js` زیر `/api` وصل می‌شوند.

#### 1) Auth
- `POST /api/auth/login`  -> `controllers/authController.login`
  - ورود با `username` و `password`
  - برمی‌گرداند: `{ token, user }`
- `GET /api/auth/me` -> `controllers/authController.me`
  - نیازمند `requireAuth`

#### 2) Users
در `backend/routes/users.js`:
- `GET /api/users` -> `controllers/usersController.getAll` (admin)
- `POST /api/users` -> `controllers/usersController.create` (admin)
- `PUT /api/users/:id` -> `controllers/usersController.update` (admin)
- `PATCH /api/users/:id/block` -> `controllers/usersController.setBlocked` (admin)
- `DELETE /api/users/:id` -> `controllers/usersController.remove` (admin)

#### 3) Upload Excel (عمومی payments legacy)
- `POST /api/upload-excel` -> `controllers/uploadController.uploadExcel`
  - مسیر آپلود: با `multer` در `backend/middleware/upload.js`
  - نیازمند `requirePaymentCreate`

#### 4) Payments (عمومی/legacy)
در `backend/routes/payments.js`:
- `GET /api/debug-all` -> `controllers/paymentsController.getAllPayments`
  - برای صفحه `PaymentsPage` (خواندن همه رکوردها)
- `POST /api/payments` -> `controllers/paymentsController.createPayment`
  - ثبت دستی یک رکورد جدید در جدول `payments`
- `PATCH /api/payments/:id/update-field` -> `controllers/paymentsController.updateField`
  - برای ویرایش field به field از روی UI
- `POST /api/payments/bulk-status` -> `controllers/paymentsController.bulkUpdateStatus`
  - تغییر status گروهی (admin-only)
- `DELETE /api/clear-all-data` -> `controllers/paymentsController.clearAllData`
  - پاکسازی کامل جدول `payments` (admin)

#### 5) Business Contacts
در `backend/routes/businessContacts.js`:
- `GET /api/business-contacts` -> `businessContactsController.getAll` (read)
- `GET /api/business-contacts/:id` -> `businessContactsController.getById` (read)
- `POST /api/business-contacts` -> `businessContactsController.create` (admin)
- `PUT /api/business-contacts/:id` -> `businessContactsController.update` (admin)
- `DELETE /api/business-contacts/:id` -> `businessContactsController.remove` (admin)

نکته مهم: `businessContactsController` validation شبا (`IR + 24 رقم`) و یکتا بودن `account_code` دارد.

#### 6) Machinery Contacts
در `backend/routes/machineryContacts.js`:
- `GET /api/machinery-contacts` -> `machineryContactsController.getAll` (read)
- `GET /api/machinery-contacts/:id` -> `machineryContactsController.getById` (read)
- `POST /api/machinery-contacts` -> `machineryContactsController.create` (admin)
- `POST /api/machinery-contacts/upload-excel` -> `machineryContactsUploadController.uploadExcel` (admin)
- `PUT /api/machinery-contacts/:id` -> `machineryContactsController.update` (admin)
- `DELETE /api/machinery-contacts/:id` -> `machineryContactsController.remove` (admin)

نکته: ماشین `machine_id` باید در جدول `machines` وجود داشته باشد.

#### 7) Machines
در `backend/routes/machines.js`:
- `GET /api/machines` -> `machinesController.getAll` (read)
- `POST /api/machines` -> `machinesController.create` (admin)
- `PUT /api/machines/:id` -> `machinesController.update` (admin)
- `DELETE /api/machines/:id` -> `machinesController.remove` (admin)

#### 8) Commercial Payments (تجاری)
در `backend/routes/commercialPayments.js`:
- `GET /api/commercial-payments` -> `commercialPaymentsController.getAll` (read)
- `GET /api/commercial-payments/:id` -> `commercialPaymentsController.getById` (read)
- `POST /api/commercial-payments` -> `commercialPaymentsController.create` (admin/accountant)
- `PUT /api/commercial-payments/:id` -> `commercialPaymentsController.update` (admin/accountant)
- `DELETE /api/commercial-payments/:id` -> `commercialPaymentsController.remove` (admin)
- `POST /api/commercial-payments/:id/receipt` -> `commercialPaymentsController.uploadReceipt`
  - آپلود فیش با `backend/middleware/uploadReceipt.js`

#### 9) Machinery Payments (ماشین‌آلات)
در `backend/routes/machineryPayments.js`:
- `GET /api/machinery-payments` -> `machineryPaymentsController.getAll` (read)
- `GET /api/machinery-payments/:id` -> `machineryPaymentsController.getById` (read)
- `POST /api/machinery-payments` -> `machineryPaymentsController.create` (admin/accountant)
- `PUT /api/machinery-payments/:id` -> `machineryPaymentsController.update` (admin/accountant)
- `DELETE /api/machinery-payments/:id` -> `machineryPaymentsController.remove` (admin)
- `POST /api/machinery-payments/:id/receipt` -> `machineryPaymentsController.uploadReceipt`

نکته: برای رکوردهایی که `status` = `'پرداخت شده'` هستند، ویرایش مجاز نیست.
همچنین حذف وقتی `accounting_document_registered` ثبت شده باشد مجاز نیست.

#### 10) Salary Payments (حقوق)
در `backend/routes/salaryPayments.js`:
- `GET /api/salary-payments` -> `salaryPaymentsController.getAll` (read)
- `GET /api/salary-payments/:id` -> `salaryPaymentsController.getById` (read)
- `POST /api/salary-payments` -> `salaryPaymentsController.create` (admin/accountant)
- `POST /api/salary-payments/bulk-status` -> `salaryPaymentsController.bulkUpdateStatus` (admin)
- `PUT /api/salary-payments/:id` -> `salaryPaymentsController.update` (admin/accountant)
- `DELETE /api/salary-payments/:id` -> `salaryPaymentsController.remove` (admin)
- `POST /api/salary-payments/:id/receipt` -> `salaryPaymentsController.uploadReceipt`

#### 11) Personnel Contacts
در `backend/routes/personnelContacts.js`:
- `GET /api/personnel-contacts` / `GET /api/personnel-contacts/:id` -> `personnelContactsController` (read)
- `POST /api/personnel-contacts` / `PUT ...` / `DELETE ...` -> (admin)

#### 12) Permission Serials (سریال/مجوز پرداخت)
در `backend/routes/permissionSerials.js`:
- `GET /api/permission-serials` -> `permissionSerialsController.getAll` (read)
- `GET /api/permission-serials/:id` -> `permissionSerialsController.getById` (read)
- `POST /api/permission-serials` -> `permissionSerialsController.create` (admin)
- `PATCH /api/permission-serials/:id/awaiting` -> `permissionSerialsController.markAwaitingPayment` (admin)
- `PATCH /api/permission-serials/:id/void` -> `permissionSerialsController.voidPermit` (admin)

#### 13) Excel (import/export + logs)
در `backend/routes/excel.js`:
- `GET /api/excel/logs` -> `excelController.getLogs` (read)
- `GET /api/excel/template/:type` -> `excelController.downloadTemplate` (read)
  - `personnel`, `payments`, `commercial-payments`, `machinery-payments`, `salary-payments`, `machinery-contacts`
- `POST /api/excel/preview/personnel` + `POST /api/excel/confirm/personnel` (admin)
- `POST /api/excel/import/personnel` -> `excelController.importPersonnel` (admin)
- `POST /api/excel/import/personnel-bulk-update` -> `excelController.importPersonnelBulkUpdate` (admin)
- `POST /api/excel/import/machinery-contacts` -> `excelController.importMachineryContacts` (admin)
- پیش‌نمایش/ثبت پرداخت‌ها (admin/accountant):
  - `POST /api/excel/preview/payments` + `POST /api/excel/confirm/payments`
  - `POST /api/excel/preview/commercial-payments` + `POST /api/excel/confirm/commercial-payments`
  - `POST /api/excel/preview/machinery-payments` + `POST /api/excel/confirm/machinery-payments`
  - `POST /api/excel/preview/salary-payments` + `POST /api/excel/confirm/salary-payments`
- `GET /api/excel/export/payments` -> `excelController.exportPayments` (read)
- `GET /api/excel/export/payments/general` -> `excelController.exportGeneralPayments` (read)
- `GET /api/excel/export/payments/commercial` -> `excelController.exportCommercialPayments` (read)
- `GET /api/excel/export/payments/machinery` -> `excelController.exportMachineryPayments` (read)
- `GET /api/excel/export/payments/salary` -> `excelController.exportSalaryPayments` (read)
- `GET /api/excel/export/by-project` -> `excelController.exportByProject` (read)
- `GET /api/excel/export/by-month` -> `excelController.exportByMonth` (read)
- `GET /api/excel/export/by-executor` -> `excelController.exportByExecutor` (read)
- `GET /api/excel/export/by-serial` -> `excelController.exportBySerial` (read)
- `GET /api/excel/export/personnel` -> `excelController.exportPersonnel` (read)

#### 14) Lookups (مرجع‌ها برای فرم‌ها)
در `backend/routes/lookups.js`:
- categories / months / executors / projects / users
  - همه برای پر کردن `Select` ها در فرانت هستند.

#### 15) Backup
در `backend/routes/backup.js`:
- `GET /api/backup/info` -> `backupController.getBackupInfo` (admin)
- `GET /api/backup/download` -> `backupController.downloadBackup` (admin)
- `POST /api/backup/restore` -> `backupController.restoreBackup` (admin)
  - با validation نوع فایل و اعتبار جدول `users` (در `backupService`)

---

### 1.5) کنترلرها — هر کدام دقیقاً چه کار می‌کنند؟

این بخش یک خلاصه «مسئولیت محور» است (برای اینکه سریع سرچ کنید داخل چه فایل‌هایی منطق هست).

#### `backend/controllers/authController.js`
- `login`: یوزر را با username پیدا می‌کند، password را با `bcryptjs` چک می‌کند، JWT می‌سازد.
- `me`: user جاری را از `req.user` برمی‌گرداند.

#### `backend/controllers/usersController.js`
- CRUD کاربران + قابلیت block/unblock
- محدودیت مهم: هنگام تغییر وضعیت admin ها باید حداقل یک admin فعال باقی بماند.
- حذف کاربر وقتی این کاربر در سوابق پرداخت‌ها استفاده شده باشد ممنوع است.

#### `backend/controllers/paymentsController.js` (legacy عمومی)
- `createPayment`: ثبت دستی در جدول `payments`
- `getAllPayments`: خروجی کامل رکوردها (برای debug UI)
- `clearAllData`: truncate جدول `payments`
- `bulkUpdateStatus`: آپدیت status گروهی
- `updateField`: آپدیت یک field مشخص از UI جدول

#### `backend/controllers/uploadController.js`
- آپلود اکسل برای «payments عمومی/legacy»
- منطق:
  - فایل را با `multer` دریافت می‌کند (در `backend/middleware/upload.js`)
  - اکسل را با `services/excelService.js` parse می‌کند (تشخیص ستون‌ها و ساخت رکوردها)
  - سپس رکوردها را در جدول `payments` insert می‌کند
  - در خطاهای مربوط به هدر/خالی بودن فایل، پیام مناسب برمی‌گرداند.

#### `backend/controllers/machineryContactsUploadController.js`
- آپلود اکسل برای «machinery_contacts»
- منطق:
  - فایل را با `multer` دریافت می‌کند
  - parse با `services/machineryContactsExcelService.js`
  - سپس رکوردهای معتبر را در `machinery_contacts` insert می‌کند.

#### `backend/controllers/businessContactsController.js`
- CRUD مخاطب تجاری
- validation:
  - شبا (`normalizeSheba` + `isValidSheba`)
  - یکتایی `account_code`

#### `backend/controllers/machineryContactsController.js`
- CRUD مخاطب ماشین‌آلات
- validation:
  - شبا
  - یکتایی `account_code`
  - وجود `machine_id` در `machines`

#### `backend/controllers/machinesController.js`
- CRUD ماشین‌ها
- حذف ماشین وقتی به `machinery_contacts` متصل باشد ممنوع است.

#### `backend/controllers/commercialPaymentsController.js`
- CRUD پرداخت تجاری + آپلود رسید
- منطق کلیدی:
  - قبل از ثبت: `commercialPaymentService.loadPaymentContext` را برای لود کردن مرجع‌ها (contact/executor/project/serial) صدا می‌زند.
  - سپس در `db.transaction`:
    - `serialService.consumeSerial` مصرف مجوز را انجام می‌دهد (و status و usage_location را ست می‌کند)
    - رکورد `commercial_payments` درج می‌شود.
- در update:
  - اگر `permission_serial_id` تغییر کند، serial قبلی release و serial جدید consume می‌شود.
- در delete:
  - serial مصرف‌شده release و پرداخت حذف می‌شود.

#### `backend/controllers/machineryPaymentsController.js`
- CRUD پرداخت ماشین‌آلات + آپلود رسید
- منطق کلیدی مشابه تجاری است، با قوانین اضافی:
  - اگر `status === 'پرداخت شده'` باشد update/ویرایش مجاز نیست.
  - اگر `accounting_document_registered` true باشد delete مجاز نیست.

#### `backend/controllers/salaryPaymentsController.js`
- CRUD پرداخت حقوق + آپلود رسید
- منطق کلیدی مشابه ماشین‌آلات است.

#### `backend/controllers/personnelContactsController.js`
- CRUD پرسنل (`national_id` اختیاری؛ `father_name`)
- حذف پرسنل وقتی به `salary_payments` لینک باشد ممنوع است.

#### `backend/controllers/permissionSerialsController.js`
- لیست/فیلتر مجوزهای پرداخت (با join به `users` برای `recipient_name`)
- ایجاد مجوزهای پشت‌سرهم:
  - پترن مجوزها با prefix/عدد انتهایی تولید می‌شود (مثل `SER-1000` تا `SER-1005`)
- status transitions:
  - `awaiting`: فرم خام -> در انتظار پرداخت
  - `void`: فقط مجوزهایی که مجاز باشند (و اگر به پرداخت متصل باشند، void ممنوع)

#### `backend/controllers/excelController.js`
- قالب‌ها و import/export اکسل
- پیش‌نمایش + تأیید انتخاب‌شده‌ها برای پرسنل و هر چهار نوع پرداخت
- ثبت لاگ‌ها در `excel_logs` با کمک `utils/excelLog.js`
- پاکسازی فایل آپلود شده با `fs.unlink`

#### `backend/controllers/lookupsController.js`
- فقط داده‌های مرجع برای پر کردن فرم‌ها (categories، months، executors، projects و ...)

#### `backend/controllers/backupController.js`
- عملیات backup/download/restore
- منطق دیتابیس پشتیبان در `services/backupService.js` است.

---

### 1.6) Middleware / Services / Utils (ماژول‌های کمکی مهم)

#### Middleware
- `backend/middleware/upload.js`
  - یک `multer` ساده با مقصد `uploads/` برای آپلود فایل (xlsx و...) است.
- `backend/middleware/uploadReceipt.js`
  - برای رسیدها (فیش‌ها) از `multer.diskStorage` استفاده می‌کند:
    - مقصد: `uploads/receipts/`
    - نام فایل: `timestamp-random` + پسوند اصلی

#### Services (منطق اصلی)
- `backend/services/serialService.js`
  - کار اصلی: مصرف/رهاسازی `payment_permission_serials`
  - `consumeSerial`:
    - فقط مجوزهای با وضعیت قابل انتخاب (`SELECTABLE_STATUSES`) را می‌پذیرد
    - status مجوز را به `'پرداخت شده'` تغییر می‌دهد و `usage_location` را ست می‌کند
  - `releaseSerial`:
    - مجوز را برمی‌گرداند به `'فرم خام'` و `usage_location` را null می‌کند
  - `findLinkedPayment`:
    - بررسی می‌کند این مجوز به کدام payment (تجاری/حقوق/ماشین‌آلات) وصل شده است یا نه

- `backend/services/*PaymentService.js`
  - وظیفه مشترک: ساخت `description` و لود کردن context مرجع‌ها
  - `commercialPaymentService.js`:
    - context شامل: `business_contacts`, `executors`, `projects`, `payment_permission_serials`
    - `consumeSerial` با `USAGE_LOCATIONS.COMMERCIAL`
  - `machineryPaymentService.js`:
    - context شامل: مخاطب ماشین‌آلات + join روی `machines` برای `machine_name`
    - و همین‌طور `category/month` مخصوص ماشین‌آلات
    - `consumeSerial` با `USAGE_LOCATIONS.MACHINERY`
  - `salaryPaymentService.js`:
    - context شامل: پرسنل + `salary_payment_categories` + پروژه و...
    - `consumeSerial` با `USAGE_LOCATIONS.PERSONNEL`

- سرویس‌های اکسل:
  - `backend/services/excelService.js`:
    - parse اکسل برای `payments` عمومی/legacy (مسیر قدیمی `/upload-excel`)
  - `backend/services/excel/personnelExcelService.js`:
    - parsePreview + confirmImport برای پرسنل
  - `backend/services/excel/generalPaymentsExcelService.js`:
    - parsePreview + confirmImport برای پرداخت‌های عمومی
  - `backend/services/excel/typedPaymentsExcelService.js`:
    - parsePreview + confirmImport برای تجاری / ماشین‌آلات / حقوق
    - resolve مرجع‌ها از متن ستون و مصرف سریال در تراکنش
  - `backend/services/excel/excelImportUtils.js`:
    - نرمال‌سازی مبلغ و lookup مشترک
  - `backend/services/machineryContactsExcelService.js`:
    - parse اکسل مخاطبین ماشین‌آلات برای import
  - `backend/services/excel/paymentExportService.js`:
    - خروجی ترکیبی همه پرداخت‌ها و گزارش‌های grouped
    - خروجی جداگانه عمومی / تجاری / ماشین‌آلات / حقوق

#### Utils
- `backend/utils/validateSheba.js`
  - normalize و اعتبارسنجی شبا (`IR` + 24 رقم)
- `backend/utils/normalizeText.js`
  - حذف کاراکترهای bidirectional و trim
- `backend/utils/excelLog.js`
  - ثبت رویدادهای اکسل در `excel_logs` و همچنین گرفتن لاگ‌های اخیر
- `backend/utils/excelHelpers.js`
  - ساخت workbook با RTL و تنظیم پهنای ستون‌ها

---

## 2) Frontend (React)

### 2.1) نقطه شروع برنامه (Entry / Providers)
- `frontend/src/main.jsx`
  - `ThemeProvider` را دور `App` می‌پیچد و با `createRoot` رندر می‌کند.
- `frontend/src/App.jsx`
  - ناوبری (Tabs/Groups) را بر اساس `NAV_GROUPS` مدیریت می‌کند.
  - نقش کاربر (`user.role`) را برای محدود کردن tab ها استفاده می‌کند (مثلا `adminOnly`).
  - اگر توکن در لوکال‌استوریج باشد `fetchMe()` را صدا می‌زند.

### 2.2) لایه ارتباط با بک‌اند (API wrapper)
- `frontend/src/api.js`
  - `API_BASE = 'http://localhost:5000/api'`
  - axios interceptor:
    - اگر پاسخ `401` باشد و درخواست `/auth/login` نباشد، session را پاک می‌کند و event به نام `auth:logout` dispatch می‌کند.
  - توابع کلیدی:
    - `login(username, password)`
    - `fetchMe()`
    - `logout()`
  - همچنین helpers:
    - `canCreatePayment()`
    - `canEditCommercialPayment()`
    - `isSelectablePermit(status)` برای مجوزهایی که UI اجازه انتخاب‌شان را می‌دهد.

### 2.3) کامپوننت‌ها/هوک‌های مشترک

#### `frontend/src/hooks/useFormKeyboardNav.js`
- یک helper برای فرم‌ها:
  - Enter -> رفتن به field بعدی
  - Shift+Enter -> field قبلی
  - اگر روی آخرین field باشید و `onSubmitLast` تعریف شده باشد آن را اجرا می‌کند.

#### `frontend/src/components/ui/index.jsx`
یک مجموعه کامپوننت UI قابل استفاده در همه صفحات:
- `Card`, `PageHeader`
- `Button`
- `TextInput`, `SelectField`
- `SearchInput`
- `StatusTabs`
- `DataTable`
- `Alert`

#### `frontend/src/components/SmartForm.jsx`
- فرم «ثبت رکورد جدید» برای صفحه Payments عمومی
- فیلدها: `personnel_code`, `first_name`, `last_name`, `date_shamsi`, `amount`, `serial`, `sheba`, `subject`, `description`
- با Enter/Keyboard Nav به فیلدهای بعدی می‌رود و در آخر submit می‌کند.

#### `frontend/src/components/PersonnelExcelImport.jsx`
- ورود گروهی پرسنل با پیش‌نمایش، انتخاب ردیف و تأیید

#### `frontend/src/components/PaymentExcelImport.jsx`
- همان جریان پرسنل برای پرداخت‌های عمومی/تجاری/ماشین‌آلات/حقوق
- `kind`: `general` | `commercial` | `machinery` | `salary`

#### `frontend/src/components/PaymentExcelExport.jsx`
- دکمه خروجی اکسل سرور برای هر نوع پرداخت (`GET /excel/export/payments/{general|commercial|machinery|salary}`)

#### `frontend/src/components/PaymentTable.jsx`
- جدول رکوردهای `payments` (legacy عمومی)
- قابلیت‌ها:
  - انتخاب ردیف‌ها (checkbox) برای عملیات گروهی (در صورت `canSelect`)
  - اگر `isLocked` باشد، سلول‌ها فقط نمایش داده می‌شوند؛ اگر نباشد editable هستند.
  - ویرایش سلولی:
    - با `onBlur` به backend `PATCH /payments/:id/update-field` ارسال می‌کند.

#### `frontend/src/components/ui/ThemePicker.jsx` و theme
- `frontend/src/theme/ThemeContext.jsx`
  - theme را در `localStorage` با کلید `pm-theme` ذخیره می‌کند.
  - روی عنصر `html` attribute `data-theme` ست می‌کند.
- `frontend/src/components/ui/ThemePicker.jsx`
  - فقط UI انتخاب تم است.

### 2.4) صفحات (Pages) — هر صفحه چه کاری می‌کند

#### `frontend/src/pages/LoginPage.jsx`
- ورود با `login(username, password)`
- نمایش error های `err.response?.data?.message`

#### `frontend/src/pages/PaymentsPage.jsx` (پرداخت عمومی/legacy)
- داده را از `GET /debug-all` می‌گیرد.
- جستجو: فیلتر local بر اساس name/serial/sheba.
- فرم ثبت دستی با `SmartForm`:
  - submit -> `POST /api/payments`
- جدول editable:
  - PATCH -> `/payments/:id/update-field`
- عملیات گروهی:
  - `POST /payments/bulk-status` برای وضعیت `'تکمیل شده'` (admin)
- خروجی اکسل:
  - `GET /excel/export/payments/general` (همه رکوردها)
- ورود اکسل با پیش‌نمایش و انتخاب ردیف:
  - `POST /excel/preview/payments` سپس `POST /excel/confirm/payments`
- پاکسازی کامل:
  - `DELETE /clear-all-data`

#### `frontend/src/pages/BusinessContactsPage.jsx`
- CRUD مخاطب تجاری:
  - GET `/business-contacts`
  - POST `/business-contacts`
  - PUT `/business-contacts/:id`
  - DELETE `/business-contacts/:id`

#### `frontend/src/pages/MachinesPage.jsx`
- CRUD ماشین‌ها:
  - GET `/machines`
  - POST `/machines`
  - PUT `/machines/:id`
  - DELETE `/machines/:id`

#### `frontend/src/pages/MachineryContactsPage.jsx`
- CRUD مخاطب ماشین‌آلات:
  - GET `/machinery-contacts`
  - GET `/machines` (برای select)
  - POST `/machinery-contacts`
  - PUT `/machinery-contacts/:id`
  - DELETE `/machinery-contacts/:id`
- آپلود Excel مخاطبین ماشین‌آلات:
  - POST `/machinery-contacts/upload-excel`

#### `frontend/src/pages/CommercialPaymentsPage.jsx`
- لیست پرداخت تجاری با tab status:
  - GET `/commercial-payments?status=...`
- lookup ها برای فرم:
  - GET `/business-contacts`
  - GET `/commercial-payment-categories`
  - GET `/executors`
  - GET `/projects`
  - GET `/permission-serials`
- ایجاد/ویرایش:
  - POST `/commercial-payments`
  - PUT `/commercial-payments/:id`
- حذف:
  - DELETE `/commercial-payments/:id` (admin و وقتی اجازه حذف داشته باشد)
- آپلود فیش:
  - POST `/commercial-payments/:id/receipt`
- ورود اکسل با پیش‌نمایش:
  - POST `/excel/preview/commercial-payments` سپس POST `/excel/confirm/commercial-payments`
- خروجی اکسل:
  - GET `/excel/export/payments/commercial`

#### `frontend/src/pages/MachineryPaymentsPage.jsx`
- مشابه تجاری، ولی endpoint های مخصوص ماشین‌آلات:
  - GET `/machinery-payments?status=...`
  - lookups: `/machinery-contacts`, `/machinery-payment-categories`, `/persian-months`, `/executors`, `/projects`, `/permission-serials`
  - POST/PUT/DELETE روی `/machinery-payments/:id`
  - آپلود رسید: `/machinery-payments/:id/receipt`
  - ورود اکسل: `/excel/preview/machinery-payments` + `/excel/confirm/machinery-payments`
  - خروجی اکسل: `/excel/export/payments/machinery`

#### `frontend/src/pages/SalaryPaymentsPage.jsx`
- مشابه، ولی endpoint های حقوق:
  - GET `/salary-payments?status=...`
  - lookups: `/personnel-contacts`, `/salary-payment-categories`, `/persian-months`, `/executors`, `/projects`, `/permission-serials`
  - POST/PUT/DELETE روی `/salary-payments/:id`
  - آپلود رسید: `/salary-payments/:id/receipt`
  - ورود اکسل: فایل فقط کد پرسنلی و مبلغ لازم دارد؛ بقیه فیلدها مرحله‌به‌مرحله پرسیده و روی کل فایل اعمال می‌شود (`/excel/preview/salary-payments` + `/excel/confirm/salary-payments`)
  - خروجی اکسل: `/excel/export/payments/salary`
  - انتخاب چندتایی + جمع مبلغ شناور در تب‌های در انتظار / در جریان پرداخت
  - انتقال گروهی وضعیت (admin): `POST /salary-payments/bulk-status`

#### `frontend/src/pages/PersonnelContactsPage.jsx`
- CRUD پرسنل:
  - GET `/personnel-contacts`
  - POST `/personnel-contacts`
  - PUT `/personnel-contacts/:id`
  - DELETE `/personnel-contacts/:id`
  - `national_id` اختیاری است؛ نام پدر در `father_name` ذخیره می‌شود

#### `frontend/src/pages/PermissionSerialsPage.jsx`
- مدیریت سریال/مجوز پرداخت:
  - لیست/فیلتر از `/permission-serials` (با params status/usage_location/recipient_user_id)
  - ایجاد:
    - POST `/permission-serials` (admin)
    - UI در زمان باز شدن فرم سعی می‌کند سریال بعدی را با `getNextSerialNumber` از آخرین رکورد حدس بزند.
  - گذار وضعیت:
    - PATCH `/permission-serials/:id/awaiting`
    - PATCH `/permission-serials/:id/void`
- خروجی اکسل client-side:
  - با `utils/excelExport.js`

#### `frontend/src/pages/ExcelOperationsPage.jsx`
- import/export اکسل «پیشرفته» با endpoint های بک‌اند + دانلود قالب:
  - ورود پرداخت‌ها (admin/accountant) با پیش‌نمایش و انتخاب:
    - `/excel/preview/payments` + `/excel/confirm/payments`
    - `/excel/preview/commercial-payments` + `/excel/confirm/commercial-payments`
    - `/excel/preview/machinery-payments` + `/excel/confirm/machinery-payments`
    - `/excel/preview/salary-payments` + `/excel/confirm/salary-payments`
  - آپلود‌های مخاطبین (admin فقط):
    - `/excel/preview/personnel` + `/excel/confirm/personnel`
    - `/excel/import/personnel-bulk-update`
    - `/excel/import/machinery-contacts`
  - خروجی‌ها (read):
    - `/excel/export/personnel`
    - `/excel/export/payments/general`
    - `/excel/export/payments/commercial`
    - `/excel/export/payments/machinery`
    - `/excel/export/payments/salary`
    - `/excel/export/payments`
    - `/excel/export/by-project`
    - `/excel/export/by-month`
    - `/excel/export/by-executor`
    - `/excel/export/by-serial`
- نمایش لاگ‌ها:
  - GET `/excel/logs`

#### `frontend/src/pages/UsersPage.jsx`
- مدیریت کاربران سیستم:
  - GET `/users`
  - POST `/users`
  - PUT `/users/:id`
  - PATCH `/users/:id/block`
  - DELETE `/users/:id`

#### `frontend/src/pages/BackupPage.jsx`
- اطلاعات دیتابیس:
  - GET `/backup/info`
- دانلود پشتیبان:
  - GET `/backup/download` (blob)
- بازیابی از فایل:
  - POST `/backup/restore` (multipart/form-data)

---

## 3) خلاصه جریان‌های مهم (برای درک سریع «منطق کسب‌وکار»)

### 3.1) زنجیره مجوز پرداخت (Permission Serial -> Payment)
برای پرداخت‌های تجاری/ماشین‌آلات/حقوق:
1. مدیر ابتدا مجوز را در `permissionSerials` ایجاد می‌کند.
2. مجوز را از «فرم خام» به «در انتظار پرداخت» منتقل می‌کند.
3. کاربر مجاز (admin/accountant) هنگام create پرداخت، مجوز را مصرف می‌کند:
   - در `services/serialService.consumeSerial`:
     - status مجوز -> `پرداخت شده`
     - `usage_location` -> محل مصرف (تجاری/پرسنل/ماشین‌آلات)
4. در update پرداخت:
   - اگر مجوز تغییر کند، old serial release و new serial consume می‌شود.
5. در delete پرداخت:
   - serial مصرف‌شده release و payment حذف می‌شود (با محدودیت‌های مربوط به status یا سند حسابداری برای برخی انواع پرداخت).

### 3.2) مسیرهای Excel
- import با پیش‌نمایش:
  - آپلود فایل -> `preview*` (بدون insert) -> مودال انتخاب در فرانت -> `confirm*` -> insert
  - پرداخت‌های تجاری/ماشین‌آلات/حقوق هنگام confirm سریال مجوز را در تراکنش مصرف می‌کنند
  - خطاها در `excel_logs` ثبت می‌شود.
- export ها:
  - `excelController` -> `services/excel/paymentExportService.js` -> ساخت workbook با `utils/excelHelpers.js` -> ارسال فایل.

---

## 4) پیشنهاد برای بهبود سند
اگر دوست داری، در نسخه بعدی می‌توانم این سند را به شکل «چارت» هم تبدیل کنم (مثلا نمودار جریان یک پرداخت از فرم فرانت تا مصرف مجوز در بک‌اند).

