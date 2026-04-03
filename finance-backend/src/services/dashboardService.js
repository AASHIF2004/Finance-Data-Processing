const { getDb } = require('../config/database');

function getSummary(requestingUser) {
  const db  = getDb();
  const uid = requestingUser.id;
  const isAdmin = requestingUser.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND user_id = ?';
  const params = isAdmin ? [] : [uid];

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COUNT(*) AS total_records
    FROM financial_records
    WHERE deleted_at IS NULL ${userFilter}
  `).get(...params);

  totals.net_balance = totals.total_income - totals.total_expenses;
  return totals;
}

function getCategoryBreakdown(requestingUser) {
  const db  = getDb();
  const isAdmin = requestingUser.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND user_id = ?';
  const params = isAdmin ? [] : [requestingUser.id];

  return db.prepare(`
    SELECT
      category,
      type,
      ROUND(SUM(amount), 2) AS total,
      COUNT(*) AS count
    FROM financial_records
    WHERE deleted_at IS NULL ${userFilter}
    GROUP BY category, type
    ORDER BY total DESC
  `).all(...params);
}

function getMonthlyTrends(requestingUser, months = 12) {
  const db  = getDb();
  const isAdmin = requestingUser.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND user_id = ?';
  const params = isAdmin ? [months] : [requestingUser.id, months];

  return db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 2) AS income,
      ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS expenses,
      ROUND(
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) -
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)
      , 2) AS net
    FROM financial_records
    WHERE deleted_at IS NULL ${userFilter}
    GROUP BY month
    ORDER BY month DESC
    LIMIT ?
  `).all(...params);
}

function getRecentActivity(requestingUser, limit = 10) {
  const db  = getDb();
  const isAdmin = requestingUser.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND r.user_id = ?';
  const params = isAdmin ? [limit] : [requestingUser.id, limit];

  return db.prepare(`
    SELECT r.*, u.name as user_name
    FROM financial_records r
    JOIN users u ON u.id = r.user_id
    WHERE r.deleted_at IS NULL ${userFilter}
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(...params);
}

function getWeeklyTrends(requestingUser, weeks = 8) {
  const db  = getDb();
  const isAdmin = requestingUser.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND user_id = ?';
  const params = isAdmin ? [weeks] : [requestingUser.id, weeks];

  return db.prepare(`
    SELECT
      strftime('%Y-W%W', date) AS week,
      ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 2) AS income,
      ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS expenses
    FROM financial_records
    WHERE deleted_at IS NULL ${userFilter}
    GROUP BY week
    ORDER BY week DESC
    LIMIT ?
  `).all(...params);
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrends, getRecentActivity, getWeeklyTrends };