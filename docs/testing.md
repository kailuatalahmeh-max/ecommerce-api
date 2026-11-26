[← Back to README](../README.md) · **English** | [العربية](ar/testing.md)

# 🧪 Tests

```bash
npm test
```

Tests run with `jest --runInBand` (one file after another). Running in parallel (`npx jest`) also works, because each file has its own database.

### Test database (in memory)

Tests use **[mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server)**: a real MongoDB that runs **in memory** on your computer. No Atlas, no internet, no IP whitelist.

- Each test file starts its own empty database (`testingDataBase`) and deletes it when the file finishes (`tests/setup/db.js`).
- The tests can never touch a real database: they stop if the address is not `127.0.0.1`.
- The **first run** downloads the MongoDB binary once (about 1–2 minutes). After that it is cached, and all tests take a few seconds.
- `.env.testing` is **optional**. It only gives `JWT_SECRET` (`MONGO_URI` is not used). Without it, the tests use `"test-secret"`.

> MongoDB driver 7 loads the `os` module with a dynamic `import()`, and Jest blocks that, so the server refuses the connection ("Missing required sub-document 'driver'"). `db.js` fixes it by giving the driver `os` directly: `mongoose.connect(uri, { runtimeAdapters: { os } })`.

### What do the tests cover?

- **`items.test.js`**: Get products, add and edit by an admin, reject missing or invalid tokens, reject disabled admins, reject invalid data (negative price, `javascript:` links), invalid or missing IDs

**`orders.test.js`**

- Direct purchase: success updates stock and total; rejects invalid ID, invalid quantity, quantity bigger than stock, missing product
- **Stock conflict:** two requests at the same time for stock that is enough for only one → one `201`, one `400`, and only `1` order saved
- **WhatsApp confirm:** purchase returns a code and a `wa.me` link; `503` with no store number; `GET /:id/confirmation` is `404` while the bot is off; a moderator confirms only once (`409` the second time); wrong phone → `PHONE_MISMATCH`; role `admin` → `403`
- **Tracking:** `/track` cleans a messy code and phone, refuses objects (injection) and a wrong phone; `/track-many` answers `found` / `notFound` / `invalid` in order, never shows other orders of the same phone, refuses an empty or too long list (more than 20); the old `/api/guest/sessions` is `404`
- **Cancel:** `/cancel` cancels a `Pending` order once and returns the stock (a second click → `409`, the stock is not returned twice); refuses a wrong phone (`404`), injection (`400`) and an `Accepted` order (`409`); a cancelled order can't be confirmed (`CANCELLED`)
- **Admin status:** admin cancel returns the stock once (`cancelledBy: "admin"`); opening it again takes the stock again, or is refused with `NOT_ENOUGH_STOCK`; other status changes don't touch the stock; the customer can't cancel an order the admin cancelled
- **Expired:** an expired `Pending` order becomes `Cancelled` (`cancelledBy: "system"`) and its stock comes back only once; fresh, confirmed and accepted orders are not touched; an order the customer already cancelled is not returned twice

- **`auth.test.js`**: Admin routes return `401` with no token, a fake token, or a valid token for an admin that does not exist

- **`health.test.js`**: `GET /health` returns `200`

- **`cart.test.js`**: Adding the same item twice adds up the quantity in **one** cart row (2 + 3 = 5), and adding to the cart does not take stock

- **`storeSettings.test.js`**: `super_admin` saves a messy number and it is saved clean (`+970599111222`), only one settings document; `GET` gives `null` with no number; a bad, empty, object or unknown country number → `400` `INVALID_PHONE` and the old number stays; `admin` and `moderator` → `403`, no token → `401`; `GET /public` works with no token and returns **only** `whatsappNumber`

- **`unit/trustProxy.test.js`**: `TRUST_PROXY` reads `0`–`10`, and a missing or wrong value gives `1`; with `2` (Cloudflare + Render) `req.ip` is the real client IP and a fake `X-Forwarded-For` can't change it; with `1` it is the Cloudflare IP

All **55 tests** pass.
