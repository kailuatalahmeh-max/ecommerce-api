const StoreSettings = require("../models/StoreSettings");
const { normalizePhone } = require("../utils/phone");

// GET /api/store-settings (super_admin): the store's settings
exports.getStoreSettings = async (req, res, next) => {
  try {
    const settings = await StoreSettings.findOne({ key: "main" })
      .select("whatsappNumber updatedAt updatedBy")
      .populate("updatedBy", "fullName")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        whatsappNumber: settings?.whatsappNumber || null,
        updatedAt: settings?.updatedAt || null,
        updatedBy: settings?.updatedBy?.fullName || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/store-settings (super_admin): save the store's WhatsApp number
// Body: { "whatsappNumber": "+970599123456" }
// The number can be changed, but not removed: with no number, all purchases stop.
exports.updateStoreSettings = async (req, res, next) => {
  try {
    const whatsappNumber = normalizePhone(req.body?.whatsappNumber);

    if (!whatsappNumber) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PHONE",
        message: "رقم واتساب المتجر غير صحيح، اختر كود الدولة وأدخل 9 أرقام",
      });
    }

    const settings = await StoreSettings.findOneAndUpdate(
      { key: "main" },
      { $set: { whatsappNumber, updatedBy: req.admin._id } },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean();

    res.status(200).json({
      success: true,
      message: "تم حفظ رقم واتساب المتجر",
      data: {
        whatsappNumber: settings.whatsappNumber,
        updatedAt: settings.updatedAt,
        updatedBy: req.admin.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
};
