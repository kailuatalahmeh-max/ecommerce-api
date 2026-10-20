import { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!allowedRoles.includes(req.admin?.role as string)) {
      return res.status(403).json({
        success: false,
        message: "لا تمتلك الصلاحيات للقيام بهذا الإجراء",
      });
    }
    next();
  };
}