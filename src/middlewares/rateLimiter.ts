import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_MINUTES = WINDOW_MS / 60000;

export const addLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 1000,
  message: {
    status: 429,
    message: `عدد الطلبات كبير، يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة.`,
  },
});

export const createLimiter = (maxRequests?: number, message?: string) => {
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