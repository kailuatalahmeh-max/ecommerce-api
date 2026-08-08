const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "لا يوجد توكن، الدخول مرفوض",
      });
    }
    const token = authHeader.split(" ")[1];

    const JWT_SECRET = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "التوكن غير صالح او منتهي الصلاحية!",
    });
  }
}

module.exports = { verifyToken };
