# Backend Overview — ساختار کلی

این بک‌اند با **Node.js + Express** نوشته شده و دیتابیس برنامه **SQLite** است که با **Knex** مدیریت می‌شود.

---

## 1) Entry Points
- `backend/server.js`
  - راه‌اندازی سرور روی پورت `5000`
- `backend/app.js`
  - ست کردن middleware ها:
    - `cors`
    - `express.json()`
    - سرویس‌دهی فایل‌های آپلود شده: `/uploads` (از فولدر `backend/uploads`)
  - اتصال روت‌ها: زیر `/api`
- `backend/setup-db.js`
  - ساخت/seed کردن جدول‌ها با `knex.schema`

---

## 2) دیتابیس و جدول‌های اصلی
دیتابیس: `backend/database.sqlite` (از طریق `backend/config/db-config.js`)

جدول‌ها که در `setup-db.js` ساخته می‌شوند (خلاصه):
- `users`: کاربران با `role` و `is_blocked`
- مخاطبین:
  - `business_contacts`
  - `personnel_contacts`
  - `machines`
  - `machinery_contacts`
- پرداخت‌ها:
  - `payments` (عمومی/legacy)
  - `commercial_payments` (تجاری)
  - `machinery_payments` (ماشین‌آلات)
  - `salary_payments` (حقوق)
- مرجع‌ها:
  - `commercial_payment_categories`
  - `machinery_payment_categories`
  - `salary_payment_categories`
  - `executors`
  - `projects`
- مجوزها:
  - `payment_permission_serials`
- لاگ‌ها:
  - `excel_logs` (برای import/export و خطاها)

---

## 3) Auth & Authorization
### `backend/middleware/auth.js`
- JWT را از `Authorization: Bearer <token>` می‌گیرد
- با `jwtSecret` verify می‌کند
- کاربر را از جدول `users` لود می‌کند و در `req.user` قرار می‌دهد
- اگر کاربر `is_blocked` باشد: `403`

### `backend/middleware/authorize.js`
قوانین نقش‌ها:
- `requireReadAccess`: مشاهده (admin/accountant/viewer)
- `requireAdmin`: مدیر فقط
- `requirePaymentCreate`: مدیر + حسابدار (فقط create پرداخت‌ها)
- `requirePaymentApprove`: مدیر فقط (مثل bulk confirm)
- `requireCommercialPaymentWrite`: مدیر + حسابدار (نوشتن پرداخت‌های تجاری + مسیرهای حساس مرتبط)

