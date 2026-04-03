const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './finance.db';

let db;

function getDb() {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','analyst','admin')),
      status      TEXT    NOT NULL DEFAULT 'active'  CHECK(status IN ('active','inactive')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT    NOT NULL UNIQUE,
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL CHECK(amount > 0),
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      category    TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      notes       TEXT,
      deleted_at  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_records_user_id   ON financial_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_type      ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category  ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_records_date      ON financial_records(date);
  `);

  // Seed a default admin if no users exist
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES ('Admin User', 'admin@finance.com', ?, 'admin')
    `).run(hash);
    console.log('✅ Seeded default admin — email: admin@finance.com  password: admin123');
  }
}

module.exports = { getDb };