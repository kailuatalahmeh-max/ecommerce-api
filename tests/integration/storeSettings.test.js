const app = require("../../myApp");
const request = require("supertest");

const { connectTestDB, disconnectTestDB } = require("../setup/db");
const StoreSettings = require("../../src/models/StoreSettings");
const { createTestAdmin } = require("../helpers/createTestAdmin");

const URL = "/api/store-settings";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await StoreSettings.deleteMany({});
});

describe("Store settings (WhatsApp number)", () => {
  it("super_admin saves a messy number, and it is saved clean", async () => {
    const { token } = await createTestAdmin("super_admin");

    const put = await request(app)
      .put(URL)
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappNumber: "+970 0599-111-222" });

    expect(put.status).toBe(200);
    expect(put.body.data.whatsappNumber).toBe("+970599111222");
    expect(put.body.data.updatedBy).toBe("Test Admin User");

    const get = await request(app)
      .get(URL)
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.whatsappNumber).toBe("+970599111222");

    // only one settings document
    expect(await StoreSettings.countDocuments()).toBe(1);
  });

  it("GET returns null when no number is saved yet", async () => {
    const { token } = await createTestAdmin("super_admin");

    const res = await request(app)
      .get(URL)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.whatsappNumber).toBeNull();
  });

  it("refuses a bad, empty or object number, and keeps the old one", async () => {
    const { token } = await createTestAdmin("super_admin");
    await StoreSettings.create({ key: "main", whatsappNumber: "+970599111222" });

    for (const whatsappNumber of ["123", "", { $ne: null }, "+1599111222"]) {
      const res = await request(app)
        .put(URL)
        .set("Authorization", `Bearer ${token}`)
        .send({ whatsappNumber });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_PHONE");
    }

    const saved = await StoreSettings.findOne({ key: "main" }).lean();
    expect(saved.whatsappNumber).toBe("+970599111222");
  });

  it("GET /public gives everyone only the WhatsApp number", async () => {
    const empty = await request(app).get(`${URL}/public`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual({ whatsappNumber: null });

    const { admin } = await createTestAdmin("super_admin");
    await StoreSettings.create({
      key: "main",
      whatsappNumber: "+970599111222",
      updatedBy: admin._id,
    });

    const res = await request(app).get(`${URL}/public`); // no token
    expect(res.status).toBe(200);
    // nothing else (no updatedBy, no dates)
    expect(res.body.data).toEqual({ whatsappNumber: "+970599111222" });
  });

  it("only super_admin can see or change it", async () => {
    for (const role of ["admin", "moderator"]) {
      const { token } = await createTestAdmin(role);

      const get = await request(app)
        .get(URL)
        .set("Authorization", `Bearer ${token}`);
      expect(get.status).toBe(403);

      const put = await request(app)
        .put(URL)
        .set("Authorization", `Bearer ${token}`)
        .send({ whatsappNumber: "+970599111222" });
      expect(put.status).toBe(403);
    }

    const noToken = await request(app)
      .put(URL)
      .send({ whatsappNumber: "+970599111222" });
    expect(noToken.status).toBe(401);

    expect(await StoreSettings.countDocuments()).toBe(0);
  });
});
