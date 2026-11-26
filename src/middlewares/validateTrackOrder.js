const { normalizePhone } = require("../utils/phone");

// Same letters as the confirm code (orderConfirmation.service.js): no 0 O 1 I L
const CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/*
  Checks the body of POST /api/orders/track: { code, phoneNumber }
  - code: 6 characters, case and spaces do not matter ("k7p 2xm" → "K7P2XM")
  - phoneNumber: country code + number, cleaned like everywhere else
      "+970 0599-123-456" → "+970599123456"
  The clean values are saved in res.locals.tracking for the controller.
*/
exports.validateTrackOrder = (req, res, next) => {
  const { code, phoneNumber } = req.body || {};

  // Only strings: blocks objects like { "$ne": null } (NoSQL injection)
  if (typeof code !== "string" || typeof phoneNumber !== "string") {
    return res.status(400).json({
      success: false,
      message: "الرمز ورقم الهاتف مطلوبان",
    });
  }

  const cleanCode = code.replace(/\s/g, "").toUpperCase();
  if (!CODE_REGEX.test(cleanCode)) {
    return res.status(400).json({
      success: false,
      message: "رمز الطلب غير صحيح، يجب أن يكون 6 أحرف وأرقام",
    });
  }

  const cleanPhone = normalizePhone(phoneNumber);
  if (!cleanPhone) {
    return res.status(400).json({
      success: false,
      message: "رقم الهاتف غير صحيح، اختر كود الدولة وأدخل 9 أرقام",
    });
  }

  res.locals.tracking = {
    code: cleanCode,
    phoneNumber: cleanPhone,
  };
  next();
};
