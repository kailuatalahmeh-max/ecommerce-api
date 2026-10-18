const { ITEM_LIMITS } = require("../utils/constants");

exports.validateItemInput = (req, res, next) => {
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
    }

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
        condition: isNameInvalid || isImageInvalid,
        message: "اسم المنتج ورابط الصورة مطلوبان",
      },
      {
        condition: itemName.length > ITEM_LIMITS.MAX_NAME_LENGTH,
        message: `اسم المنتج يجب ألا يتجاوز ${ITEM_LIMITS.MAX_NAME_LENGTH} حرفاً`,
      },
      {
        condition: isImageInvalid,
        message: "رابط الصورة غير صالح أو يتجاوز الحد المسموح",
      },
      {
        condition: isPriceInvalid,
        message: "السعر غير صالح أو يتجاوز الحد المسموح",
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
      return res.status(400).json({
        success: false,
        message: firstError.message || "بيانات الإدخال غير صالحة",
      });
    }

    req.validatedData = {
      itemName,
      itemPrice,
      itemQuantity,
      images,
    };

    next();
  } catch (error) {
    next(error);
  }
};
