[← Back to README](../README.md) · **English** | [العربية](ar/scripts.md)

# 🧹 Maintenance Scripts (`scripts/`)

Scripts you run by hand from the command line. They connect to the database in `MONGO_URI`.

> ⚠️ **Important — where to run:** some scripts read `../.env` and some read `.env` from the current folder, so the folder matters:
> - Scripts marked **(from `scripts/`)**: run them after `cd scripts`.
> - Scripts marked **(from `backend/`)**: run them from the `backend/` folder.

| Script                        | What it does                                                                                     | Run                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `addAdmin.js`                 | Create the first admin account. Email and password come from `.env` (see [First admin](#-first-admin-addadminjs)) | `node scripts/addAdmin.js` (from any folder)           |
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

### 👤 First admin: `addAdmin.js`

Creates the first admin account (usually `super_admin`), so you can log in to the admin pages. Later admins can be added from the admin page **Create admin account**.

1. Add these to `backend/.env` (they are also in `.env.example`, as comments):

   ```env
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=a-strong-password
   ADMIN_FULL_NAME=المدير العام      # optional
   ADMIN_ROLE=super_admin           # optional: admin | moderator | super_admin
   ```

2. Run `node scripts/addAdmin.js`. It always reads `backend/.env`, so it works from any folder.
3. **Remove `ADMIN_PASSWORD` from `.env`** after it works.

- It uses the same rules as `POST /api/admins`: a valid email, a password of 8 to 72 characters, a name longer than 5 characters, and a valid role. If something is wrong, it lists all the problems and does not connect to the database.
- If the email already exists, it changes **nothing** (the old password stays).
- The password is saved hashed (`bcrypt`) and is **never printed**.
- No email or password is written in the code.

### 📱 Demo data: `seedPhoneShop.js`

Fills the database in **`MONGO_URI2`** (not `MONGO_URI`) with **22 demo products** for the "Talahmeh Phones" store: phones, earbuds, chargers, watches and a tablet. The products are not real. Some quantities are set on purpose to show the stock badges (`0` = out of stock, `2`–`4` = few left). Run it from `backend/`:

```bash
node scripts/seedPhoneShop.js --dry-run            # show only, change nothing
node scripts/seedPhoneShop.js                      # add the products that do not exist yet (by name)
node scripts/seedPhoneShop.js --dry-run --replace  # show what --replace would do
node scripts/seedPhoneShop.js --replace            # backup → delete ALL items → add the 22 products
```

- `--replace` deletes **only the `items` collection**. Orders, carts and admins are not touched.
- Before deleting, it saves all current items to `backend/backups/items-<db>-<date>.json` and checks the file. The `backups/` folder is in `.gitignore`.
- Old orders keep the item name and price inside them, so they still show correctly. Old carts may point to deleted items until they expire (7 days).
- Before writing, it checks the same limits as the API (name length, price, quantity, 1–6 images).

### 💬 Store WhatsApp number: `storeSettingsSeed.js`

Saves the store's WhatsApp number in `StoreSettings` (database in `MONGO_URI`). **Purchases do not work until you run it once.** Run it from `backend/`:

```bash
node scripts/storeSettingsSeed.js +970599123456
```

Run it again with another number to change it. A wrong number is rejected.

> You can also change the number in the admin page **⚙️ Store settings** (`super_admin`).

### Image migration from `imageURL` to `images`

Products used to store one image in `imageURL`, then moved to the `images` array. Safe cleanup order:

1. `checkLegacyImageURL.js` to see the products' state.
2. `checkBeforeCleanup.js` to make sure every product has `images`.
3. `cleanDatabase.js` to delete the old `imageURL`. This script has **no DRY RUN mode and cannot be undone**, so make a backup first.
