const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { isAnalyst }   = require('../middleware/rbac');
const dashboardService = require('../services/dashboardService');

router.use(verifyToken, isAnalyst);

// GET /api/dashboard/summary
router.get('/summary', (req, res, next) => {
  try { res.json(dashboardService.getSummary(req.user)); }
  catch (err) { next(err); }
});

// GET /api/dashboard/categories
router.get('/categories', (req, res, next) => {
  try { res.json(dashboardService.getCategoryBreakdown(req.user)); }
  catch (err) { next(err); }
});

// GET /api/dashboard/monthly?months=12
router.get('/monthly', (req, res, next) => {
  const months = Math.min(parseInt(req.query.months) || 12, 24);
  try { res.json(dashboardService.getMonthlyTrends(req.user, months)); }
  catch (err) { next(err); }
});

// GET /api/dashboard/weekly?weeks=8
router.get('/weekly', (req, res, next) => {
  const weeks = Math.min(parseInt(req.query.weeks) || 8, 52);
  try { res.json(dashboardService.getWeeklyTrends(req.user, weeks)); }
  catch (err) { next(err); }
});

// GET /api/dashboard/recent?limit=10
router.get('/recent', (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  try { res.json(dashboardService.getRecentActivity(req.user, limit)); }
  catch (err) { next(err); }
});

module.exports = router;