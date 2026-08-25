const STATUS = {
    UNREGISTERED: 'ثبت نشده',
    AWAITING_PAYMENT: 'در انتظار پرداخت',
    IN_PROGRESS: 'در جریان پرداخت',
    PAID: 'پرداخت شده',
};

const PAYMENT_STATUSES = [
    STATUS.UNREGISTERED,
    STATUS.AWAITING_PAYMENT,
    STATUS.IN_PROGRESS,
    STATUS.PAID,
];

const DEFAULT_STATUS = STATUS.AWAITING_PAYMENT;
const WORKFLOW_STATUSES = [STATUS.AWAITING_PAYMENT, STATUS.IN_PROGRESS];

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
    STATUS,
    PAYMENT_STATUSES,
    DEFAULT_STATUS,
    WORKFLOW_STATUSES,
    CATEGORIES,
    MONTHLY_WORK_CATEGORY,
    PERSIAN_MONTHS,
};
