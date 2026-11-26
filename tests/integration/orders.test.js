const app = require("../../myApp");
const request = require("supertest");

const { connectTestDB, disconnectTestDB } = require("../setup/db");

const Item = require("../../src/models/Item");
const Order = require("../../src/models/Order");
const StoreSettings = require("../../src/models/StoreSettings");
const { createTestAdmin } = require("../helpers/createTestAdmin");

const URL = "/api/orders";

const { addTestItem } = require("../helpers/addTestItem");
const { createTestOrder } = require("../fixtures/orderData");

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

const STORE_WHATSAPP = "+970599000000";

beforeEach(async () => {
  await Item.deleteMany({});
  await Order.deleteMany({});
  // الشراء يحتاج رقم واتساب المتجر (requireStoreWhatsApp)
  await StoreSettings.findOneAndUpdate(
    { key: "main" },
    { $set: { whatsappNumber: STORE_WHATSAPP } },
    { upsert: true },
  );
});

describe("Direct Purchase Testing", () => {
  describe("🟢 Success Cases ", () => {
    it("The product must be purchased in the correct quantity, the total price updated, and the data saved.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id);

      const existsQuantity = testItem.itemQuantity - order.quantity;
      const totalPrice = order.quantity * testItem.itemPrice;

      const res = await request(app)
        .post(URL)
        .send(order);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      expect(res.body.data.updatedItem.itemQuantity).toBe(existsQuantity);

      const savedOrder = await Order.findById(res.body.data.orderId).lean();

      expect(savedOrder).not.toBeNull();
      expect(savedOrder.totalPrice).toBe(totalPrice);
      expect(savedOrder.items[0].quantity).toBe(order.quantity);
      expect(savedOrder.items[0].itemId.toString()).toBe(
        testItem._id.toString(),
      );

      const itemInDb = await Item.findById(testItem._id).lean();
      expect(itemInDb.itemQuantity).toBe(existsQuantity);
    });
  });

  describe("🔴 Validation & Missing Data Cases ", () => {
    it("A missing or invalid itemId must be rejected.", async () => {
      const order = createTestOrder("dsadc2");

      const res = await request(app)
        .post(URL)
        .send(order);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
    });

    it("The request must be rejected if the quantity is zero, negative, or not an integer.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id, { quantity: -1 });

      const res = await request(app)
        .post(URL)
        .send(order);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
    });

    it("The request must be rejected if the requested quantity exceeds the available stock.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id, { quantity: 25 });

      const res = await request(app)
        .post(URL)
        .send(order);

      const { itemQuantity } = await Item.findById(testItem._id)
        .select("itemQuantity")
        .lean();

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
      expect(testItem.itemQuantity).toBe(itemQuantity);
    });

    it("The purchase of a deleted product, or one that does not exist in the database, must be rejected.", async () => {
      const order = createTestOrder("6a780926966bdf371b4d67bf");

      const res = await request(app)
        .post(URL)
        .send(order);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
    });
  });

  it("only one request succeeds when stock covers a single order", async () => {
    const { testItem } = await addTestItem();
    const order = createTestOrder(testItem._id, { quantity: 10 });

    const results = await Promise.all([
      request(app).post(URL).send(order),
      request(app).post(URL).send(order),
    ]);

    const statuses = results.map((r) => r.statusCode).sort();
    expect(statuses).toEqual([201, 400]);

    const success = results.find((r) => r.statusCode === 201);
    const failed = results.find((r) => r.statusCode === 400);

    expect(success.body.success).toBe(true);
    expect(failed.body.success).toBe(false);

    expect(await Order.countDocuments()).toBe(1);

    const itemInDb = await Item.findById(testItem._id).lean();
    expect(itemInDb.itemQuantity).toBe(0);
  });
});

describe("WhatsApp order confirmation", () => {
  const buyOne = async () => {
    const { testItem } = await addTestItem();
    return request(app).post(URL).send(createTestOrder(testItem._id));
  };

  it("purchase returns a confirm code and a WhatsApp link", async () => {
    const res = await buyOne();

    expect(res.status).toBe(201);
    const { orderId, confirmCode, whatsappUrl, expiresAt } = res.body.data;

    expect(confirmCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(whatsappUrl).toContain("https://wa.me/970599000000?text=");
    expect(decodeURIComponent(whatsappUrl)).toContain(confirmCode);

    const saved = await Order.findById(orderId).lean();
    expect(saved.confirmation.code).toBe(confirmCode);
    expect(saved.confirmation.status).toBe("pending");
  });

  it("purchase is blocked (503) when the store has no WhatsApp number", async () => {
    await StoreSettings.deleteMany({});

    const res = await buyOne();

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(await Order.countDocuments()).toBe(0);
  });

  // The route is added only when WHATSAPP_BOT_ENABLED === "true" (not in tests)
  it("GET /:id/confirmation does not exist while the WhatsApp bot is off", async () => {
    const { orderId } = (await buyOne()).body.data;

    const res = await request(app).get(`${URL}/${orderId}/confirmation`);
    expect(res.status).toBe(404);
  });

  it("moderator confirms the order manually, only once", async () => {
    const { orderId, confirmCode } = (await buyOne()).body.data;
    const { token } = await createTestAdmin("moderator");

    const confirm = () =>
      request(app)
        .post(`${URL}/confirm`)
        .set("Authorization", `Bearer ${token}`)
        .send({ code: confirmCode, senderPhone: "+970599123456" });

    const first = await confirm();
    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);

    const saved = await Order.findById(orderId).lean();
    expect(saved.confirmation.status).toBe("confirmed");

    const second = await confirm();
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_CONFIRMED");
  });

  it("manual confirm is rejected when the phone does not match", async () => {
    const { confirmCode } = (await buyOne()).body.data;
    const { token } = await createTestAdmin("moderator");

    const res = await request(app)
      .post(`${URL}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ code: confirmCode, senderPhone: "+970591111111" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PHONE_MISMATCH");
  });

  it("manual confirm needs a moderator or super_admin", async () => {
    const { confirmCode } = (await buyOne()).body.data;
    const { token } = await createTestAdmin("admin");

    const res = await request(app)
      .post(`${URL}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ code: confirmCode, senderPhone: "+970599123456" });

    expect(res.status).toBe(403);
  });
});

describe("Track orders by code + phone", () => {
  const PHONE = "+970599123456"; // the phone in createTestOrder

  const buy = async () => {
    const { testItem } = await addTestItem();
    const res = await request(app)
      .post(URL)
      .send(createTestOrder(testItem._id, { quantity: 1 }));
    expect(res.status).toBe(201);
    return res.body.data; // { orderId, confirmCode, ... }
  };

  it("POST /track finds the order with a messy code and phone", async () => {
    const { orderId, confirmCode } = await buy();

    const res = await request(app)
      .post(`${URL}/track`)
      .send({
        code: ` ${confirmCode.slice(0, 3).toLowerCase()} ${confirmCode.slice(3)}`,
        phoneNumber: "+970 0599-123-456",
      });

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(orderId);
  });

  it("POST /track refuses objects (NoSQL injection) and wrong phones", async () => {
    const { confirmCode } = await buy();

    const injection = await request(app)
      .post(`${URL}/track`)
      .send({ code: { $ne: null }, phoneNumber: PHONE });
    expect(injection.status).toBe(400);

    const otherPhone = await request(app)
      .post(`${URL}/track`)
      .send({ code: confirmCode, phoneNumber: "+970591111111" });
    expect(otherPhone.status).toBe(404);
  });

  it("POST /track-many answers found / notFound / invalid in the same order", async () => {
    const first = await buy();
    const second = await buy();

    const res = await request(app)
      .post(`${URL}/track-many`)
      .send({
        orders: [
          { code: second.confirmCode, phoneNumber: PHONE },
          { code: "ABCDEF", phoneNumber: PHONE }, // valid format, no order
          { code: "bad", phoneNumber: PHONE }, // bad format
          { code: first.confirmCode, phoneNumber: "+970591111111" }, // wrong phone
          { code: first.confirmCode.toLowerCase(), phoneNumber: "0599123456" }, // no country code
          { code: first.confirmCode, phoneNumber: PHONE },
        ],
      });

    expect(res.status).toBe(200);
    const statuses = res.body.data.map((r) => r.status);
    expect(statuses).toEqual([
      "found",
      "notFound",
      "invalid",
      "notFound",
      "invalid",
      "found",
    ]);
    expect(res.body.data[0].order._id).toBe(second.orderId);
    expect(res.body.data[5].order._id).toBe(first.orderId);
    // the browser's own values come back, so it can match its saved list
    expect(res.body.data[2].code).toBe("bad");
  });

  it("POST /track-many never shows other orders of the same phone", async () => {
    const mine = await buy();
    await buy(); // another order with the same phone

    const res = await request(app)
      .post(`${URL}/track-many`)
      .send({ orders: [{ code: mine.confirmCode, phoneNumber: PHONE }] });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].order._id).toBe(mine.orderId);
  });

  it("POST /track-many refuses a missing, empty or too long list", async () => {
    const many = Array.from({ length: 21 }, () => ({
      code: "ABCDEF",
      phoneNumber: PHONE,
    }));

    for (const body of [{}, { orders: [] }, { orders: "x" }, { orders: many }]) {
      const res = await request(app).post(`${URL}/track-many`).send(body);
      expect(res.status).toBe(400);
    }
  });

  it("POST /cancel cancels a Pending order once and returns the stock", async () => {
    const { testItem } = await addTestItem(); // stock 10
    const buyRes = await request(app)
      .post(URL)
      .send(createTestOrder(testItem._id, { quantity: 3 }));
    const { orderId, confirmCode } = buyRes.body.data;
    expect((await Item.findById(testItem._id)).itemQuantity).toBe(7);

    const cancel = () =>
      request(app)
        .post(`${URL}/cancel`)
        .send({ code: confirmCode.toLowerCase(), phoneNumber: PHONE });

    const first = await cancel();
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe("Cancelled");

    const saved = await Order.findById(orderId).lean();
    expect(saved.status).toBe("Cancelled");
    expect(saved.cancelledBy).toBe("customer");
    expect((await Item.findById(testItem._id)).itemQuantity).toBe(10);

    // second click: refused, and the stock is not returned twice
    const second = await cancel();
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("NOT_CANCELLABLE");
    expect((await Item.findById(testItem._id)).itemQuantity).toBe(10);
  });

  it("POST /cancel refuses accepted orders, wrong phones and bad input", async () => {
    const { orderId, confirmCode } = await buy();

    const wrongPhone = await request(app)
      .post(`${URL}/cancel`)
      .send({ code: confirmCode, phoneNumber: "+970591111111" });
    expect(wrongPhone.status).toBe(404);

    const injection = await request(app)
      .post(`${URL}/cancel`)
      .send({ code: { $ne: null }, phoneNumber: PHONE });
    expect(injection.status).toBe(400);

    await Order.findByIdAndUpdate(orderId, { status: "Accepted" });
    const accepted = await request(app)
      .post(`${URL}/cancel`)
      .send({ code: confirmCode, phoneNumber: PHONE });
    expect(accepted.status).toBe(409);
    expect((await Order.findById(orderId)).status).toBe("Accepted");
  });

  it("a cancelled order cannot be confirmed by the moderator", async () => {
    const { confirmCode } = await buy();
    await request(app)
      .post(`${URL}/cancel`)
      .send({ code: confirmCode, phoneNumber: PHONE });

    const { token } = await createTestAdmin("moderator");
    const res = await request(app)
      .post(`${URL}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ code: confirmCode, senderPhone: PHONE });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CANCELLED");
  });

  it("the old guest session routes are gone", async () => {
    const res = await request(app)
      .post("/api/guest/sessions")
      .send({ phoneNumber: PHONE });
    expect(res.status).toBe(404);
  });
});
