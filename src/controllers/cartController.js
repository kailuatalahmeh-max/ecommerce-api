const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Item = require("../models/Item");
const { UUID_V4_REGEX } = require("../utils/constants");

exports.addToCart = async (req, res) => {
  try {
    const { guestId, itemId, quantity } = req.body;

    if (!guestId || !itemId || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "يرجى التأكد من إرسال جميع بيانات المنتج المطلوبة",
      });
    }

    if (typeof guestId !== "string" || !UUID_V4_REGEX.test(guestId)) {
      return res.status(400).json({
        success: false,
        error: "معرّف الجلسة غير صالح",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        error: "معرّف المنتج غير صالح",
      });
    }

    if (
      typeof quantity !== "number" ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message: "الكمية المرسلة غير صالحة",
      });
    }

    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: "العنصر غير موجود أو قد يكون تم حذفه!",
      });
    }

    let cart = await Cart.findOne({ guestId });

    let currentQuantityInCart = 0;
    let itemIndex = -1;

    if (cart) {
      itemIndex = cart.items.findIndex((p) => p.itemId.toString() === itemId);
      currentQuantityInCart =
        itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
    }

    const targetQuantity = currentQuantityInCart + quantity;

    if (itemExists.itemQuantity < targetQuantity) {
      return res.status(400).json({
        success: false,
        message: `الكمية المطلوبة غير متوفرة! الحد الأقصى المتاح هو ${itemExists.itemQuantity}`,
      });
    }

    if (cart) {
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = targetQuantity;
      } else {
        cart.items.push({ itemId, quantity });
      }
      await cart.save();
    } else {
      cart = await Cart.create({
        guestId,
        items: [{ itemId, quantity }],
      });
    }

    await cart.populate("items.itemId");

    return res.status(200).json({
      success: true,
      message: "تم تحديث السلة بنجاح",
      data: { items: cart.items },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ غير متوقع في السيرفر أثناء إضافة المنتج",
    });
  }
};

exports.getCart = async (req, res) => {
  try {
    const { guestId } = req.params;

    if (!UUID_V4_REGEX.test(guestId)) {
      return res.status(400).json({
        success: false,
        error: "معرّف الجلسة غير صالح",
      });
    }

    const cart = await Cart.findOne({ guestId }).populate("items.itemId");

    if (cart) {
      return res.status(200).json({
        success: true,
        data: cart,
      });
    } else {
      return res.status(200).json({
        success: true,
        data: { guestId, items: [] },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في السيرفر أثناء جلب السلة",
    });
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId } = req.body;

    if (!UUID_V4_REGEX.test(guestId || "")) {
      return res.status(400).json({
        success: false,
        error: "معرّف الجلسة غير صالح",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "معرّف العنصر غير صالح",
      });
    }

    const cartUpdated = await Cart.findOneAndUpdate(
      { guestId: guestId },
      {
        $pull: { items: { _id: id } },
      },
      { returnDocument: "after" },
    ).populate("items.itemId");

    if (!cartUpdated) {
      return res
        .status(404)
        .json({ success: false, error: "السلة غير موجودة!" });
    }
    return res.status(200).json({
      success: true,
      message: "تم حذف العنصر بنجاح",
      data: cartUpdated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "حدث خطأ ما!" });
  }
};

exports.increaseQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId } = req.body;

    if (!UUID_V4_REGEX.test(guestId || "")) {
      return res.status(400).json({
        success: false,
        error: "معرّف الجلسة غير صالح",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "معرّف العنصر غير صالح",
      });
    }

    const cart = await Cart.findOne({ guestId }).populate("items.itemId");

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, error: "السلة غير موجودة!" });
    }

    const itemInCart = cart.items.find((item) => item._id.toString() === id);

    if (!itemInCart) {
      return res.status(404).json({
        success: false,
        message: "العنصر غير موجود بالسلة أو تم حذفه!",
      });
    }

    if (!itemInCart.itemId) {
      return res.status(404).json({
        success: false,
        message: "هذا المنتج لم يعد متوفراً وتم حذفه من المتجر",
      });
    }

    const maxAvailable = itemInCart.itemId.itemQuantity;

    const updatedCart = await Cart.findOneAndUpdate(
      {
        guestId,
        items: {
          $elemMatch: { _id: id, quantity: { $lt: maxAvailable } },
        },
      },
      { $inc: { "items.$.quantity": 1 } },
      { returnDocument: "after" },
    ).populate("items.itemId");

    if (!updatedCart) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن أضافة أكثر من ${maxAvailable}!`,
      });
    }
    return res.status(200).json({
      success: true,
      message: "تم زيادة الكمية بنجاح",
      data: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما!",
    });
  }
};

exports.reduceQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId } = req.body;

    if (!UUID_V4_REGEX.test(guestId || "")) {
      return res.status(400).json({
        success: false,
        error: "معرّف الجلسة غير صالح",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "معرّف العنصر غير صالح",
      });
    }

    const cart = await Cart.findOne({ guestId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "السلة غير موجودة!",
      });
    }

    const itemInCart = cart.items.find((item) => item._id.toString() === id);

    if (!itemInCart) {
      return res.status(404).json({
        success: false,
        message: "العنصر غير موجود بالسلة أو تم حذفه!",
      });
    }

    if (itemInCart.quantity <= 1) {
      return res.status(400).json({
        success: false,
        message: "الحد الأدنى للكمية هو 1، يمكنك حذف المنتج بدلاً من ذلك 🗑️",
      });
    }

    const updatedCart = await Cart.findOneAndUpdate(
      {
        guestId,
        items: {
          $elemMatch: { _id: id, quantity: { $gt: 1 } },
        },
      },
      { $inc: { "items.$.quantity": -1 } },
      { returnDocument: "after" },
    ).populate("items.itemId");

    if (!updatedCart) {
      return res.status(400).json({
        success: false,
        message: "تعذر تقليل الكمية، يرجى المحاولة مرة أخرى",
      });
    }

    return res.status(200).json({
      success: true,
      message: "تم تقليل الكمية بنجاح",
      data: updatedCart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "حدث خطأ ما أثناء تقليل الكمية!",
    });
  }
};

exports.deleteAllCart = async (req, res) => {
  try {
    const { guestId } = req.params;

    if (!UUID_V4_REGEX.test(guestId || "")) {
      return res.status(400).json({
        success: false,
        message: "معرّف الجلسة غير صالح!",
      });
    }
    const cartDeleted = await Cart.findOneAndDelete({ guestId: guestId });

    if (!cartDeleted) {
      return res.status(404).json({
        success: false,
        message: "السلة غير موجودة او تم حذفها سابقا!",
      });
    }

    return res.status(200).json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما!",
    });
  }
};
