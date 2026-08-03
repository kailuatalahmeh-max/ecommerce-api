// 1. تفعيل مكتبة dotenv في أول السيرفر
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Item = require("./models/Item");
const Admin = require("./models/Admin");
const rateLimit = require("express-rate-limit");
const Cart = require("./models/Cart");
const Order = require("./models/Order");

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "15kb" }));
app.use((req, res, next) => {
  console.log(req.ip, req.method, req.path);
  next();
});

const PORT = process.env.PORT || 5000;
const dbURI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

mongoose
  .connect(dbURI)
  .then(() => {
    console.log("تم الاتصال بقاعدة بيانات تلاحمة بنجاح ");
  })
  .catch((err) => console.error("خطأ في الاتصال بقاعدة البيانات:", err));

const addLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    status: 429,
    message: "هدّي اللعب شوي! أرسلت طلبات كثيرة، ارجع جرب بعد 15 دقيقة.",
  },
});

const createLimiter = (maxRequests, message) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests || 15,
    message: {
      status: 429,
      message:
        message || "هدّي اللعب شوي! أرسلت طلبات كثيرة، ارجع جرب بعد 15 دقيقة.",
    },
  });
};

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "لا يوجد توكن، الدخول مرفوض",
      });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "التوكن غير صالح او منتهي الصلاحية!",
    });
  }
}

app.post("/addItem", addLimiter, verifyToken, async (req, res) => {
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
});

app.get("/api/getItemsData", createLimiter(300), async (req, res) => {
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
});

app.delete(
  "/api/deleteItem/:id",
  createLimiter(300),
  verifyToken,
  async (req, res) => {
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
  },
);

app.post(
  "/api/admin/create-new-admin",
  createLimiter(5),
  verifyToken,
  async (req, res) => {
    try {
      const superAdmin = req.admin?.role === "super_admin";

      if (!superAdmin) {
        return res.status(403).json({
          success: false,
          message: "لا تمتلك الصلاحيات لأنشاء حساب أدمن",
        });
      }

      const fullName = String(req.body.fullName || "").trim();
      const email = String(req.body.email || "").trim();
      const password = String(req.body.password || "").trim();
      const role = String(req.body.role || "").trim();

      const allowedRoles = ["admin", "moderator", "super_admin"];

      const validationRules = [
        {
          condition: !fullName || !email || !password || !role,
          message: "يرجى التأكد من إدخال جميع البيانات",
        },
        {
          condition: fullName.length <= 5,
          message: "يرجى التأكد من إدخال الاسم الكامل (أكثر من 5 أحرف)",
        },
        {
          condition: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          message: "صيغة البريد الإلكتروني غير صحيحة",
        },
        {
          condition: password.length < 8 || password.length > 72,
          message: "كلمة المرور يجب أن تكون بين 8 و72 حرف",
        },
        {
          condition: !allowedRoles.includes(role),
          message: "الرتبة المدخلة غير صالحة!",
        },
      ];

      const firstError = validationRules.find((rule) => rule.condition);

      if (firstError) {
        return res
          .status(400)
          .json({ success: false, message: firstError.message });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingAdmin = await Admin.findOne({
        email: normalizedEmail,
      }).lean();
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني مستخدم بالفعل مسجلاً مسبقاً",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const allData = {
        fullName,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      };

      const adminCreated = await Admin.create(allData);

      res.status(201).json({
        success: true,
        message: `تم أضافة الأدمن بنجاح`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "حدث خطأ داخلي" });
    }
  },
);

app.post("/api/admin/logIn", createLimiter(10), async (req, res) => {
  try {
    const rawEmail = String(req.body.email || "").trim();
    const password = String(req.body.password || "").trim();

    if (!rawEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن ترك الحقول فارغة!",
      });
    }

    const email = rawEmail.toLowerCase();

    const adminData = await Admin.findOne({ email }).lean();

    const passwordHash =
      adminData?.password || "$2b$10$invalidsaltinvalidsaltinvalidsO";

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!adminData || !isMatch) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const token = jwt.sign(
      { role: adminData.role, id: adminData._id },
      JWT_SECRET,
      { expiresIn: "23h" },
    );

    return res.json({
      success: true,
      token: token,
      message: "تم التحقق من البيانات بنجاح!",
    });
  } catch (error) {
    console.error("حدث خطأ في السيرفر:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ ما!" });
  }
});

app.put(
  "/api/item/edit/:id",
  createLimiter(50),
  verifyToken,
  async (req, res) => {
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
      return res.status(500).json({ success: false, message: "حدث خطأ ما" });
    }
  },
);

app.post("/api/cart/add", createLimiter(500), async (req, res) => {
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
});

app.get("/api/cart/:guestId", createLimiter(50), async (req, res) => {
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
});

app.delete("/api/cart/delete/:id", createLimiter(50), async (req, res) => {
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
});

app.post("/api/cart/add-quantity/:id", createLimiter(50), async (req, res) => {
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
});

app.patch(
  "/api/cart/reducing-quantity/:id",
  createLimiter(50),
  async (req, res) => {
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
  },
);

app.delete(
  "/api/cart/delete-all/:guestId",
  createLimiter(100),
  async (req, res) => {
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
  },
);

app.post(
  "/api/direct-purchase/set-data",
  createLimiter(300),
  async (req, res) => {
    try {
      const { purchaseDetails, itemId, quantity } = req.body;

      if (!purchaseDetails) {
        return res.status(400).json({
          success: false,
          message: "بيانات الشراء غير موجودة",
        });
      }

      const { fullName, countryCode, phoneNumber, region } = purchaseDetails;

      const countryCodeArray = [
        { value: "+970", label: "Palestine" },
        { value: "+972", label: "Israel" },
      ];

      if (
        !fullName ||
        !phoneNumber ||
        !region ||
        !quantity ||
        !itemId ||
        !countryCode ||
        quantity <= 0
      ) {
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

      const countryFind = countryCodeArray.find(
        (country) => country.value === countryCode,
      );

      if (!countryFind) {
        return res.status(400).json({
          success: false,
          message: "معرّف الدولة غير مدعوم",
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
        customerName: fullName.trim(),
        phoneNumber: `${countryCode}${phoneNumber.trim()}`,
        region: region.trim(),
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
  },
);

app.post(
  "/api/cart-purchase/set-data/:guestId",
  addLimiter,
  async (req, res) => {
    try {
      const { guestId } = req.params;
      const { purchaseDetails } = req.body;

      if (!UUID_V4_REGEX.test(guestId || "")) {
        return res.status(400).json({
          success: false,
          message: "معرّف الجلسة غير صالح!",
        });
      }

      if (!purchaseDetails || typeof purchaseDetails !== "object") {
        return res.status(400).json({
          success: false,
          message: "بيانات الشراء غير صالحة!",
        });
      }

      const { fullName, countryCode, phoneNumber, region } = purchaseDetails;

      if (!fullName || !phoneNumber || !region) {
        return res.status(400).json({
          success: false,
          message: "يرجى التأكد من تعبئة البيانات بشكل صحيح!",
        });
      }

      if (typeof phoneNumber !== "string") {
        return res.status(400).json({
          success: false,
          message: "رقم الهاتف يجب أن يكون نصاً",
        });
      }

      const cleanPhone = phoneNumber.replace(/\s+/g, "");

      if (!/^\d+$/.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: "رقم الهاتف غير صحيح",
        });
      }

      if (cleanPhone.length !== 9) {
        return res.status(400).json({
          success: false,
          message: "رقم الهاتف يجب أن يكون 9 أرقام",
        });
      }

      const countryCodeArray = [
        { value: "+970", label: "Palestine" },
        { value: "+972", label: "Israel" },
      ];

      const countryFind = countryCodeArray.find(
        (country) => country.value === countryCode,
      );

      if (!countryFind) {
        return res.status(400).json({
          success: false,
          message: "معرف الدولة غير مدعوم",
        });
      }

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
        phoneNumber: `${countryCode}${cleanPhone}`,
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
      const orderAdded = await Order.create(order);

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
  },
);

app.get("/api/order/get-my-orders", createLimiter(30), async (req, res) => {
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
});

app.get(
  "/api/admin-control/orders",
  verifyToken,
  createLimiter(300),
  async (req, res) => {
    try {
      const allowedRoles = ["moderator", "super_admin"];

      if (!allowedRoles.includes(req.admin?.role)) {
        return res.status(403).json({
          success: false,
          message: "تعذر جلب البيانات",
        });
      }

      const orders = await Order.find().sort({ createdAt: -1 });

      return res.status(200).json({ success: true, data: orders || [] });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ ما",
      });
    }
  },
);

app.patch(
  "/api/admin-control/order-edit-status",
  createLimiter(300),
  verifyToken,
  async (req, res) => {
    try {
      const allowedRoles = ["moderator", "super_admin"];
      const allowedStatuses = ["Pending", "Accepted", "Delivered", "Cancelled"];

      if (!allowedRoles.includes(req.admin?.role)) {
        return res.status(403).json({
          success: false,
          message: "تعذر تعديل حالة الطلب!",
        });
      }

      const { orderId, status } = req.body;

      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: " يرجى التأكد من إدخال البيانات بشكل صحيح",
        });
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
  },
);

app.get(
  "/api/admin/analytics",
  createLimiter(50),
  verifyToken,
  async (req, res) => {
    try {
      const allowedRoles = ["super_admin"];

      if (!allowedRoles.includes(req.admin?.role)) {
        return res.status(403).json({
          success: false,
          message: "تعذر جلب البيانات",
        });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const start = Date.now();

      const salesStats = await Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      console.log("salesStats:", Date.now() - start, "ms");

      const statusGroup = await Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const ordersByStatus = {
        Pending: 0,
        Accepted: 0,
        Delivered: 0,
        Cancelled: 0,
      };

      statusGroup.forEach((item) => {
        if (item._id) ordersByStatus[item._id] = item.count;
      });

      const topProductStats = await Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.itemId",
            itemName: { $first: "$items.itemName" },
            totalSold: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 1 },
      ]);

      const topRegions = await Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: "$region",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      const totalItems = await Item.countDocuments();
      const activeCarts = await Cart.countDocuments();

      const lowStockItems = await Item.find({
        itemQuantity: { $lt: 5 },
      }).select("itemName itemQuantity");

      res.json({
        success: true,
        data: {
          totalRevenue: salesStats[0]?.totalRevenue || 0,
          totalOrders: salesStats[0]?.totalOrders || 0,
          totalItems,
          activeCarts,
          ordersByStatus,
          topProduct: topProductStats[0] || null,
          lowStockItems,
          topRegions,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ ما!",
      });
    }
  },
);

app.get("/health", createLimiter(1000), (req, res) => {
  return res.status(200).json({ status: "ok" });
});

module.exports = app;
