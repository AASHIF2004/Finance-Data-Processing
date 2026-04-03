const { getDb } = require('../config/database');

const SAFE_FIELDS = 'id, name, email, role, status, created_at, updated_at';

function listUsers() {
  return getDb().prepare(`SELECT ${SAFE_FIELDS} FROM users ORDER BY created_at DESC`).all();
}

function getUserById(id) {
  const user = getDb().prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(id);
  if (!user) { const err = new Error('User not found'); err.status = 404; throw err; }
  return user;
}

function updateUser(id, data) {
  const db = getDb();
  getUserById(id); // throws 404 if not found

  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];

  db.prepare(`
    UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?
  `).run(...values);

  return getUserById(id);
}

function deleteUser(id) {
  const db = getDb();
  getUserById(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function setStatus(id, status) {
  return updateUser(id, { status });
}

module.exports = { listUsers, getUserById, updateUser, deleteUser, setStatus };