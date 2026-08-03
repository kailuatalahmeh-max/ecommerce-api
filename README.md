# 🛒 متجر إلكتروني - Backend API

باك إند لمتجر إلكتروني مبني بـ **Express.js** و **MongoDB**، يدعم إدارة المنتجات، السلة (بدون تسجيل دخول عبر Guest ID)، الطلبات، ولوحة تحكم إدارية بصلاحيات متعددة المستويات.

> هذا أول مشروع باك إند حقيقي لي، بنيته بعد حوالي شهر ونصف من تعلم Express.js و MongoDB.

---

## 🧰 التقنيات المستخدمة

| التقنية | الاستخدام |
|---|---|
| Node.js + Express.js | السيرفر و الـ API |
| MongoDB + Mongoose | قاعدة البيانات |
| JWT (jsonwebtoken) | مصادقة الأدمن |
| bcrypt | تشفير كلمات المرور |
| express-rate-limit | حماية الـ endpoints من الإساءة |
| cors | التعامل مع الطلبات من الفرونت إند |

---

## ⚙️ الإعداد والتشغيل

### 1. تثبيت الحزم
```bash
npm install
```

### 2. متغيرات البيئة
أنشئ ملف `.env` في جذر المشروع وضع فيه:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### 3. تشغيل السيرفر
```bash
node index.js
```

السيرفر رح يشتغل افتراضياً على `http://localhost:5000`

### 4. التأكد إنه شغال
```
GET /health → { "status": "ok" }
```

---

## 🔑 نظام الصلاحيات (Roles)

الأدمن عنده 3 مستويات صلاحية، كل endpoint إداري محمي حسب الصلاحية المطلوبة:

| الرتبة | الصلاحيات |
|---|---|
| `admin` | إضافة / تعديل / حذف المنتجات |
| `moderator` | كل صلاحيات admin + إدارة الطلبات |
| `super_admin` | كل الصلاحيات + إنشاء أدمنز جدد + الإحصائيات |

المصادقة عبر **JWT Bearer Token** يُرسل بالـ header:
```
Authorization: Bearer <token>
```

---

## 📚 توثيق الـ Endpoints

### 🛍️ المنتجات (Items)

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/api/getItemsData` | عام | جلب كل المنتجات |
| POST | `/addItem` | admin+ | إضافة منتج جديد |
| PUT | `/api/item/edit/:id` | admin+ | تعديل منتج |
| DELETE | `/api/deleteItem/:id` | admin+ | حذف منتج |

### 🔐 الأدمن (Admin Auth)

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| POST | `/api/admin/logIn` | عام | تسجيل دخول الأدمن، بيرجع JWT token |
| POST | `/api/admin/create-new-admin` | super_admin | إنشاء حساب أدمن جديد |

### 🛒 السلة (Cart)

يعتمد النظام على `guestId` (UUID v4) يُخزّن بمتصفح المستخدم للتعرف على سلته بدون تسجيل دخول.

| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/cart/:guestId` | جلب محتويات السلة |
| POST | `/api/cart/add` | إضافة منتج للسلة |
| POST | `/api/cart/add-quantity/:id` | زيادة كمية منتج بالسلة |
| PATCH | `/api/cart/reducing-quantity/:id` | تقليل كمية منتج بالسلة |
| DELETE | `/api/cart/delete/:id` | حذف منتج واحد من السلة |
| DELETE | `/api/cart/delete-all/:guestId` | تفريغ السلة بالكامل |

### 📦 الطلبات (Orders)

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| POST | `/api/direct-purchase/set-data` | عام | شراء مباشر لمنتج واحد (بدون المرور بالسلة) |
| POST | `/api/cart-purchase/set-data/:guestId` | عام | إتمام الشراء لكل محتويات السلة |
| GET | `/api/order/get-my-orders?phoneNumber=` | عام | جلب طلبات المستخدم عبر رقم الهاتف |
| GET | `/api/admin-control/orders` | moderator+ | جلب كل الطلبات (لوحة التحكم) |
| PATCH | `/api/admin-control/order-edit-status` | moderator+ | تعديل حالة الطلب (Pending/Accepted/Delivered/Cancelled) |

### 📊 الإحصائيات (Analytics)

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/api/admin/analytics` | super_admin | إحصائيات آخر 7 أيام (الإيرادات، الطلبات حسب الحالة، أكثر منتج مبيعاً، أكثر المناطق طلباً، المنتجات منخفضة المخزون) |

---

## 🛡️ الحماية والأمان

- **Rate Limiting**: كل مجموعة endpoints محمية بحد أقصى للطلبات خلال 15 دقيقة، لتفادي إساءة الاستخدام.
- **Validation**: كل المدخلات (الأسعار، الكميات، الروابط، أرقام الهواتف...) يتم التحقق منها قبل معالجتها.
- **معالجة تعارض المخزون (Stock Race Conditions)**: عمليات الشراء تستخدم تحديثات ذرية (`findOneAndUpdate` مع شرط الكمية) لمنع بيع كمية أكبر من المتوفر، مع آلية rollback تلقائية لو فشلت أي خطوة بمنتصف عملية شراء متعددة المنتجات.
- **تشفير كلمات المرور**: عبر bcrypt، ولا يتم تخزين أي كلمة مرور كنص صريح.

---

## 📝 ملاحظات معروفة (تحسينات مستقبلية)

هاي أشياء واعٍ فيها بس تم تأجيلها لضيق الوقت، ومو أخطاء وظيفية:

- إعداد CORS مفتوح حالياً لكل الـ origins، يفضّل تقييده لدومين الفرونت إند بالإنتاج.
- عدم وجود فحص لمتغيرات البيئة (`MONGO_URI`, `JWT_SECRET`) عند إقلاع السيرفر.
- عدم اتساق كامل بين استخدام `message` و `error` بردود بعض الـ endpoints.
- لا يوجد centralized error handler أو 404 handler عام.

---

## 🌐 الاستضافة

المشروع مرفوع على:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas

(الاستضافة على خطة مجانية، لذا العرض المباشر تم على `localhost` لتفادي تأخير الاستيقاظ الأولي - cold start)
