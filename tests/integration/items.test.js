const app = require("../../myApp");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { connectTestDB, disconnectTestDB } = require("../setup/db");
const { createTestAdmin } = require("../helpers/createTestAdmin");
const { disableAdmin } = require("../helpers/disableAdmin");

const Admin = require("../../src/models/Admin");
const Item = require("../../src/models/Item");

const {
  validItemData,
  validEditedItemData,
  invalidItemDataNegativePrice,
  invalidItemDataJavaScriptImageURL,
} = require("../fixtures/itemData");

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await Admin.deleteMany({});
  await Item.deleteMany({});
});

const invalidToken = jwt.sign(
  { role: "admin", id: "someinvalidid" },
  "invalidsecret",
  { expiresIn: "1h" },
);

describe("Testing item endpoints", () => {
  it("getItemsData should return 200 and an array of items", async () => {
    const res = await request(app).get("/api/getItemsData");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.itemsData)).toBe(true);
  });

  it("enabled admin can add items", async () => {
    const { token } = await createTestAdmin("super_admin");
    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", `Bearer ${token}`)
      .send(validItemData);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(await Item.countDocuments()).toBe(1);
    expect(res.body.data._id).toBeDefined();
  });

  it("enabled admin can edit items", async () => {
    const { token } = await createTestAdmin("super_admin");

    const createItem = await Item.create(validItemData);

    const res = await request(app)
      .put(`/api/item/edit/${createItem._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(validEditedItemData);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemName).toBe(validEditedItemData.itemName);
  });
});

describe("Sending a request via a disabled admin account", () => {
  it("disabled admin cannot add items", async () => {
    const { admin, token } = await createTestAdmin("super_admin");

    await disableAdmin(admin._id);

    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", `Bearer ${token}`)
      .send(validItemData);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(await Item.countDocuments()).toBe(0);
  });
});

describe("Rejecting requests with missing or invalid tokens", () => {
  it("should return 401 for addItem without token", async () => {
    const res = await request(app).post("/api/addItem").send(validItemData);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(await Item.countDocuments()).toBe(0);
  });

  it("should return 401 for addItem with invalid token", async () => {
    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", `Bearer ${invalidToken}`)
      .send(validItemData);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(await Item.countDocuments()).toBe(0);
  });
});

describe("Rejecting invalid item data", () => {
  it("should reject a negative item price", async () => {
    const { token } = await createTestAdmin("super_admin");

    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", `Bearer ${token}`)
      .send(invalidItemDataNegativePrice);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(await Item.countDocuments()).toBe(0);
  });

  it("should reject JavaScript URLs in item images", async () => {
    const { token } = await createTestAdmin("super_admin");

    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", `Bearer ${token}`)
      .send(invalidItemDataJavaScriptImageURL);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(await Item.countDocuments()).toBe(0);
  });
});

describe("Testing item operations with invalid or non-existent IDs", () => {
  it("should reject editing an item with an invalid ID", async () => {
    const { token } = await createTestAdmin("admin");

    const res = await request(app)
      .put("/api/item/edit/invalidID")
      .set("Authorization", `Bearer ${token}`)
      .send(validEditedItemData);

    expect(res.body.success).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  it("should reject editing a non-existent item", async () => {
    const { token } = await createTestAdmin("admin");

    const res = await request(app)
      .put("/api/item/edit/6a780926966bdf371b4d67bf")
      .set("Authorization", `Bearer ${token}`)
      .send(validEditedItemData);

    expect(res.body.success).toBe(false);
    expect(res.statusCode).toBe(404);
  });

  it("should reject deleting an item with an invalid ID", async () => {
    const { token } = await createTestAdmin("admin");

    const res = await request(app)
      .delete("/api/deleteItem/invalidID")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.success).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  it("should reject deleting a non-existent item", async () => {
    const { token } = await createTestAdmin("admin");

    const res = await request(app)
      .delete("/api/deleteItem/6a7c71a6fb399bd981b090cb")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.success).toBe(false);
    expect(res.statusCode).toBe(404);
  });
});
