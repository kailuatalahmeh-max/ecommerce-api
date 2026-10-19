const mongoose = require("mongoose");
const Cart = require("../models/Cart").default;
const Item = require("../models/Item").default;
const { UUID_V4_REGEX } = require("../utils/constants");

exports.addToCart = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    const { itemId, quantity } = req.body;

    if (!itemId || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "يرجى التأكد من إرسال جميع بيانات المنتج المطلوبة",
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
    next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const { guestId } = req.params;

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
    next(error);
  }
};

exports.deleteCartItem = async (req, res, next) => {
  try {
    const { guestId, id } = req.params;

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
    next(error);
  }
};

exports.increaseQuantity = async (req, res, next) => {
  try {
    const { id, guestId } = req.params;

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
    next(error);
  }
};

exports.reduceQuantity = async (req, res, next) => {
  try {
    const { id, guestId } = req.params;

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
    next(error);
  }
};

exports.deleteAllCart = async (req, res, next) => {
  try {
    const { guestId } = req.params;

    const cartDeleted = await Cart.findOneAndDelete({ guestId: guestId });

    if (!cartDeleted) {
      return res.status(404).json({
        success: false,
        message: "السلة غير موجودة او تم حذفها سابقا!",
      });
    }

    return res.status(200).json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error) {
    next(error);
  }
};
