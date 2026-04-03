const { getDb } = require('../config/database');

function buildWhereClause(filters, userId, role) {
  const conditions = ['r.deleted_at IS NULL'];
  const params = [];

  // Non-admins can only see their own records
  if (role !== 'admin') {
    conditions.push('r.user_id = ?');
    params.push(userId);
  }

  if (filters.type)      { conditions.push('r.type = ?');     params.push(filters.type); }
  if (filters.category)  { conditions.push('r.category LIKE ?'); params.push(`%${filters.category}%`); }
  if (filters.date_from) { conditions.push('r.date >= ?');    params.push(filters.date_from); }
  if (filters.date_to)   { conditions.push('r.date <= ?');    params.push(filters.date_to); }

  return { where: conditions.join(' AND '), params };
}

function listRecords(filters, requestingUser) {
  const db  = getDb();
  const { where, params } = buildWhereClause(filters, requestingUser.id, requestingUser.role);
  const { sort_by, sort_order, page, limit } = filters;

  const offset = (page - 1) * limit;

  const total = db.prepare(`
    SELECT COUNT(*) as c FROM financial_records r WHERE ${where}
  `).get(...params).c;

  const rows = db.prepare(`
    SELECT r.*, u.name as user_name
    FROM financial_records r
    JOIN users u ON u.id = r.user_id
    WHERE ${where}
    ORDER BY r.${sort_by} ${sort_order}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    data: rows,
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) }
  };
}

function getRecordById(id, requestingUser) {
  const db     = getDb();
  const record = db.prepare(`
    SELECT r.*, u.name as user_name
    FROM financial_records r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.deleted_at IS NULL
  `).get(id);

  if (!record) { const err = new Error('Record not found'); err.status = 404; throw err; }

  // Non-admins can only access their own records
  if (requestingUser.role !== 'admin' && record.user_id !== requestingUser.id) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  return record;
}

function createRecord(data, userId) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO financial_records (user_id, amount, type, category, date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, data.amount, data.type, data.category, data.date, data.notes || null);

  return db.prepare('SELECT * FROM financial_records WHERE id = ?').get(result.lastInsertRowid);
}

function updateRecord(id, data, requestingUser) {
  const db = getDb();
  getRecordById(id, requestingUser); // ownership + existence check

  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];

  db.prepare(`
    UPDATE financial_records SET ${fields}, updated_at = datetime('now') WHERE id = ?
  `).run(...values);

  return db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id);
}

function deleteRecord(id, requestingUser) {
  const db = getDb();
  getRecordById(id, requestingUser);
  // Soft delete
  db.prepare(`
    UPDATE financial_records SET deleted_at = datetime('now') WHERE id = ?
  `).run(id);
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord };