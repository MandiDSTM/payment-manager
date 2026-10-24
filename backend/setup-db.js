const db = require('./config/db-config.js');

async function createPaymentsTable() {
  const exists = await db.schema.hasTable('payments');
  if (!exists) {
    await db.schema.createTable('payments', (table) => {
      table.increments('id').primary();
      table.string('first_name');
      table.string('last_name');
      table.string('personnel_code');
      table.string('date_shamsi');
      table.string('serial');
      table.string('requester');
      table.string('project_name');
      table.string('subject');
      table.text('description');
      table.bigInteger('amount');
      table.string('category');
      table.string('sheba');
      table.text('app_log');
      table.string('status').defaultTo('در انتظار پرداخت');
      table.integer('parent_id').unsigned().nullable();
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'payments' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'payments' از قبل وجود دارد.");
  }
}

async function createBusinessContactsTable() {
  const exists = await db.schema.hasTable('business_contacts');
  if (!exists) {
    await db.schema.createTable('business_contacts', (table) => {
      table.increments('id').primary();
      table.string('first_name');                    // نام
      table.string('last_name');                     // نام خانوادگی
      table.string('business_name').notNullable();   // نام تجاری
      table.string('sheba').notNullable();           // شماره شبا
      table.string('account_holder_name').notNullable(); // نام صاحب حساب
      table.string('account_code').notNullable().unique(); // کد طرف حساب
      table.string('mobile');                        // شماره موبایل
      table.string('phone');                         // شماره تماس
      table.string('city');                          // شهر
      table.string('service_category').notNullable(); // دسته بندی خدمات تجاری
      table.text('description');                     // توضیحات
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'business_contacts' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'business_contacts' از قبل وجود دارد.");
  }
}

async function createMachinesTable() {
  const exists = await db.schema.hasTable('machines');
  if (!exists) {
    await db.schema.createTable('machines', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'machines' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'machines' از قبل وجود دارد.");
  }
}

async function createMachineryContactsTable() {
  const exists = await db.schema.hasTable('machinery_contacts');
  if (!exists) {
    await db.schema.createTable('machinery_contacts', (table) => {
      table.increments('id').primary();
      table.string('account_code').notNullable().unique();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.integer('machine_id').unsigned().notNullable()
        .references('id').inTable('machines');
      table.string('plate');
      table.string('sheba').notNullable();
      table.string('account_holder_name').notNullable();
      table.string('mobile');
      table.string('city');
      table.text('description');
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'machinery_contacts' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'machinery_contacts' از قبل وجود دارد.");
  }
}

async function createMachineryPaymentCategoriesTable() {
  const exists = await db.schema.hasTable('machinery_payment_categories');
  if (!exists) {
    await db.schema.createTable('machinery_payment_categories', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
    });
    const { CATEGORIES } = require('./constants/machineryPayments');
    await db('machinery_payment_categories').insert(CATEGORIES.map((name) => ({ name })));
    console.log("✅ جدول 'machinery_payment_categories' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'machinery_payment_categories' از قبل وجود دارد.");
  }
}

async function createMachineryPaymentsTable() {
  const exists = await db.schema.hasTable('machinery_payments');
  if (exists) {
    const hasAmount = await db.schema.hasColumn('machinery_payments', 'amount');
    if (!hasAmount) {
      await db.schema.dropTable('machinery_payments');
      console.log("ℹ️ جدول قدیمی 'machinery_payments' حذف و بازسازی می‌شود.");
    }
  }

  const existsAfterDrop = await db.schema.hasTable('machinery_payments');
  if (!existsAfterDrop) {
    const { PAYMENT_STATUSES } = require('./constants/machineryPayments');
    await db.schema.createTable('machinery_payments', (table) => {
      table.increments('id').primary();
      table.integer('machinery_contact_id').unsigned().notNullable()
        .references('id').inTable('machinery_contacts');
      table.bigInteger('amount').notNullable();
      table.integer('category_id').unsigned().notNullable()
        .references('id').inTable('machinery_payment_categories');
      table.string('month').notNullable();
      table.integer('executor_id').unsigned().notNullable()
        .references('id').inTable('executors');
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects');
      table.integer('permission_serial_id').unsigned().notNullable().unique()
        .references('id').inTable('payment_permission_serials');
      table.text('description');
      table.string('status').notNullable().defaultTo(PAYMENT_STATUSES[0]);
      table.integer('recorded_by_user_id').unsigned().nullable()
        .references('id').inTable('users');
      table.string('receipt_file_path').nullable();
      table.boolean('accounting_document_registered').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'machinery_payments' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'machinery_payments' از قبل وجود دارد.");
  }
}

async function createUsersTable() {
  const exists = await db.schema.hasTable('users');
  if (!exists) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('username').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('role').notNullable();
      table.boolean('is_blocked').notNullable().defaultTo(false);
      table.timestamps(true, true);
    });
    const bcrypt = require('bcryptjs');
    const defaultPassword = require('./config/default-password');
    const hash = await bcrypt.hash(defaultPassword, 10);
    await db('users').insert([
      { name: 'مدیر سیستم', username: 'admin', password_hash: hash, role: 'admin', is_blocked: false },
      { name: 'حسابدار', username: 'accountant', password_hash: hash, role: 'accountant', is_blocked: false },
      { name: 'مشاهده‌گر', username: 'viewer', password_hash: hash, role: 'viewer', is_blocked: false },
    ]);
    console.log("✅ جدول 'users' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'users' از قبل وجود دارد.");
  }

  await migrateUsersAuthColumns();
}

async function migrateUsersAuthColumns() {
  const hasUsername = await db.schema.hasColumn('users', 'username');
  if (!hasUsername) {
    await db.schema.alterTable('users', (table) => {
      table.string('username');
      table.string('password_hash');
      table.boolean('is_blocked').notNullable().defaultTo(false);
    });

    const bcrypt = require('bcryptjs');
    const defaultPassword = require('./config/default-password');
    const hash = await bcrypt.hash(defaultPassword, 10);
    const users = await db('users').select('id', 'role', 'name');

    for (const user of users) {
      const username = user.role === 'admin' && user.id === 1
        ? 'admin'
        : `${user.role}${user.id}`;
      await db('users').where({ id: user.id }).update({
        username,
        password_hash: hash,
        is_blocked: false,
      });
    }

    console.log("ℹ️ ستون‌های احراز هویت به users اضافه شد.");
  }
}

async function createCommercialPaymentCategoriesTable() {
  const exists = await db.schema.hasTable('commercial_payment_categories');
  if (!exists) {
    await db.schema.createTable('commercial_payment_categories', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
    });
    const { CATEGORIES } = require('./constants/commercialPayments');
    await db('commercial_payment_categories').insert(CATEGORIES.map((name) => ({ name })));
    console.log("✅ جدول 'commercial_payment_categories' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'commercial_payment_categories' از قبل وجود دارد.");
  }
}

async function createExecutorsTable() {
  const exists = await db.schema.hasTable('executors');
  if (!exists) {
    await db.schema.createTable('executors', (table) => {
      table.increments('id').primary();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('name').notNullable().unique();
      table.timestamps(true, true);
    });
    await db('executors').insert([
      { first_name: 'محمدعلی', last_name: 'نجفی', name: 'محمدعلی نجفی' },
      { first_name: 'حسن', last_name: 'کریمی', name: 'حسن کریمی' },
    ]);
    console.log("✅ جدول 'executors' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'executors' از قبل وجود دارد.");
  }
}

async function createProjectsTable() {
  const exists = await db.schema.hasTable('projects');
  if (!exists) {
    await db.schema.createTable('projects', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.timestamps(true, true);
    });
    await db('projects').insert([
      { name: 'دیزج ۲' },
      { name: 'جلفا' },
      { name: 'دفتر' },
      { name: 'عمومی' },
    ]);
    console.log("✅ جدول 'projects' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'projects' از قبل وجود دارد.");
  }
}

async function createPaymentPermissionSerialsTable() {
  const { PERMIT_STATUSES } = require('./constants/permissionSerials');

  const exists = await db.schema.hasTable('payment_permission_serials');
  if (!exists) {
    await db.schema.createTable('payment_permission_serials', (table) => {
      table.increments('id').primary();
      table.string('serial_number').notNullable().unique();
      table.integer('recipient_user_id').unsigned().notNullable()
        .references('id').inTable('users');
      table.string('status').notNullable().defaultTo(PERMIT_STATUSES.RAW_FORM);
      table.string('usage_location').nullable();
      table.timestamps(true, true);
    });
    await db('payment_permission_serials').insert([
      { serial_number: 'SER-1001', recipient_user_id: 1, status: PERMIT_STATUSES.RAW_FORM },
      { serial_number: 'SER-1002', recipient_user_id: 1, status: PERMIT_STATUSES.RAW_FORM },
      { serial_number: 'SER-1003', recipient_user_id: 2, status: PERMIT_STATUSES.RAW_FORM },
    ]);
    console.log("✅ جدول 'payment_permission_serials' ساخته شد.");
    return;
  }

  const hasRecipient = await db.schema.hasColumn('payment_permission_serials', 'recipient_user_id');
  if (!hasRecipient) {
    await db.schema.alterTable('payment_permission_serials', (table) => {
      table.integer('recipient_user_id').unsigned().nullable()
        .references('id').inTable('users');
    });
    await db('payment_permission_serials').update({ recipient_user_id: 1 });
    console.log("ℹ️ ستون 'recipient_user_id' به مجوزها اضافه شد.");
  }

  await db('payment_permission_serials').where({ status: 'موجود' }).update({
    status: PERMIT_STATUSES.RAW_FORM,
  });
  await db('payment_permission_serials').where({ status: 'مصرف شده' }).update({
    status: PERMIT_STATUSES.PAID,
  });
  await db('payment_permission_serials').where({ usage_location: 'پرداخت ماشین‌آلات' }).update({
    usage_location: 'ماشین‌آلات',
  });
  await db('payment_permission_serials').where({ usage_location: 'پرداخت حقوق' }).update({
    usage_location: 'پرسنل',
  });

  console.log("ℹ️ جدول 'payment_permission_serials' بروزرسانی شد.");
}

async function createCommercialPaymentsTable() {
  const exists = await db.schema.hasTable('commercial_payments');
  if (!exists) {
    const { PAYMENT_STATUSES } = require('./constants/commercialPayments');
    await db.schema.createTable('commercial_payments', (table) => {
      table.increments('id').primary();
      table.integer('business_contact_id').unsigned().notNullable()
        .references('id').inTable('business_contacts');
      table.bigInteger('amount').notNullable();
      table.integer('category_id').unsigned().notNullable()
        .references('id').inTable('commercial_payment_categories');
      table.integer('executor_id').unsigned().notNullable()
        .references('id').inTable('executors');
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects');
      table.integer('permission_serial_id').unsigned().notNullable().unique()
        .references('id').inTable('payment_permission_serials');
      table.text('description');
      table.string('status').notNullable().defaultTo(PAYMENT_STATUSES[0]);
      table.integer('recorded_by_user_id').unsigned().nullable()
        .references('id').inTable('users');
      table.string('receipt_file_path').nullable();
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'commercial_payments' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'commercial_payments' از قبل وجود دارد.");
  }
}

async function createPersonnelContactsTable() {
  const exists = await db.schema.hasTable('personnel_contacts');
  if (!exists) {
    await db.schema.createTable('personnel_contacts', (table) => {
      table.increments('id').primary();
      table.string('personnel_code').notNullable().unique();
      table.string('national_id').nullable().unique();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('father_name').nullable();
      table.string('sheba').notNullable();
      table.boolean('sheba_needs_review').notNullable().defaultTo(false);
      table.string('account_holder_name').notNullable();
      table.string('mobile');
      table.string('city');
      table.text('description');
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'personnel_contacts' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'personnel_contacts' از قبل وجود دارد.");
  }

  await migratePersonnelNationalIdColumn();
  await migratePersonnelShebaReviewColumn();
  await migratePersonnelFatherNameColumn();
}

async function migratePersonnelNationalIdColumn() {
  const hasNationalId = await db.schema.hasColumn('personnel_contacts', 'national_id');
  if (!hasNationalId) {
    await db.schema.alterTable('personnel_contacts', (table) => {
      table.string('national_id').nullable().unique();
    });
    console.log("ℹ️ ستون national_id به personnel_contacts اضافه شد.");
  }
}

async function migratePersonnelFatherNameColumn() {
  const hasFatherName = await db.schema.hasColumn('personnel_contacts', 'father_name');
  if (!hasFatherName) {
    await db.schema.alterTable('personnel_contacts', (table) => {
      table.string('father_name').nullable();
    });
    console.log("ℹ️ ستون father_name به personnel_contacts اضافه شد.");
  }
}

async function migratePersonnelShebaReviewColumn() {
  const hasFlag = await db.schema.hasColumn('personnel_contacts', 'sheba_needs_review');
  if (!hasFlag) {
    await db.schema.alterTable('personnel_contacts', (table) => {
      table.boolean('sheba_needs_review').notNullable().defaultTo(false);
    });
    console.log("ℹ️ ستون sheba_needs_review به personnel_contacts اضافه شد.");
  }
}

async function createSalaryPaymentCategoriesTable() {
  const exists = await db.schema.hasTable('salary_payment_categories');
  if (!exists) {
    await db.schema.createTable('salary_payment_categories', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
    });
    const { CATEGORIES } = require('./constants/salaryPayments');
    await db('salary_payment_categories').insert(CATEGORIES.map((name) => ({ name })));
    console.log("✅ جدول 'salary_payment_categories' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'salary_payment_categories' از قبل وجود دارد.");
  }
}

async function createSalaryPaymentsTable() {
  const exists = await db.schema.hasTable('salary_payments');
  if (!exists) {
    const { DEFAULT_STATUS } = require('./constants/salaryPayments');
    await db.schema.createTable('salary_payments', (table) => {
      table.increments('id').primary();
      table.integer('personnel_contact_id').unsigned().notNullable()
        .references('id').inTable('personnel_contacts');
      table.bigInteger('amount').notNullable();
      table.integer('category_id').unsigned().notNullable()
        .references('id').inTable('salary_payment_categories');
      table.string('month').notNullable();
      table.integer('executor_id').unsigned().notNullable()
        .references('id').inTable('executors');
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects');
      table.integer('permission_serial_id').unsigned().notNullable().unique()
        .references('id').inTable('payment_permission_serials');
      table.text('description');
      table.string('status').notNullable().defaultTo(DEFAULT_STATUS);
      table.integer('recorded_by_user_id').unsigned().nullable()
        .references('id').inTable('users');
      table.string('receipt_file_path').nullable();
      table.boolean('accounting_document_registered').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log("✅ جدول 'salary_payments' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'salary_payments' از قبل وجود دارد.");
  }
}

async function createExcelLogsTable() {
  const exists = await db.schema.hasTable('excel_logs');
  if (!exists) {
    await db.schema.createTable('excel_logs', (table) => {
      table.increments('id').primary();
      table.string('operation_type').notNullable();
      table.string('file_name').nullable();
      table.integer('user_id').unsigned().nullable();
      table.integer('imported').defaultTo(0);
      table.integer('failed').defaultTo(0);
      table.text('errors').nullable();
      table.text('message').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log("✅ جدول 'excel_logs' ساخته شد.");
  } else {
    console.log("ℹ️ جدول 'excel_logs' از قبل وجود دارد.");
  }
}

async function createTables() {
  try {
    await createPaymentsTable();
    await createBusinessContactsTable();
    await createMachinesTable();
    await createMachineryContactsTable();
    await createUsersTable();
    await createCommercialPaymentCategoriesTable();
    await createMachineryPaymentCategoriesTable();
    await createSalaryPaymentCategoriesTable();
    await createPersonnelContactsTable();
    await createExecutorsTable();
    await createProjectsTable();
    await createPaymentPermissionSerialsTable();
    await createCommercialPaymentsTable();
    await createMachineryPaymentsTable();
    await createSalaryPaymentsTable();
    await createExcelLogsTable();
    process.exit();
  } catch (error) {
    console.error('❌ خطا در ساخت جداول:', error);
    process.exit(1);
  }
}

createTables();
