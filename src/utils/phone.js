const { COUNTRY_CODES } = require("./constants");

// حذف المسافات والشرطات والأقواس والنقاط
const PHONE_SEPARATORS_REGEX = /[\s\-().]/g;

/*
  دالة التنظيف المشتركة (للشراء ولصفحة "طلباتي"):
  تنظّف الجزء المحلي من الرقم (بدون كود الدولة).
    "0599 123-456" ← "599123456"
  - تحذف المسافات و - والأقواس والنقاط
  - تحذف صفراً واحداً في البداية
  لا تتحقق من الطول؛ استخدم isValidLocalPhone بعدها.
*/
function cleanLocalPhone(input) {
  if (typeof input !== "string") return "";

  let local = input.replace(PHONE_SEPARATORS_REGEX, "");

  if (local.startsWith("0")) {
    local = local.slice(1);
  }

  return local;
}

// الرقم المحلي الصحيح = 9 أرقام بالضبط
function isValidLocalPhone(local) {
  return /^\d{9}$/.test(local);
}

/*
  يحوّل رقم كامل (مع كود الدولة) إلى الشكل المحفوظ في الطلبات: كود الدولة + 9 أرقام.
  أمثلة كلها ترجع "+970599123456":
    "+970599123456"
    "+9700599123456"     (صفر في البداية)
    "+970 0599-123-456"  (مسافات وشرطات)
    "00970599123456"     (00 بدل +)
  يرجع null إذا كان الرقم غير صحيح.
*/
function normalizePhone(input) {
  if (typeof input !== "string") return null;

  let phone = input.replace(PHONE_SEPARATORS_REGEX, "");

  // 00970... ← +970...
  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  const country = COUNTRY_CODES.find((c) => phone.startsWith(c.value));
  if (!country) return null;

  const local = cleanLocalPhone(phone.slice(country.value.length));
  if (!isValidLocalPhone(local)) return null;

  return `${country.value}${local}`;
}

module.exports = { cleanLocalPhone, isValidLocalPhone, normalizePhone };
