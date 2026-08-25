# Backend Routes — endpointها و اتصال به کنترلرها

همه endpointها زیر `/api` قرار می‌گیرند.

---

## 1) Auth
- `POST /api/auth/login` -> `backend/controllers/authController.js#login`
- `GET /api/auth/me` -> `backend/controllers/authController.js#me` (نیازمند `requireAuth`)

---

## 2) Users (سیستم)
مسیرها در `backend/routes/users.js`:
- `GET /api/users` -> `usersController.getAll` (admin)
- `POST /api/users` -> `usersController.create` (admin)
- `PUT /api/users/:id` -> `usersController.update` (admin)
- `PATCH /api/users/:id/block` -> `usersController.setBlocked` (admin)
- `DELETE /api/users/:id` -> `usersController.remove` (admin)

---

## 3) Payments (عمومی/legacy)
در `backend/routes/payments.js`:
- `GET /api/debug-all` -> `paymentsController.getAllPayments` (read)
- `POST /api/payments` -> `paymentsController.createPayment` (admin/accountant)
- `PATCH /api/payments/:id/update-field` -> `paymentsController.updateField` (admin)
- `POST /api/payments/bulk-status` -> `paymentsController.bulkUpdateStatus` (admin)
- `DELETE /api/clear-all-data` -> `paymentsController.clearAllData` (admin)

---

## 4) Upload Excel (payments عمومی/legacy)
در `backend/routes/upload.js`:
- `POST /api/upload-excel` -> `uploadController.uploadExcel`
  - آپلود فایل: فیلد `file`
  - نیازمند `requirePaymentCreate`

---

## 5) Contacts — مخاطبین
### 5.1) Business contacts
در `backend/routes/businessContacts.js`:
- `GET /api/business-contacts`
- `GET /api/business-contacts/:id`
- `POST /api/business-contacts` (admin)
- `PUT /api/business-contacts/:id` (admin)
- `DELETE /api/business-contacts/:id` (admin)

### 5.2) Personnel contacts
در `backend/routes/personnelContacts.js`:
- `GET /api/personnel-contacts`
- `GET /api/personnel-contacts/duplicates` (admin)
- `GET /api/personnel-contacts/:id`
- `POST /api/personnel-contacts` (admin)
- `POST /api/personnel-contacts/bulk-delete` (admin)
- `POST /api/personnel-contacts/merge` (admin): `{ firstId, secondId, mode, fieldChoices? }` که `mode` یکی از `union` | `keep_first` | `keep_second` است؛ در تجمیع اگر فیلدی در هر دو مقدار متفاوت داشته باشد با `409` و `conflicts` برمی‌گردد تا کاربر برای هر فیلد `first` یا `second` را در `fieldChoices` بفرستد
- `PUT /api/personnel-contacts/:id` (admin)
- `DELETE /api/personnel-contacts/:id` (admin)

### 5.3) Machinery contacts
در `backend/routes/machineryContacts.js`:
- `GET /api/machinery-contacts`
- `GET /api/machinery-contacts/:id`
- `POST /api/machinery-contacts` (admin)
- `PUT /api/machinery-contacts/:id` (admin)
- `DELETE /api/machinery-contacts/:id` (admin)
- `POST /api/machinery-contacts/upload-excel` -> `machineryContactsUploadController.uploadExcel` (admin)
  - آپلود فایل: فیلد `file`

---

## 6) Machines
در `backend/routes/machines.js`:
- `GET /api/machines`
- `POST /api/machines` (admin)
- `PUT /api/machines/:id` (admin)
- `DELETE /api/machines/:id` (admin)

---

## 7) Payments — انواع پرداخت
### 7.1) Commercial payments
در `backend/routes/commercialPayments.js`:
- `GET /api/commercial-payments`
- `GET /api/commercial-payments/:id`
- `POST /api/commercial-payments` (admin/accountant)
- `PUT /api/commercial-payments/:id` (admin/accountant)
- `DELETE /api/commercial-payments/:id` (admin)
- `POST /api/commercial-payments/:id/receipt` -> `uploadReceipt` + `commercialPaymentsController.uploadReceipt`

### 7.2) Machinery payments
در `backend/routes/machineryPayments.js`:
- `GET /api/machinery-payments`
- `GET /api/machinery-payments/:id`
- `POST /api/machinery-payments` (admin/accountant)
- `PUT /api/machinery-payments/:id` (admin/accountant)
- `DELETE /api/machinery-payments/:id` (admin)
- `POST /api/machinery-payments/:id/receipt`

### 7.3) Salary payments
در `backend/routes/salaryPayments.js`:
- `GET /api/salary-payments`
- `GET /api/salary-payments/:id`
- `POST /api/salary-payments` (admin/accountant)
- `POST /api/salary-payments/bulk-status` (admin) — انتقال بین «در انتظار پرداخت» و «در جریان پرداخت»
- `PUT /api/salary-payments/:id` (admin/accountant)
- `DELETE /api/salary-payments/:id` (admin)
- `POST /api/salary-payments/:id/receipt`

---

## 8) Permission Serials
در `backend/routes/permissionSerials.js`:
- `GET /api/permission-serials`
- `GET /api/permission-serials/:id`
- `POST /api/permission-serials` (admin)
- `PATCH /api/permission-serials/:id/awaiting` (admin)
- `PATCH /api/permission-serials/:id/void` (admin)

---

## 9) Excel (import/export + قالب‌ها + logs)
در `backend/routes/excel.js`:
- `GET /api/excel/logs` -> `excelController.getLogs`
- `GET /api/excel/template/:type` -> `excelController.downloadTemplate`
  - نوع‌ها: `personnel`, `payments`, `commercial-payments`, `machinery-payments`, `salary-payments`, `machinery-contacts`
- `POST /api/excel/preview/personnel` -> `excelController.previewPersonnel`
- `POST /api/excel/confirm/personnel` -> `excelController.confirmPersonnel`
- `POST /api/excel/import/personnel` -> `excelController.importPersonnel`
- `POST /api/excel/import/personnel-bulk-update` -> `excelController.importPersonnelBulkUpdate`
- `POST /api/excel/import/machinery-contacts` -> `excelController.importMachineryContacts`
- `POST /api/excel/preview/payments` -> `excelController.previewPayments` (admin/accountant)
- `POST /api/excel/confirm/payments` -> `excelController.confirmPayments` (admin/accountant)
- `POST /api/excel/preview/commercial-payments` -> `excelController.previewCommercialPayments` (admin/accountant)
- `POST /api/excel/confirm/commercial-payments` -> `excelController.confirmCommercialPayments` (admin/accountant)
- `POST /api/excel/preview/machinery-payments` -> `excelController.previewMachineryPayments` (admin/accountant)
- `POST /api/excel/confirm/machinery-payments` -> `excelController.confirmMachineryPayments` (admin/accountant)
- `POST /api/excel/preview/salary-payments` -> `excelController.previewSalaryPayments` (admin/accountant)
- `POST /api/excel/confirm/salary-payments` -> `excelController.confirmSalaryPayments` (admin/accountant)
- `GET /api/excel/export/payments` -> `excelController.exportPayments` (همه انواع در یک فایل)
- `GET /api/excel/export/payments/general` -> `excelController.exportGeneralPayments`
- `GET /api/excel/export/payments/commercial` -> `excelController.exportCommercialPayments`
- `GET /api/excel/export/payments/machinery` -> `excelController.exportMachineryPayments`
- `GET /api/excel/export/payments/salary` -> `excelController.exportSalaryPayments`
- `GET /api/excel/export/by-project` -> `excelController.exportByProject`
- `GET /api/excel/export/by-month` -> `excelController.exportByMonth`
- `GET /api/excel/export/by-executor` -> `excelController.exportByExecutor`
- `GET /api/excel/export/by-serial` -> `excelController.exportBySerial`
- `GET /api/excel/export/personnel` -> `excelController.exportPersonnel` (اختیاری: `ids=1,2,3` برای خروجی همان فهرست فیلترشده)

---

## 10) Lookups (داده‌های مرجع فرم‌ها)
در `backend/routes/lookups.js`:
- `GET/POST /api/commercial-payment-categories` + PUT/DELETE (admin)
- `GET/POST /api/salary-payment-categories` + PUT/DELETE (admin)
- `GET/POST /api/machinery-payment-categories` + PUT/DELETE (admin)
- `GET /api/persian-months`
- `GET/POST /api/executors` + PUT/DELETE (admin)؛ مجری: `first_name` و `last_name` اجباری
- `GET/POST /api/projects` + PUT/DELETE (admin)
- `GET /api/users`

---

## 11) Backup
در `backend/routes/backup.js`:
- `GET /api/backup/info` (admin)
- `GET /api/backup/download` (admin)
- `POST /api/backup/restore` (admin) + آپلود فایل `.sqlite/.db`

