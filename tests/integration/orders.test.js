const app = require("../../myApp");
const request = require("supertest");

const { connectTestDB, disconnectTestDB } = require("../setup/db");

const Item = require("../../src/models/Item").default;
const Order = require("../../src/models/Order").default;

const URL = "/api/direct-purchase/set-data";

const { addTestItem } = require("../helpers/addTestItem");
const { createTestOrder } = require("../fixtures/orderData");

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await Item.deleteMany({});
  await Order.deleteMany({});
});

describe("Direct Purchase Testing", () => {
  describe("🟢 Success Cases ", () => {
    it("The product must be purchased in the correct quantity, the total price updated, and the data saved.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id);

      const existsQuantity = testItem.itemQuantity - order.quantity;
      const totalPrice = order.quantity * testItem.itemPrice;

      const res = await request(app)
        .post("/api/direct-purchase/set-data")
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
        .post("/api/direct-purchase/set-data")
        .send(order);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
    });

    it("The request must be rejected if the quantity is zero, negative, or not an integer.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id, { quantity: -1 });

      const res = await request(app)
        .post("/api/direct-purchase/set-data")
        .send(order);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Order.countDocuments()).toBe(0);
    });

    it("The request must be rejected if the requested quantity exceeds the available stock.", async () => {
      const { testItem } = await addTestItem();

      const order = createTestOrder(testItem._id, { quantity: 25 });

      const res = await request(app)
        .post("/api/direct-purchase/set-data")
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
        .post("/api/direct-purchase/set-data")
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
