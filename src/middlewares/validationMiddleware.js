const { COUNTRY_CODES, REGIONS } = require("../utils/constants");

const INVISIBLE_UNICODE_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

function stripInvisibleChars(value) {
  return typeof value === "string"
    ? value.replace(INVISIBLE_UNICODE_REGEX, "")
    : value;
}

exports.validatePurchaseDetails = (req, res, next) => {
  const { purchaseDetails } = req.body;

  if (!purchaseDetails || typeof purchaseDetails !== "object") {
    return res.status(400).json({
      success: false,
      message: "بيانات الشراء غير صالحة!",
    });
  }

  const { fullName, countryCode, phoneNumber, region } = purchaseDetails;

  const cleanFullName =
    typeof fullName === "string" ? stripInvisibleChars(fullName).trim() : "";

  const cleanRegion =
    typeof region === "string" ? stripInvisibleChars(region).trim() : "";

  if (!cleanFullName || !phoneNumber || !cleanRegion) {
    return res.status(400).json({
      success: false,
      message: "يرجى التأكد من تعبئة البيانات بشكل صحيح!",
    });
  }

  if (typeof phoneNumber !== "string") {
    return res.status(400).json({
      success: false,
      code: "INVALID_PHONE",
      message: "يرجى إدخال رقم هاتف صحيح",
    });
  }

  const cleanPhone = phoneNumber.replace(/\s+/g, "");

  if (!/^\d+$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: "رقم الهاتف غير صحيح",
    });
  }

  if (cleanPhone.length !== 9) {
    return res.status(400).json({
      success: false,
      message: "رقم الهاتف يجب أن يكون 9 أرقام",
    });
  }

  const countryFind = COUNTRY_CODES.find(
    (country) => country.value === countryCode,
  );
  if (!countryFind) {
    return res.status(400).json({
      success: false,
      message: "معرف الدولة غير مدعوم",
    });
  }

  const regionFind = REGIONS.find((r) => r.value === cleanRegion);

  if (!regionFind) {
    return res.status(400).json({
      success: false,
      message: "المنطقة المدخلة غير مدعومة",
    });
  }

  req.purchaseDetails = {
    ...purchaseDetails,
    fullName: cleanFullName,
    region: cleanRegion,
    phoneNumber: cleanPhone,
  };

  next();
};
