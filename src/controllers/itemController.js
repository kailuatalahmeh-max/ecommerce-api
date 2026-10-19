const mongoose = require("mongoose");
const Item = require("../models/Item").default;

exports.getItemsData = async (req, res, next) => {
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

exports.addItem = async (req, res, next) => {
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

exports.deleteItem = async (req, res, next) => {
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

exports.editItem = async (req, res, next) => {
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
