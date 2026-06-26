# UrbanHive Backend

Node.js/Express backend powering the UrbanHive shop, admin panel, and customer accounts.
All data lives in a single JSON file (`data/urbanhive.json`) — no database setup needed.

---

## Quick start

```bash
npm install
cp .env.example .env   # then fill in the 5 values below
node server.js         # or: npm run dev  (auto-restarts)
```

Open **http://localhost:4000** — the full site runs from one port.

---

## .env values you must set

| Variable | What |
|---|---|
| `JWT_SECRET` | Any long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PASSWORD` | Your admin panel password (min 6 chars). Only read on first run — change it from the Settings panel after. |
| `SITE_URL` | Your public domain, e.g. `https://urbanhive.com`. Used in email links. |
| `RESEND_API_KEY` | From https://resend.com/api-keys |
| `RESEND_FROM` | A verified sender on your Resend account, e.g. `UrbanHive <hello@yourdomain.com>`. Use `onboarding@resend.dev` for quick local testing. |
| `CONTACT_TO_EMAIL` | Where contact form submissions get emailed. |

---

## What's included

### Customer accounts (new)
- **Sign up** with email + password → verification email sent via Resend
- **Magic link login** → one-click email login, no password needed (also auto-creates account)
- **Wishlist** synced to their account (persists across devices)
- **Order history** with live status updates
- **Early access** flag — admin can grant members-only access per user

### Shop (`shop.html`)
- Products loaded from the API (not localStorage — all visitors see the same live catalogue)
- Account icon in nav → opens auth modal (sign in / create account / magic link)
- Once signed in → opens account drawer with wishlist + order history tabs
- Early access badge shown for members

### Admin panel (`admin.html`)
- **Dashboard** — live stats + activity feed
- **Products** — full CRUD, stock toggle, image preview
- **Users** — list all customer accounts, grant/revoke early access per user
- **Orders** — list all orders, advance status (pending → confirmed → shipped → delivered)
- **Messages** — contact form submissions with email status
- **Settings** — password change, data export, catalogue reset

### Emails (via Resend)
| Trigger | Email sent |
|---|---|
| Customer signs up | Verification link (expires 24h) |
| Customer requests magic link | Login link (expires 15min, single-use) |
| Customer places order | Order confirmation with itemised receipt |
| Contact form submitted | Notification to `CONTACT_TO_EMAIL` |

---

## API reference

### Auth (admin)
| Method | Path | Auth | |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{username, password}` → `{token}` |
| GET  | `/api/auth/me` | Admin | Validate session |
| PUT  | `/api/auth/password` | Admin | `{currentPassword, newPassword}` |

### Products
| Method | Path | Auth | |
|---|---|---|---|
| GET    | `/api/products` | — | List all (public) |
| POST   | `/api/products` | Admin | Add product |
| PUT    | `/api/products/:id` | Admin | Edit product |
| PATCH  | `/api/products/:id/stock` | Admin | Toggle stock |
| DELETE | `/api/products/:id` | Admin | Delete |
| POST   | `/api/products/reset` | Admin | Reset to defaults |

### Customer auth
| Method | Path | Auth | |
|---|---|---|---|
| POST | `/api/users/signup` | — | `{email, password}` |
| GET  | `/api/users/verify-email?token=` | — | Email verification link |
| POST | `/api/users/login` | — | `{email, password}` → `{token, user}` |
| POST | `/api/users/magic-link` | — | `{email}` → sends login email |
| GET  | `/api/users/magic-link/verify?token=` | — | Validates token, redirects to shop |
| GET  | `/api/users/me` | Customer | Get current user |

### Wishlist
| Method | Path | Auth | |
|---|---|---|---|
| GET    | `/api/wishlist` | Customer | Get wishlist items |
| POST   | `/api/wishlist/:productId` | Customer | Add to wishlist |
| DELETE | `/api/wishlist/:productId` | Customer | Remove from wishlist |

### Orders
| Method | Path | Auth | |
|---|---|---|---|
| POST | `/api/orders` | Customer | Place order `{items:[{productId,qty}]}` |
| GET  | `/api/orders/mine` | Customer | My order history |
| GET  | `/api/orders/admin/all` | Admin | All orders |
| PATCH | `/api/orders/admin/:id/status` | Admin | `{status}` — pending/confirmed/shipped/delivered |

### Admin extras
| Method | Path | Auth | |
|---|---|---|---|
| GET   | `/api/users/admin/list` | Admin | All customer accounts |
| PATCH | `/api/users/admin/:id/early-access` | Admin | Toggle early access |
| GET   | `/api/contact` | Admin | Contact form submissions |
| DELETE | `/api/contact/:id` | Admin | Delete submission |
| GET   | `/api/activity` | Admin | Recent activity feed |

---

## Forgot your admin password?
```bash
npm run reset-admin-password -- yournewpassword
```

---

## Deploying

Works on Railway, Render, Fly.io, or any VPS. One thing matters:

> **The `data/` folder must be on a persistent disk.** On Railway and Render this means attaching a volume and mounting it at `/data` (then set `DATA_DIR=/data` or adjust `src/db.js` to point there). Without persistence the JSON file resets on every redeploy.

Set all `.env` values in your host's environment panel instead of a file.

---

## Project structure

```
urbanhive-backend/
├── server.js
├── public/                   ← Full frontend (updated)
│   ├── shop.html             ← API-driven products + customer auth modal
│   ├── admin.html            ← Full admin dashboard (products/users/orders/messages)
│   ├── contact.html          ← Posts to /api/contact
│   └── ...
├── src/
│   ├── db.js                 ← JSON file store
│   ├── seedDefaults.js       ← Default catalogue
│   ├── middleware/
│   │   ├── auth.js           ← Admin JWT middleware
│   │   └── userAuth.js       ← Customer JWT middleware
│   ├── lib/
│   │   └── resend.js         ← All email templates
│   └── routes/
│       ├── auth.js           ← Admin login/password
│       ├── products.js       ← Product CRUD
│       ├── users.js          ← Customer signup/login/magic link
│       ├── wishlist.js       ← Customer wishlist
│       ├── orders.js         ← Orders (customer + admin)
│       ├── contact.js        ← Contact form
│       └── activity.js       ← Activity log
├── scripts/
│   └── reset-admin-password.js
├── data/
│   └── urbanhive.json        ← Auto-created. Keep this persistent in production!
└── .env.example
```
# urbanhive
