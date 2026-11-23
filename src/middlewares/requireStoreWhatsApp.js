const StoreSettings = require("../models/StoreSettings");

// يتأكد إن رقم واتساب المتجر موجود قبل أي عملية شراء
// ويحطه في req.storeWhatsApp عشان الكونترولر يستخدمه
exports.requireStoreWhatsApp = async (req, res, next) => {
  try {
    const settings = await StoreSettings.findOne()
      .select("whatsappNumber")
      .lean();

    if (!settings?.whatsappNumber) {
      return res.status(503).json({
        success: false,
        message: "الشراء غير متاح حالياً، يرجى المحاولة لاحقاً",
      });
    }

    req.storeWhatsApp = settings.whatsappNumber;
    next();
  } catch (error) {
    next(error);
  }
};