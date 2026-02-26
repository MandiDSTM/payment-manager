const db = require('./config/db-config.js');

async function createTables() {
  try {
    const exists = await db.schema.hasTable('payments');
    if (!exists) {
      await db.schema.createTable('payments', (table) => {
        table.increments('id').primary();
        table.string('first_name');           // نام
        table.string('last_name');            // نام خانوادگی
        table.string('personnel_code');       // کد پرسنلی / کد طرف حساب
        table.string('date_shamsi');          // تاریخ شمسی
        table.string('serial');               // سریال
        table.string('requester');            // درخواست کننده
        table.string('project_name');         // نام پروژه
        table.string('subject');              // بابت
        table.text('description');            // توضیحات
        table.bigInteger('amount');           // مبلغ
        table.string('category');             // دسته
        table.string('sheba');                // شماره شبا
        table.text('app_log');                // لاگ برنامه
        table.string('status').defaultTo('در انتظار پرداخت'); // وضعیت
        table.integer('parent_id').unsigned().nullable(); 
        table.timestamps(true, true); 
      });
      console.log("✅ جدول 'payments' با موفقیت در فایل database.sqlite ساخته شد.");
    } else {
      console.log("ℹ️ جدول از قبل وجود دارد.");
    }
    process.exit();
  } catch (error) {
    console.error("❌ خطا در ساخت جدول:", error);
    process.exit(1);
  }
}

createTables();