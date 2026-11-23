const mongoose = require("mongoose");
const crypto = require("crypto");
const GuestSession = require("../models/GuestSession");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Cart = require("../models/Cart");
const {
  createConfirmation,
  buildWhatsAppUrl,
} = require("../services/orderConfirmation.service");
const { normalizePhone } = require("../utils/phone");

exports.directPurchase = async (req, res, next) => {
  try {
    const { purchaseDetails } = req;

    const { itemId, quantity } = req.body;

    const { fullName, countryCode, phoneNumber, region } = purchaseDetails;

    if (!itemId || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "يرجى التأكد من تعبئة كافة البيانات بشكل صحيح!",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "معرّف المنتج غير صالح!",
      });
    }

    const updatedItem = await Item.findOneAndUpdate(
      {
        _id: itemId,
        itemQuantity: { $gte: quantity },
      },
      {
        $inc: { itemQuantity: -quantity },
      },
      { returnDocument: "after" },
    );

    if (!updatedItem) {
      const itemExists = await Item.exists({ _id: itemId });
      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: "المنتج غير موجود أو تم حذفه!",
        });
      }

      return res.status(400).json({
        success: false,
        message: "عذراً! الكمية المطلوبة غير متوفرة حالياً في المخزن.",
      });
    }

    const totalPrice = quantity * updatedItem.itemPrice;

    const orderItems = [
      {
        itemName: updatedItem.itemName,
        itemPrice: updatedItem.itemPrice,
        quantity: quantity,
        itemId: updatedItem._id,
      },
    ];
    const confirmation = createConfirmation();
    const newOrder = await Order.create({
      customerName: fullName,
      phoneNumber: `${countryCode}${phoneNumber}`,
      region: region,
      items: orderItems,
      totalPrice: totalPrice,
      confirmation: confirmation,
    });

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب! أكّد طلبك عبر واتساب",
      data: {
        orderId: newOrder._id,
        updatedItem: updatedItem,
        confirmCode: confirmation.code,
        expiresAt: confirmation.expiresAt,
        whatsappUrl: buildWhatsAppUrl(req.storeWhatsApp, confirmation.code),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.cartPurchase = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    const { purchaseDetails } = req;

    const { fullName, countryCode, phoneNumber, region } = purchaseDetails;

    const cart = await Cart.findOne({ guestId }).populate("items.itemId");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(404).json({
        success: false,
        error: "السلة فارغة أو غير موجودة!",
      });
    }

    const hasMissingItem = cart.items.some((item) => !item.itemId);
    if (hasMissingItem) {
      return res.status(400).json({
        success: false,
        message:
          "عذراً، بعض المنتجات في سلتك لم تعد متوفرة حالياً، يرجى تحديث السلة!",
      });
    }

    let totalAmount = 0;
    let order = {
      customerName: fullName,
      phoneNumber: `${countryCode}${phoneNumber}`,
      region: region,
      items: [],
    };

    for (const item of cart.items) {
      if (item.quantity > item.itemId.itemQuantity) {
        return res.status(400).json({
          success: false,
          message: `الكمية المطلوبة من المنتج "${item.itemId.itemName}" غير متوفرة حالياً`,
        });
      }

      totalAmount += item.quantity * item.itemId.itemPrice;

      order.items.push({
        itemName: item.itemId.itemName,
        itemPrice: item.itemId.itemPrice,
        quantity: item.quantity,
        itemId: item.itemId._id,
      });
    }

    order.totalPrice = totalAmount;

    const stockUpdates = [];

    for (const item of cart.items) {
      const updatedItem = await Item.findOneAndUpdate(
        { _id: item.itemId._id, itemQuantity: { $gte: item.quantity } },
        { $inc: { itemQuantity: -item.quantity } },
        { returnDocument: "after" },
      );

      if (!updatedItem) {
        for (const rollbackItem of stockUpdates) {
          await Item.findByIdAndUpdate(rollbackItem.itemId, {
            $inc: { itemQuantity: rollbackItem.quantity },
          });
        }

        return res.status(400).json({
          success: false,
          message: `عذراً، الكمية المتوفرة من "${item.itemId.itemName}" لم تعد كافية!`,
        });
      }

      stockUpdates.push({ itemId: item.itemId._id, quantity: item.quantity });
    }
    order.confirmation = createConfirmation();
    const orderCreated = await Order.create(order);
    await Cart.findOneAndUpdate({ guestId }, { $set: { items: [] } });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب! أكّد طلبك عبر واتساب",
      data: {
        orderId: orderCreated._id,
        confirmCode: order.confirmation.code,
        expiresAt: order.confirmation.expiresAt,
        whatsappUrl: buildWhatsAppUrl(
          req.storeWhatsApp,
          order.confirmation.code,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllOrdersForAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders || [] });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const allowedStatuses = ["Pending", "Accepted", "Delivered", "Cancelled"];

    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: " يرجى التأكد من إدخال البيانات بشكل صحيح",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "معرّف الطلب غير صالح" });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "يرجى التأكد من إدخال حالة الطلب بشكل صحيح",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: status,
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "تم تحديث حالة الطلب بنجاح",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPhoneAndCreateToken = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال رقم الهاتف",
      });
    }

    // نفس شكل الرقم المحفوظ في الطلب، مثال: +970599123456
    const cleanPhone = normalizePhone(phoneNumber);

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message: "رقم الهاتف غير صحيح، اختر كود الدولة وأدخل 9 أرقام",
      });
    }

    const orders = await Order.find({ phoneNumber: cleanPhone }).limit(1);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "لا توجد طلبات مرتبطة بهذا الرقم",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await GuestSession.create({
      phoneNumber: cleanPhone,
      token: token,
    });

    return res.status(200).json({
      success: true,
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrdersByToken = async (req, res, next) => {
  res.set("Cache-Control", "no-store");

  try {
    const token = req.headers["x-guest-token"];

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "الرمز غير موجود",
      });
    }

    const session = await GuestSession.findOne({ token: token.trim() });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "انتهت الجلسة، يرجى إدخال رقم الهاتف مرة أخرى",
      });
    }

    const orders = await Order.find({
      phoneNumber: session.phoneNumber,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
