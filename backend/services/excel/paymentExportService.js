const db = require('../../config/db-config');
const { buildWorkbookBuffer } = require('../../utils/excelHelpers');

const fetchAllPayments = async () => {
    const [commercial, salary, machinery, legacy] = await Promise.all([
        db('commercial_payments as p')
            .leftJoin('business_contacts as c', 'p.business_contact_id', 'c.id')
            .leftJoin('commercial_payment_categories as cat', 'p.category_id', 'cat.id')
            .leftJoin('executors as e', 'p.executor_id', 'e.id')
            .leftJoin('projects as pr', 'p.project_id', 'pr.id')
            .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
            .select(
                db.raw("'تجاری' as payment_type"),
                'p.id',
                'p.amount',
                'p.status',
                'p.description',
                'p.created_at',
                db.raw("'' as month"),
                'c.business_name as payee',
                'cat.name as category',
                'e.name as executor_name',
                'pr.name as project_name',
                's.serial_number',
            ),
        db('salary_payments as p')
            .leftJoin('personnel_contacts as c', 'p.personnel_contact_id', 'c.id')
            .leftJoin('salary_payment_categories as cat', 'p.category_id', 'cat.id')
            .leftJoin('executors as e', 'p.executor_id', 'e.id')
            .leftJoin('projects as pr', 'p.project_id', 'pr.id')
            .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
            .select(
                db.raw("'حقوق' as payment_type"),
                'p.id',
                'p.amount',
                'p.status',
                'p.description',
                'p.created_at',
                'p.month',
                db.raw("c.personnel_code || ' - ' || c.first_name || ' ' || c.last_name as payee"),
                'cat.name as category',
                'e.name as executor_name',
                'pr.name as project_name',
                's.serial_number',
            ),
        db('machinery_payments as p')
            .leftJoin('machinery_contacts as c', 'p.machinery_contact_id', 'c.id')
            .leftJoin('machines as m', 'c.machine_id', 'm.id')
            .leftJoin('machinery_payment_categories as cat', 'p.category_id', 'cat.id')
            .leftJoin('executors as e', 'p.executor_id', 'e.id')
            .leftJoin('projects as pr', 'p.project_id', 'pr.id')
            .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
            .select(
                db.raw("'ماشین‌آلات' as payment_type"),
                'p.id',
                'p.amount',
                'p.status',
                'p.description',
                'p.created_at',
                'p.month',
                db.raw("c.account_code || ' - ' || m.name as payee"),
                'cat.name as category',
                'e.name as executor_name',
                'pr.name as project_name',
                's.serial_number',
            ),
        db('payments').select(
            db.raw("'عمومی' as payment_type"),
            'id',
            'amount',
            'status',
            'description',
            'created_at',
            db.raw("date_shamsi as month"),
            db.raw("personnel_code || ' - ' || first_name || ' ' || last_name as payee"),
            db.raw("subject as category"),
            db.raw("'' as executor_name"),
            db.raw("project_name"),
            db.raw("serial as serial_number"),
        ),
    ]);

    return [...commercial, ...salary, ...machinery, ...legacy];
};

const toExportRow = (p) => ({
    'نوع پرداخت': p.payment_type,
    'شناسه': p.id,
    'مبلغ': p.amount,
    'وضعیت': p.status,
    'ماه': p.month || '',
    'طرف حساب': p.payee || '',
    'دسته‌بندی': p.category || '',
    'مجری': p.executor_name || '',
    'پروژه': p.project_name || '',
    'سریال مجوز': p.serial_number || '',
    'توضیحات': p.description || '',
    'تاریخ ثبت': p.created_at || '',
});

const exportPaymentsList = async () => {
    const payments = await fetchAllPayments();
    return buildWorkbookBuffer('لیست پرداخت‌ها', payments.map(toExportRow), {
        title: 'گزارش لیست پرداخت‌ها',
    });
};

const groupAndExport = async (key, label) => {
    const payments = await fetchAllPayments();
    const groups = {};

    payments.forEach((p) => {
        const groupKey = p[key] || 'نامشخص';
        if (!groups[groupKey]) {
            groups[groupKey] = { [label]: groupKey, 'تعداد': 0, 'جمع مبلغ': 0 };
        }
        groups[groupKey]['تعداد'] += 1;
        groups[groupKey]['جمع مبلغ'] += Number(p.amount) || 0;
    });

    return buildWorkbookBuffer(`گزارش ${label}`, Object.values(groups), {
        title: `گزارش پرداخت‌ها بر اساس ${label}`,
    });
};

const exportByProject = () => groupAndExport('project_name', 'پروژه');
const exportByMonth = () => groupAndExport('month', 'ماه');
const exportByExecutor = () => groupAndExport('executor_name', 'مجری');
const exportBySerial = () => groupAndExport('serial_number', 'سریال مجوز');

const formatDate = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return String(value);
    }
};

const exportGeneralPayments = async () => {
    const rows = await db('payments').select('*').orderBy('id', 'desc');
    return buildWorkbookBuffer('پرداخت عمومی', rows.map((p, index) => ({
        'ردیف': index + 1,
        'کد پرسنلی': p.personnel_code || '',
        'نام': p.first_name || '',
        'نام خانوادگی': p.last_name || '',
        'تاریخ': p.date_shamsi || '',
        'مبلغ': p.amount || 0,
        'سریال': p.serial || '',
        'شماره شبا': p.sheba || '',
        'بابت': p.subject || '',
        'توضیحات': p.description || '',
        'وضعیت': p.status || '',
        'تاریخ ثبت': formatDate(p.created_at),
    })), {
        title: 'خروجی پرداخت‌های عمومی',
        textColumns: ['کد پرسنلی', 'سریال', 'شماره شبا', 'تاریخ'],
    });
};

const exportCommercialPayments = async () => {
    const rows = await db('commercial_payments as p')
        .leftJoin('business_contacts as c', 'p.business_contact_id', 'c.id')
        .leftJoin('commercial_payment_categories as cat', 'p.category_id', 'cat.id')
        .leftJoin('executors as e', 'p.executor_id', 'e.id')
        .leftJoin('projects as pr', 'p.project_id', 'pr.id')
        .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
        .leftJoin('users as u', 'p.recorded_by_user_id', 'u.id')
        .select(
            'p.amount',
            'p.status',
            'p.description',
            'p.created_at',
            'c.account_code',
            'c.business_name',
            'cat.name as category_name',
            'e.name as executor_name',
            'pr.name as project_name',
            's.serial_number',
            'u.name as recorded_by_name',
        )
        .orderBy('p.id', 'desc');

    return buildWorkbookBuffer('پرداخت تجاری', rows.map((p, index) => ({
        'ردیف': index + 1,
        'کد طرف حساب': p.account_code || '',
        'نام تجاری': p.business_name || '',
        'مبلغ': p.amount || 0,
        'دسته‌بندی': p.category_name || '',
        'مجری': p.executor_name || '',
        'پروژه': p.project_name || '',
        'سریال مجوز': p.serial_number || '',
        'وضعیت': p.status || '',
        'توضیحات': p.description || '',
        'ثبت‌کننده': p.recorded_by_name || '',
        'تاریخ ثبت': formatDate(p.created_at),
    })), {
        title: 'خروجی پرداخت‌های تجاری',
        textColumns: ['کد طرف حساب', 'سریال مجوز'],
    });
};

const exportMachineryPayments = async () => {
    const rows = await db('machinery_payments as p')
        .leftJoin('machinery_contacts as c', 'p.machinery_contact_id', 'c.id')
        .leftJoin('machines as m', 'c.machine_id', 'm.id')
        .leftJoin('machinery_payment_categories as cat', 'p.category_id', 'cat.id')
        .leftJoin('executors as e', 'p.executor_id', 'e.id')
        .leftJoin('projects as pr', 'p.project_id', 'pr.id')
        .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
        .leftJoin('users as u', 'p.recorded_by_user_id', 'u.id')
        .select(
            'p.amount',
            'p.month',
            'p.status',
            'p.description',
            'p.created_at',
            'c.account_code',
            'c.first_name',
            'c.last_name',
            'm.name as machine_name',
            'cat.name as category_name',
            'e.name as executor_name',
            'pr.name as project_name',
            's.serial_number',
            'u.name as recorded_by_name',
        )
        .orderBy('p.id', 'desc');

    return buildWorkbookBuffer('پرداخت ماشین', rows.map((p, index) => ({
        'ردیف': index + 1,
        'کد طرف حساب': p.account_code || '',
        'ماشین': p.machine_name || '',
        'نام مخاطب': `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        'مبلغ': p.amount || 0,
        'دسته‌بندی': p.category_name || '',
        'ماه': p.month || '',
        'مجری': p.executor_name || '',
        'پروژه': p.project_name || '',
        'سریال مجوز': p.serial_number || '',
        'وضعیت': p.status || '',
        'توضیحات': p.description || '',
        'ثبت‌کننده': p.recorded_by_name || '',
        'تاریخ ثبت': formatDate(p.created_at),
    })), {
        title: 'خروجی پرداخت ماشین‌آلات',
        textColumns: ['کد طرف حساب', 'سریال مجوز'],
    });
};

const exportSalaryPayments = async () => {
    const rows = await db('salary_payments as p')
        .leftJoin('personnel_contacts as c', 'p.personnel_contact_id', 'c.id')
        .leftJoin('salary_payment_categories as cat', 'p.category_id', 'cat.id')
        .leftJoin('executors as e', 'p.executor_id', 'e.id')
        .leftJoin('projects as pr', 'p.project_id', 'pr.id')
        .leftJoin('payment_permission_serials as s', 'p.permission_serial_id', 's.id')
        .leftJoin('users as u', 'p.recorded_by_user_id', 'u.id')
        .select(
            'p.amount',
            'p.month',
            'p.status',
            'p.description',
            'p.created_at',
            'c.personnel_code',
            'c.first_name',
            'c.last_name',
            'cat.name as category_name',
            'e.name as executor_name',
            'pr.name as project_name',
            's.serial_number',
            'u.name as recorded_by_name',
        )
        .orderBy('p.id', 'desc');

    return buildWorkbookBuffer('پرداخت حقوق', rows.map((p, index) => ({
        'ردیف': index + 1,
        'کد پرسنلی': p.personnel_code || '',
        'نام': p.first_name || '',
        'نام خانوادگی': p.last_name || '',
        'مبلغ': p.amount || 0,
        'دسته‌بندی': p.category_name || '',
        'ماه': p.month || '',
        'مجری': p.executor_name || '',
        'پروژه': p.project_name || '',
        'سریال مجوز': p.serial_number || '',
        'وضعیت': p.status || '',
        'توضیحات': p.description || '',
        'ثبت‌کننده': p.recorded_by_name || '',
        'تاریخ ثبت': formatDate(p.created_at),
    })), {
        title: 'خروجی پرداخت حقوق',
        textColumns: ['کد پرسنلی', 'سریال مجوز'],
    });
};

module.exports = {
    exportPaymentsList,
    exportByProject,
    exportByMonth,
    exportByExecutor,
    exportBySerial,
    exportGeneralPayments,
    exportCommercialPayments,
    exportMachineryPayments,
    exportSalaryPayments,
};
