# Frontend Overview — ساختار کلی

فرانت با **React** ساخته شده و با **axios** به بک‌اند وصل می‌شود.

---

## 1) Entry / Theme
- `frontend/src/main.jsx`
  - رندر `App` داخل `ThemeProvider`
  - بارگذاری `index.css`
- `frontend/src/theme/ThemeContext.jsx`
  - theme را در `localStorage` ذخیره می‌کند (کلید `pm-theme`)
  - attribute روی `html` را با `data-theme` عوض می‌کند
- `frontend/src/theme/themes.js`
  - لیست theme ها: `light`, `slate`, `ocean`

---

## 2) App Navigation (چه چیزی نمایش داده می‌شود؟)
- `frontend/src/App.jsx`
  - `NAV_GROUPS` چند دسته‌ی ناوبری می‌سازد (Payments/Contacts/System)
  - بر اساس `user.role` تب‌های `adminOnly` را نشان/پنهان می‌کند
  - اگر توکن داشته باشد:
    - `fetchMe()` را اجرا می‌کند
  - اگر auth برقرار نباشد:
    - `LoginPage` نمایش داده می‌شود

---

## 3) API Layer
- `frontend/src/api.js`
  - `API_BASE = http://localhost:5000/api`
  - interceptor axios:
    - اگر `401` باشد و درخواست `'/auth/login'` نباشد:
      - `localStorage` پاک می‌شود
      - event به نام `auth:logout` dispatch می‌شود

توابع کلیدی:
- `login(username, password)` -> `/auth/login`
- `fetchMe()` -> `/auth/me`
- `logout()`

همچنین helpers برای UI:
- `canCreatePayment()`
- `canEditCommercialPayment()`
- `isSelectablePermit(status)`

