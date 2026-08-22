const fs = require('fs');
const knex = require('knex');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function createConnection() {
  return knex({
    client: 'better-sqlite3',
    connection: {
      filename: DB_PATH,
    },
    useNullAsDefault: true,
  });
}

let db = createConnection();

async function reconnect() {
  await db.destroy();
  db = createConnection();
  return db;
}

function getDbPath() {
  return DB_PATH;
}

const dbProxy = new Proxy(function knexProxy() {}, {
  apply(_target, _thisArg, args) {
    return db(...args);
  },
  get(_target, prop) {
    if (prop === 'reconnect') return reconnect;
    if (prop === 'getDbPath') return getDbPath;
    const value = db[prop];
    return typeof value === 'function' ? value.bind(db) : value;
  },
});

module.exports = dbProxy;
