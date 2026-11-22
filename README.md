# 🛒 E-Commerce Store — Backend API

**English** | [العربية](README.ar.md)

A backend for an online store, built with **Express.js** and **MongoDB**. It supports:

- Product management, with many images per product.
- A shopping cart without login, using a `Guest ID`.
- Creating and managing orders.
- Order tracking with a guest session (`Guest Token`).
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
| **crypto**               | Generating guest session tokens            |
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
│   ├── middlewares/      # Auth, roles, validation, rate limiting, error handling
│   ├── models/           # Admin, Cart, GuestSession, Item, Order, OtpCode
│   ├── routes/           # Route definitions
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
| `guestRoutes.js`      | `/api/guest`     | Guest sessions and guest orders          |

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

Tests run with `jest --runInBand` (one after another, because they share one database).

### Test database

Tests use a **real, separate MongoDB database**, not the production one. Create a `.env.testing` file inside `backend/` (it is in `.gitignore`, so it is not pushed to GitHub):

```env
MONGO_URI=your_testing_mongodb_connection_string/testingDataBase
JWT_SECRET=any_test_secret
```

> ⚠️ **Warning:** the tests delete collection data (`Admin`, `Item`, `Order`...) before each test. So there is a guard: the tests stop if the database name in the URI and in the real connection is not exactly `testingDataBase`. Never point this file to a real database.

### What do the tests cover?

| File                    | What it tests                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `items.test.js`         | Get products, add and edit by an admin, reject missing or invalid tokens, reject disabled admins, reject invalid data (negative price, `javascript:` links), invalid or missing IDs |
| `orders.test.js`        | Direct purchase: success updates stock and total; rejects invalid ID, invalid quantity, quantity bigger than stock, missing product. **Stock conflict:** two requests at the same time for stock that is enough for only one → one `201`, one `400`, and only `1` order saved |
| `auth.test.js`          | Admin routes return `401` with no token, a fake token, or a valid token for an admin that does not exist        |
| `health.test.js`        | `GET /health` returns `200`                                                                                     |
| `cart.test.js`          | ⚠️ Empty for now (no tests yet)                                                                                  |
| `unit/validation.test.js` | ⚠️ Empty for now (no tests yet)                                                                                |

> Jest reports the two empty files as failed suites ("Your test suite must contain at least one test"). All real tests pass.

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

There is an index on (`phoneNumber`, `createdAt`) to get a user's orders faster.

---

## 🎟️ GuestSession

A guest session lets the user track orders without sending the phone number in every request.

| Field         | Type     | Notes                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `phoneNumber` | `String` | Phone number linked to the session                                          |
| `token`       | `String` | Unique random token from `crypto.randomBytes` (32 bytes, `hex` format)      |
| `createdAt`   | `Date`   | The session is deleted automatically after **30 days** (TTL index)          |

---

## 🔢 OtpCode

> 🚧 **Not used yet.** This model is the first step of the OTP feature (see [Known Issues](#-phone-ownership-check-with-otpsms)). No route or controller uses it yet.

| Field         | Type     | Notes                                                                 |
| ------------- | -------- | --------------------------------------------------------------------- |
| `phoneNumber` | `String` | Required, unique (one active code per number)                         |
| `codeHash`    | `String` | Required. The hashed code (the plain code is never saved)             |
| `attempts`    | `Number` | Wrong tries so far. Default `0`                                        |
| `expiresAt`   | `Date`   | Required. The code is deleted automatically at this time (TTL index)  |

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
| `POST`  | `/api/guest/sessions`                   | Public       | Create a guest token with a phone number          |
| `GET`   | `/api/guest/orders`                     | Guest Token  | Get a user's orders with the token                |
| `GET`   | `/api/orders`                           | `moderator+` | Get all orders (dashboard)                        |
| `PATCH` | `/api/orders/:orderId`                  | `moderator+` | Change order status (Body: `{ "status" }`)        |

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

---

# 🎟️ Order Tracking with a Guest Session

This is another way to track orders, without sending the phone number with every request.

## 1. Create a guest token

```http
POST /api/guest/sessions
```

Body:

```json
{
  "phoneNumber": "+970599123456"
}
```

> The number is cleaned with the same rules as checkout, then matched against the saved order number (country code + 9 digits). So `+970599123456`, `+9700599123456`, `+970 0599-123-456` and `00970599123456` all find the same orders. A number without a supported country code, or without 9 digits, returns **400**.

If the phone number has at least one order, a token is created and returned:

```json
{
  "success": true,
  "token": "..."
}
```

If there is no order for this number:

```http
404 Not Found
```

---

## 2. Get orders with the token

```http
GET /api/guest/orders
x-guest-token: <token>
```

Returns the orders for the token's phone number, from **newest to oldest**.

If the `x-guest-token` header is missing:

```http
400 Bad Request
```

If the token is invalid or expired (after 30 days):

```http
401 Unauthorized
```

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

Each endpoint has a maximum number of requests per **15 minutes** (per IP). The limit depends on how sensitive the endpoint is (for example: 5 for creating an admin, 10 for login and enabling/disabling admins, 30 for creating a guest session). Too many requests → `429`.

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

### 🎟️ Guest Tokens

Guest tokens are random, created with:

```javascript
crypto.randomBytes();
```

They expire automatically after **30 days**.

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

- `--replace` deletes **only the `items` collection**. Orders, carts, guest sessions and admins are not touched.
- Before deleting, it saves all current items to `backend/backups/items-<db>-<date>.json` and checks the file. The `backups/` folder is in `.gitignore`.
- Old orders keep the item name and price inside them, so they still show correctly. Old carts may point to deleted items until they expire (7 days).
- Before writing, it checks the same limits as the API (name length, price, quantity, 1–6 images).

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

> This line is only in `tests/setup/db.js` now (for tests), not in the server code.

### `MongooseServerSelectionError` (IP not whitelisted)

MongoDB Atlas blocks IPs that are not in its list. Add your IP in Atlas → **Network Access**.

---

# 📝 Known Issues and Future Improvements

These are things I know need work, but I postponed them because of time or cost.

### 📱 Phone ownership check with OTP/SMS

Right now, anyone who knows a phone number with orders can get a guest token with `/api/guest/sessions`, and then see that person's orders.

This is because there is no step to check who owns the number.

**Future fix:** an OTP system that sends a code to the phone before giving a guest token or showing orders.

**Status:** started. The [`OtpCode`](#-otpcode) model exists, but sending the SMS and checking the code are not built yet.

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

`cart.test.js` and `unit/validation.test.js` are empty. The cart, cart checkout, admin management, guest session, and analytics routes have no tests yet.

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

**Express.js + MongoDB + Authentication + Authorization + Cart + Orders + Guest Sessions + Security + Testing**

I focused on real-world cases, like stock conflicts, user roles, input validation, and protecting the API from abuse.
