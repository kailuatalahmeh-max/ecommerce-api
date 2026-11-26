[↩ العودة إلى README](../../README.ar.md) · [English](../troubleshooting.md) | **العربية**

# 🩺 حل المشاكل الشائعة

### `querySrv ECONNREFUSED`

يظهر هذا الخطأ عند الاتصال برابط `mongodb+srv://` عندما لا يستطيع الـ DNS المحلي تحليل سجلات SRV. الحلول:

- تغيير DNS الجهاز إلى `8.8.8.8` أو `1.1.1.1`.
- استخدام رابط الاتصال القديم (غير SRV) من MongoDB Atlas.
- أو إضافة هذا السطر في بداية ملف التشغيل:

```javascript
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
```

> هذا السطر غير مضاف في كود السيرفر. والاختبارات لم تعد تحتاجه (تستخدم قاعدة في الذاكرة).

### `MongooseServerSelectionError` (الـ IP غير مسموح)

MongoDB Atlas يمنع أي IP غير موجود في القائمة. أضف الـ IP الخاص بك من Atlas ← **Network Access**.
