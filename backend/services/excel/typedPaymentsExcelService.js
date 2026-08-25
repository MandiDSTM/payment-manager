const db = require('../../config/db-config');
const { USAGE_LOCATIONS } = require('../../constants/permissionSerials');
const { PAYMENT_STATUSES: COMMERCIAL_STATUSES } = require('../../constants/commercialPayments');
const {
    PAYMENT_STATUSES: MACHINERY_STATUSES,
    PERSIAN_MONTHS,
} = require('../../constants/machineryPayments');
const { PAYMENT_STATUSES: SALARY_STATUSES, DEFAULT_STATUS: SALARY_DEFAULT_STATUS } = require('../../constants/salaryPayments');
const { consumeSerial, isSelectable } = require('../serialService');
const commercialPaymentService = require('../commercialPaymentService');
const machineryPaymentService = require('../machineryPaymentService');
const salaryPaymentService = require('../salaryPaymentService');
const {
    readSheetRows,
    validateRequiredColumns,
    buildWorkbookBuffer,
} = require('../../utils/excelHelpers');
const {
    cellText,
    isEmptyRow,
    parseAmount,
    identifyColumns,
    indexRecords,
    pickOne,
    markDuplicateFieldErrors,
    uniqueErrorList,
    finalizePreviewRows,
} = require('./excelImportUtils');

const COMMON_COLUMNS = {
    amount: ['مبلغ', 'amount', 'هزینه'],
    category: ['دسته‌بندی', 'دسته بندی', 'دسته', 'category'],
    executor: ['مجری', 'نام مجری', 'executor'],
    project: ['پروژه', 'نام پروژه', 'project'],
    serial: ['سریال مجوز', 'سریال', 'شماره سریال', 'مجوز پرداخت', 'serial'],
    status: ['وضعیت', 'وضعیت پرداخت', 'status'],
    month: ['ماه', 'ماه کارکرد', 'month'],
};

const loadIndexedLookups = async (config) => {
    const [executors, projects, serials, categories, contacts] = await Promise.all([
        db('executors').select('*'),
        db('projects').select('*'),
        db('payment_permission_serials').select('*'),
        db(config.categoryTable).select('*'),
        config.loadContacts(),
    ]);

    return {
        executors,
        projects,
        serials,
        categories,
        contacts,
        executorByName: indexRecords(executors, ['name']),
        projectByName: indexRecords(projects, ['name']),
        serialByNumber: indexRecords(serials, ['serial_number']),
        categoryByName: indexRecords(categories, ['name']),
        contactIndex: indexRecords(contacts, config.contactLookupFields),
        serialById: new Map(serials.map((s) => [s.id, s])),
        executorById: new Map(executors.map((e) => [e.id, e])),
        projectById: new Map(projects.map((p) => [p.id, p])),
        categoryById: new Map(categories.map((c) => [c.id, c])),
        contactById: new Map(contacts.map((c) => [c.id, c])),
    };
};

const resolveSerial = (lookups, serialNumber) => {
    const result = pickOne(lookups.serialByNumber, serialNumber, 'سریال مجوز');
    if (result.error) return result;
    if (!isSelectable(result.record.status)) {
        return { error: `سریال مجوز «${result.record.serial_number}» قابل مصرف نیست (وضعیت: ${result.record.status})` };
    }
    return result;
};

const isDeferrable = (config, field) => (config.deferrableFields || []).includes(field);

const resolveLookupField = (value, resolver, field, config, errors) => {
    if (!value) {
        if (isDeferrable(config, field)) return { record: null };
        const result = resolver('');
        if (result.error) errors.push(result.error);
        return result;
    }
    const result = resolver(value);
    if (result.error) {
        if (isDeferrable(config, field)) return { record: null };
        errors.push(result.error);
    }
    return result;
};

const resolveTypedRow = (normalized, lookups, config) => {
    const errors = [];
    const warnings = [];
    const infos = [];

    if (normalized.amountEmpty) errors.push('مبلغ خالی است');
    else if (normalized.amountInvalid || !normalized.amount || normalized.amount <= 0) {
        errors.push('مبلغ باید بزرگ‌تر از صفر باشد');
    }

    const contact = pickOne(lookups.contactIndex, normalized.contactKey, config.contactLabel);
    if (contact.error) errors.push(contact.error);

    const category = resolveLookupField(
        normalized.category,
        (value) => pickOne(lookups.categoryByName, value, 'دسته‌بندی'),
        'category',
        config,
        errors,
    );
    const executor = resolveLookupField(
        normalized.executor,
        (value) => pickOne(lookups.executorByName, value, 'مجری'),
        'executor',
        config,
        errors,
    );
    const project = resolveLookupField(
        normalized.project,
        (value) => pickOne(lookups.projectByName, value, 'پروژه'),
        'project',
        config,
        errors,
    );
    const serial = resolveLookupField(
        normalized.serial,
        (value) => resolveSerial(lookups, value),
        'serial',
        config,
        errors,
    );

    let month = normalized.month;
    if (config.hasMonth) {
        if (!month) {
            if (!isDeferrable(config, 'month')) errors.push('ماه خالی است');
        } else if (!PERSIAN_MONTHS.includes(month)) {
            if (isDeferrable(config, 'month')) month = null;
            else errors.push(`ماه «${month}» نامعتبر است`);
        }
    }

    let status = normalized.status;
    if (!status) {
        status = config.defaultStatus;
        infos.push(`وضعیت خالی بود؛ «${status}» در نظر گرفته شد`);
    } else if (config.kind === 'salary' && status === 'ثبت نشده') {
        status = config.defaultStatus;
        infos.push(`وضعیت «ثبت نشده» به «${status}» تبدیل شد`);
    } else if (!config.statuses.includes(status)) {
        errors.push(`وضعیت «${status}» نامعتبر است`);
    }

    const data = {
        [config.contactIdField]: contact.record?.id || null,
        amount: normalized.amountInvalid ? null : normalized.amount,
        category_id: category.record?.id || null,
        executor_id: executor.record?.id || null,
        project_id: project.record?.id || null,
        permission_serial_id: serial.record?.id || null,
        status,
    };
    if (config.hasMonth) data.month = month || null;

    const display = {
        contact: contact.record ? config.contactDisplay(contact.record) : (normalized.contactKey || '—'),
        personnel_name: contact.record
            ? `${contact.record.first_name || ''} ${contact.record.last_name || ''}`.trim()
            : '',
        personnel_code: contact.record?.personnel_code || '',
        amount: data.amount,
        category: category.record?.name || normalized.category || '—',
        month: config.hasMonth ? (month || '—') : null,
        executor: executor.record?.name || normalized.executor || '—',
        project: project.record?.name || normalized.project || '—',
        serial: serial.record?.serial_number || normalized.serial || '—',
        status,
        description: '',
    };

    if (contact.record && category.record && executor.record && project.record && serial.record && (!config.hasMonth || month)) {
        display.description = config.buildDescription({
            contact: contact.record,
            category: category.record,
            executor: executor.record,
            project: project.record,
            serial: serial.record,
            month,
        });
    }

    return { errors, warnings, infos, data, display };
};

const parseWorkbook = (filePath, config, { softMissingColumns = false } = {}) => {
    const { headers, dataRows, headerRowNumber } = readSheetRows(filePath, {
        headerMatchers: config.headerMatchers,
        minHeaderScore: 1,
    });
    const missingCols = validateRequiredColumns(headers, config.requiredColumns);
    if (missingCols.length > 0 && !softMissingColumns) {
        throw new Error(`MISSING_COLUMNS:${missingCols.join(', ')}`);
    }
    return {
        headers,
        dataRows,
        headerRowNumber,
        colIdx: identifyColumns(headers, config.columnMap),
        missingCols,
    };
};

const readNormalizedRow = (row, colIdx, config) => {
    const amountParsed = parseAmount(cellText(row, colIdx.amount));
    return {
        contactKey: cellText(row, colIdx.contact),
        amount: amountParsed.invalid ? null : amountParsed.value,
        amountEmpty: amountParsed.empty,
        amountInvalid: amountParsed.invalid,
        category: cellText(row, colIdx.category),
        executor: cellText(row, colIdx.executor),
        project: cellText(row, colIdx.project),
        serial: cellText(row, colIdx.serial),
        status: cellText(row, colIdx.status),
        month: config.hasMonth ? cellText(row, colIdx.month) : '',
    };
};

const parsePreview = async (filePath, config) => {
    const { dataRows, headerRowNumber, colIdx, missingCols, headers } = parseWorkbook(filePath, config, {
        softMissingColumns: true,
    });
    const lookups = await loadIndexedLookups(config);
    const rows = [];
    const columnWarnings = missingCols.length > 0
        ? [`ستون‌های یافت‌نشده: ${missingCols.join('، ')}`]
        : [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (isEmptyRow(row)) continue;
        const excelRow = headerRowNumber + i + 1;
        const normalized = readNormalizedRow(row, colIdx, config);
        const assessed = resolveTypedRow(normalized, lookups, config);
        rows.push({
            row: excelRow,
            data: assessed.data,
            display: assessed.display,
            errors: assessed.errors,
            warnings: assessed.warnings,
            infos: assessed.infos,
        });
    }

    const serialResolved = rows.every((item) => item.data?.permission_serial_id);
    if (serialResolved) {
        markDuplicateFieldErrors(rows, 'permission_serial_id', 'سریال مجوز', (item) => (
            item.data?.permission_serial_id ? item.display?.serial : null
        ));
    }

    const finalized = finalizePreviewRows(rows);
    const sharedFieldsNeeded = (config.deferrableFields || []).filter((field) => {
        const hasValue = (item) => {
            if (field === 'category') return item.data?.category_id;
            if (field === 'executor') return item.data?.executor_id;
            if (field === 'project') return item.data?.project_id;
            if (field === 'serial') return item.data?.permission_serial_id;
            if (field === 'month') return item.data?.month;
            return true;
        };
        return finalized.some((item) => !hasValue(item));
    });

    return {
        headers,
        missingColumns: missingCols,
        warnings: columnWarnings,
        sharedFieldsNeeded,
        rows: finalized,
    };
};

const validateConfirmRecord = (item, lookups, config) => {
    const errors = [];
    const data = item.data || {};
    const contact = lookups.contactById.get(Number(data[config.contactIdField]));
    const category = lookups.categoryById.get(Number(data.category_id));
    const executor = lookups.executorById.get(Number(data.executor_id));
    const project = lookups.projectById.get(Number(data.project_id));
    const serial = lookups.serialById.get(Number(data.permission_serial_id));

    if (!contact) errors.push(`${config.contactLabel} نامعتبر است`);
    if (!category) errors.push('دسته‌بندی نامعتبر است');
    if (!executor) errors.push('مجری نامعتبر است');
    if (!project) errors.push('پروژه نامعتبر است');
    if (!serial) errors.push('سریال مجوز نامعتبر است');
    else if (!isSelectable(serial.status)) {
        errors.push(`سریال مجوز «${serial.serial_number}» قابل مصرف نیست`);
    }

    const amount = Number(data.amount);
    if (!amount || amount <= 0) errors.push('مبلغ باید بزرگ‌تر از صفر باشد');

    if (config.hasMonth) {
        if (!data.month) errors.push('ماه خالی است');
        else if (!PERSIAN_MONTHS.includes(data.month)) errors.push('ماه نامعتبر است');
    }

    const status = (config.kind === 'salary' && data.status === 'ثبت نشده')
        ? config.defaultStatus
        : (data.status || config.defaultStatus);
    if (!config.statuses.includes(status)) errors.push('وضعیت پرداخت نامعتبر است');

    return {
        errors,
        contact,
        category,
        executor,
        project,
        serial,
        amount,
        status,
        month: data.month || null,
    };
};

const confirmImport = async (records, { onlyFullyValid = false, userId = null } = {}, config) => {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('NO_RECORDS_SELECTED');
    }

    let selected = records.map((item) => ({
        row: item.row,
        data: { ...(item.data || item) },
        warnings: item.warnings || [],
    }));

    if (onlyFullyValid) {
        selected = selected.filter((item) => (item.warnings || []).length === 0);
        if (selected.length === 0) throw new Error('NO_FULLY_VALID_RECORDS');
    }

    const lookups = await loadIndexedLookups(config);
    const errors = [];
    const prepared = [];

    selected.forEach((item) => {
        const result = validateConfirmRecord(item, lookups, config);
        result.errors.forEach((message) => errors.push({ row: item.row, message }));
        prepared.push({ item, result });
    });

    const serialRows = new Map();
    prepared.forEach(({ item, result }) => {
        const serialId = result.serial?.id;
        if (!serialId) return;
        if (!serialRows.has(serialId)) serialRows.set(serialId, []);
        serialRows.get(serialId).push(item.row);
    });
    serialRows.forEach((rowNums, serialId) => {
        if (rowNums.length < 2) return;
        const serial = lookups.serialById.get(serialId);
        rowNums.forEach((row) => {
            errors.push({
                row,
                message: `سریال مجوز ${serial?.serial_number || serialId} در انتخاب‌ها تکراری است`,
            });
        });
    });

    const uniqueErrors = uniqueErrorList(errors);
    if (uniqueErrors.length > 0) {
        return { inserted: 0, errors: uniqueErrors, aborted: true };
    }

    await db.transaction(async (trx) => {
        for (const { result } of prepared) {
            await consumeSerial(result.serial.id, config.usageLocation, trx);
            const description = config.buildDescription({
                contact: result.contact,
                category: result.category,
                executor: result.executor,
                project: result.project,
                serial: result.serial,
                month: result.month,
            });
            const payload = {
                [config.contactIdField]: result.contact.id,
                amount: result.amount,
                category_id: result.category.id,
                executor_id: result.executor.id,
                project_id: result.project.id,
                permission_serial_id: result.serial.id,
                description,
                status: result.status,
                recorded_by_user_id: userId,
                receipt_file_path: null,
            };
            if (config.hasMonth) payload.month = result.month;
            if (config.hasAccountingFlag) payload.accounting_document_registered = false;
            await trx(config.table).insert(payload);
        }
    });

    return { inserted: prepared.length, errors: [], aborted: false };
};

const getTemplateBuffer = (config) => buildWorkbookBuffer(config.templateSheetName, [config.templateRow], {
    title: config.templateTitle,
    showMeta: false,
    textColumns: config.templateTextColumns,
});

const createImporter = (config) => ({
    parsePreview: (filePath) => parsePreview(filePath, config),
    confirmImport: (records, opts) => confirmImport(records, opts, config),
    getTemplateBuffer: () => getTemplateBuffer(config),
    config,
});

const commercialConfig = {
    kind: 'commercial',
    table: 'commercial_payments',
    categoryTable: 'commercial_payment_categories',
    contactIdField: 'business_contact_id',
    contactLabel: 'مخاطب تجاری',
    contactLookupFields: ['account_code', 'business_name'],
    usageLocation: USAGE_LOCATIONS.COMMERCIAL,
    statuses: COMMERCIAL_STATUSES,
    defaultStatus: COMMERCIAL_STATUSES[0],
    hasMonth: false,
    hasAccountingFlag: false,
    loadContacts: () => db('business_contacts').select('*'),
    contactDisplay: (c) => `${c.business_name} (${c.account_code})`,
    buildDescription: ({ contact, executor, project, serial }) => commercialPaymentService.buildDescription({
        businessName: contact.business_name,
        executorName: executor.name,
        serialNumber: serial.serial_number,
        projectName: project.name,
    }),
    columnMap: {
        contact: ['کد طرف حساب', 'نام تجاری', 'مخاطب', 'مخاطب تجاری', 'account_code'],
        amount: COMMON_COLUMNS.amount,
        category: COMMON_COLUMNS.category,
        executor: COMMON_COLUMNS.executor,
        project: COMMON_COLUMNS.project,
        serial: COMMON_COLUMNS.serial,
        status: COMMON_COLUMNS.status,
    },
    requiredColumns: {
        'کد طرف حساب / نام تجاری': ['کد طرف حساب', 'نام تجاری', 'مخاطب', 'مخاطب تجاری'],
        مبلغ: COMMON_COLUMNS.amount,
        دسته‌بندی: COMMON_COLUMNS.category,
        مجری: COMMON_COLUMNS.executor,
        پروژه: COMMON_COLUMNS.project,
        'سریال مجوز': COMMON_COLUMNS.serial,
    },
    headerMatchers: [
        ['کد طرف حساب', 'نام تجاری', 'مخاطب'],
        COMMON_COLUMNS.amount,
        COMMON_COLUMNS.serial,
        COMMON_COLUMNS.category,
    ],
    templateSheetName: 'پرداخت تجاری',
    templateTitle: 'قالب ورود پرداخت‌های تجاری',
    templateTextColumns: ['کد طرف حساب / نام تجاری', 'سریال مجوز'],
    templateRow: {
        'کد طرف حساب / نام تجاری': 'BC-001',
        'مبلغ': 25000000,
        'دسته‌بندی': 'خرید کالا',
        'مجری': 'محمد علی نجفی',
        'پروژه': 'پروژه توسعه باغات',
        'سریال مجوز': 'SER-1001',
        'وضعیت': 'ثبت نشده',
    },
};

const machineryConfig = {
    kind: 'machinery',
    table: 'machinery_payments',
    categoryTable: 'machinery_payment_categories',
    contactIdField: 'machinery_contact_id',
    contactLabel: 'مخاطب ماشین',
    contactLookupFields: ['account_code'],
    usageLocation: USAGE_LOCATIONS.MACHINERY,
    statuses: MACHINERY_STATUSES,
    defaultStatus: MACHINERY_STATUSES[0],
    hasMonth: true,
    hasAccountingFlag: true,
    loadContacts: () => db('machinery_contacts as mc')
        .leftJoin('machines as m', 'mc.machine_id', 'm.id')
        .select('mc.*', 'm.name as machine_name'),
    contactDisplay: (c) => `${c.account_code} — ${c.machine_name || ''}`.trim(),
    buildDescription: ({ contact, category, executor, project, serial, month }) => machineryPaymentService.buildDescription({
        categoryName: category.name,
        month,
        machineName: contact.machine_name,
        executorName: executor.name,
        serialNumber: serial.serial_number,
        projectName: project.name,
    }),
    columnMap: {
        contact: ['کد طرف حساب', 'مخاطب ماشین', 'account_code'],
        amount: COMMON_COLUMNS.amount,
        category: COMMON_COLUMNS.category,
        month: COMMON_COLUMNS.month,
        executor: COMMON_COLUMNS.executor,
        project: COMMON_COLUMNS.project,
        serial: COMMON_COLUMNS.serial,
        status: COMMON_COLUMNS.status,
    },
    requiredColumns: {
        'کد طرف حساب': ['کد طرف حساب', 'مخاطب ماشین'],
        مبلغ: COMMON_COLUMNS.amount,
        دسته‌بندی: COMMON_COLUMNS.category,
        ماه: COMMON_COLUMNS.month,
        مجری: COMMON_COLUMNS.executor,
        پروژه: COMMON_COLUMNS.project,
        'سریال مجوز': COMMON_COLUMNS.serial,
    },
    headerMatchers: [
        ['کد طرف حساب'],
        COMMON_COLUMNS.amount,
        COMMON_COLUMNS.month,
        COMMON_COLUMNS.serial,
    ],
    templateSheetName: 'پرداخت ماشین',
    templateTitle: 'قالب ورود پرداخت ماشین‌آلات',
    templateTextColumns: ['کد طرف حساب', 'سریال مجوز'],
    templateRow: {
        'کد طرف حساب': 'MC-001',
        'مبلغ': 18000000,
        'دسته‌بندی': 'کارکرد ماهانه',
        'ماه': 'فروردین',
        'مجری': 'محمد علی نجفی',
        'پروژه': 'پروژه توسعه باغات',
        'سریال مجوز': 'SER-1002',
        'وضعیت': 'ثبت نشده',
    },
};

const salaryConfig = {
    kind: 'salary',
    table: 'salary_payments',
    categoryTable: 'salary_payment_categories',
    contactIdField: 'personnel_contact_id',
    contactLabel: 'پرسنل',
    contactLookupFields: ['personnel_code', 'national_id'],
    usageLocation: USAGE_LOCATIONS.PERSONNEL,
    statuses: SALARY_STATUSES,
    defaultStatus: SALARY_DEFAULT_STATUS,
    hasMonth: true,
    hasAccountingFlag: true,
    loadContacts: () => db('personnel_contacts').select('*'),
    contactDisplay: (c) => `${c.personnel_code} — ${c.first_name} ${c.last_name}`,
    buildDescription: ({ category, executor, project, serial, month, contact }) => salaryPaymentService.buildDescription({
        categoryName: category.name,
        month,
        personnelName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        personnelCode: contact.personnel_code,
        executorName: executor.name,
        serialNumber: serial.serial_number,
        projectName: project.name,
    }),
    columnMap: {
        contact: ['کد پرسنلی', 'شماره پرسنلی', 'کد ملی', 'پرسنل'],
        amount: COMMON_COLUMNS.amount,
        category: COMMON_COLUMNS.category,
        month: COMMON_COLUMNS.month,
        executor: COMMON_COLUMNS.executor,
        project: COMMON_COLUMNS.project,
        serial: COMMON_COLUMNS.serial,
        status: COMMON_COLUMNS.status,
    },
    deferrableFields: ['category', 'month', 'executor', 'project', 'serial'],
    requiredColumns: {
        'کد پرسنلی': ['کد پرسنلی', 'شماره پرسنلی', 'کد ملی', 'پرسنل'],
        مبلغ: COMMON_COLUMNS.amount,
    },
    headerMatchers: [
        ['کد پرسنلی', 'شماره پرسنلی', 'کد ملی'],
        COMMON_COLUMNS.amount,
    ],
    templateSheetName: 'پرداخت حقوق',
    templateTitle: 'قالب ورود پرداخت حقوق — فقط کد پرسنلی و مبلغ اجباری است',
    templateTextColumns: ['کد پرسنلی'],
    templateRow: {
        'کد پرسنلی': 'P-001',
        'مبلغ': 12000000,
    },
};

module.exports = {
    commercial: createImporter(commercialConfig),
    machinery: createImporter(machineryConfig),
    salary: createImporter(salaryConfig),
};
