const crypto = require("crypto");

// حروف واضحة بدون اللي بتتلخبط ببعض (0/O و 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CONFIRM_TTL_MINUTES = 60;


/** يولّد رمز عشوائي آمن، مثل: K7P2XM */
function generateConfirmCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** يجهّز حقل confirmation للطلب الجديد */
function createConfirmation() {
  return {
    code: generateConfirmCode(),
    status: "pending",
    expiresAt: new Date(Date.now() + CONFIRM_TTL_MINUTES * 60 * 1000),
  };
}

/** رابط واتساب برسالة جاهزة */
function buildWhatsAppUrl(storeWhatsApp, code) {
  const phone = String(storeWhatsApp || "").replace(/\D/g, "");
  const message = `تأكيد طلب\nرمز التأكيد: ${code}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

module.exports = { createConfirmation, buildWhatsAppUrl };
