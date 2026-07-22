/**
 * قوانین دسترسی بین جداول:
 *
 * | نقش        | مشاهده        | ویرایش                                              |
 * |------------|---------------|-----------------------------------------------------|
 * | مدیر       | همه جداول     | همه جداول + تأیید نهایی پرداخت‌ها                   |
 * | حسابدار    | همه جداول     | فقط ایجاد ردیف جدید در جداول پرداخت (بدون ویرایش)   |
 * | مشاهده‌گر  | همه جداول     | ندارد (فقط read-only)                               |
 */

const ROLES = {
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    VIEWER: 'viewer',
};

const getUserRole = (req) => req.user?.role || req.headers['x-user-role'] || ROLES.VIEWER;

const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = getUserRole(req);

    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    req.userRole = role;
    next();
};

/** همه نقش‌ها — مشاهده تمام جداول */
const requireReadAccess = requireRole(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.VIEWER);

/** فقط مدیر — ویرایش/حذف جداول مخاطبین، ماشین‌ها و عملیات حساس */
const requireAdmin = requireRole(ROLES.ADMIN);

/** مدیر + حسابدار — فقط ایجاد ردیف جدید در جداول پرداخت */
const requirePaymentCreate = requireRole(ROLES.ADMIN, ROLES.ACCOUNTANT);

/** فقط مدیر — تأیید نهایی پرداخت‌ها */
const requirePaymentApprove = requireRole(ROLES.ADMIN);

/** مدیر + حسابدار — ثبت و ویرایش پرداخت‌های تجاری */
const requireCommercialPaymentWrite = requireRole(ROLES.ADMIN, ROLES.ACCOUNTANT);

module.exports = {
    ROLES,
    getUserRole,
    requireReadAccess,
    requireAdmin,
    requirePaymentCreate,
    requirePaymentApprove,
    requireCommercialPaymentWrite,
};
