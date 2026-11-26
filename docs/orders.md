[← Back to README](../README.md) · **English** | [العربية](ar/orders.md)

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

### ⏳ Expired orders (stock comes back)

An order that is **not confirmed on WhatsApp in 24 hours** is cancelled by the server (`src/services/expireOrders.service.js`):

- `server.js` starts the job after the database connects. It runs **once at start** (to catch up after the server was asleep), then **every 10 minutes**. Tests don't start it.
- It looks for orders with `status: "Pending"`, `confirmation.status: "pending"` and `confirmation.expiresAt` in the past (the index on `confirmation.status` + `confirmation.expiresAt` makes this fast).
- Each one becomes `status: "Cancelled"`, `confirmation.status: "expired"`, `cancelledBy: "system"`, and its **stock comes back** (`returnStock` in `src/services/stock.service.js`).
- One atomic update per order, so the stock comes back only once (even if the customer cancels at the same moment).
- **Not touched:** confirmed orders, and orders the admin already accepted.
- An admin can open an expired order again: the stock is taken again, or the change is refused with `NOT_ENOUGH_STOCK`.

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
