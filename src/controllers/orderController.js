const mongoose = require("mongoose");
const crypto = require("crypto");
const GuestSession = require("../models/GuestSession");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Cart = require("../models/Cart");

exports.directPurchase = async (req, res) => {
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

    const itemQuantityUpdated = await Item.findOneAndUpdate(
      {
        _id: itemId,
        itemQuantity: { $gte: quantity },
      },
      {
        $inc: { itemQuantity: -quantity },
      },
      { returnDocument: "after" },
    );

    if (!itemQuantityUpdated) {
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

    const totalPrice = quantity * itemQuantityUpdated.itemPrice;

    const order = [
      {
        itemName: itemQuantityUpdated.itemName,
        itemPrice: itemQuantityUpdated.itemPrice,
        quantity: quantity,
        itemId: itemQuantityUpdated._id,
      },
    ];

    const orderCreated = await Order.create({
      customerName: fullName,
      phoneNumber: `${countryCode}${phoneNumber}`,
      region: region,
      items: order,
      totalPrice: totalPrice,
    });

    return res.status(201).json({
      success: true,
      message: "تم الشراء بنجاح! يمكن متابعة الطلب من صفحة طلباتي",
      data: {
        orderId: orderCreated._id,
        updatedItem: itemQuantityUpdated,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء معالجة عملية الشراء المباشر!",
    });
  }
};

exports.cartPurchase = async (req, res) => {
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
    await Order.create(order);

    await Cart.findOneAndUpdate({ guestId }, { $set: { items: [] } });

    res.status(201).json({
      success: true,
      message: "تم الشراء! العناصر موجودة في صفحة طلباتي",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما",
    });
  }
};

exports.getMyOrders = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const { phoneNumber } = req.query;

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "يرجى أدخال رقم هاتف صالح للبحث عن الطلبات!",
      });
    }

    const cleanPhone = phoneNumber.trim();

    const orders = await Order.find({ phoneNumber: cleanPhone }).sort({
      createdAt: -1,
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ليس لديك طلبات شراء حتى اللحظة!",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما",
    });
  }
};

exports.getAllOrdersForAdmin = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما",
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const allowedStatuses = ["Pending", "Accepted", "Delivered", "Cancelled"];

    const { orderId, status } = req.body;

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
    res.status(500).json({ success: false, message: "حدث خطأ ما!" });
  }
};

exports.verifyPhoneAndCreateToken = async (req, res) => {
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

    const cleanPhone = phoneNumber.trim();

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
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما",
    });
  }
};

exports.getOrdersByToken = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما",
    });
  }
};
