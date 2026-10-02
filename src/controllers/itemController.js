const mongoose = require("mongoose");
const Item = require("../models/Item");
const { ITEM_LIMITS } = require("../utils/constants");

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

exports.addItem = async (req, res) => {
  try {
    const itemName = String(req.body.itemName || "").trim();
    const itemPrice = Number(req.body.itemPrice);
    const itemQuantity = Number(req.body.itemQuantity);

    let images = [];

    if (Array.isArray(req.body.images) && req.body.images.length > 0) {
      images = req.body.images
        .map((img) => ({
          imageURL: String(img.imageURL || "").trim(),
        }))
        .filter((img) => img.imageURL.length > 0);
    } else if (req.body.imageURL) {
      const singleURL = String(req.body.imageURL).trim();
      if (singleURL.length > 0) {
        images = [{ imageURL: singleURL }];
      }
    }

    const imageURL = images.length > 0 ? images[0].imageURL : "";

    const isPriceInvalid =
      Number.isNaN(itemPrice) ||
      !Number.isFinite(itemPrice) ||
      itemPrice < 0 ||
      itemPrice > ITEM_LIMITS.MAX_PRICE;

    const isNameInvalid =
      itemName.length === 0 || itemName.length > ITEM_LIMITS.MAX_NAME_LENGTH;

    let isImageInvalid = images.length === 0;
    if (!isImageInvalid) {
      for (let img of images) {
        const url = img.imageURL;
        if (url.length > ITEM_LIMITS.MAX_URL_LENGTH) {
          isImageInvalid = true;
          break;
        }
        try {
          const parsedUrl = new URL(url);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            isImageInvalid = true;
            break;
          }
        } catch {
          isImageInvalid = true;
          break;
        }
      }
    }

    const validationRules = [
      {
        condition: isNameInvalid,
        message: `اسم المنتج غير صالح (يجب أن يكون بين 1 و${ITEM_LIMITS.MAX_NAME_LENGTH} حرفاً)`,
      },
      {
        condition: isPriceInvalid,
        message: `السعر غير صالح أو يتجاوز الحد المسموح`,
      },
      {
        condition: isImageInvalid,
        message: "رابط الصورة غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition:
          Number.isNaN(itemQuantity) || !Number.isInteger(itemQuantity),
        message: "الكمية يجب أن تكون عدداً صحيحاً",
      },
      {
        condition: itemQuantity < 0 || itemQuantity > ITEM_LIMITS.MAX_QUANTITY,
        message: `الكمية يجب أن تكون بين 0 و${ITEM_LIMITS.MAX_QUANTITY}`,
      },
      {
        condition: images.length > ITEM_LIMITS.MAX_IMAGES_PER_ITEM,
        message: `الحد الأقصى للصور هو ${ITEM_LIMITS.MAX_IMAGES_PER_ITEM} صور`,
      },
    ];

    const firstError = validationRules.find((rule) => rule.condition);
    if (firstError) {
      return res
        .status(400)
        .json({ success: false, message: firstError.message });
    }

    const newItem = await Item.create({
      itemName,
      itemPrice,
      itemQuantity,
      imageURL,
      images,
    });

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

exports.deleteItem = async (req, res) => {
  try {
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
    return res.status(500).json({ success: false, message: "خطأ غير متوقع!" });
  }
};

exports.editItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "معرّف المنتج غير صالح",
      });
    }

    const rawItemName =
      typeof req.body.itemName === "string" ? req.body.itemName.trim() : "";

    const priceNum = Number(req.body.itemPrice);
    const quantityNum = Number(req.body.itemQuantity);

    let images = [];

    if (Array.isArray(req.body.images) && req.body.images.length > 0) {
      images = req.body.images
        .map((img) => ({
          imageURL: String(img.imageURL || "").trim(),
        }))
        .filter((img) => img.imageURL.length > 0);
    } else if (req.body.imageURL) {
      const singleURL = String(req.body.imageURL).trim();
      if (singleURL.length > 0) {
        images = [{ imageURL: singleURL }];
      }
    }

    const imageURL = images.length > 0 ? images[0].imageURL : "";

    let isImageInvalid = images.length === 0;
    if (!isImageInvalid) {
      for (let img of images) {
        const url = img.imageURL;
        if (url.length > ITEM_LIMITS.MAX_URL_LENGTH) {
          isImageInvalid = true;
          break;
        }
        try {
          const parsedUrl = new URL(url);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            isImageInvalid = true;
            break;
          }
        } catch {
          isImageInvalid = true;
          break;
        }
      }
    }

    const validationRules = [
      {
        condition: !rawItemName || isImageInvalid,
        message: "اسم المنتج ورابط الصورة مطلوبان",
      },
      {
        condition: rawItemName.length > ITEM_LIMITS.MAX_NAME_LENGTH,
        message: `اسم المنتج يجب ألا يتجاوز ${ITEM_LIMITS.MAX_NAME_LENGTH} حرفاً`,
      },
      {
        condition: isImageInvalid,
        message: "رابط الصورة غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition:
          isNaN(priceNum) || priceNum < 0 || priceNum > ITEM_LIMITS.MAX_PRICE,
        message: "السعر غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition: Number.isNaN(quantityNum) || !Number.isInteger(quantityNum),
        message: "الكمية يجب أن تكون عدداً صحيحاً",
      },
      {
        condition: quantityNum < 0 || quantityNum > ITEM_LIMITS.MAX_QUANTITY,
        message: `الكمية يجب أن تكون بين 0 و${ITEM_LIMITS.MAX_QUANTITY}`,
      },
      {
        condition: images.length > ITEM_LIMITS.MAX_IMAGES_PER_ITEM,
        message: `الحد الأقصى للصور هو ${ITEM_LIMITS.MAX_IMAGES_PER_ITEM} صور`,
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
          imageURL: imageURL, // الحقل القديم للتوافق
          images: images, // الحقل الجديد
          itemName: rawItemName,
          itemPrice: priceNum,
          itemQuantity: quantityNum,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
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
    console.log(error);
    return res.status(500).json({ success: false, message: "حدث خطأ ما" });
  }
};
