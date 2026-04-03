const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { isAdmin }     = require('../middleware/rbac');
const { validate }    = require('../middleware/validate');
const { updateUserSchema } = require('../validators/userSchemas');
const userService = require('../services/userService');

// All user management routes require admin
router.use(verifyToken, isAdmin);

// GET /api/users
router.get('/', (req, res, next) => {
  try { res.json(userService.listUsers()); }
  catch (err) { next(err); }
});

// GET /api/users/:id
router.get('/:id', (req, res, next) => {
  try { res.json(userService.getUserById(+req.params.id)); }
  catch (err) { next(err); }
});

// PATCH /api/users/:id
router.patch('/:id', validate(updateUserSchema), (req, res, next) => {
  try { res.json(userService.updateUser(+req.params.id, req.body)); }
  catch (err) { next(err); }
});

// PATCH /api/users/:id/status
router.patch('/:id/status', (req, res, next) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or inactive' });
  }
  try { res.json(userService.setStatus(+req.params.id, status)); }
  catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res, next) => {
  try {
    userService.deleteUser(+req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;