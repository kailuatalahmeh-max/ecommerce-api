import { Request, Response, NextFunction } from "express";
import Item from "../models/Item";



export const getItemsData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const itemsData = await Item.find().lean();

    return res.status(200).json({
      success: true,
      itemsData: itemsData,
    });
  } catch (error) {
    next(error);
  }
};

export const addItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemName, itemPrice, itemQuantity, images } = req.validatedData;
    const newItem = await Item.create({
      itemName,
      itemPrice,
      itemQuantity,
      images,
    });

    res.status(201).json({
      success: true,
      message: "تم إضافة المنتج بنجاح",
      data: newItem,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const itemId = req.params.id;

    const itemDeleted = await Item.findByIdAndDelete(itemId);
    if (!itemDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "تعذر العثور على العنصر" });
    }
    return res
      .status(200)
      .json({ success: true, message: "تم حذف العنصر بنجاح" });
  } catch (error) {
    next(error);
  }
};

export const editItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemName, itemPrice, itemQuantity, images } = req.validatedData;

    const { id } = req.params;

    const itemUpdated = await Item.findByIdAndUpdate(
      id,
      {
        $set: {
          images: images,
          itemName: itemName,
          itemPrice: itemPrice,
          itemQuantity: itemQuantity,
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
    next(error);
  }
};
