const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "معرف غير صالح" });
  }

  res.status(500).json({ message: "خطأ داخلي في السيرفر" });
};

module.exports = errorHandler;
