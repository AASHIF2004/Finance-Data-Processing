const router = require('express').Router();
const { validate }    = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authSchemas');
const authService = require('../services/authService');

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), (req, res, next) => {
  try {
    const tokens = authService.refresh(req.body.refresh_token);
    res.json(tokens);
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', validate(refreshSchema), (req, res) => {
  authService.logout(req.body.refresh_token);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const { getDb } = require('../config/database');
  const user = getDb()
    .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
    .get(req.user.id);
  res.json(user);
});

module.exports = router;