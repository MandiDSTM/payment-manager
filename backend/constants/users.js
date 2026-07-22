const ROLES = {
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    VIEWER: 'viewer',
};

const ROLE_LABELS = {
    [ROLES.ADMIN]: 'مدیر',
    [ROLES.ACCOUNTANT]: 'حسابدار',
    [ROLES.VIEWER]: 'مشاهده‌گر',
};

const VALID_ROLES = Object.values(ROLES);

module.exports = {
    ROLES,
    ROLE_LABELS,
    VALID_ROLES,
};
