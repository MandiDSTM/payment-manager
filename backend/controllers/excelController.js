const db = require('../config/db-config');
const fs = require('fs');
const { logExcelEvent, getRecentLogs } = require('../utils/excelLog');
const { sendExcelBuffer } = require('../utils/excelHelpers');
const personnelExcel = require('../services/excel/personnelExcelService');
const { parseExcelFile: parseMachineryExcel } = require('../services/machineryContactsExcelService');
const paymentExport = require('../services/excel/paymentExportService');
const { buildWorkbookBuffer } = require('../utils/excelHelpers');
const { resolveRecordedByUserId } = require('../services/commercialPaymentService');

const handleImportError = (error) => {
    if (error.message?.startsWith('MISSING_COLUMNS:')) {
        return { status: 400, message: `ستون‌های اجباری یافت نشد: ${error.message.split(':')[1]}` };
    }
    if (error.message === 'EMPTY_OR_NO_HEADER') {
        return { status: 400, message: 'فایل اکسل خالی است یا سطر هدر ندارد' };
    }
    return { status: 500, message: error.message };
};

const importPersonnel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'فایلی انتخاب نشده است' });

        const { records, errors } = await personnelExcel.parseImport(req.file.path);
        if (records.length > 0) await db('personnel_contacts').insert(records);

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
        if (records.length > 0) await db('machinery_contacts').insert(records);

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

const downloadTemplate = async (req, res) => {
    try {
        const { type } = req.params;
        let buffer;

        switch (type) {
            case 'personnel':
                buffer = personnelExcel.getTemplateBuffer();
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
    importPersonnelBulkUpdate,
    importMachineryContacts,
    downloadTemplate,
    exportPayments,
    exportByProject,
    exportByMonth,
    exportByExecutor,
    exportBySerial,
    getLogs,
};
