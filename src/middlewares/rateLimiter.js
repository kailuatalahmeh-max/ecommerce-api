const rateLimit = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_MINUTES = WINDOW_MS / 60000;

const addLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 1000,
  message: {
    status: 429,
    message: `عدد الطلبات كبير، يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة.`,
  },
});

const createLimiter = (maxRequests, message) => {
  return rateLimit({
    windowMs: WINDOW_MS,
    max: maxRequests || 15,
    message: {
      status: 429,
      message:
        message ||
        `عدد الطلبات كبير، يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة.`,
    },
  });
};

module.exports = {
  addLimiter,
  createLimiter,
};
