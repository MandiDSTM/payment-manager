const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const db = require('./config/db-config');

const app = express();
app.use(cors());
app.use(express.json());

// Set up upload directory
const upload = multer({ dest: 'uploads/' });

const normalizeText = (text) => {
    if (!text || typeof text !== 'string') return text;
    // حذف کاراکترهای خاص Unicode که جهت متن را تغییر می‌دهند (U+200E, U+200F, U+202B, etc.)
    return text.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
};

// Route for Excel Upload
app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
    console.log(">>> [LOG] Incoming request: Smart Upload Excel");

    try {
        if (!req.file) {
            console.error(">>> [ERROR] No file uploaded");
            return res.status(400).json({ message: "فایلی انتخاب نشده است" });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
            return res.status(400).json({ message: "فایل اکسل خالی است یا سطر هدر ندارد" });
        }

        // ۱. شناسایی هدرها (سطر اول)
        const headers = rows[0].map(h => String(h || '').trim());

        // پیدا کردن جایگاه هر ستون بر اساس نام (Case-insensitive)
        const findIdx = (keywords) => headers.findIndex(h =>
            keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
        );

        const colIdx = {
            personnel: findIdx(['پرسنلی', 'کد']),
            firstName: findIdx(['نام', 'first name']),
            lastName: findIdx(['خانوادگی', 'last name']),
            fullName: findIdx(['نام و نام خانوادگی', 'full name']),
            date: findIdx(['تاریخ', 'date']),
            amount: findIdx(['مبلغ', 'amount', 'هزینه']),
            serial: findIdx(['سریال', 'serial']),
            sheba: findIdx(['شبا', 'sheba', 'iban']),
            subject: findIdx(['بابت', 'موضوع', 'subject']), // اضافه شد
            description: findIdx(['توضیحات', 'description', 'شرح']) // اضافه شد
        };
        // ۲. پردازش سطرها
        const dataRows = rows.slice(1);
        console.log(`>>> [LOG] Analyzing ${dataRows.length} rows with identified columns`);

        const recordsToInsert = dataRows.map((row, index) => {
            try {
                // منطق تفکیک نام و نام خانوادگی (اگر در یک ستون بودند)
                let fName = "";
                let lName = "";

                if (colIdx.fullName !== -1 && row[colIdx.fullName]) {
                    const parts = String(row[colIdx.fullName]).trim().split(/\s+/);
                    fName = parts[0];
                    lName = parts.slice(1).join(' ');
                } else {
                    fName = colIdx.firstName !== -1 ? row[colIdx.firstName] : "";
                    lName = colIdx.lastName !== -1 ? row[colIdx.lastName] : "";
                }

                // اگر ستون پیدا نشد، مقدار پیش‌فرض را در نظر بگیر
                const getValue = (idx) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : null;

                const record = {
                    personnel_code: normalizeText(String(getValue(colIdx.personnel) || '')),
                    first_name: normalizeText(String(fName || '')),
                    last_name: normalizeText(String(lName || '')),
                    date_shamsi: normalizeText(String(getValue(colIdx.date) || '')),
                    serial: normalizeText(String(getValue(colIdx.serial) || '')),
                    sheba: normalizeText(String(getValue(colIdx.sheba) || '')),
                    amount: getValue(colIdx.amount) ? Number(getValue(colIdx.amount)) : 0,
                    subject: normalizeText(String(getValue(colIdx.subject) || '')),
                    description: normalizeText(String(getValue(colIdx.description) || '')),
                    status: 'در انتظار پرداخت',
                    app_log: 'Smart Header Mapping'
                };

                // اعتبار سنجی حداقلی: اگر نام یا کد پرسنلی نداشت، رد کن
                if (!record.first_name && !record.personnel_code) return null;

                return record;
            } catch (innerError) {
                console.error(`>>> [ERROR] Parsing error at row ${index + 2}:`, innerError.message);
                return null;
            }
        }).filter(r => r !== null);

        if (recordsToInsert.length === 0) {
            return res.status(400).json({ message: "هیچ دیتای معتبری بر اساس هدرها پیدا نشد" });
        }

        // ۳. ثبت در دیتابیس
        await db('payments').insert(recordsToInsert);

        console.log(`>>> [SUCCESS] ${recordsToInsert.length} records processed successfully`);
        res.json({
            message: `تعداد ${recordsToInsert.length} رکورد با موفقیت شناسایی و ثبت شد.`,
        });

    } catch (error) {
        console.error(">>> [CRITICAL ERROR]:", error.message);
        res.status(500).json({ message: "خطای سرور در پردازش فایل اکسل", error: error.message });
    }
});

// Route to fetch all data
// Route for manual single record entry
app.post('/api/payments', async (req, res) => {
    try {
        const {
            personnel_code, first_name, last_name, date_shamsi,
            amount, serial, sheba, subject, description
        } = req.body;

        const newRecord = {
            personnel_code,
            first_name,
            last_name,
            date_shamsi,
            amount: amount ? Number(amount) : 0,
            serial: serial || null, // اطمینان از ثبت سریال
            sheba: sheba || null,   // اطمینان از ثبت شبا
            subject: subject || null,
            description: description || null,
            status: 'در انتظار پرداخت',
            app_log: 'Manual Entry'
        };

        const [id] = await db('payments').insert(newRecord);
        res.json({ message: "Saved", id });
    } catch (error) {
        console.error("Manual save error:", error.message);
        res.status(500).json({ message: "Failed to save record", error: error.message });
    }
});


app.get('/api/debug-all', async (req, res) => {
    console.log(">>> [LOG] Debug request: Fetching all records");
    try {
        const allPayments = await db('payments').select('*').orderBy('id', 'desc');

        // اگر دیتابیس خالی بود
        if (allPayments.length === 0) {
            return res.json({
                status: "Success",
                message: "Database is connected but empty.",
                count: 0,
                data: []
            });
        }

        // نمایش داده‌ها
        res.json({
            status: "Success",
            count: allPayments.length,
            data: allPayments
        });

    } catch (error) {
        console.error(">>> [ERROR] Debug route failed:", error.message);
        res.status(500).json({
            status: "Error",
            message: "Could not fetch data from database",
            error: error.message
        });
    }
});


// مسیر خطرناک: پاکسازی کل جدول پرداخت‌ها
app.delete('/api/clear-all-data', async (req, res) => {
    console.log(">>> [WARN] Incoming request: Clear ALL Data");
    try {
        await db('payments').truncate(); // این دستور کل ردیف‌ها را حذف و شمارنده ID را صفر می‌کند
        res.json({ message: "تمامی داده‌ها با موفقیت پاکسازی شدند." });
    } catch (error) {
        console.error("Clear data error:", error.message);
        res.status(500).json({ message: "خطا در پاکسازی دیتابیس", error: error.message });
    }
});



// ۱. آپدیت گروهی وضعیت (برای دکمه تایید پرداخت دسته‌جمعی)
app.post('/api/payments/bulk-status', async (req, res) => {
    const { ids, status } = req.body;
    try {
        await db('payments').whereIn('id', ids).update({ status });
        res.json({ message: "وضعیت موارد انتخاب شده بروزرسانی شد." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ۲. آپدیت یک فیلد خاص (برای ویرایش مستقیم هر سلول مثل اکسل)
app.patch('/api/payments/:id/update-field', async (req, res) => {
    const { id } = req.params;
    const { field, value } = req.body;
    try {
        await db('payments').where({ id }).update({ [field]: value });
        res.json({ message: "تغییرات ذخیره شد" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`>>> [INFO] Server started on http://localhost:${PORT}`);
});