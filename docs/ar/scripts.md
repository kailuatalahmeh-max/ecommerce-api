[↩ العودة إلى README](../../README.ar.md) · [English](../scripts.md) | **العربية**

# 🧹 سكربتات الصيانة (`scripts/`)

سكربتات تُشغَّل يدوياً من سطر الأوامر، وتتصل بقاعدة البيانات الموجودة في `MONGO_URI`.

> ⚠️ **مهم — مكان التشغيل:** بعض السكربتات تقرأ `../.env` وبعضها يقرأ `.env` من المجلد الحالي، لذلك مكان تشغيلها مهم:
> - السكربتات المحددة بـ **(من `scripts/`)** نفّذها بعد `cd scripts`.
> - السكربتات المحددة بـ **(من `backend/`)** نفّذها من مجلد `backend/`.

| السكربت                       | الوظيفة                                                                                                  | التشغيل                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `addAdmin.js`                 | إنشاء أول حساب أدمن. البريد وكلمة المرور من `.env` (انظر [أول أدمن](#-أول-أدمن-addadminjs))              | `node scripts/addAdmin.js` (من أي مجلد)                  |
| `updateAdminsLastActivity.js` | ترحيل: يضيف `lastActivityAt` و`isActive` و`firstName` للأدمنز القدامى الذين لا يملكونها                  | `node updateAdminsLastActivity.js` (من `scripts/`)       |
| `checkLegacyImageURL.js`      | فحص فقط: يعرض لكل منتج هل ما زال يملك الحقل القديم `imageURL` وعدد الصور في `images`                      | `node checkLegacyImageURL.js` (من `scripts/`)            |
| `checkBeforeCleanup.js`       | فحص فقط: يتأكد أن كل المنتجات لديها `images` قبل حذف `imageURL` القديم                                    | `node checkBeforeCleanup.js` (من `scripts/`)             |
| `cleanDatabase.js`            | **يحذف** الحقل القديم `imageURL` من جميع المنتجات                                                         | `node cleanDatabase.js` (من `scripts/`)                  |
| `scanInvisibleChars.js`       | فحص فقط: يبحث عن محارف Unicode الخفية في `Admin` و`Cart` و`Item` و`Order` ويطبع النتائج                    | `node scripts/scanInvisibleChars.js` (من `backend/`)     |
| `cleanInvisibleChars.js`      | يزيل محارف Unicode الخفية من نفس الجداول. الوضع الافتراضي **DRY RUN** (عرض فقط بدون تعديل)               | `node scripts/cleanInvisibleChars.js` (من `backend/`)    |

للتنفيذ الفعلي (وليس العرض فقط) لسكربت `cleanInvisibleChars.js`:

```bash
DRY_RUN=false node scripts/cleanInvisibleChars.js
```

### 👤 أول أدمن: `addAdmin.js`

ينشئ أول حساب أدمن (عادةً `super_admin`)، حتى تستطيع الدخول لصفحات الأدمن. باقي الأدمنز يمكن إضافتهم من صفحة الأدمن **إنشاء حساب أدمن**.

1. أضف هذه القيم إلى `backend/.env` (موجودة أيضاً في `.env.example` كتعليقات):

   ```env
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=a-strong-password
   ADMIN_FULL_NAME=المدير العام      # اختياري
   ADMIN_ROLE=super_admin           # اختياري: admin | moderator | super_admin
   ```

2. شغّل `node scripts/addAdmin.js`. يقرأ دائماً `backend/.env`، لذلك يعمل من أي مجلد.
3. **احذف `ADMIN_PASSWORD` من `.env`** بعد أن ينجح.

- يستخدم نفس قواعد `POST /api/admins`: بريد صحيح، كلمة مرور من 8 إلى 72 حرف، اسم أطول من 5 أحرف، وصلاحية صحيحة. إذا كان هناك خطأ، يعرض كل المشاكل ولا يتصل بقاعدة البيانات.
- إذا كان البريد موجوداً، **لا يغيّر شيئاً** (كلمة المرور القديمة تبقى).
- كلمة المرور تُحفظ مشفّرة (`bcrypt`) و**لا تُطبع أبداً**.
- لا يوجد بريد أو كلمة مرور مكتوبة في الكود.

### 📱 بيانات تجريبية: `seedPhoneShop.js`

يملأ قاعدة البيانات في **`MONGO_URI2`** (وليس `MONGO_URI`) بـ **22 منتجاً تجريبياً** لمتجر "Talahmeh Phones": هواتف، سماعات، شواحن، ساعات، وتابلت. المنتجات ليست حقيقية. بعض الكميات مقصودة لإظهار شارات المخزون (`0` = نفذت الكمية، `2`–`4` = كمية قليلة). شغّله من مجلد `backend/`:

```bash
node scripts/seedPhoneShop.js --dry-run            # عرض فقط، بدون أي تغيير
node scripts/seedPhoneShop.js                      # إضافة المنتجات غير الموجودة فقط (حسب الاسم)
node scripts/seedPhoneShop.js --dry-run --replace  # عرض ما سيفعله --replace
node scripts/seedPhoneShop.js --replace            # نسخة احتياطية ← حذف كل المنتجات ← إضافة الـ 22 منتجاً
```

- `--replace` يحذف **مجموعة `items` فقط**. الطلبات، السلات، والأدمن لا تتأثر.
- قبل الحذف يحفظ كل المنتجات الحالية في `backend/backups/items-<db>-<date>.json` ويتأكد من الملف. مجلد `backups/` موجود في `.gitignore`.
- الطلبات القديمة تحتفظ باسم المنتج وسعره بداخلها، لذلك تبقى تظهر بشكل صحيح. السلات القديمة قد تشير لمنتجات محذوفة حتى تنتهي صلاحيتها (7 أيام).
- قبل الكتابة يتحقق من نفس حدود الـ API (طول الاسم، السعر، الكمية، 1–6 صور).

### 💬 رقم واتساب المتجر: `storeSettingsSeed.js`

يحفظ رقم واتساب المتجر في `StoreSettings` (قاعدة البيانات في `MONGO_URI`). **الشراء لا يعمل حتى تشغّله مرة واحدة.** شغّله من `backend/`:

```bash
node scripts/storeSettingsSeed.js +970599123456
```

شغّله مرة أخرى برقم آخر لتغييره. الرقم الخاطئ يُرفض.

> يمكنك أيضاً تغيير الرقم من صفحة الأدمن **⚙️ إعدادات المتجر** (`super_admin`).

### ترحيل الصور من `imageURL` إلى `images`

كان المنتج يخزّن صورة واحدة في الحقل `imageURL`، ثم تم الانتقال إلى مصفوفة `images`. ترتيب التنظيف الآمن:

1. `checkLegacyImageURL.js` لمعرفة حالة المنتجات.
2. `checkBeforeCleanup.js` للتأكد أن كل منتج لديه `images`.
3. `cleanDatabase.js` لحذف `imageURL` القديم، وهذا الأمر **لا يملك وضع DRY RUN ولا يمكن التراجع عنه**، فخذ نسخة احتياطية قبله.
