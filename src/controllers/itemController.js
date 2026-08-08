const mongoose = require("mongoose");
const Item = require("../models/Item");

exports.addItem = async (req, res) => {
  try {
    const allowedRoles = ["admin", "moderator", "super_admin"];

    if (!allowedRoles.includes(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "لا تملك صلاحية الإضافة!",
      });
    }

    const itemName = String(req.body.itemName || "").trim();
    const itemPrice = Number(req.body.itemPrice);
    const imageURL = String(req.body.imageURL || "").trim();
    const itemQuantity = Number(req.body.itemQuantity);

    const MAX_NAME_LENGTH = 100;
    const MAX_URL_LENGTH = 500;
    const MAX_PRICE = 1_000_000;
    const MAX_QUANTITY = 100_000;

    const isQuantityInvalid =
      Number.isNaN(itemQuantity) ||
      !Number.isInteger(itemQuantity) ||
      itemQuantity < 0 ||
      itemQuantity > MAX_QUANTITY;

    const isPriceInvalid =
      Number.isNaN(itemPrice) ||
      !Number.isFinite(itemPrice) ||
      itemPrice < 0 ||
      itemPrice > MAX_PRICE;

    const isNameInvalid =
      itemName.length === 0 || itemName.length > MAX_NAME_LENGTH;

    let isImageUrlInvalid =
      imageURL.length === 0 || imageURL.length > MAX_URL_LENGTH;

    if (!isImageUrlInvalid) {
      try {
        const parsedUrl = new URL(imageURL);
        isImageUrlInvalid = !["http:", "https:"].includes(parsedUrl.protocol);
      } catch {
        isImageUrlInvalid = true;
      }
    }

    if (
      isNameInvalid ||
      isPriceInvalid ||
      isImageUrlInvalid ||
      isQuantityInvalid
    ) {
      return res.status(400).json({
        success: false,
        message: "بيانات غير صالحة",
      });
    }

    const allowedFields = {
      itemName,
      itemPrice,
      imageURL,
      itemQuantity,
    };

    const newItem = await Item.create(allowedFields);

    res.status(201).json({
      success: true,
      message: "تم إضافة المنتج بنجاح",
      data: newItem,
    });
  } catch (error) {
    console.error("خطأ في addItem:", error.message);
    res.status(500).json({ success: false, message: "حدث خطأ ما!" });
  }
};

exports.getItemsData = async (req, res) => {
  try {
    const itemsData = await Item.find().lean();

    return res.status(200).json({
      success: true,
      itemsData: itemsData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ ما!",
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const allowedRoles = ["admin", "moderator", "super_admin"];

    if (!allowedRoles.includes(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "لا تملك صلاحية الحذف!",
      });
    }

    const itemId = req.params.id;

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "تعذر حذف المنتج",
      });
    }
    const itemDeleted = await Item.findByIdAndDelete(itemId);
    if (!itemDeleted) {
      return res
        .status(404)
        .json({ success: false, error: "العنصر غير موجود" });
    }
    return res
      .status(200)
      .json({ success: true, message: "تم حذف العنصر بنجاح" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "خطأ غير متوقع!" });
  }
};

exports.editItem = async (req, res) => {
  try {
    const allowedRoles = ["admin", "moderator", "super_admin"];

    if (!allowedRoles.includes(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "لا تملك صلاحية للتعديل",
      });
    }

    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "معرّف المنتج غير صالح",
      });
    }

    const rawImageURL =
      typeof req.body.imageURL === "string" ? req.body.imageURL.trim() : "";
    const rawItemName =
      typeof req.body.itemName === "string" ? req.body.itemName.trim() : "";

    const priceNum = Number(req.body.itemPrice);
    const quantityNum = Number(req.body.itemQuantity);

    const MAX_NAME_LENGTH = 100;
    const MAX_URL_LENGTH = 500;
    const MAX_PRICE = 1_000_000;
    const MAX_QUANTITY = 100_000;

    let isValidUrl = false;
    if (rawImageURL.length > 0 && rawImageURL.length <= MAX_URL_LENGTH) {
      try {
        new URL(rawImageURL);
        isValidUrl = true;
      } catch {
        isValidUrl = false;
      }
    }

    const validationRules = [
      {
        condition: !rawImageURL || !rawItemName,
        message: "يرجى إدخال جميع البيانات المطلوب",
      },
      {
        condition: rawItemName.length > MAX_NAME_LENGTH,
        message: `اسم المنتج يجب ألا يتجاوز ${MAX_NAME_LENGTH} حرفاً`,
      },
      {
        condition: !isValidUrl,
        message: "رابط الصورة غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition: isNaN(priceNum) || priceNum < 0 || priceNum > MAX_PRICE,
        message: "السعر غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition:
          isNaN(quantityNum) ||
          quantityNum < 0 ||
          quantityNum > MAX_QUANTITY ||
          !Number.isInteger(quantityNum),
        message: "الكمية غير صالحة (يجب أن تكون عدداً صحيحاً)",
      },
    ];

    const firstError = validationRules.find((rule) => rule.condition);

    if (firstError) {
      return res
        .status(400)
        .json({ success: false, message: firstError.message });
    }

    const itemUpdated = await Item.findByIdAndUpdate(
      id,
      {
        $set: {
          imageURL: rawImageURL,
          itemName: rawItemName,
          itemPrice: priceNum,
          itemQuantity: quantityNum,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!itemUpdated) {
      return res.status(404).json({
        success: false,
        message: "تعذر العثور على العنصر",
      });
    }

    return res.status(200).json({
      success: true,
      message: "تم تعديل العنصر بنجاح",
      data: itemUpdated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "حدث خطأ ما" });
  }
};