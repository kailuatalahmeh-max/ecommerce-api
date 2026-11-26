[↩ العودة إلى README](../../README.ar.md) · [English](../models.md) | **العربية**

# 🗄️ نماذج البيانات (Models)

## 🛍️ المنتج (Item)

يمكن لكل منتج أن يحتوي على عدد ديناميكي من الصور، حيث يتم تخزين الصور كمصفوفة من الكائنات بدلاً من الاعتماد على رابط صورة واحد.

| الحقل          | النوع            | الملاحظات                                                         |
| -------------- | ---------------- | ----------------------------------------------------------------- |
| `images`       | `[{ imageURL }]` | مصفوفة صور، افتراضياً فارغة، وكل صورة يجب أن تحتوي على `imageURL` |
| `itemName`     | `String`         | مطلوب                                                             |
| `itemPrice`    | `Number`         | مطلوب، ولا يمكن أن يكون أقل من `0`                                |
| `itemQuantity` | `Number`         | الافتراضي `0`، ولا يمكن أن يكون أقل من `0`                        |

### مثال

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
  "itemName": "اسم المنتج",
  "itemPrice": 50,
  "itemQuantity": 10
}
```

---

## 👤 الأدمن (Admin)

| الحقل            | النوع     | الملاحظات                                                          |
| ---------------- | --------- | ------------------------------------------------------------------ |
| `fullName`       | `String`  | مطلوب                                                              |
| `firstName`      | `String`  | يُحسب تلقائياً من أول كلمة في `fullName` عند الحفظ                 |
| `email`          | `String`  | مطلوب، فريد، يُحفظ بأحرف صغيرة                                     |
| `password`       | `String`  | مطلوب، مشفّر، ولا يُرجَع في الاستعلامات افتراضياً (`select: false`) |
| `role`           | `String`  | `admin` / `moderator` / `super_admin`، والافتراضي `admin`          |
| `isActive`       | `Boolean` | الافتراضي `true`، والحساب المعطّل لا يستطيع تنفيذ العمليات         |
| `lastActivityAt` | `Date`    | آخر نشاط للحساب، الافتراضي `null`                                   |

---

## 🛒 السلة (Cart)

| الحقل     | النوع                      | الملاحظات                                               |
| --------- | -------------------------- | ------------------------------------------------------- |
| `guestId` | `String`                   | مطلوب وفريد                                             |
| `items`   | `[{ itemId, quantity }]`   | `quantity` لا يقل عن `1`                                |

تُحذف السلة تلقائياً بعد **7 أيام** من آخر تحديث لها (TTL Index على `updatedAt`).

---

## 📦 الطلب (Order)

| الحقل          | النوع    | الملاحظات                                                                  |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `customerName` | `String` | مطلوب                                                                      |
| `phoneNumber`  | `String` | مطلوب. يُحفظ كرمز الدولة + الرقم، مثل `+970599123456`                       |
| `region`       | `String` | مطلوب. قيمة من قائمة `REGIONS` في `src/utils/constants.js`                  |
| `items`        | `Array`  | كل عنصر يحتوي على `itemId` و`itemName` و`itemPrice` و`quantity`           |
| `totalPrice`   | `Number` | مطلوب                                                                      |
| `status`       | `String` | `Pending` (الافتراضي) / `Accepted` / `Delivered` / `Cancelled`             |
| `confirmation` | `Object` | تأكيد واتساب (انظر بالأسفل). الطلبات القديمة لا تحتوي عليه                 |
| `cancelledAt`  | `Date`   | وقت إلغاء الطلب (اختياري)                                                  |
| `cancelledBy`  | `String` | `customer` أو `admin` أو `system` (انتهى التأكيد): من ألغى الطلب (اختياري) |

حقول `confirmation`:

| الحقل         | النوع    | ملاحظات                                                                    |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `code`        | `String` | 6 خانات من `A–Z` و`2–9` بدون `0 O 1 I L` (سهلة القراءة). فريد              |
| `status`      | `String` | `pending` (الافتراضي) / `confirmed` / `expired`                            |
| `expiresAt`   | `Date`   | بعد **24 ساعة** من الطلب (`CONFIRM_TTL_MINUTES` في الـ service)            |
| `confirmedAt` | `Date`   | وقت التأكيد                                                                |
| `method`      | `String` | من أكّد: `whatsapp_bot` أو `manual` في قائمة الـ schema. مسار الأدمن يحفظ `admin` |

الـ Indexes: (`phoneNumber`, `createdAt`) لتسريع جلب طلبات المستخدم، و`confirmation.code` (فريد)، و(`confirmation.status`, `confirmation.expiresAt`).

---

## ⚙️ إعدادات المتجر (StoreSettings)

مستند واحد للمتجر كله (`key: "main"`).

| الحقل            | النوع      | ملاحظات                                                              |
| ---------------- | ---------- | -------------------------------------------------------------------- |
| `key`            | `String`   | دائماً `"main"`. فريد ولا يمكن تغييره                                |
| `whatsappNumber` | `String`   | رقم واتساب المتجر. يُنظَّف بـ `normalizePhone`، مثل `+970599123456`   |
| `updatedBy`      | `ObjectId` | الأدمن الذي غيّره (اختياري)                                          |

> ⚠️ إذا لم يوجد `whatsappNumber`، **يتم منع كل عمليات الشراء** بـ `503` ("الشراء غير متاح حالياً"). احفظه من صفحة الأدمن **⚙️ إعدادات المتجر** (`super_admin`، انظر [إعدادات المتجر](api.md#-إعدادات-المتجر-store-settings))، أو باستخدام [`storeSettingsSeed.js`](scripts.md#-رقم-واتساب-المتجر-storesettingsseedjs).
