const Item = require("../models/Item");

// Give the order's quantities back to the items (a deleted item is skipped)
async function returnStock(items) {
  if (!items?.length) return;
  await Item.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { _id: item.itemId },
        update: { $inc: { itemQuantity: item.quantity } },
      },
    })),
  );
}

// Take the order's quantities from the items again.
// All or nothing: if one item has not enough stock (or was deleted),
// the items already taken are given back, and it returns false.
async function takeStock(items) {
  const taken = [];
  for (const item of items) {
    const result = await Item.updateOne(
      { _id: item.itemId, itemQuantity: { $gte: item.quantity } },
      { $inc: { itemQuantity: -item.quantity } },
    );
    if (result.modifiedCount === 0) {
      await returnStock(taken);
      return false;
    }
    taken.push(item);
  }
  return true;
}

module.exports = { returnStock, takeStock };
