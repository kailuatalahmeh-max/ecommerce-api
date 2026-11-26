[← Back to README](../README.md) · **English** | [العربية](ar/api.md)

# 📚 API Endpoints

All routes are under `/api`, and all responses from `/api` have `Cache-Control: no-store`.

## Route files

| File                  | Mounted at       | Content                                  |
| --------------------- | ---------------- | ---------------------------------------- |
| `authRoutes.js`       | `/api/auth`      | Admin login                              |
| `adminRoutes.js`      | `/api/admins`    | Admin account management                 |
| `dashboardRoutes.js`  | `/api/dashboard` | Analytics                                |
| `storeSettingsRoutes.js` | `/api/store-settings` | Store WhatsApp number (`super_admin`) |
| `itemRoutes.js`       | `/api/items`     | Products                                 |
| `cartRoutes.js`       | `/api/carts`     | Cart                                     |
| `orderRoutes.js`      | `/api/orders`    | Orders                                   |

Cart checkout (`POST /api/carts/:guestId/checkout`) is in `cartRoutes.js`, but it uses `orderController`.

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

# 🏪 Store Settings

Only `super_admin` can see or change them (except `/public`). Used by the frontend page `/admin/store-settings`.

| Method | Endpoint              | Role          | Description                                      |
| ------ | --------------------- | ------------- | ------------------------------------------------ |
| `GET`  | `/api/store-settings` | `super_admin` | The store WhatsApp number, when and by whom it was changed |
| `GET`  | `/api/store-settings/public` | Public | **Only** the store WhatsApp number (`{ "whatsappNumber" }`, or `null`). Used by "Contact support" in "My orders" |
| `PUT`  | `/api/store-settings` | `super_admin` | Save the store WhatsApp number (Body: `{ "whatsappNumber" }`) |

`GET` answer (`whatsappNumber` is `null` when no number is saved):

```json
{
  "success": true,
  "data": {
    "whatsappNumber": "+970599123456",
    "updatedAt": "2026-11-26T12:00:00.000Z",
    "updatedBy": "Super Admin"
  }
}
```

- `PUT` cleans the number with `normalizePhone` (`"+970 0599-123-456"` → `"+970599123456"`). A bad number → `400` `INVALID_PHONE`, and the old number stays.
- It saves `updatedBy` (the admin who changed it). There is always **one** settings document (`key: "main"`, upsert).
- The number can be **changed but not removed**: with no number, all purchases stop (`503`).
- `/public` shows nothing else (no dates, no admin name). The number is not secret: customers already see it in the WhatsApp link after buying.
- Rate limit: 100 for `GET`, 300 for `GET /public`, 20 for `PUT`.
- The script [`storeSettingsSeed.js`](scripts.md#-store-whatsapp-number-storesettingsseedjs) still works (for the first setup, before any `super_admin` logs in).

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
