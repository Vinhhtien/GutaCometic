# GUTA Cosmetic POS Demo

GUTA Cosmetic POS is a demo omnichannel skincare application with:

- React Native, Expo Router, and TypeScript mobile app
- Node.js and Express REST API
- MongoDB and Mongoose data models
- JWT authentication persisted with AsyncStorage
- Gmail OTP registration, login, password recovery, profile, and product flows

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

Order and inventory workflows use MongoDB multi-document transactions. The
local MongoDB service runs as a single-node replica set named `rs0` on port
`27017`. Set the backend connection in `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/guta_cosmetic_pos?replicaSet=rs0
```

Change `JWT_SECRET` before using the project outside a local demo. Run
`npm run check:transactions` to verify the replica set configuration.

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

## Google Sign-In

Google Sign-In automatically creates a `CUSTOMER` account on first login and
links an existing account when Google returns the same verified Gmail address.
It uses browser OAuth through the Expo AuthSession proxy and runs in Expo Go.

Create one OAuth client in Google Cloud Console with application type
`Web application`. Add this authorized redirect URI:

```text
https://auth.expo.io/@vinhhtien/guta-cosmetic-pos
```

The shared development Web Client ID is included in the project. Override it
in `backend/.env` only when using a different Google Cloud project:

```env
GOOGLE_CLIENT_IDS=your_web_client_id.apps.googleusercontent.com
```

The mobile app uses the same development Client ID by default. No Apple
Developer account or iOS build is required for this Expo Go flow.

## Demo flow

1. Open the app. It redirects to Login when no session is stored.
2. Open Register, enter the required Gmail address and phone number, then
   request the Gmail OTP.
3. Enter the OTP received by email. The account is only created after OTP
   verification, then the app stores the JWT and opens Home.
4. Home displays the current user, role, and seeded products.
5. Logout clears AsyncStorage and returns to Login.

With `OTP_MODE=development`, OTP request responses include `developmentOtp` so
the flow can be tested without SMS or email services. Do not enable this mode
in production.

For real Gmail delivery, set `OTP_MODE=production` and configure:

- Gmail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  and `OTP_EMAIL_FROM`. Gmail SMTP requires a Google App Password.
Registration uses Gmail OTP only. Password recovery accepts Gmail or phone as
the account identifier, but always delivers the code to the Gmail stored on
that account.

## API routes

| Method | Route | Authentication |
| --- | --- | --- |
| `POST` | `/api/auth/register/request-otp` | Public |
| `POST` | `/api/auth/register/verify-otp` | Public |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/google` | Public, Google ID token |
| `POST` | `/api/auth/password/forgot/request-otp` | Public |
| `POST` | `/api/auth/password/forgot/verify-otp` | Public |
| `POST` | `/api/auth/password/reset` | Public, reset token |
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
