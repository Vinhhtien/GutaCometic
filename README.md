# GUTA Cosmetic POS Demo

GUTA Cosmetic POS is a demo omnichannel skincare application with:

- React Native, Expo Router, and TypeScript mobile app
- Node.js and Express REST API
- MongoDB and Mongoose data models
- JWT authentication persisted with AsyncStorage
- Register, login, logout, profile, and demo product list flows

## Prerequisites

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string
- Expo Go on a phone, or an Android emulator

## 1. Start the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

The API runs at `http://localhost:5000`. Test it with:

```text
GET http://localhost:5000/api/health
```

Set `MONGODB_URI` in `backend/.env` when MongoDB is not running at the
default local address. Change `JWT_SECRET` before using the project outside a
local demo.

Order and inventory workflows use MongoDB multi-document transactions. The
backend automatically starts a project-local single-node replica set on port
`27018` before `npm run dev`, `npm start`, and `npm test`. Its data is stored in
`backend/.mongodb-rs-data`.

To migrate existing local data from the old standalone database on port
`27017`, run once:

```powershell
cd backend
npm run db:start
npm run db:migrate
npm run check:transactions
```

## 2. Mobile API connection

The Expo Metro server proxies `/api/*` requests to the backend on port `5000`.
When tunnel mode is used, the app and API share the same HTTPS `exp.direct`
host. A physical phone can therefore use the app from another Wi-Fi network or
mobile data without changing a LAN IP.

## 3. Start the mobile app

```powershell
cd mobile
npm install
npm run tunnel
```

The backend must already be running. Scan the QR code with Expo Go.

## Demo flow

1. Open the app. It redirects to Login when no session is stored.
2. Open Register and create a customer account.
3. Registration stores the JWT and user, then opens Home.
4. Home displays the current user, role, and seeded products.
5. Logout clears AsyncStorage and returns to Login.

## API routes

| Method | Route | Authentication |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Bearer token |
| `GET` | `/api/products` | Bearer token |
| `GET` | `/api/orders` | Bearer token, scoped by role |
| `POST` | `/api/orders/online` | `CUSTOMER` |
| `POST` | `/api/orders/offline` | `SALES`, assigned store |
| `PATCH` | `/api/orders/:orderId/approve` | `SALES`, assigned store |
| `PATCH` | `/api/orders/:orderId/pay` | `MANAGER`, assigned store |
| `PATCH` | `/api/orders/:orderId/online-status` | `MANAGER`, assigned store |
| `PATCH` | `/api/orders/:orderId/cancel` | Owner, assigned staff, or owning customer |

Public registration always creates a `CUSTOMER`. Privileged roles should be
assigned through a protected administration flow in a future phase.

## Phase 1 business rules

- Online orders reserve stock when they are created.
- Sales creates an offline order, then approves it to reserve stock and send it
  to the Manager payment queue.
- Manager payment completes the POS sale and converts reserved stock into sold
  stock.
- Cancelling an order releases any reservation.
- `MANAGER` and `SALES` users can only process their assigned `storeId`.
- Customers only see their own orders. Staff only see their branch orders.
  Owners can see all orders.
- Mobile cart state is stored per signed-in user with AsyncStorage.
