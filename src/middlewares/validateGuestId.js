const { UUID_V4_REGEX } = require("../utils/constants");

exports.validateGuestId = (req, res, next) => {
  const { guestId } = req.params;

  if (!UUID_V4_REGEX.test(guestId || "")) {
    return res.status(400).json({
      success: false,
      message: "معرّف الجلسة غير صالح!",
    });
  }

  next();
};
