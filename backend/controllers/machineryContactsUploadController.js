const { parseExcelFile } = require('../services/machineryContactsExcelService');
const db = require('../config/db-config');

const uploadExcel = async (req, res) => {
    console.log('>>> [LOG] Incoming request: Machinery Contacts Excel Upload');

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'فایلی انتخاب نشده است' });
        }

        let result;

        try {
            result = await parseExcelFile(req.file.path);
        } catch (parseError) {
            if (parseError.message === 'EMPTY_OR_NO_HEADER') {
                return res.status(400).json({ message: 'فایل اکسل خالی است یا سطر هدر ندارد' });
            }
            throw parseError;
        }

        const { records, errors } = result;

        if (records.length === 0) {
            return res.status(400).json({
                message: 'هیچ رکورد معتبری یافت نشد',
                errors,
            });
        }

        await db('machinery_contacts').insert(records);

        res.json({
            message: `تعداد ${records.length} مخاطب با موفقیت ثبت شد.`,
            imported: records.length,
            failed: errors.length,
            errors,
        });
    } catch (error) {
        console.error('>>> [CRITICAL ERROR] Machinery excel upload:', error.message);
        res.status(500).json({ message: 'خطای سرور در پردازش فایل اکسل', error: error.message });
    }
};

module.exports = { uploadExcel };
