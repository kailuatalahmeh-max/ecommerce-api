const app = require("../../myApp");
const request = require("supertest");
const crypto = require("crypto");

const { connectTestDB, disconnectTestDB } = require("../setup/db");

const Item = require("../../src/models/Item");
const Cart = require("../../src/models/Cart");

const { addTestItem } = require("../helpers/addTestItem");

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await Item.deleteMany({});
  await Cart.deleteMany({});
});

describe("Cart Testing", () => {
  it("adding the same item twice adds up the quantity in one cart row", async () => {
    const { testItem } = await addTestItem(); // itemQuantity: 10
    const guestId = crypto.randomUUID(); // UUID v4, like the frontend
    const url = `/api/carts/${guestId}/items`;

    const first = await request(app)
      .post(url)
      .send({ itemId: testItem._id.toString(), quantity: 2 });

    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);

    const second = await request(app)
      .post(url)
      .send({ itemId: testItem._id.toString(), quantity: 3 });

    expect(second.status).toBe(200);
    expect(second.body.data.items).toHaveLength(1);
    expect(second.body.data.items[0].quantity).toBe(5);

    // saved in the database: one cart, one row, quantity 2 + 3
    const cart = await Cart.findOne({ guestId }).lean();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);

    // adding to the cart does not take stock (only buying does)
    const itemInDb = await Item.findById(testItem._id).lean();
    expect(itemInDb.itemQuantity).toBe(10);
  });
});
