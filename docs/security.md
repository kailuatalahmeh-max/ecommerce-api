[← Back to README](../README.md) · **English** | [العربية](ar/security.md)

# 🛡️ Security

The project has these protections:

### 🚦 Rate Limiting

Each endpoint has a maximum number of requests per **15 minutes** (per IP). The limit depends on how sensitive the endpoint is (for example: 5 for creating an admin, 10 for login and enabling/disabling admins, 20 for tracking one order, 60 for tracking many, 20 for cancelling). Too many requests → `429`.

The goal is to reduce API abuse.

### 🌐 Real client IP (`TRUST_PROXY`)

The rate limits count requests **per IP** (`req.ip`), and the request log prints it. Behind proxies, Express must know **how many** proxies to trust, to find the real client IP in `X-Forwarded-For`. This number comes from `TRUST_PROXY` (`src/utils/trustProxy.js`, used in `myApp.js`).

On Render a request goes: **client → Cloudflare → Render's load balancer → the app**. So on Render set **`TRUST_PROXY=2`**.

| Value on Render | `req.ip` is | Problem |
| --------------- | ----------- | ------- |
| `1` (too low)   | a Cloudflare IP, which changes | One user is counted under several IPs (gets the limit many times), and users on the same Cloudflare server share one counter. The log shows Cloudflare IPs |
| `2` ✅          | the real client IP | — |
| `3` or more (too high) | the IP the client writes | A client can fake its IP with its own `X-Forwarded-For` header and skip the limits |

- Missing or wrong value (not a whole number from `0` to `10`) → `1`.
- Local work needs no change (no proxy, so the value does not matter).
- **How to check on the live server:** send several requests to `/health` and read the `x-ratelimit-remaining` header. It must go down **1 by 1**. A request with a fake `X-Forwarded-For: 1.2.3.4` header must **not** reset it.

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

### 📨 One Error Format

Every error answer (controllers, middlewares, rate limit, 404, error handler) has the same shape:

```json
{
  "success": false,
  "message": "السلة غير موجودة!",
  "code": "NOT_CANCELLABLE"
}
```

- `message` is short Arabic text. The frontend shows it to the user in a toast, so it must be safe and clear for customers.
- `code` is optional. It is there when the frontend or a test needs to know the exact case (for example `NOT_CANCELLABLE`, `NOT_ENOUGH_STOCK`, `ALREADY_CONFIRMED`).
- There is no `error` key. The old cart answers used `error`, so the frontend showed a generic message instead. Now they use `message` too.

### 🚧 404 for Unknown Routes

If no route matches, a middleware in `myApp.js` (after all routes, before `errorHandler`) returns JSON:

```json
{
  "success": false,
  "message": "المسار غير موجود"
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

```javascript
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
```

The number of trusted proxies comes from `TRUST_PROXY` (on Render: `2`). See [Real client IP](#-real-client-ip-trust_proxy).

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
