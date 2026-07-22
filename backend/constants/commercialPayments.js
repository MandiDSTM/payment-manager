const PAYMENT_STATUSES = [
    'ثبت نشده',
    'در انتظار ثبت سند',
    'تکمیل شده',
];

const { USAGE_LOCATIONS } = require('./permissionSerials');

const CATEGORIES = [
    'خرید کالا',
    'مواد غذایی',
    'ابزار',
    'تجهیزات',
    'کرایه حمل بار',
];

module.exports = {
    PAYMENT_STATUSES,
    USAGE_LOCATIONS,
    CATEGORIES,
};
