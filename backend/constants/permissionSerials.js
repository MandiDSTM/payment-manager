const PERMIT_STATUSES = {
    RAW_FORM: 'فرم خام',
    AWAITING_PAYMENT: 'در انتظار پرداخت',
    VOIDED: 'باطل‌شده',
    PAID: 'پرداخت شده',
};

const SELECTABLE_STATUSES = [
    PERMIT_STATUSES.RAW_FORM,
    PERMIT_STATUSES.AWAITING_PAYMENT,
];

const USAGE_LOCATIONS = {
    COMMERCIAL: 'تجاری',
    PERSONNEL: 'پرسنل',
    MACHINERY: 'ماشین‌آلات',
};

module.exports = {
    PERMIT_STATUSES,
    SELECTABLE_STATUSES,
    USAGE_LOCATIONS,
};
