const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Cart = require("../models/Cart");

exports.createAdmin = async (req, res) => {
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

    await Admin.create(allData);

    res.status(201).json({
      success: true,
      message: `تم أضافة الأدمن بنجاح`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "حدث خطأ داخلي" });
  }
};

exports.loginAdmin = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET is not defined!");
    return res
      .status(500)
      .json({ success: false, message: "خطأ في إعدادات السيرفر!" });
  }

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
      { expiresIn: "23h" }
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
};

exports.getAnalytics = async (req, res) => {
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
};