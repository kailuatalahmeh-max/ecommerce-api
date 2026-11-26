# 🛒 E-Commerce Store — Backend API

**English** | [العربية](README.ar.md)

A backend for an online store, built with **Express.js** and **MongoDB**. It supports:

- Product management, with many images per product.
- A shopping cart without login, using a `Guest ID`.
- Creating and managing orders.
- Order confirmation on WhatsApp with a one-time code (confirmed by hand for now).
- Order tracking by confirmation code + phone number (one order, or many at once).
- An admin dashboard with multi-level roles, and enabling/disabling admin accounts.
- API abuse protection and input validation.
- Handling stock conflicts during purchases.
- Integration and unit tests with Jest and Supertest.

> 💡 This is my first real backend project. I built it after about one and a half months of learning Express.js and MongoDB.

> This file is about the backend only. The repository has two folders: `backend/` and `frontend/`. See the [frontend README](../frontend/README.md).

> 📖 The details (API, orders, models, security, scripts, tests) are in the [`docs/`](#-documentation) folder.

---

## 🧰 Tech Stack

| Technology               | Used for                                   |
| ------------------------ | ------------------------------------------ |
| **Node.js + Express.js** | Server and API                             |
| **MongoDB + Mongoose**   | Database and models                        |
| **JWT (jsonwebtoken)**   | Admin authentication                       |
| **bcrypt**               | Password hashing                           |
| **express-rate-limit**   | Protecting endpoints from abuse            |
| **cors**                 | Handling requests from the frontend        |
| **dotenv**               | Reading environment variables from `.env`  |
| **crypto**               | Generating random order confirmation codes |
| **Jest + Supertest**     | API tests                                  |

---

## 📁 Project Structure (Backend)

```text
backend/
├── .env.example          # Example env variables (copy it to .env)
├── docs/                 # Detailed docs (English), docs/ar/ (Arabic)
├── myApp.js              # Express app (middlewares and routes) — imported by the tests
├── server.js             # Entry point: connects to the database, starts the server and the expired orders job
├── backups/              # JSON backups made by seedPhoneShop.js (ignored by git)
├── scripts/              # Maintenance, data migration and seed scripts (run by hand)
├── src/
│   ├── config/           # Database connection
│   ├── controllers/      # Business logic
│   ├── middlewares/      # Auth, roles, validation, rate limiting, error handling, store WhatsApp check
│   ├── models/           # Admin, Cart, Item, Order, StoreSettings
│   ├── routes/           # Route definitions
│   ├── services/         # orderConfirmation (WhatsApp confirm code), stock (return / take stock), expireOrders (expired orders job)
│   └── utils/            # Shared constants (constants.js), phone number cleaning (phone.js)
└── tests/
    ├── setup/            # Test database connection
    ├── fixtures/         # Ready-made test data
    ├── helpers/          # Helper functions (create test admin, add item...)
    ├── integration/      # Endpoint tests
    └── unit/             # Unit tests
```

`myApp.js` is separate from `server.js`, so the tests can import the app without opening a port or connecting to the main database.

---

## ⚙️ Setup and Run

Run all commands inside the `backend/` folder.

### 1. Install packages

```bash
cd backend
npm install
```

### 2. Environment variables

Copy the example file, then fill in your own values (**inside `backend/`**):

```bash
cp .env.example .env
```

`.env.example` lists every variable with a short note (it has no real secrets, so it is in git). The real `.env` is never committed. The variables:

| Variable       | Required | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| `MONGO_URI`    | Yes      | MongoDB connection string                                 |
| `JWT_SECRET`   | Yes      | Secret key for signing admin tokens                       |
| `FRONTEND_URL` | Yes      | The only origin allowed by CORS (your frontend address)   |
| `PORT`         | No       | Default `5000`                                            |
| `MONGO_URI2`   | No       | Only for `scripts/seedPhoneShop.js` and `scripts/updateAdminsLastActivity.js`. The server does not use it |
| `WHATSAPP_BOT_ENABLED` | No | `true` adds the bot route `GET /api/orders/:id/confirmation`. Leave it empty for now |

When the server starts (`server.js`), it checks `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`. If one is missing, it prints `Missing environment variables: ...` and stops.

### 3. Start the server

```bash
npm start
```

Or for development, with auto-restart on file changes (nodemon):

```bash
npm run dev
```

The server connects to the database first. If the connection fails, it stops. If it works, the server runs at:

```text
http://localhost:5000
```

### 4. Check that the server is running

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

> Note: `/health` also has rate limiting, and it is outside the `/api` path.

---

## 📖 Documentation

| Topic | What is inside |
| ----- | -------------- |
| [📚 API](docs/api.md) | Route files, roles, all endpoints, store settings, analytics |
| [💬 Orders](docs/orders.md) | WhatsApp confirm code, tracking, cancel, expired orders, stock |
| [🗄️ Models](docs/models.md) | Item, Admin, Cart, Order, StoreSettings |
| [🛡️ Security](docs/security.md) | Rate limits, CORS, validation, error format, stock conflicts, logging |
| [🧹 Scripts](docs/scripts.md) | First admin, demo data, store WhatsApp number, maintenance |
| [🧪 Testing](docs/testing.md) | In-memory test database and what the tests cover |
| [🩺 Troubleshooting](docs/troubleshooting.md) | Common MongoDB connection errors |

---

## 🌐 Hosting

| Part         | Service       |
| ------------ | ------------- |
| **Frontend** | Vercel        |
| **Backend**  | Render        |
| **Database** | MongoDB Atlas |

> The project uses free plans, so I used `localhost` during live demos to avoid the slow first start of the server (**cold start**).

---

## 🚀 About the Project

This project was hands-on practice for building a real backend with:

**Express.js + MongoDB + Authentication + Authorization + Cart + Orders + Order Tracking + Security + Testing**

I focused on real-world cases, like stock conflicts, user roles, input validation, and protecting the API from abuse.
