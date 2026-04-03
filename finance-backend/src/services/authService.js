const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb } = require('../config/database');

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });

  // Persist refresh token
  const db = getDb();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

async function register(data) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existing) {
    const err = new Error('Email already registered'); err.status = 409; throw err;
  }

  const hash = await bcrypt.hash(data.password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `).run(data.name, data.email, hash, data.role || 'viewer');

  const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  return { user, ...generateTokens(user) };
}

async function login({ email, password }) {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }
  if (user.status === 'inactive') {
    const err = new Error('Account is inactive'); err.status = 403; throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }

  const { password: _, ...safeUser } = user;
  return { user: safeUser, ...generateTokens(safeUser) };
}

function refresh(refreshToken) {
  const db = getDb();

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token'); err.status = 401; throw err;
  }

  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
  if (!stored) {
    const err = new Error('Refresh token not recognised'); err.status = 401; throw err;
  }

  // Rotate: delete old, issue new
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);

  const user = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?')
    .get(payload.id);

  if (!user || user.status === 'inactive') {
    const err = new Error('User not available'); err.status = 403; throw err;
  }

  return generateTokens(user);
}

function logout(refreshToken) {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
}

module.exports = { register, login, refresh, logout };