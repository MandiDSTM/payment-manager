# Frontend Pages — هر صفحه چه می‌کند؟

این فایل نقش‌محور است و تمرکز روی endpointهایی است که هر Page مصرف می‌کند.

---

## `LoginPage`
- ورود به سیستم:
  - `api.login(username, password)` -> `POST /api/auth/login`

---

## `PaymentsPage` (عمومی/legacy)
اتصال‌ها:
- `GET /api/debug-all` -> برای نمایش جدول `payments`
- ثبت دستی:
  - `POST /api/payments`
- ویرایش فیلد:
  - `PATCH /api/payments/:id/update-field`
- عملیات گروهی (admin):
  - `POST /api/payments/bulk-status` با status = `تکمیل شده`
- پاکسازی (admin):
  - `DELETE /api/clear-all-data`
- آپلود اکسل (اگر مجاز باشد):
  - `POST /api/excel/preview/payments` (multipart/form-data) سپس مودال انتخاب
  - `POST /api/excel/confirm/payments` برای ثبت ردیف‌های انتخاب‌شده
  - قالب: `GET /api/excel/template/payments`
  - مسیر قدیمی `POST /api/upload-excel` هنوز برای سازگاری وجود دارد

---

## `BusinessContactsPage`
- لیست و details:
  - `GET /api/business-contacts`
- CRUD:
  - `POST /api/business-contacts`
  - `PUT /api/business-contacts/:id`
  - `DELETE /api/business-contacts/:id`

---

## `MachinesPage`
- لیست و CRUD:
  - `GET /api/machines`
  - `POST /api/machines`
  - `PUT /api/machines/:id`
  - `DELETE /api/machines/:id`

---

## `MachineryContactsPage`
- لیست مخاطبین:
  - `GET /api/machinery-contacts`
- select برای ماشین‌ها:
  - `GET /api/machines`
- CRUD:
  - `POST /api/machinery-contacts`
  - `PUT /api/machinery-contacts/:id`
  - `DELETE /api/machinery-contacts/:id`
- آپلود اکسل (admin):
  - `POST /api/machinery-contacts/upload-excel` (multipart/form-data)

---

## `CommercialPaymentsPage` (تجاری)
Lookups:
- `GET /api/business-contacts`
- `GET /api/commercial-payment-categories`
- `GET /api/executors`
- `GET /api/projects`
- `GET /api/permission-serials`

پرداخت‌ها:
- `GET /api/commercial-payments?status=...`
- ایجاد/ویرایش:
  - `POST /api/commercial-payments`
  - `PUT /api/commercial-payments/:id`
- حذف (admin):
  - `DELETE /api/commercial-payments/:id`
- آپلود فیش:
  - `POST /api/commercial-payments/:id/receipt`
- ورود اکسل (admin/accountant):
  - `POST /api/excel/preview/commercial-payments`
  - `POST /api/excel/confirm/commercial-payments`
  - قالب: `GET /api/excel/template/commercial-payments`

---

## `MachineryPaymentsPage` (ماشین‌آلات)
Lookups:
- `GET /api/machinery-contacts`
- `GET /api/machinery-payment-categories`
- `GET /api/persian-months`
- `GET /api/executors`
- `GET /api/projects`
- `GET /api/permission-serials`

پرداخت‌ها:
- `GET /api/machinery-payments?status=...`
- ایجاد/ویرایش/حذف:
  - `POST /api/machinery-payments`
  - `PUT /api/machinery-payments/:id`
  - `DELETE /api/machinery-payments/:id`
- آپلود فیش:
  - `POST /api/machinery-payments/:id/receipt`
- ورود اکسل (admin/accountant):
  - `POST /api/excel/preview/machinery-payments`
  - `POST /api/excel/confirm/machinery-payments`
  - قالب: `GET /api/excel/template/machinery-payments`

---

## `SalaryPaymentsPage` (حقوق)
Lookups:
- `GET /api/personnel-contacts`
- `GET /api/salary-payment-categories`
- `GET /api/persian-months`
- `GET /api/executors`
- `GET /api/projects`
- `GET /api/permission-serials`

پرداخت‌ها:
- `GET /api/salary-payments?status=...`
- ایجاد/ویرایش/حذف:
  - `POST /api/salary-payments`
  - `PUT /api/salary-payments/:id`
  - `DELETE /api/salary-payments/:id`
- ورود اکسل (admin/accountant):
  - فایل حداقل باید `کد پرسنلی` و `مبلغ` داشته باشد
  - اگر دسته/ماه/مجری/پروژه/سریال خالی باشد: ویزارد مرحله‌به‌مرحله (`SalaryImportDefaultsWizard`) مقدار را می‌گیرد و روی همه ردیف‌ها اعمال می‌کند
  - سپس پیش‌نمایش + انتخاب ردیف: `POST /api/excel/preview/salary-payments` و `POST /api/excel/confirm/salary-payments`
  - قالب: `GET /api/excel/template/salary-payments`

---

## `PersonnelContactsPage`
- لیست:
  - `GET /api/personnel-contacts`
- CRUD:
  - `POST /api/personnel-contacts`
  - `PUT /api/personnel-contacts/:id`
  - `DELETE /api/personnel-contacts/:id`
  - ورود اکسل از همین صفحه: پیش‌نمایش + تأیید (`/excel/preview/personnel` و `/excel/confirm/personnel`)

---

## `PermissionSerialsPage` (مجوز پرداخت)
- لیست/فیلتر:
  - `GET /api/permission-serials` با params:
    - `status`, `usage_location`, `recipient_user_id`
- ایجاد مجوز:
  - `POST /api/permission-serials`
- گذار وضعیت (admin):
  - `PATCH /api/permission-serials/:id/awaiting`
  - `PATCH /api/permission-serials/:id/void`

خروجی اکسل:
- client-side export با `frontend/src/utils/excelExport.js`

---

## `ExcelOperationsPage`
ورود پرداخت‌ها (admin/accountant) با همان جریان پرسنل:
- آپلود → `POST /api/excel/preview/{payments|commercial-payments|machinery-payments|salary-payments}`
- مودال انتخاب با چک‌باکس → `POST /api/excel/confirm/...`
- در خطای سریال تکراری/غیرقابل‌مصرف یا مرجع نامعتبر، مودال باز می‌ماند و ردیف خطا هایلایت می‌شود

Import پرسنل (admin):
- آپلود → `POST /api/excel/preview/personnel`
- مودال انتخاب با چک‌باکس → `POST /api/excel/confirm/personnel`
- در خطای یکتایی کد پرسنلی/کد ملی، مودال باز می‌ماند و ردیف خطا هایلایت می‌شود

سایر Import:
- `POST /api/excel/import/personnel-bulk-update`
- `POST /api/excel/import/machinery-contacts`

Download templates:
- `GET /api/excel/template/:type`
  - `personnel`, `payments`, `commercial-payments`, `machinery-payments`, `salary-payments`, `machinery-contacts`

Export (read):
- `GET /api/excel/export/personnel`
- `GET /api/excel/export/payments`
- `GET /api/excel/export/by-project`
- `GET /api/excel/export/by-month`
- `GET /api/excel/export/by-executor`
- `GET /api/excel/export/by-serial`

Logs:
- `GET /api/excel/logs`

---

## `UsersPage` (admin)
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PATCH /api/users/:id/block`
- `DELETE /api/users/:id`

---

## `BackupPage` (admin)
- `GET /api/backup/info`
- `GET /api/backup/download` (blob)
- `POST /api/backup/restore` (multipart/form-data)

