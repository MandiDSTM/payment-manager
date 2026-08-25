const db = require('../../config/db-config');
const normalizeText = require('../../utils/normalizeText');
const { normalizeSheba, isValidSheba } = require('../../utils/validateSheba');
const {
    findColumnIndex,
    getCellValue,
    readSheetRows,
    validateRequiredColumns,
    buildWorkbookBuffer,
} = require('../../utils/excelHelpers');

const COLUMN_MAP = {
    'کد پرسنلی': ['کد پرسنلی', 'شماره پرسنلی', 'کدپرسنلی', 'شمارهپرسنلی', 'personnel'],
    'کد ملی': ['کد ملی', 'کدملی', 'کد_ملی', 'شماره ملی', 'شمارهملی', 'national id', 'national_id', 'nationalid'],
    'نام کامل': ['نام و نام خانوادگی پرسنل', 'نام و نام خانوادگی', 'نام کامل', 'نام پرسنل'],
    'نام': ['نام'],
    'نام خانوادگی': ['نام خانوادگی', 'خانوادگی'],
    'نام پدر': ['نام پدر', 'نامپدر', 'father name', 'father_name', 'fathername'],
    'شماره شبا': ['شبا', 'شماره شبا', 'شمارهشبا', 'sheba', 'iban'],
    'نام صاحب حساب': ['نام صاحب حساب', 'صاحب حساب', 'نامصاحب حساب'],
    'موبایل': ['شماره تماس', 'موبایل', 'تلفن همراه', 'mobile', 'phone'],
    'شهر': ['محل تولد', 'شهر', 'city'],
    'توضیحات': ['توضیحات', 'description'],
};

/** Matchers used to discover the real header row (score-based; not all required). */
const HEADER_MATCHERS = [
    COLUMN_MAP['کد پرسنلی'],
    COLUMN_MAP['کد ملی'],
    COLUMN_MAP['شماره شبا'],
    COLUMN_MAP['نام کامل'],
    COLUMN_MAP['نام صاحب حساب'],
];

const normalizeNationalId = (raw) => {
    const text = normalizeText(String(raw ?? ''));
    if (!text) return '';
    if (/^\d+$/.test(text) && text.length < 10) {
        return text.padStart(10, '0');
    }
    return text;
};

const isValidNationalId = (value) => /^\d{10}$/.test(String(value || ''));

const splitFullName = (fullName) => {
    const parts = normalizeText(String(fullName || '')).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first_name: '', last_name: '' };
    if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
};

const identifyColumns = (headers) => {
    const fullName = findColumnIndex(headers, COLUMN_MAP['نام کامل']);
    const firstName = findColumnIndex(headers, ['نام'], { exact: true });
    const lastName = findColumnIndex(headers, ['نام خانوادگی'], { exact: true });

    return {
        personnelCode: findColumnIndex(headers, COLUMN_MAP['کد پرسنلی']),
        nationalId: findColumnIndex(headers, COLUMN_MAP['کد ملی']),
        fullName,
        firstName: firstName === fullName ? -1 : firstName,
        lastName: lastName === fullName ? -1 : lastName,
        fatherName: findColumnIndex(headers, COLUMN_MAP['نام پدر'], { exact: true }),
        sheba: findColumnIndex(headers, COLUMN_MAP['شماره شبا']),
        accountHolder: findColumnIndex(headers, COLUMN_MAP['نام صاحب حساب']),
        mobile: findColumnIndex(headers, COLUMN_MAP['موبایل']),
        city: findColumnIndex(headers, COLUMN_MAP['شهر']),
        description: findColumnIndex(headers, COLUMN_MAP['توضیحات']),
    };
};

const normalizeRow = (row, colIdx) => {
    let firstName = '';
    let lastName = '';

    if (colIdx.fullName !== -1) {
        const split = splitFullName(getCellValue(row, colIdx.fullName));
        firstName = split.first_name;
        lastName = split.last_name;
    } else {
        firstName = normalizeText(String(getCellValue(row, colIdx.firstName) ?? ''));
        lastName = normalizeText(String(getCellValue(row, colIdx.lastName) ?? ''));
    }

    const accountHolder = normalizeText(String(getCellValue(row, colIdx.accountHolder) ?? ''))
        || [firstName, lastName].filter(Boolean).join(' ');

    return {
        personnel_code: normalizeText(String(getCellValue(row, colIdx.personnelCode) ?? '')),
        national_id: normalizeNationalId(getCellValue(row, colIdx.nationalId)),
        first_name: firstName,
        last_name: lastName,
        father_name: normalizeText(String(getCellValue(row, colIdx.fatherName) ?? '')) || null,
        sheba: normalizeSheba(String(getCellValue(row, colIdx.sheba) ?? '')),
        account_holder_name: accountHolder,
        mobile: normalizeText(String(getCellValue(row, colIdx.mobile) ?? '')) || null,
        city: normalizeText(String(getCellValue(row, colIdx.city) ?? '')) || null,
        description: normalizeText(String(getCellValue(row, colIdx.description) ?? '')) || null,
    };
};

/** Hard errors block selection/import. Warnings are allowed with flags. */
const assessRow = (contact) => {
    const errors = [];
    const warnings = [];

    if (contact.national_id && !isValidNationalId(contact.national_id)) {
        errors.push('کد ملی معتبر نیست (باید ۱۰ رقم باشد)');
    }

    if (!contact.first_name || !contact.last_name) errors.push('نام یا نام خانوادگی خالی است');
    if (!contact.account_holder_name) errors.push('نام صاحب حساب خالی است');

    if (!contact.sheba) {
        errors.push('شماره شبا خالی است');
    } else if (!isValidSheba(contact.sheba)) {
        warnings.push('شماره شبا نامعتبر است — ثبت می‌شود ولی نیاز به اصلاح دارد');
    }

    return {
        errors,
        warnings,
        sheba_needs_review: !isValidSheba(contact.sheba),
        code_generated: false,
    };
};

const loadUsedPersonnelCodes = async () => {
    const existing = await db('personnel_contacts').select('personnel_code');
    return new Set(existing.map((r) => r.personnel_code).filter(Boolean));
};

const nextAutoPersonnelCode = (usedCodes) => {
    let n = 1;
    let code = `AUTO-${String(n).padStart(5, '0')}`;
    while (usedCodes.has(code)) {
        n += 1;
        code = `AUTO-${String(n).padStart(5, '0')}`;
    }
    usedCodes.add(code);
    return code;
};

const assignMissingPersonnelCodes = (rows, usedCodes) => {
    rows.forEach((item) => {
        if (item.data.personnel_code) {
            usedCodes.add(item.data.personnel_code);
            return;
        }
        const code = nextAutoPersonnelCode(usedCodes);
        item.data.personnel_code = code;
        item.code_generated = true;
        item.infos = [...(item.infos || []), `کد پرسنلی خودکار: ${code}`];
    });
};

const markDuplicateErrors = (rows, field, label) => {
    const seen = new Map();
    rows.forEach((item) => {
        const value = item.data?.[field];
        if (!value) return;
        if (!seen.has(value)) {
            seen.set(value, [item]);
        } else {
            seen.get(value).push(item);
        }
    });

    seen.forEach((group, value) => {
        if (group.length < 2) return;
        group.forEach((item) => {
            const message = `${label} ${value} در فایل تکراری است`;
            if (!item.errors.includes(message)) item.errors.push(message);
        });
    });
};

const attachDbUniquenessErrors = async (rows) => {
    const codes = [...new Set(rows.map((r) => r.data.personnel_code).filter(Boolean))];
    const nationalIds = [...new Set(rows.map((r) => r.data.national_id).filter(Boolean))];

    const existingByCode = codes.length > 0
        ? await db('personnel_contacts').whereIn('personnel_code', codes).select('personnel_code')
        : [];
    const existingByNationalId = nationalIds.length > 0
        ? await db('personnel_contacts').whereIn('national_id', nationalIds).select('national_id')
        : [];

    const codeSet = new Set(existingByCode.map((r) => r.personnel_code));
    const nationalIdSet = new Set(existingByNationalId.map((r) => r.national_id));

    rows.forEach((item) => {
        if (!item.code_generated && item.data.personnel_code && codeSet.has(item.data.personnel_code)) {
            const message = `کد پرسنلی ${item.data.personnel_code} قبلاً در دیتابیس ثبت شده`;
            if (!item.errors.includes(message)) item.errors.push(message);
        }
        if (item.data.national_id && nationalIdSet.has(item.data.national_id)) {
            const message = `کد ملی ${item.data.national_id} قبلاً در دیتابیس ثبت شده`;
            if (!item.errors.includes(message)) item.errors.push(message);
        }
    });
};

const parseWorkbook = (filePath, {
    requireNationalId = false,
    requireSheba = true,
    requireName = true,
    softMissingColumns = false,
} = {}) => {
    const { headers, dataRows, headerRowNumber } = readSheetRows(filePath, {
        headerMatchers: HEADER_MATCHERS,
        minHeaderScore: 1,
    });

    const requiredMap = {
        'کد پرسنلی': COLUMN_MAP['کد پرسنلی'],
    };
    if (requireNationalId) requiredMap['کد ملی'] = COLUMN_MAP['کد ملی'];
    if (requireSheba) requiredMap['شماره شبا'] = COLUMN_MAP['شماره شبا'];

    const missingCols = validateRequiredColumns(headers, requiredMap);

    if (requireName) {
        const hasFullName = findColumnIndex(headers, COLUMN_MAP['نام کامل']) !== -1;
        const hasSplitName = findColumnIndex(headers, ['نام'], { exact: true }) !== -1
            && findColumnIndex(headers, ['نام خانوادگی'], { exact: true }) !== -1;
        if (!hasFullName && !hasSplitName) {
            missingCols.push('نام و نام خانوادگی پرسنل');
        }
    }

    if (missingCols.length > 0 && !softMissingColumns) {
        throw new Error(`MISSING_COLUMNS:${missingCols.join(', ')}`);
    }

    return {
        headers,
        dataRows,
        headerRowNumber,
        colIdx: identifyColumns(headers),
        missingCols,
    };
};

const parsePreview = async (filePath) => {
    const { dataRows, headerRowNumber, colIdx, missingCols, headers } = parseWorkbook(filePath, {
        softMissingColumns: true,
    });
    const rows = [];
    const columnWarnings = missingCols.length > 0
        ? [`ستون‌های یافت‌نشده: ${missingCols.join('، ')}`]
        : [];

    const usedCodes = await loadUsedPersonnelCodes();

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;

        const excelRow = headerRowNumber + i + 1;
        const contact = normalizeRow(row, colIdx);
        const assessment = assessRow(contact);

        rows.push({
            row: excelRow,
            data: {
                ...contact,
                sheba_needs_review: assessment.sheba_needs_review,
            },
            errors: assessment.errors,
            warnings: assessment.warnings,
            infos: [],
            code_generated: false,
            sheba_needs_review: assessment.sheba_needs_review,
            full_name: `${contact.first_name} ${contact.last_name}`.trim(),
        });
    }

    assignMissingPersonnelCodes(rows, usedCodes);
    markDuplicateErrors(rows, 'personnel_code', 'کد پرسنلی');
    markDuplicateErrors(rows, 'national_id', 'کد ملی');
    await attachDbUniquenessErrors(rows);

    return {
        headers,
        missingColumns: missingCols,
        warnings: columnWarnings,
        rows: rows.map((item) => {
            const hasHardError = item.errors.length > 0;
            return {
                ...item,
                data: {
                    ...item.data,
                    personnel_code: item.data.personnel_code,
                    sheba_needs_review: !!item.sheba_needs_review,
                },
                selectable: !hasHardError,
                is_fully_valid: !hasHardError && !item.sheba_needs_review,
            };
        }),
    };
};

const hardValidateContact = (contact) => {
    const { errors } = assessRow(contact);
    if (!contact.personnel_code) errors.push('کد پرسنلی خالی است');
    return errors;
};

const collectUniquenessErrors = async (records) => {
    const errors = [];
    const codeMap = new Map();
    const nationalIdMap = new Map();

    records.forEach((item, index) => {
        const row = item.row ?? index + 1;
        const contact = item.data || item;
        const validationErrors = hardValidateContact(contact);
        if (validationErrors.length > 0) {
            validationErrors.forEach((message) => {
                errors.push({ row, message, field: 'validation' });
            });
            return;
        }

        if (codeMap.has(contact.personnel_code)) {
            errors.push({
                row,
                message: `کد پرسنلی ${contact.personnel_code} در انتخاب‌ها تکراری است`,
                field: 'personnel_code',
            });
            errors.push({
                row: codeMap.get(contact.personnel_code),
                message: `کد پرسنلی ${contact.personnel_code} در انتخاب‌ها تکراری است`,
                field: 'personnel_code',
            });
        } else {
            codeMap.set(contact.personnel_code, row);
        }

        if (contact.national_id) {
            if (nationalIdMap.has(contact.national_id)) {
                errors.push({
                    row,
                    message: `کد ملی ${contact.national_id} در انتخاب‌ها تکراری است`,
                    field: 'national_id',
                });
                errors.push({
                    row: nationalIdMap.get(contact.national_id),
                    message: `کد ملی ${contact.national_id} در انتخاب‌ها تکراری است`,
                    field: 'national_id',
                });
            } else {
                nationalIdMap.set(contact.national_id, row);
            }
        }
    });

    const validContacts = records
        .map((item, index) => ({ row: item.row ?? index + 1, data: item.data || item }))
        .filter((item) => hardValidateContact(item.data).length === 0);

    const codes = [...new Set(validContacts.map((r) => r.data.personnel_code))];
    const nationalIds = [...new Set(validContacts.map((r) => r.data.national_id).filter(Boolean))];

    const existingByCode = codes.length > 0
        ? await db('personnel_contacts').whereIn('personnel_code', codes).select('personnel_code')
        : [];
    const existingByNationalId = nationalIds.length > 0
        ? await db('personnel_contacts').whereIn('national_id', nationalIds).select('national_id')
        : [];

    const codeSet = new Set(existingByCode.map((r) => r.personnel_code));
    const nationalIdSet = new Set(existingByNationalId.map((r) => r.national_id));

    validContacts.forEach((item) => {
        if (codeSet.has(item.data.personnel_code)) {
            errors.push({
                row: item.row,
                message: `کد پرسنلی ${item.data.personnel_code} قبلاً در دیتابیس ثبت شده`,
                field: 'personnel_code',
            });
        }
        if (item.data.national_id && nationalIdSet.has(item.data.national_id)) {
            errors.push({
                row: item.row,
                message: `کد ملی ${item.data.national_id} قبلاً در دیتابیس ثبت شده`,
                field: 'national_id',
            });
        }
    });

    const uniqueErrors = [];
    const seen = new Set();
    errors.forEach((err) => {
        const key = `${err.row}|${err.message}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniqueErrors.push(err);
    });

    return uniqueErrors;
};

const confirmImport = async (records, { onlyFullyValid = false } = {}) => {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('NO_RECORDS_SELECTED');
    }

    let selected = records.map((item) => {
        const contact = { ...(item.data || item) };
        const shebaNeedsReview = contact.sheba_needs_review === true || !isValidSheba(contact.sheba);
        return {
            row: item.row,
            data: {
                ...contact,
                sheba: contact.sheba || '',
                sheba_needs_review: shebaNeedsReview,
            },
            warnings: item.warnings || (shebaNeedsReview ? ['sheba'] : []),
        };
    });

    if (onlyFullyValid) {
        selected = selected.filter((item) => {
            const hard = hardValidateContact(item.data);
            return hard.length === 0 && !item.data.sheba_needs_review;
        });
        if (selected.length === 0) {
            throw new Error('NO_FULLY_VALID_RECORDS');
        }
    }

    const usedCodes = await loadUsedPersonnelCodes();
    selected.forEach((item) => {
        if (!item.data.personnel_code) {
            item.data.personnel_code = nextAutoPersonnelCode(usedCodes);
        } else {
            usedCodes.add(item.data.personnel_code);
        }
    });

    const uniquenessErrors = await collectUniquenessErrors(selected);
    if (uniquenessErrors.length > 0) {
        return { inserted: 0, errors: uniquenessErrors, aborted: true };
    }

    const payload = selected.map((item) => {
        const contact = item.data;
        return {
            personnel_code: contact.personnel_code,
            national_id: contact.national_id || null,
            first_name: contact.first_name,
            last_name: contact.last_name,
            father_name: contact.father_name || null,
            sheba: contact.sheba || '',
            sheba_needs_review: !!contact.sheba_needs_review,
            account_holder_name: contact.account_holder_name,
            mobile: contact.mobile || null,
            city: contact.city || null,
            description: contact.description || null,
        };
    });

    await db('personnel_contacts').insert(payload);
    return { inserted: payload.length, errors: [], aborted: false };
};

/** Legacy one-shot import: only inserts rows without uniqueness/validation issues. */
const parseImport = async (filePath) => {
    const { rows } = await parsePreview(filePath);
    const records = rows.filter((r) => r.errors.length === 0).map((r) => ({
        ...r.data,
        sheba_needs_review: !!r.sheba_needs_review,
    }));
    const errors = rows
        .filter((r) => r.errors.length > 0)
        .flatMap((r) => r.errors.map((message) => ({ row: r.row, message })));
    return { records, errors };
};

const parseBulkUpdate = async (filePath) => {
    const { dataRows, headerRowNumber, colIdx } = parseWorkbook(filePath, {
        requireNationalId: false,
        requireSheba: false,
        requireName: false,
    });
    const updates = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;

        const rowNum = headerRowNumber + i + 1;
        const personnelCode = normalizeText(String(getCellValue(row, colIdx.personnelCode) || ''));
        if (!personnelCode) {
            errors.push({ row: rowNum, message: 'کد پرسنلی خالی است' });
            continue;
        }

        const existing = await db('personnel_contacts').where({ personnel_code: personnelCode }).first();
        if (!existing) {
            errors.push({ row: rowNum, message: `پرسنل با کد ${personnelCode} یافت نشد` });
            continue;
        }

        const normalized = normalizeRow(row, colIdx);
        const patch = { personnel_code: personnelCode };

        if (colIdx.nationalId !== -1) patch.national_id = normalized.national_id || null;
        if (colIdx.fullName !== -1 || colIdx.firstName !== -1) patch.first_name = normalized.first_name;
        if (colIdx.fullName !== -1 || colIdx.lastName !== -1) patch.last_name = normalized.last_name;
        if (colIdx.fatherName !== -1) patch.father_name = normalized.father_name;
        if (colIdx.sheba !== -1) {
            patch.sheba = normalized.sheba;
            patch.sheba_needs_review = !isValidSheba(normalized.sheba);
        }
        if (colIdx.accountHolder !== -1) patch.account_holder_name = normalized.account_holder_name;
        if (colIdx.mobile !== -1) patch.mobile = normalized.mobile;
        if (colIdx.city !== -1) patch.city = normalized.city;
        if (colIdx.description !== -1) patch.description = normalized.description;

        const merged = { ...existing, ...patch };

        if (!merged.first_name || !merged.last_name) {
            errors.push({ row: rowNum, message: 'نام یا نام خانوادگی خالی است' });
            continue;
        }
        if (!merged.account_holder_name) {
            errors.push({ row: rowNum, message: 'نام صاحب حساب خالی است' });
            continue;
        }
        if (!merged.sheba) {
            errors.push({ row: rowNum, message: 'شماره شبا خالی است' });
            continue;
        }
        if (colIdx.nationalId !== -1 && merged.national_id) {
            if (!isValidNationalId(merged.national_id)) {
                errors.push({ row: rowNum, message: 'کد ملی معتبر نیست (باید ۱۰ رقم باشد)' });
                continue;
            }
            const duplicateNationalId = await db('personnel_contacts')
                .where({ national_id: merged.national_id })
                .whereNot({ id: existing.id })
                .first();
            if (duplicateNationalId) {
                errors.push({ row: rowNum, message: `کد ملی ${merged.national_id} قبلاً ثبت شده` });
                continue;
            }
        }

        updates.push({ id: existing.id, data: patch });
    }

    return { updates, errors };
};

const getTemplateBuffer = () => buildWorkbookBuffer('پرسنل', [{
    'کد پرسنلی': 'P-001',
    'کد ملی': '0012345678',
    'نام و نام خانوادگی پرسنل': 'علی رضایی',
    'نام پدر': 'حسن',
    'شماره شبا': 'IR123456789012345678901234',
    'نام صاحب حساب': 'علی رضایی',
    'شماره تماس': '09121234567',
    'محل تولد': 'تهران',
    'توضیحات': '',
}], {
    title: 'قالب ورود پرسنل',
    showMeta: false,
    textColumns: ['کد پرسنلی', 'کد ملی', 'شماره شبا', 'شماره تماس'],
});

const PERSONNEL_EXPORT_COLUMNS = [
    'ردیف',
    'کد پرسنلی',
    'کد ملی',
    'نام',
    'نام خانوادگی',
    'نام پدر',
    'نام کامل',
    'شماره شبا',
    'وضعیت شبا',
    'نام صاحب حساب',
    'موبایل',
    'شهر',
    'توضیحات',
    'تاریخ ثبت',
];

const formatContactDate = (value) => {
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

const exportPersonnelList = async () => {
    const contacts = await db('personnel_contacts')
        .select('*')
        .orderBy('personnel_code', 'asc')
        .orderBy('id', 'asc');

    const rows = contacts.map((c, index) => ({
        'ردیف': index + 1,
        'کد پرسنلی': c.personnel_code || '',
        'کد ملی': c.national_id || '',
        'نام': c.first_name || '',
        'نام خانوادگی': c.last_name || '',
        'نام پدر': c.father_name || '',
        'نام کامل': `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        'شماره شبا': c.sheba || '',
        'وضعیت شبا': c.sheba_needs_review ? 'نیاز به اصلاح' : 'معتبر',
        'نام صاحب حساب': c.account_holder_name || '',
        'موبایل': c.mobile || '',
        'شهر': c.city || '',
        'توضیحات': c.description || '',
        'تاریخ ثبت': formatContactDate(c.created_at),
    }));

    return buildWorkbookBuffer('پرسنل', rows, {
        title: 'خروجی لیست پرسنل',
        columns: PERSONNEL_EXPORT_COLUMNS,
        textColumns: ['کد پرسنلی', 'کد ملی', 'شماره شبا', 'موبایل'],
    });
};

module.exports = {
    parsePreview,
    confirmImport,
    parseImport,
    parseBulkUpdate,
    getTemplateBuffer,
    exportPersonnelList,
};
