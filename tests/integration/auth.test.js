require("dotenv").config({
  path: ".env.testing",
  override: true,
});
const Admin = require("../../src/models/Admin").default;
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../../myApp").default;
const { connectTestDB, disconnectTestDB } = require("../setup/db");
const { createTestAdmin } = require("../helpers/createTestAdmin").default;

jest.setTimeout(60000);

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await Admin.deleteMany({ email: /@test\.com$/ });
  await disconnectTestDB();
});

describe("حماية endpoints الأدمن", () => {
  it("POST /api/addItem بدون token لازم يرجّع 401", async () => {
    const res = await request(app).post("/api/addItem").send({
      itemName: "منتج تجريبي",
      itemPrice: 50,
      itemQuantity: 10,
      images: [],
    });
    expect(res.statusCode).toBe(401);
  });

  it("token مزيّف لازم يرجّع 401", async () => {
    const res = await request(app)
      .post("/api/addItem")
      .set("Authorization", "Bearer this.is.fake")
      .send({});
    expect(res.statusCode).toBe(401);
  });

  it("token صحيح التوقيع لأدمن غير موجود لازم يرجّع 401", async () => {
    const ghostToken = jwt.sign(
      { role: "admin", id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET,
    );
    const res = await request(app)
      .delete("/api/deleteItem/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${ghostToken}`);
    expect(res.statusCode).toBe(401);
  });
});
