const router = require('express').Router();
const { verifyToken }  = require('../middleware/auth');
const { isAnalyst }    = require('../middleware/rbac');
const { validate, validateQuery } = require('../middleware/validate');
const { createRecordSchema, updateRecordSchema, filterRecordSchema } = require('../validators/recordSchemas');
const recordService = require('../services/recordService');

router.use(verifyToken);

// GET /api/records  — viewer+ can read
router.get('/', validateQuery(filterRecordSchema), (req, res, next) => {
  try { res.json(recordService.listRecords(req.query, req.user)); }
  catch (err) { next(err); }
});

// GET /api/records/:id
router.get('/:id', (req, res, next) => {
  try { res.json(recordService.getRecordById(+req.params.id, req.user)); }
  catch (err) { next(err); }
});

// POST /api/records  — analyst+ can create
router.post('/', isAnalyst, validate(createRecordSchema), (req, res, next) => {
  try {
    const record = recordService.createRecord(req.body, req.user.id);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// PATCH /api/records/:id  — analyst+ can update their own; admin can update any
router.patch('/:id', isAnalyst, validate(updateRecordSchema), (req, res, next) => {
  try { res.json(recordService.updateRecord(+req.params.id, req.body, req.user)); }
  catch (err) { next(err); }
});

// DELETE /api/records/:id  — analyst+ (soft delete)
router.delete('/:id', isAnalyst, (req, res, next) => {
  try {
    recordService.deleteRecord(+req.params.id, req.user);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;