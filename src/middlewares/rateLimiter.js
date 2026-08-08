const rateLimit = require("express-rate-limit");

const addLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    status: 429,
    message: "هدّي اللعب شوي! أرسلت طلبات كثيرة، ارجع جرب بعد 15 دقيقة.",
  },
});

const createLimiter = (maxRequests, message) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests || 15,
    message: {
      status: 429,
      message:
        message || "هدّي اللعب شوي! أرسلت طلبات كثيرة، ارجع جرب بعد 15 دقيقة.",
    },
  });
};

module.exports = {
  addLimiter,
  createLimiter,
};
