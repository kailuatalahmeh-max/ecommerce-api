const Order = require("../models/Order");
const { returnStock } = require("./stock.service");

// How often the server looks for expired orders
const EXPIRE_CHECK_MINUTES = 10;

/**
 * Orders that were not confirmed on WhatsApp in time (24 hours):
 * - confirmation.status → "expired"
 * - status → "Cancelled" (cancelledBy: "system")
 * - the stock comes back
 *
 * Only "Pending" orders. An order the admin already accepted is not touched.
 * Returns the number of expired orders.
 */
async function expireOldOrders(now = new Date()) {
  const filter = {
    status: "Pending",
    "confirmation.status": "pending",
    "confirmation.expiresAt": { $lt: now },
  };

  const candidates = await Order.find(filter).select("_id").lean();

  let count = 0;
  for (const { _id } of candidates) {
    // One atomic step per order: if the customer cancels, or the job runs
    // twice at the same time, the stock comes back only once
    const order = await Order.findOneAndUpdate(
      { _id, ...filter },
      {
        $set: {
          status: "Cancelled",
          "confirmation.status": "expired",
          cancelledAt: now,
          cancelledBy: "system",
        },
      },
      { returnDocument: "after" },
    );
    if (!order) continue;

    await returnStock(order.items);
    count++;
  }
  return count;
}

// Runs once now (catches up after the server was asleep), then every 10 minutes.
// Started from server.js only, so tests are not affected.
function startExpireOrdersJob() {
  const run = () =>
    expireOldOrders()
      .then((count) => {
        if (count > 0) console.log(`Expired orders: ${count} (stock returned)`);
      })
      .catch((error) => console.error("expireOldOrders error:", error));

  run();
  const timer = setInterval(run, EXPIRE_CHECK_MINUTES * 60 * 1000);
  timer.unref(); // does not keep the process alive on its own
  return timer;
}

module.exports = { expireOldOrders, startExpireOrdersJob };
