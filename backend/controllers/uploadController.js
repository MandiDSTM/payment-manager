const db = require('../config/db-config');
const { parseExcelFile } = require('../services/excelService');

const uploadExcel = async (req, res) => {
    console.log('>>> [LOG] Incoming request: Smart Upload Excel');

    try {
        if (!req.file) {
            console.error('>>> [ERROR] No file uploaded');
            return res.status(400).json({ message: 'فایلی انتخاب نشده است' });
        }

        let recordsToInsert;

        try {
            recordsToInsert = parseExcelFile(req.file.path);
        } catch (parseError) {
            if (parseError.message === 'EMPTY_OR_NO_HEADER') {
                return res.status(400).json({ message: 'فایل اکسل خالی است یا سطر هدر ندارد' });
            }
            throw parseError;
        }

        if (recordsToInsert.length === 0) {
            return res.status(400).json({ message: 'هیچ دیتای معتبری بر اساس هدرها پیدا نشد' });
        }

        await db('payments').insert(recordsToInsert);

        console.log(`>>> [SUCCESS] ${recordsToInsert.length} records processed successfully`);
        res.json({
            message: `تعداد ${recordsToInsert.length} رکورد با موفقیت شناسایی و ثبت شد.`,
        });
    } catch (error) {
        console.error('>>> [CRITICAL ERROR]:', error.message);
        res.status(500).json({ message: 'خطای سرور در پردازش فایل اکسل', error: error.message });
    }
};

module.exports = { uploadExcel };
