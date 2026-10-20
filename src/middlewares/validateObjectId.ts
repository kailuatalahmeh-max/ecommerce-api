import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export function validateObjectId(paramName: string = "id") {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        success: false,
        message: "معرّف العنصر غير صالح",
      });
    }
    next();
  };
}