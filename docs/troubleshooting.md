[← Back to README](../README.md) · **English** | [العربية](ar/troubleshooting.md)

# 🩺 Troubleshooting

### `querySrv ECONNREFUSED`

This error happens with a `mongodb+srv://` link when the local DNS cannot resolve SRV records. Fixes:

- Change your computer's DNS to `8.8.8.8` or `1.1.1.1`.
- Use the old (non-SRV) connection string from MongoDB Atlas.
- Or add this line at the start of the entry file:

```javascript
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
```

> This line is not in the server code. The tests do not need it any more (they use an in-memory database).

### `MongooseServerSelectionError` (IP not whitelisted)

MongoDB Atlas blocks IPs that are not in its list. Add your IP in Atlas → **Network Access**.
