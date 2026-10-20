import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin, { IAdmin } from "../models/Admin";

// توسيع واجهة Request في Express عشان تتعرف على prop الـ admin
declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "لا يوجد توكن، الدخول مرفوض",
      });
    }
    const token = authHeader.split(" ")[1];

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "خطأ في تكوين الخادم",
      });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const admin = await Admin.findById(decoded.id).select(
      "_id fullName email role isActive lastActivityAt",
    );

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "حساب الأدمن غير موجود أو معطّل",
      });
    }

    await Admin.updateOne(
      { _id: admin._id },
      { $set: { lastActivityAt: new Date() } },
    );
    req.admin = admin as IAdmin;
    next();
  } catch (error) {
    next(error);
  }
}