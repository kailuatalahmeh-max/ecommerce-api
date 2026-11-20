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
├── scripts/              # Maintenance and data migration scripts (run by hand)
├── src/
│   ├── config/           # Database connection
│   ├── controllers/      # Business logic
│   ├── middlewares/      # Auth, roles, validation, rate limiting, error handling
│   ├── models/           # Admin, Cart, GuestSession, Item, Order
│   ├── routes/           # Route definitions
│   └── utils/            # Shared constants
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
| `orderRoutes.js`      | `/api`           | Orders and guest sessions                |

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
```

`PORT` is optional. The default is `5000`.

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

- **Products:** get products, add and edit by an admin, reject missing or invalid tokens, reject disabled admins, reject invalid data (negative price, `javascript:` links), and handle invalid or missing IDs.
- **Direct purchase:** successful purchase updates stock and total; rejects invalid ID, invalid quantity, quantity bigger than stock, and missing product.
- **Stock conflict:** two requests at the same time for stock that is enough for only one: one succeeds (`201`), the other fails (`400`), and only `1` order is saved.
- Also auth, cart, health, and unit tests for input validation.

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

A disabled account (`isActive: false`) gets `401`, even if its token is still valid.

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
| `phoneNumber`  | `String` | Required                                                         |
| `region`       | `String` | Required                                                         |
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
| `POST`  | `/api/direct-purchase/set-data`         | Public       | Buy one product directly, without the cart        |
| `POST`  | `/api/cart-purchase/set-data/:guestId`  | Public       | Buy everything in the cart                        |
| `GET`   | `/api/order/get-my-orders?phoneNumber=` | Public       | Get a user's orders by phone number               |
| `POST`  | `/api/guest/verify`                     | Public       | Create a guest token with a phone number          |
| `GET`   | `/api/guest/orders`                     | Guest Token  | Get a user's orders with the token                |
| `GET`   | `/api/orders`                           | `moderator+` | Get all orders (dashboard)                        |
| `PATCH` | `/api/orders/:orderId`                  | `moderator+` | Change order status (Body: `{ "status" }`)        |

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
POST /api/guest/verify
```

Body:

```json
{
  "phoneNumber": "05XXXXXXXX"
}
```

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

The analytics include:

- 💰 Revenue.
- 📦 Orders by status.
- 🏆 Best-selling product.
- 📍 Top regions.
- ⚠️ Low-stock products.

---

# 🛡️ Security

The project has these protections:

### 🚦 Rate Limiting

Each endpoint has a maximum number of requests per **15 minutes**. The limit depends on how sensitive the endpoint is (for example: 5 for creating an admin, 10 for login, 30 for getting orders by phone number).

The goal is to reduce API abuse.

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

Right now, anyone who knows a phone number with orders can:

- Get a guest token with `/api/guest/verify`.
- Get the orders directly with `/api/order/get-my-orders`.

This is because there is no step to check who owns the number.

**Future fix:** an OTP system that sends a code to the phone before giving a guest token or showing orders.

### 🔁 More RESTful routes

The auth, admins, dashboard, items, cart, and admin orders routes are now RESTful. The customer order routes (`/direct-purchase/set-data`, `/cart-purchase/set-data/:guestId`, `/order/get-my-orders`) still use the old style (verbs in the URL) and will be moved later.

### 🌐 CORS

CORS is open to all origins now (`app.use(cors())`).

In production, it is better to allow only the frontend domain.

### 🔑 Environment variable check

There is no clear check for required environment variables at startup, like:

```text
MONGO_URI
JWT_SECRET
```

Now the server stops only if the database connection fails. A better way is to check the variables at startup and stop with a clear message if one is missing.

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

It is better to use one format for all API responses.

### 🚧 Global 404 handler

There is no global middleware for routes that do not exist yet. It is planned.

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
