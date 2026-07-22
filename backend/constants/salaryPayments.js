const PAYMENT_STATUSES = [
    'ثبت نشده',
    'در انتظار پرداخت',
    'در جریان پرداخت',
    'پرداخت شده',
];

const CATEGORIES = [
    'مساعده',
    'کارکرد ماهانه',
    'درمان',
    'تشویقی',
    'عیدی و پاداش',
    'مأموریت',
];

const MONTHLY_WORK_CATEGORY = 'کارکرد ماهانه';

const { PERSIAN_MONTHS } = require('./machineryPayments');

module.exports = {
    PAYMENT_STATUSES,
    CATEGORIES,
    MONTHLY_WORK_CATEGORY,
    PERSIAN_MONTHS,
};
