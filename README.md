# 🛒 E-Commerce Store — Backend API

**English** | [العربية](README.ar.md)

A backend for an online store, built with **Express.js** and **MongoDB**. It supports:

- Product management, with many images per product.
- A shopping cart without login, using a `Guest ID`.
- Creating and managing orders.
- Order confirmation on WhatsApp with a one-time code (confirmed by hand for now).
- Order tracking by confirmation code + phone number (one order, or many at once).
- An admin dashboard with multi-level roles, and enabling/disabling admin accounts.
- API abuse protection and input validation.
- Handling stock conflicts during purchases.
- Integration and unit tests with Jest and Supertest.

> 💡 This is my first real backend project. I built it after about one and a half months of learning Express.js and MongoDB.

> This file is about the backend only. The repository has two folders: `backend/` and `frontend/`. See the [frontend README](../frontend/README.md).

---

## 🧰 Tech Stack

| Technology               | Used for                                   |
| ------------------------ | ------------------------------------------ |
| **Node.js + Express.js** | Server and API                             |
| **MongoDB + Mongoose**   | Database and models                        |
| **JWT (jsonwebtoken)**   | Admin authentication                       |
| **bcrypt**               | Password hashing                           |
| **express-rate-limit**   | Protecting endpoints from abuse            |
| **cors**                 | Handling requests from the frontend        |
| **dotenv**               | Reading environment variables from `.env`  |
| **crypto**               | Generating random order confirmation codes |
| **Jest + Supertest**     | API tests                                  |

---

## 📁 Project Structure (Backend)

```text
backend/
├── myApp.js              # Express app (middlewares and routes) — imported by the tests
├── server.js             # Entry point: connects to the database, then starts the server
├── backups/              # JSON backups made by seedPhoneShop.js (ignored by git)
├── scripts/              # Maintenance, data migration and seed scripts (run by hand)
├── src/
│   ├── config/           # Database connection
│   ├── controllers/      # Business logic
│   ├── middlewares/      # Auth, roles, validation, rate limiting, error handling, store WhatsApp check
│   ├── models/           # Admin, Cart, Item, Order, StoreSettings
│   ├── routes/           # Route definitions
│   ├── services/         # orderConfirmation.service.js (WhatsApp confirm code)
│   └── utils/            # Shared constants (constants.js), phone number cleaning (phone.js)
└── tests/
    ├── setup/            # Test database connection
    ├── fixtures/         # Ready-made test data
    ├── helpers/          # Helper functions (create test admin, add item...)
    ├── integration/      # Endpoint tests
    └── unit/             # Unit tests
```

### Route files

| File                  | Mounted at       | Content                                  |
| --------------------- | ---------------- | ---------------------------------------- |
| `authRoutes.js`       | `/api/auth`      | Admin login                              |
| `adminRoutes.js`      | `/api/admins`    | Admin account management                 |
| `dashboardRoutes.js`  | `/api/dashboard` | Analytics                                |
| `itemRoutes.js`       | `/api/items`     | Products                                 |
| `cartRoutes.js`       | `/api/carts`     | Cart                                     |
| `orderRoutes.js`      | `/api/orders`    | Orders                                   |

Cart checkout (`POST /api/carts/:guestId/checkout`) is in `cartRoutes.js`, but it uses `orderController`.

`myApp.js` is separate from `server.js`, so the tests can import the app without opening a port or connecting to the main database.

---

## ⚙️ Setup and Run

Run all commands inside the `backend/` folder.

### 1. Install packages

```bash
cd backend
npm install
```

### 2. Environment variables

Create a `.env` file **inside `backend/`**:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
```

| Variable       | Required | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| `MONGO_URI`    | Yes      | MongoDB connection string                                 |
| `JWT_SECRET`   | Yes      | Secret key for signing admin tokens                       |
| `FRONTEND_URL` | Yes      | The only origin allowed by CORS (your frontend address)   |
| `PORT`         | No       | Default `5000`                                            |
| `MONGO_URI2`   | No       | Only for `scripts/seedPhoneShop.js` (the database it fills with demo products). The server does not use it |
| `WHATSAPP_BOT_ENABLED` | No | `true` adds the bot route `GET /api/orders/:id/confirmation`. Leave it empty for now |

When the server starts (`server.js`), it checks `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`. If one is missing, it prints `Missing environment variables: ...` and stops.

### 3. Start the server

```bash
npm start
```

Or for development, with auto-restart on file changes (nodemon):

```bash
npm run dev
```

The server connects to the database first. If the connection fails, it stops. If it works, the server runs at:

```text
http://localhost:5000
```

### 4. Check that the server is running

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

> Note: `/health` also has rate limiting, and it is outside the `/api` path.

---

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

| File                    | What it tests                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `items.test.js`         | Get products, add and edit by an admin, reject missing or invalid tokens, reject disabled admins, reject invalid data (negative price, `javascript:` links), invalid or missing IDs |
| `orders.test.js`        | Direct purchase: success updates stock and total; rejects invalid ID, invalid quantity, quantity bigger than stock, missing product. **Stock conflict:** two requests at the same time for stock that is enough for only one → one `201`, one `400`, and only `1` order saved. **WhatsApp confirm:** purchase returns a code and a `wa.me` link; `503` with no store number; `GET /:id/confirmation` is `404` while the bot is off; a moderator confirms only once (`409` the second time); wrong phone → `PHONE_MISMATCH`; role `admin` → `403`. **Tracking:** `/track` cleans a messy code and phone, refuses objects (injection) and a wrong phone; `/track-many` answers `found` / `notFound` / `invalid` in order, never shows other orders of the same phone, refuses an empty or too long list (more than 20); the old `/api/guest/sessions` is `404`. **Cancel:** `/cancel` cancels a `Pending` order once and returns the stock (a second click → `409`, the stock is not returned twice); refuses a wrong phone (`404`), injection (`400`) and an `Accepted` order (`409`); a cancelled order can't be confirmed (`CANCELLED`). **Admin status:** admin cancel returns the stock once (`cancelledBy: "admin"`); opening it again takes the stock again, or is refused with `NOT_ENOUGH_STOCK`; other status changes don't touch the stock; the customer can't cancel an order the admin cancelled |
| `auth.test.js`          | Admin routes return `401` with no token, a fake token, or a valid token for an admin that does not exist        |
| `health.test.js`        | `GET /health` returns `200`                                                                                     |
| `cart.test.js`          | Adding the same item twice adds up the quantity in **one** cart row (2 + 3 = 5), and adding to the cart does not take stock |

All **43 tests** pass.

---

# 🔑 Roles

The system has **3 role levels**. Each admin endpoint is protected by the needed role.

| Role          | Permissions                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `admin`       | Add, edit, and delete products                                                    |
| `moderator`   | Everything `admin` can do, plus order management                                  |
| `super_admin` | Everything, plus admin account management (create, enable, disable) and analytics |

### Admin authentication

Authentication uses a **JWT Bearer Token**:

```http
Authorization: Bearer <token>
```

- The token is valid for **48 hours**. It contains the admin `id` and `role`.
- A disabled account cannot log in (`403`).
- A disabled account (`isActive: false`) also gets `401` on every admin request, even if its token is still valid.
- Each successful admin request updates the admin's `lastActivityAt`.
- No token, or a wrong role → `401` / `403`.

---

# 🗄️ Models

## 🛍️ Item

Each product can have any number of images. Images are stored as an array of objects, not as one image link.

| Field          | Type             | Notes                                                       |
| -------------- | ---------------- | ----------------------------------------------------------- |
| `images`       | `[{ imageURL }]` | Image array, empty by default; each image needs `imageURL`  |
| `itemName`     | `String`         | Required                                                    |
| `itemPrice`    | `Number`         | Required, cannot be less than `0`                           |
| `itemQuantity` | `Number`         | Default `0`, cannot be less than `0`                        |

### Example

```json
{
  "images": [
    {
      "imageURL": "https://example.com/img1.jpg"
    },
    {
      "imageURL": "https://example.com/img2.jpg"
    }
  ],
  "itemName": "Product name",
  "itemPrice": 50,
  "itemQuantity": 10
}
```

---

## 👤 Admin

| Field            | Type      | Notes                                                              |
| ---------------- | --------- | ------------------------------------------------------------------ |
| `fullName`       | `String`  | Required                                                           |
| `firstName`      | `String`  | Set automatically from the first word of `fullName` on save        |
| `email`          | `String`  | Required, unique, saved in lowercase                               |
| `password`       | `String`  | Required, hashed, not returned in queries by default (`select: false`) |
| `role`           | `String`  | `admin` / `moderator` / `super_admin`, default `admin`             |
| `isActive`       | `Boolean` | Default `true`; a disabled account cannot do any action            |
| `lastActivityAt` | `Date`    | Last activity of the account, default `null`                       |

---

## 🛒 Cart

| Field     | Type                     | Notes                         |
| --------- | ------------------------ | ----------------------------- |
| `guestId` | `String`                 | Required and unique           |
| `items`   | `[{ itemId, quantity }]` | `quantity` is at least `1`    |

The cart is deleted automatically **7 days** after its last update (TTL index on `updatedAt`).

---

## 📦 Order

| Field          | Type     | Notes                                                            |
| -------------- | -------- | ---------------------------------------------------------------- |
| `customerName` | `String` | Required                                                         |
| `phoneNumber`  | `String` | Required. Saved as country code + number, e.g. `+970599123456`   |
| `region`       | `String` | Required. A value from the `REGIONS` list in `src/utils/constants.js` |
| `items`        | `Array`  | Each item has `itemId`, `itemName`, `itemPrice`, and `quantity`  |
| `totalPrice`   | `Number` | Required                                                         |
| `status`       | `String` | `Pending` (default) / `Accepted` / `Delivered` / `Cancelled`     |
| `confirmation` | `Object` | WhatsApp confirmation (see below). Old orders do not have it     |
| `cancelledAt`  | `Date`   | When the order was cancelled (optional)                          |
| `cancelledBy`  | `String` | `customer` or `admin`: who cancelled it (optional)               |

`confirmation` fields:

| Field         | Type     | Notes                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `code`        | `String` | 6 characters from `A–Z` and `2–9`, without `0 O 1 I L` (easy to read). Unique |
| `status`      | `String` | `pending` (default) / `confirmed` / `expired`                               |
| `expiresAt`   | `Date`   | **24 hours** after the order (`CONFIRM_TTL_MINUTES` in the service)         |
| `confirmedAt` | `Date`   | When it was confirmed                                                       |
| `method`      | `String` | Who confirmed: `whatsapp_bot` or `manual` in the schema list. The admin endpoint saves `admin` |

Indexes: (`phoneNumber`, `createdAt`) to get a user's orders faster, `confirmation.code` (unique), and (`confirmation.status`, `confirmation.expiresAt`).

---

## ⚙️ StoreSettings

One document for the whole store (`key: "main"`).

| Field            | Type       | Notes                                                                     |
| ---------------- | ---------- | ------------------------------------------------------------------------- |
| `key`            | `String`   | Always `"main"`. Unique and cannot change                                 |
| `whatsappNumber` | `String`   | The store's WhatsApp number. Cleaned with `normalizePhone`, e.g. `+970599123456` |
| `updatedBy`      | `ObjectId` | The admin who changed it (optional)                                       |

> ⚠️ If there is no `whatsappNumber`, **all purchases are blocked** with `503` ("الشراء غير متاح حالياً"). Set it with [`storeSettingsSeed.js`](#-store-whatsapp-number-storesettingsseedjs).

---

# 📚 API Endpoints

All routes are under `/api`, and all responses from `/api` have `Cache-Control: no-store`.

## 🛍️ Items

| Method   | Endpoint              | Role     | Description        |
| -------- | --------------------- | -------- | ------------------ |
| `GET`    | `/api/items`          | Public   | Get all products   |
| `POST`   | `/api/items`          | `admin+` | Add a new product  |
| `PUT`    | `/api/items/:id`      | `admin+` | Edit a product     |
| `DELETE` | `/api/items/:id`      | `admin+` | Delete a product   |

> `admin+` means `admin`, `moderator`, or `super_admin`. In the same way, `moderator+` means `moderator` or `super_admin`.

### Add / edit rules (`POST` and `PUT`)

| Field          | Rule                                                        |
| -------------- | ----------------------------------------------------------- |
| `itemName`     | Required, max **100** characters                            |
| `itemPrice`    | Number from `0` to **1,000,000**                            |
| `itemQuantity` | Whole number from `0` to **100,000**                        |
| `images`       | **1 to 6** images; each `imageURL` must be `http`/`https` and max **500** characters |

The limits are in `ITEM_LIMITS` in `src/utils/constants.js`.

---

## 🔑 Auth

| Method | Endpoint          | Role   | Description                          |
| ------ | ----------------- | ------ | ------------------------------------ |
| `POST` | `/api/auth/login` | Public | Admin login, returns a JWT token     |

---

## 🔐 Admins

| Method  | Endpoint                       | Role          | Description                                             |
| ------- | ------------------------------ | ------------- | ------------------------------------------------------- |
| `POST`  | `/api/admins`                  | `super_admin` | Create a new admin account                              |
| `GET`   | `/api/admins`                  | `super_admin` | Get all admins without passwords (`404` if none)        |
| `PATCH` | `/api/admins/:adminId/disable` | `super_admin` | Disable an admin account                                |
| `PATCH` | `/api/admins/:adminId/enable`  | `super_admin` | Enable an admin account                                 |

### Rules for disabling accounts

- An admin cannot disable their own account (`400`).
- You cannot disable the last active `super_admin` (`400`), so the system always has a super admin.
- An account that does not exist returns `404`.

---

## 🛒 Cart

The cart uses a `guestId` of type **UUID v4**. It is stored in the user's browser, so the store knows the cart without login.

The `guestId` is sent in the URL and is validated before the request runs. Product IDs (`:id`) are validated too when needed.

| Method   | Endpoint                                   | Description                    |
| -------- | ------------------------------------------ | ------------------------------ |
| `GET`    | `/api/carts/:guestId`                      | Get cart content               |
| `POST`   | `/api/carts/:guestId/items`                | Add a product to the cart      |
| `PATCH`  | `/api/carts/:guestId/items/:id/increase`   | Increase product quantity      |
| `PATCH`  | `/api/carts/:guestId/items/:id/decrease`   | Decrease product quantity      |
| `DELETE` | `/api/carts/:guestId/items/:id`            | Remove one product             |
| `DELETE` | `/api/carts/:guestId/items`                | Empty the cart                 |

---

## 📦 Orders

| Method  | Endpoint                                | Role         | Description                                       |
| ------- | --------------------------------------- | ------------ | ------------------------------------------------- |
| `POST`  | `/api/orders`                           | Public       | Buy one product directly, without the cart        |
| `POST`  | `/api/carts/:guestId/checkout`          | Public       | Buy everything in the cart                        |
| `GET`   | `/api/orders`                           | `moderator+` | Get all orders (dashboard)                        |
| `PATCH` | `/api/orders/:orderId`                  | `moderator+` | Change order status (Body: `{ "status" }`)        |
| `POST`  | `/api/orders/track`                     | Public       | Find one order by confirm code + phone (Body: `{ "code", "phoneNumber" }`) |
| `POST`  | `/api/orders/track-many`                | Public       | Fresh data for up to 20 orders at once (Body: `{ "orders": [{ "code", "phoneNumber" }] }`) |
| `POST`  | `/api/orders/cancel`                    | Public       | The customer cancels a `Pending` order with code + phone (Body: `{ "code", "phoneNumber" }`). The stock comes back |
| `POST`  | `/api/orders/confirm`                   | `moderator+` | Confirm an order by hand (Body: `{ "code", "senderPhone" }`) |
| `GET`   | `/api/orders/:id/confirmation`          | `bot`        | WhatsApp confirm status. 🚧 **Only exists when `WHATSAPP_BOT_ENABLED=true`** (otherwise `404`) |

### Purchase body

Direct purchase (`POST /api/orders`):

```json
{
  "itemId": "6a780926966bdf371b4d67bf",
  "quantity": 2,
  "purchaseDetails": {
    "fullName": "Customer Name",
    "countryCode": "+970",
    "phoneNumber": "599123456",
    "region": "hebron"
  }
}
```

Cart checkout (`POST /api/carts/:guestId/checkout`) sends only `purchaseDetails`. After success, the cart is emptied.

`purchaseDetails` rules:

- `fullName` and `region` are required. Hidden Unicode characters are removed.
- `phoneNumber`: spaces, `-`, `( )`, `.` and **one leading `0`** are removed, then it must be exactly **9 digits** (`0599 123-456` → `599123456`). Cleaning is in `src/utils/phone.js`.
- `countryCode`: `+970` or `+972`.
- `region`: one of the values in `REGIONS` (`src/utils/constants.js`), e.g. `hebron`, `dura`, `yatta`.
- `quantity` (direct purchase): a whole number bigger than `0`.

### Order statuses

```text
Pending
Accepted
Delivered
Cancelled
```

### Direct purchase responses

| Case                                                          | Code  |
| ------------------------------------------------------------- | ----- |
| Success (has `data.orderId` and `data.updatedItem`)           | `201` |
| Invalid data (ID or quantity)                                 | `400` |
| Quantity is bigger than stock                                 | `400` |
| Product not found or deleted                                  | `404` |
| The store has no WhatsApp number                              | `503` |

---

# 💬 WhatsApp Order Confirmation

Every new order must be confirmed by the customer on WhatsApp. This shows that the customer really owns the phone number.

1. The customer buys (direct or cart). The order is saved with `confirmation.status: "pending"` and a 6-character code.
2. Both purchase endpoints return:

```json
{
  "data": {
    "orderId": "...",
    "confirmCode": "K7P2XM",
    "expiresAt": "2026-11-23T15:35:00.000Z",
    "whatsappUrl": "https://wa.me/970599123456?text=..."
  }
}
```

3. `whatsappUrl` opens a chat with the store number, with this message already typed:

```text
تأكيد طلب
رمز التأكيد: K7P2XM
```

4. A moderator confirms it by hand after seeing the message (`POST /api/orders/confirm`).
5. The customer can see the order and its confirm state with the code (`POST /api/orders/track`, see below) or in "My orders".

> 🚧 `GET /api/orders/:id/confirmation` is for the future WhatsApp bot. The route is added **only** when `WHATSAPP_BOT_ENABLED=true`, and it needs the `bot` role. It returns `pending`, `confirmed` or `expired` (a `pending` order after `expiresAt` is shown as `expired`; old orders with no `confirmation` return `confirmed`). The frontend does not use it.

### Track an order (`POST /api/orders/track`)

```json
{ "code": "K7P2XM", "phoneNumber": "+970599123456" }
```

The customer needs **both** the code and the phone number. The middleware `validateTrackOrder.js` checks them before the database:

- Both must be text. Objects like `{ "$ne": null }` are refused (NoSQL injection).
- `code`: spaces are removed and letters become uppercase (`k7p 2xm` → `K7P2XM`). Then it must be 6 characters from the confirm-code letters (no `0 O 1 I L`).
- `phoneNumber`: cleaned with `normalizePhone`, the same as checkout (`+970 0599-123-456` → `+970599123456`).
- The clean values go to the controller in `res.locals.tracking`.
- Rate limit: **20** requests.

| Case                                         | Code  |
| -------------------------------------------- | ----- |
| Found (`data` is the whole order)            | `200` |
| Missing code or phone, or not text           | `400` |
| Bad code format                              | `400` |
| Bad phone number                             | `400` |
| No order with this code **and** this phone   | `404` |

> The phone must match exactly: an order saved with `+970` is not found with `+972` (manual confirm treats them as the same, track does not).

### Track many orders (`POST /api/orders/track-many`)

Used by the "My orders" page: the browser saves `{ code, phoneNumber }` for each order, and asks for fresh data for all of them in **one** request (one database query).

```json
{
  "orders": [
    { "code": "K7P2XM", "phoneNumber": "+970599123456" },
    { "code": "ABCDEF", "phoneNumber": "+970599123456" },
    { "code": "bad", "phoneNumber": "+970599123456" }
  ]
}
```

Answer (same order and length as the request):

```json
{
  "success": true,
  "data": [
    { "code": "K7P2XM", "phoneNumber": "+970599123456", "status": "found", "order": { "...": "..." } },
    { "code": "ABCDEF", "phoneNumber": "+970599123456", "status": "notFound" },
    { "code": "bad", "phoneNumber": "+970599123456", "status": "invalid" }
  ]
}
```

- `orders` must be an array with **1 to 20** items, or the whole request is refused with `400`.
- Each item is checked with the same rules as `/track` (`validateTrackMany` in `validateTrackOrder.js`).
- A bad item does **not** refuse the request. It comes back as `"invalid"`, so one broken saved order does not hide the others.
- `code` and `phoneNumber` in the answer are what the browser sent, so it can match each answer to its saved order.
- It never shows other orders of the same phone: only the orders whose code you send.
- Rate limit: **60** requests.

### Customer cancel (`POST /api/orders/cancel`)

Used by the **Cancel order** button in "My orders".

```json
{ "code": "K7P2XM", "phoneNumber": "+970599123456" }
```

- The code and phone are checked with the same rules as `/track` (`validateTrackOrder`).
- Only a **`Pending`** order can be cancelled (the store did not accept it yet).
- The order becomes `Cancelled`, with `cancelledAt` and `cancelledBy: "customer"`.
- The **stock comes back**: each item gets its quantity again. A deleted item is skipped.
- It is one atomic update (`findOneAndUpdate` with `status: "Pending"`). So two clicks at the same time return the stock only once.
- A cancelled order can't be confirmed any more (`CANCELLED` in the manual confirm table).
- Rate limit: **20** requests.

| Case                                      | Code  | `code` in the response |
| ----------------------------------------- | ----- | ---------------------- |
| Cancelled (the answer has the order)      | `200` | —                      |
| Bad code or phone                         | `400` | —                      |
| No order with this code + phone           | `404` | —                      |
| Accepted, Delivered or already Cancelled  | `409` | `NOT_CANCELLABLE`      |

> **Admin status change** (`PATCH /api/orders/:orderId`) moves the stock too:
> - Into `Cancelled`: the stock comes back, and the order saves `cancelledBy: "admin"`.
> - Out of `Cancelled` (opened again): the stock is taken again, and `cancelledAt` / `cancelledBy` are removed. If one item has not enough stock (or was deleted), nothing changes and the answer is `400` `NOT_ENOUGH_STOCK`.
> - Between other statuses (`Pending` / `Accepted` / `Delivered`): the stock does not change.
> - The update works only if the status did not change in the meantime, so two clicks move the stock only once. Otherwise: `409` `STATUS_CHANGED`.

### Manual confirm (`POST /api/orders/confirm`)

```json
{ "code": "K7P2XM", "senderPhone": "+970599123456" }
```

- `senderPhone` must be the order's number. `+970` and `+972` count as the same number (`isSamePhone` in `src/utils/phone.js`).
- The update only works while the order is still `pending` and not expired. So if two people confirm at the same time, only one succeeds.
- The same function (`confirmOrderByCode` in `src/services/orderConfirmation.service.js`) is ready for a WhatsApp bot later.

| Case                                 | Code  | `code` in the response |
| ------------------------------------ | ----- | ---------------------- |
| Confirmed                            | `200` | —                      |
| Bad code format                      | `400` | `INVALID_CODE`         |
| The phone is not the order's number  | `400` | `PHONE_MISMATCH`       |
| No order with this code              | `404` | `NOT_FOUND`            |
| Already confirmed                    | `409` | `ALREADY_CONFIRMED`    |
| The customer cancelled the order     | `409` | `CANCELLED`            |
| More than 24 hours passed            | `410` | `EXPIRED`              |

---

# 📊 Analytics

Only `super_admin` can see analytics.

| Method | Endpoint                   | Role          | Description            |
| ------ | -------------------------- | ------------- | ---------------------- |
| `GET`  | `/api/dashboard/analytics` | `super_admin` | Stats for last 7 days  |

The response (`data`) includes:

| Field            | Meaning                                                   | Period       |
| ---------------- | --------------------------------------------------------- | ------------ |
| `totalRevenue`   | 💰 Sum of `totalPrice`                                     | Last 7 days  |
| `totalOrders`    | Number of orders                                          | Last 7 days  |
| `ordersByStatus` | 📦 Orders per status (`Pending`, `Accepted`...)            | Last 7 days  |
| `topProduct`     | 🏆 Best-selling product (by quantity)                      | Last 7 days  |
| `topRegions`     | 📍 Top 5 regions by number of orders                       | Last 7 days  |
| `totalItems`     | Number of products                                        | All time     |
| `activeCarts`    | Number of carts in the database                           | All time     |
| `lowStockItems`  | ⚠️ Products with quantity **5 or less**                    | Now          |

---

# 🛡️ Security

The project has these protections:

### 🚦 Rate Limiting

Each endpoint has a maximum number of requests per **15 minutes** (per IP). The limit depends on how sensitive the endpoint is (for example: 5 for creating an admin, 10 for login and enabling/disabling admins, 20 for tracking one order, 60 for tracking many, 20 for cancelling). Too many requests → `429`.

The goal is to reduce API abuse.

### 🌍 CORS

CORS allows only one origin: the value of `FRONTEND_URL`.

### ✅ Validation

Inputs are checked before they are used, including:

- Prices.
- Quantities.
- Image links (dangerous links like `javascript:` are rejected).
- Phone numbers.
- `guestId`.
- MongoDB `ObjectId`s.
- And other inputs.

### ⚠️ Centralized Error Handler

A central error middleware (`errorMiddleware.js`) turns common errors into clear responses:

| Error type                                 | Code  |
| ------------------------------------------ | ----- |
| `ValidationError` (Mongoose)               | `400` |
| `CastError` (invalid ID)                   | `400` |
| `TokenExpiredError` / `JsonWebTokenError`  | `401` |
| Duplicate value (`E11000`)                 | `409` |
| Any unexpected error                       | `500` |

### 🚧 404 for Unknown Routes

If no route matches, a middleware in `myApp.js` (after all routes, before `errorHandler`) returns JSON:

```json
{
  "success": false,
  "message": "Route not found"
}
```

### 📦 Stock Race Conditions

Purchases use atomic updates with:

```text
findOneAndUpdate
```

with a condition that checks the available quantity.

This stops selling more than the stock when many purchases happen at the same time. An integration test covers this by sending two requests at the same time.

There is also an automatic **rollback** if any part of a multi-product purchase fails.

### 🔐 Password Hashing

Admin passwords are hashed with **bcrypt**. They are never stored as plain text, and they are not returned in queries by default.

### 🔎 Order Tracking

There are no guest sessions or tokens. A customer sees an order only with **its confirmation code + its phone number**. There is no endpoint that lists all orders of a phone number, so knowing someone's number is not enough. The code is random (`crypto.randomInt`, about 887 million options) and tracking is rate limited.

### 🚫 No Caching

All routes under `/api` return:

```http
Cache-Control: no-store
```

This lowers the chance that order data is saved in a cache.

### 📏 Request Size Limit

The request body size is limited to:

```text
1mb
```

This stops very large data from being sent to the server.

### 🌐 Trust Proxy

This is enabled:

```javascript
app.set("trust proxy", 1);
```

So the rate limiter can read the user's real IP when the app runs behind a proxy like **Render**.

---

# 📋 Request Logging

Each request is logged to the console when it finishes. Logging is **off during tests** (`NODE_ENV=test`).

The log includes:

- Time (when the request started).
- HTTP method.
- URL.
- IP address.
- HTTP status code.
- Duration.
- User-Agent.
- Referer.
- Response size.

Requests are grouped by response status:

| Status      | Label             | Level           |
| ----------- | ----------------- | --------------- |
| `2xx / 3xx` | ✅ `REQUEST`      | `console.log`   |
| `4xx`       | ⚠️ `CLIENT ERROR` | `console.warn`  |
| `5xx`       | 🔥 `SERVER ERROR` | `console.error` |

---

# 🧹 Maintenance Scripts (`scripts/`)

Scripts you run by hand from the command line. They connect to the database in `MONGO_URI`.

> ⚠️ **Important — where to run:** some scripts read `../.env` and some read `.env` from the current folder, so the folder matters:
> - Scripts marked **(from `scripts/`)**: run them after `cd scripts`.
> - Scripts marked **(from `backend/`)**: run them from the `backend/` folder.

| Script                        | What it does                                                                                     | Run                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `addAdmin.js`                 | Add an admin account by hand (see the file for usage)                                            | —                                                      |
| `updateAdminsLastActivity.js` | Migration: adds `lastActivityAt`, `isActive`, and `firstName` to old admins that do not have them | `node updateAdminsLastActivity.js` (from `scripts/`)   |
| `checkLegacyImageURL.js`      | Check only: shows for each product if it still has the old `imageURL` field, and how many `images` | `node checkLegacyImageURL.js` (from `scripts/`)        |
| `checkBeforeCleanup.js`       | Check only: makes sure all products have `images` before deleting the old `imageURL`             | `node checkBeforeCleanup.js` (from `scripts/`)         |
| `cleanDatabase.js`            | **Deletes** the old `imageURL` field from all products                                           | `node cleanDatabase.js` (from `scripts/`)              |
| `scanInvisibleChars.js`       | Check only: finds hidden Unicode characters in `Admin`, `Cart`, `Item`, and `Order`              | `node scripts/scanInvisibleChars.js` (from `backend/`) |
| `cleanInvisibleChars.js`      | Removes hidden Unicode characters from the same collections. Default mode is **DRY RUN** (show only, no changes) | `node scripts/cleanInvisibleChars.js` (from `backend/`) |

To really run `cleanInvisibleChars.js` (not only show):

```bash
DRY_RUN=false node scripts/cleanInvisibleChars.js
```

### 📱 Demo data: `seedPhoneShop.js`

Fills the database in **`MONGO_URI2`** (not `MONGO_URI`) with **22 demo products** for the "Talahmeh Phones" store: phones, earbuds, chargers, watches and a tablet. The products are not real. Some quantities are set on purpose to show the stock badges (`0` = out of stock, `2`–`4` = few left). Run it from `backend/`:

```bash
node scripts/seedPhoneShop.js --dry-run            # show only, change nothing
node scripts/seedPhoneShop.js                      # add the products that do not exist yet (by name)
node scripts/seedPhoneShop.js --dry-run --replace  # show what --replace would do
node scripts/seedPhoneShop.js --replace            # backup → delete ALL items → add the 22 products
```

- `--replace` deletes **only the `items` collection**. Orders, carts and admins are not touched.
- Before deleting, it saves all current items to `backend/backups/items-<db>-<date>.json` and checks the file. The `backups/` folder is in `.gitignore`.
- Old orders keep the item name and price inside them, so they still show correctly. Old carts may point to deleted items until they expire (7 days).
- Before writing, it checks the same limits as the API (name length, price, quantity, 1–6 images).

### 💬 Store WhatsApp number: `storeSettingsSeed.js`

Saves the store's WhatsApp number in `StoreSettings` (database in `MONGO_URI`). **Purchases do not work until you run it once.** Run it from `backend/`:

```bash
node scripts/storeSettingsSeed.js +970599123456
```

Run it again with another number to change it. A wrong number is rejected.

### Image migration from `imageURL` to `images`

Products used to store one image in `imageURL`, then moved to the `images` array. Safe cleanup order:

1. `checkLegacyImageURL.js` to see the products' state.
2. `checkBeforeCleanup.js` to make sure every product has `images`.
3. `cleanDatabase.js` to delete the old `imageURL`. This script has **no DRY RUN mode and cannot be undone**, so make a backup first.

---

# 🩺 Troubleshooting

### `querySrv ECONNREFUSED`

This error happens with a `mongodb+srv://` link when the local DNS cannot resolve SRV records. Fixes:

- Change your computer's DNS to `8.8.8.8` or `1.1.1.1`.
- Use the old (non-SRV) connection string from MongoDB Atlas.
- Or add this line at the start of the entry file:

```javascript
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
```

> This line is not in the server code. The tests do not need it any more (they use an in-memory database).

### `MongooseServerSelectionError` (IP not whitelisted)

MongoDB Atlas blocks IPs that are not in its list. Add your IP in Atlas → **Network Access**.

---

# 📝 Known Issues and Future Improvements

These are things I know need work, but I postponed them because of time or cost.

### 📱 Seeing other people's orders by phone number — ✅ fixed

Before, `/api/guest/sessions` gave a token for **any** phone number, so anyone could see the orders of that number.

**Fix:** guest sessions were removed. Now an order is shown only with its **confirmation code + phone number** (`/track`, `/track-many`). Someone who makes a fake order with your number sees only that fake order, never your orders.

### 🤖 Automatic WhatsApp confirmation

Right now a moderator confirms orders by hand. **Future fix:** a WhatsApp bot (for example the official WhatsApp Cloud API) with a webhook that reads the customer's message and calls `confirmOrderByCode` with `method: "whatsapp_bot"`.

**Status:** postponed. The decision is not made yet.

### ⏳ Expired orders keep the stock

When an order expires without confirmation, its stock is not returned, and the order status does not change. Admins can also accept an order that is not confirmed.

### 📨 One error message format

Some endpoints use:

```json
{
  "message": "..."
}
```

and others use:

```json
{
  "error": "..."
}
```

For example, an empty cart at checkout returns `error` instead of `message`. It is better to use one format for all API responses.

### 🧪 Missing tests

`cart.test.js` has only one test, and there are no unit tests yet. Cart checkout, removing and changing cart items, admin management, and analytics have no tests yet.

---

# 🌐 Hosting

| Part         | Service       |
| ------------ | ------------- |
| **Frontend** | Vercel        |
| **Backend**  | Render        |
| **Database** | MongoDB Atlas |

> The project uses free plans, so I used `localhost` during live demos to avoid the slow first start of the server (**cold start**).

---

## 🚀 About the Project

This project was hands-on practice for building a real backend with:

**Express.js + MongoDB + Authentication + Authorization + Cart + Orders + Order Tracking + Security + Testing**

I focused on real-world cases, like stock conflicts, user roles, input validation, and protecting the API from abuse.
