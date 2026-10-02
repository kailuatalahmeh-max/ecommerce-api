const mongoose = require("mongoose");

function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        success: false,
        error: "معرّف العنصر غير صالح",
      });
    }
    next();
  };
}

module.exports = { validateObjectId };