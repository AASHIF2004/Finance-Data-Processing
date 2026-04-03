const ROLE_HIERARCHY = { viewer: 1, analyst: 2, admin: 3 };

// Enforce minimum role level
function requireRole(...roles) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] ?? 0;
    const allowed = roles.some(r => ROLE_HIERARCHY[r] <= userLevel);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

// Shorthand helpers
const isViewer  = requireRole('viewer');
const isAnalyst = requireRole('analyst');
const isAdmin   = requireRole('admin');

module.exports = { requireRole, isViewer, isAnalyst, isAdmin };