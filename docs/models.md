[← Back to README](../README.md) · **English** | [العربية](ar/models.md)

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
| `cancelledBy`  | `String` | `customer`, `admin`, or `system` (confirmation expired): who cancelled it (optional) |

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

> ⚠️ If there is no `whatsappNumber`, **all purchases are blocked** with `503` ("الشراء غير متاح حالياً"). Set it in the admin page **⚙️ Store settings** (`super_admin`, see [Store Settings](api.md#-store-settings)), or with [`storeSettingsSeed.js`](scripts.md#-store-whatsapp-number-storesettingsseedjs).
