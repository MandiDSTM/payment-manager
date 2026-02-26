const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    // فایل دیتابیس در پوشه اصلی backend ذخیره می‌شود
    filename: path.join(__dirname, '../database.sqlite') 
  },
  useNullAsDefault: true
});

module.exports = db;