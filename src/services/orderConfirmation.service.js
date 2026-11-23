const crypto = require("crypto");

const Order = require("../models/Order");
const { isSamePhone } = require("../utils/phone");

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

/**
 * يأكد الطلب بالرمز ورقم المرسل
 * يستخدمها الأدمن (يدوي) والبوت (أوتوماتيكي)
 * يرجع { ok: true, order } أو { ok: false, reason }
 */
async function confirmOrderByCode({ code, senderPhone, method }) {
  const cleanCode = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
    return { ok: false, reason: "INVALID_CODE" };
  }

  const order = await Order.findOne({ "confirmation.code": cleanCode });
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  const { status, expiresAt } = order.confirmation;
  if (status === "confirmed") return { ok: false, reason: "ALREADY_CONFIRMED" };
  if (status === "expired" || expiresAt < new Date()) {
    return { ok: false, reason: "EXPIRED" };
  }

  if (!isSamePhone(order.phoneNumber, senderPhone)) {
    return { ok: false, reason: "PHONE_MISMATCH" };
  }

  // التحديث بشرط إنه لسا pending وما انتهى، عشان لو الأدمن والبوت أكدوا بنفس اللحظة
  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "confirmation.status": "pending",
      "confirmation.expiresAt": { $gt: new Date() },
    },
    {
      $set: {
        "confirmation.status": "confirmed",
        "confirmation.confirmedAt": new Date(),
        "confirmation.method": method,
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) return { ok: false, reason: "ALREADY_CONFIRMED" };
  return { ok: true, order: updated };
}

module.exports = { createConfirmation, buildWhatsAppUrl, confirmOrderByCode };
