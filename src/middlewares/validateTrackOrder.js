const { normalizePhone } = require("../utils/phone");

// Same letters as the confirm code (orderConfirmation.service.js): no 0 O 1 I L
const CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

// The most orders one track-many request can ask for
const MAX_TRACK_MANY = 20;

/*
  Cleans and checks one { code, phoneNumber } pair.
  - code: 6 characters, case and spaces do not matter ("k7p 2xm" → "K7P2XM")
  - phoneNumber: country code + number, cleaned like everywhere else
      "+970 0599-123-456" → "+970599123456"
  Returns { ok: true, code, phoneNumber } or { ok: false, message }.
*/
function cleanTrackPair(code, phoneNumber) {
  // Only strings: blocks objects like { "$ne": null } (NoSQL injection)
  if (typeof code !== "string" || typeof phoneNumber !== "string") {
    return { ok: false, message: "الرمز ورقم الهاتف مطلوبان" };
  }

  const cleanCode = code.replace(/\s/g, "").toUpperCase();
  if (!CODE_REGEX.test(cleanCode)) {
    return {
      ok: false,
      message: "رمز الطلب غير صحيح، يجب أن يكون 6 أحرف وأرقام",
    };
  }

  const cleanPhone = normalizePhone(phoneNumber);
  if (!cleanPhone) {
    return {
      ok: false,
      message: "رقم الهاتف غير صحيح، اختر كود الدولة وأدخل 9 أرقام",
    };
  }

  return { ok: true, code: cleanCode, phoneNumber: cleanPhone };
}

/*
  POST /api/orders/track — body: { code, phoneNumber }
  The clean values are saved in res.locals.tracking for the controller.
*/
exports.validateTrackOrder = (req, res, next) => {
  const { code, phoneNumber } = req.body || {};
  const result = cleanTrackPair(code, phoneNumber);

  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.locals.tracking = { code: result.code, phoneNumber: result.phoneNumber };
  next();
};

/*
  POST /api/orders/track-many — body: { orders: [{ code, phoneNumber }, ...] }
  - orders must be an array with 1 to MAX_TRACK_MANY items, or the request is refused (400).
  - A bad item does NOT refuse the request: it is marked invalid, so one broken
    saved order in the browser does not hide all the others.
  res.locals.trackMany = [{ input, valid, code, phoneNumber }] in the same order.
*/
exports.validateTrackMany = (req, res, next) => {
  const { orders } = req.body || {};

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({
      success: false,
      message: "يرجى إرسال قائمة الطلبات",
    });
  }

  if (orders.length > MAX_TRACK_MANY) {
    return res.status(400).json({
      success: false,
      message: `الحد الأقصى ${MAX_TRACK_MANY} طلب في المرة الواحدة`,
    });
  }

  res.locals.trackMany = orders.map((item) => {
    const result = cleanTrackPair(item?.code, item?.phoneNumber);
    return {
      // what the browser sent, so it can match the answer to its saved order
      input: {
        code: typeof item?.code === "string" ? item.code : null,
        phoneNumber:
          typeof item?.phoneNumber === "string" ? item.phoneNumber : null,
      },
      valid: result.ok,
      code: result.code,
      phoneNumber: result.phoneNumber,
    };
  });
  next();
};

exports.MAX_TRACK_MANY = MAX_TRACK_MANY;
