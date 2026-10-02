function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "لا تمتلك الصلاحيات للقيام بهذا الإجراء",
      });
    }
    next();
  };
}

module.exports = { requireRole };