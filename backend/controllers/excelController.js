const db = require('../config/db-config');
const fs = require('fs');
const { logExcelEvent, getRecentLogs } = require('../utils/excelLog');
const { sendExcelBuffer } = require('../utils/excelHelpers');
const { insertInChunks, describeSqliteWriteError } = require('../utils/dbBatch');
const personnelExcel = require('../services/excel/personnelExcelService');
const { parseExcelFile: parseMachineryExcel } = require('../services/machineryContactsExcelService');
const paymentExport = require('../services/excel/paymentExportService');
const generalPaymentsExcel = require('../services/excel/generalPaymentsExcelService');
const typedPaymentsExcel = require('../services/excel/typedPaymentsExcelService');
const { buildWorkbookBuffer } = require('../utils/excelHelpers');
const { resolveRecordedByUserId } = require('../services/commercialPaymentService');

const handleImportError = (error) => {
    if (error.message?.startsWith('MISSING_COLUMNS:')) {
        return { status: 400, message: `ستون‌های اجباری یافت نشد: ${error.message.split(':')[1]}` };
    }
    if (error.message === 'EMPTY_OR_NO_HEADER') {
        return { status: 400, message: 'فایل اکسل خالی است یا سطر هدر ندارد' };
    }
    if (error.status && error.message) {
        return { status: error.status, message: error.message };
    }
    const described = describeSqliteWriteError(error);
    if (described) return described;
    return { status: 500, message: error.message };
};

const importPersonnel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { records, errors } = await personnelExcel.parseImport(req.file.path);
        if (records.length > 0) await insertInChunks(db, 'personnel_contacts', records);

        const log = await logExcelEvent({
            operationType: 'import_personnel',
            fileName: req.file.originalname,
            userId: resolveRecordedByUserId(req),
            imported: records.length,
            failed: errors.length,
            errors,
        });

        res.json({
            message: `${records.length} پرسنل ثبت شد، ${errors.length} خطا`,
            imported: records.length,
            failed: errors.length,
            errors,
            log,
        });
    } catch (error) {
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

const previewPersonnel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { rows, warnings, missingColumns } = await personnelExcel.parsePreview(req.file.path);
        res.json({
            message: `${rows.length} ردیف خوانده شد`,
            fileName: req.file.originalname,
            warnings: warnings || [],
            missingColumns: missingColumns || [],
            rows,
        });
    } catch (error) {
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

const confirmPersonnel = async (req, res) => {
    try {
        const records = req.body?.records;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'هیچ ردیفی برای ثبت انتخاب نشده است' });
        }

        const result = await personnelExcel.confirmImport(records, {
            onlyFullyValid: Boolean(req.body?.onlyFullyValid),
            replaceExisting: Boolean(req.body?.replaceExisting),
        });
        if (result.aborted) {
            return res.status(409).json({
                message: 'ثبت انجام نشد؛ کد پرسنلی در فایل تکراری است یا کد ملی متعلق به فرد دیگری است',
                imported: 0,
                updated: 0,
                skipped: 0,
                failed: result.errors.length,
                errors: result.errors,
                aborted: true,
            });
        }

        const log = await logExcelEvent({
            operationType: 'import_personnel',
            fileName: req.body?.fileName || null,
            userId: resolveRecordedByUserId(req),
            imported: (result.inserted || 0) + (result.updated || 0),
            failed: result.skipped || 0,
            errors: [],
        });

        const parts = [];
        if (result.inserted) parts.push(`${result.inserted} نفر ثبت شد`);
        if (result.updated) parts.push(`${result.updated} نفر جایگزین شد`);
        if (result.skipped) parts.push(`${result.skipped} نفر تکراری بدون جایگزینی رد شد`);

        res.json({
            message: parts.length > 0 ? parts.join('، ') : 'ردیفی برای ثبت باقی نماند',
            imported: result.inserted,
            updated: result.updated,
            skipped: result.skipped,
            failed: 0,
            errors: [],
            aborted: false,
            log,
        });
    } catch (error) {
        if (error.message === 'NO_RECORDS_SELECTED') {
            return res.status(400).json({ message: 'هیچ ردیفی برای ثبت انتخاب نشده است' });
        }
        if (error.message === 'NO_FULLY_VALID_RECORDS') {
            return res.status(400).json({ message: 'هیچ ردیف کاملاً معتبری برای ثبت وجود ندارد' });
        }
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    }
};

const importPersonnelBulkUpdate = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { updates, errors } = await personnelExcel.parseBulkUpdate(req.file.path);

        for (const item of updates) {
            await db('personnel_contacts').where({ id: item.id }).update({
                ...item.data,
                updated_at: db.fn.now(),
            });
        }

        const log = await logExcelEvent({
            operationType: 'bulk_update_personnel',
            fileName: req.file.originalname,
            userId: resolveRecordedByUserId(req),
            imported: updates.length,
            failed: errors.length,
            errors,
        });

        res.json({
            message: `${updates.length} پرسنل بروزرسانی شد، ${errors.length} خطا`,
            imported: updates.length,
            failed: errors.length,
            errors,
            log,
        });
    } catch (error) {
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

const importMachineryContacts = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { records, errors } = await parseMachineryExcel(req.file.path);
        if (records.length > 0) await insertInChunks(db, 'machinery_contacts', records);

        const log = await logExcelEvent({
            operationType: 'import_machinery_contacts',
            fileName: req.file.originalname,
            userId: resolveRecordedByUserId(req),
            imported: records.length,
            failed: errors.length,
            errors,
        });

        res.json({
            message: `${records.length} مخاطب ثبت شد، ${errors.length} خطا`,
            imported: records.length,
            failed: errors.length,
            errors,
            log,
        });
    } catch (error) {
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

const makePreviewHandler = (service) => async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { rows, warnings, missingColumns, sharedFieldsNeeded } = await service.parsePreview(req.file.path);
        res.json({
            message: `${rows.length} ردیف خوانده شد`,
            fileName: req.file.originalname,
            warnings: warnings || [],
            missingColumns: missingColumns || [],
            sharedFieldsNeeded: sharedFieldsNeeded || [],
            rows,
        });
    } catch (error) {
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

const makeConfirmHandler = (service, { operationType, successLabel }) => async (req, res) => {
    try {
        const records = req.body?.records;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'هیچ ردیفی برای ثبت انتخاب نشده است' });
        }

        const result = await service.confirmImport(records, {
            onlyFullyValid: Boolean(req.body?.onlyFullyValid),
            userId: resolveRecordedByUserId(req),
        });
        if (result.aborted) {
            return res.status(409).json({
                message: 'ثبت انجام نشد؛ خطاهای انتخاب‌شده را برطرف کنید',
                imported: 0,
                failed: result.errors.length,
                errors: result.errors,
                aborted: true,
            });
        }

        const log = await logExcelEvent({
            operationType,
            fileName: req.body?.fileName || null,
            userId: resolveRecordedByUserId(req),
            imported: result.inserted,
            failed: 0,
            errors: [],
        });

        res.json({
            message: `${result.inserted} ${successLabel} با موفقیت ثبت شد`,
            imported: result.inserted,
            failed: 0,
            errors: [],
            aborted: false,
            log,
        });
    } catch (error) {
        if (error.message === 'NO_RECORDS_SELECTED') {
            return res.status(400).json({ message: 'هیچ ردیفی برای ثبت انتخاب نشده است' });
        }
        if (error.message === 'NO_FULLY_VALID_RECORDS') {
            return res.status(400).json({ message: 'هیچ ردیف کاملاً معتبری برای ثبت وجود ندارد' });
        }
        if (error.message === 'SERIAL_NOT_AVAILABLE') {
            return res.status(409).json({
                message: 'ثبت انجام نشد؛ سریال مجوز قابل مصرف نیست',
                imported: 0,
                failed: 1,
                errors: [{ row: null, message: 'سریال مجوز قبلاً مصرف شده است' }],
                aborted: true,
            });
        }
        if (error.message === 'SERIAL_NOT_FOUND') {
            return res.status(404).json({ message: 'سریال مجوز پرداخت یافت نشد' });
        }
        const err = handleImportError(error);
        res.status(err.status).json({ message: err.message });
    }
};

const previewPayments = makePreviewHandler(generalPaymentsExcel);
const confirmPayments = makeConfirmHandler(generalPaymentsExcel, {
    operationType: 'import_payments',
    successLabel: 'پرداخت عمومی',
});
const previewCommercialPayments = makePreviewHandler(typedPaymentsExcel.commercial);
const confirmCommercialPayments = makeConfirmHandler(typedPaymentsExcel.commercial, {
    operationType: 'import_commercial_payments',
    successLabel: 'پرداخت تجاری',
});
const previewMachineryPayments = makePreviewHandler(typedPaymentsExcel.machinery);
const confirmMachineryPayments = makeConfirmHandler(typedPaymentsExcel.machinery, {
    operationType: 'import_machinery_payments',
    successLabel: 'پرداخت ماشین‌آلات',
});
const previewSalaryPayments = makePreviewHandler(typedPaymentsExcel.salary);
const confirmSalaryPayments = makeConfirmHandler(typedPaymentsExcel.salary, {
    operationType: 'import_salary_payments',
    successLabel: 'پرداخت حقوق',
});

const downloadTemplate = async (req, res) => {
    try {
        const { type } = req.params;
        let buffer;

        switch (type) {
            case 'personnel':
                buffer = personnelExcel.getTemplateBuffer();
                break;
            case 'payments':
                buffer = generalPaymentsExcel.getTemplateBuffer();
                break;
            case 'commercial-payments':
                buffer = typedPaymentsExcel.commercial.getTemplateBuffer();
                break;
            case 'machinery-payments':
                buffer = typedPaymentsExcel.machinery.getTemplateBuffer();
                break;
            case 'salary-payments':
                buffer = typedPaymentsExcel.salary.getTemplateBuffer();
                break;
            case 'machinery-contacts':
                buffer = buildWorkbookBuffer('مخاطبین ماشین', [{
                    'کد طرف حساب': 'MC-001',
                    'نام': 'رضا',
                    'نام خانوادگی': 'محمدی',
                    'نام ماشین': 'تراکتور 285',
                    'پلاک': '12ب345',
                    'شماره شبا': 'IR123456789012345678901234',
                    'نام صاحب حساب': 'رضا محمدی',
                    'موبایل': '09121234567',
                    'شهر': 'تهران',
                    'توضیحات': '',
                }], {
                    title: 'قالب ورود مخاطبین ماشین',
                    showMeta: false,
                });
                break;
            default:
                return res.status(404).json({ message: 'قالب یافت نشد' });
        }

        sendExcelBuffer(res, buffer, `template-${type}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportPayments = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportPaymentsList();
        sendExcelBuffer(res, buffer, `payments-list-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportByProject = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportByProject();
        sendExcelBuffer(res, buffer, `report-by-project-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportByMonth = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportByMonth();
        sendExcelBuffer(res, buffer, `report-by-month-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportByExecutor = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportByExecutor();
        sendExcelBuffer(res, buffer, `report-by-executor-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportBySerial = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportBySerial();
        sendExcelBuffer(res, buffer, `report-by-serial-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const parseIdList = (raw) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const ids = [...new Set(String(raw).split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    return ids;
};

const exportPersonnel = async (req, res) => {
    try {
        const ids = parseIdList(req.query.ids);
        const buffer = await personnelExcel.exportPersonnelList(ids);
        sendExcelBuffer(res, buffer, `personnel-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportGeneralPayments = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportGeneralPayments();
        sendExcelBuffer(res, buffer, `payments-general-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportCommercialPayments = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportCommercialPayments();
        sendExcelBuffer(res, buffer, `payments-commercial-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportMachineryPayments = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportMachineryPayments();
        sendExcelBuffer(res, buffer, `payments-machinery-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportSalaryPayments = async (_req, res) => {
    try {
        const buffer = await paymentExport.exportSalaryPayments();
        sendExcelBuffer(res, buffer, `payments-salary-${Date.now()}.xlsx`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLogs = async (_req, res) => {
    try {
        const logs = await getRecentLogs();
        res.json({ status: 'Success', data: logs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    importPersonnel,
    previewPersonnel,
    confirmPersonnel,
    importPersonnelBulkUpdate,
    importMachineryContacts,
    previewPayments,
    confirmPayments,
    previewCommercialPayments,
    confirmCommercialPayments,
    previewMachineryPayments,
    confirmMachineryPayments,
    previewSalaryPayments,
    confirmSalaryPayments,
    downloadTemplate,
    exportPayments,
    exportByProject,
    exportByMonth,
    exportByExecutor,
    exportBySerial,
    exportPersonnel,
    exportGeneralPayments,
    exportCommercialPayments,
    exportMachineryPayments,
    exportSalaryPayments,
    getLogs,
};
