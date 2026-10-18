const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ success: false, message: messages.join(", ") });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "معرف غير صالح" });
  }
  
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "التوكن غير صالح، الدخول مرفوض",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];

    if (field === "guestId") {
      return res.status(409).json({
        success: false,
        message: "حدث خطأ غير متوقع في إنشاء الجلسة، يرجى إعادة المحاولة",
      });
    }

    if (field === "email") {
      return res.status(409).json({
        success: false,
        message:
          "البريد الإلكتروني مستخدم مسبقاً، يرجى استخدام بريد إلكتروني آخر",
      });
    }

    return res
      .status(409)
      .json({ success: false, message: "هذه القيمة مستخدمة مسبقاً" });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "خطأ داخلي في السيرفر" });
};

module.exports = errorHandler;
