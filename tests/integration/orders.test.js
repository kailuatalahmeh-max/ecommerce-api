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
