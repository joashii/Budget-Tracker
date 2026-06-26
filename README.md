# Budget Tracker — Express/React/Node (multi-user, Google Sheets backend)

Your Apps Script budget tracker, ported to a standard web stack:

- **Backend**: Express (Node) — talks to Google Sheets via the Sheets API (`googleapis`).
  Each user signs in with their own Google account (OAuth2), so each person's data lives
  in **their own** Google Sheet — same as your original Apps Script behavior, where the
  script ran as the logged-in user.
- **Frontend**: React (Vite) — full UI: dashboard, transaction logging, debt ledger,
  and notification settings, all calling the Express API instead of `google.script.run`.
- **Database**: still Google Sheets. Same tab schema, same formulas as `Code.txt`.

## How auth works now

1. User clicks "Continue with Google" → redirected to Google's consent screen.
2. Google redirects back to `/auth/google/callback` with a code.
3. Backend exchanges the code for a `refresh_token`, looks up/creates that user's
   "Budget Tracker — My Data" spreadsheet **in their own Drive**, and stores
   `{ userId, email, refreshToken, spreadsheetId }` in `backend/src/db/users.json`.
4. A session cookie keeps them logged in. Every API call after that uses
   `req.ctx.authClient` (built fresh from their stored refresh token) so all
   reads/writes go to that user's own sheet — nobody can see anyone else's data.

`backend/src/db/users.json` is a flat-file store for simplicity. Swap it for a real
database (Postgres, etc.) before you have more than a handful of users — the only
interface other files depend on is `getUser(id)` / `upsertUser(id, fields)` in
`backend/src/db/userStore.js`.

## 1. Google Cloud setup (one-time)

1. console.cloud.google.com → create/select a project.
2. APIs & Services → Library → enable **Google Sheets API** and **Google Drive API**.
3. APIs & Services → OAuth consent screen → set it up (External, add scopes for
   Sheets/Drive/userinfo, add yourself as a test user while unverified).
4. APIs & Services → Credentials → Create Credentials → **OAuth client ID** → Web application.
   - Authorized redirect URI: `http://localhost:4000/auth/google/callback`
5. Copy the Client ID and Client Secret into `backend/.env`.

## 2. Backend

```bash
cd backend
cp .env.example .env      # fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SMTP creds
npm install
npm run dev                # http://localhost:4000
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173, click "Continue with Google", sign in, and you'll land on
the dashboard. The first login automatically creates your spreadsheet with all tabs
(Account_Balance, Today, Weekly, Monthly, Yearly, Payables, Receivables, Cash on Hand,
Bank Account, Settings) styled the same way your `_styleHeader` did.

## 4. What's included

| Screen | What it does |
|---|---|
| **Dashboard** | Total balance (+ inline edit), sources of funds list, today's spendings |
| **Log** | Log a spending against Today/Weekly/Monthly/Yearly + a source of funds (auto-deducts and mirrors to Cash on Hand if needed); Deposit/Withdraw against any source; add new source tabs |
| **Debts** | Payables/Receivables totals, directory, add new record, settle (with source mirroring), delete |
| **Settings** | Daily reminder toggle + times + notify email, link to open the underlying Google Sheet, sign out |

| Backend feature | Status |
|---|---|
| Per-user OAuth2 + own spreadsheet | ✅ |
| Account balance read/edit + SUM/SUMIF formula rebuild | ✅ |
| Sources of funds: create, deposit/withdraw, Cash on Hand mirroring | ✅ |
| Budget item logging + auto-deduct from source | ✅ |
| Payables/Receivables: add, list, settle, delete | ✅ |
| Notification settings (Settings tab instead of `PropertiesService`) | ✅ |
| Daily reminder emails (Nodemailer), checked every minute across all users (`node-cron`) | ✅ |

## 5. API reference

```
GET    /auth/google                 (redirect to Google login)
GET    /auth/google/callback        (OAuth redirect target)
GET    /auth/me                     -> { email, name } or 401
POST   /auth/logout

GET    /api/balance
PUT    /api/balance                 { balance }
GET    /api/sources
POST   /api/sources                 { sourceName }
POST   /api/sources/transaction     { sourceName, actionType, amount, date, description }
POST   /api/items                   { timeframe, date, category, itemName, spendings, budget, sourceName }
GET    /api/items/today
GET    /api/debts/totals
GET    /api/debts/:type             (Payables | Receivables)
POST   /api/debts/:type             { name, amount, description, dateStart, dateDue }
POST   /api/debts/payment           { id, paymentAmount, sourceName, ledgerType }
DELETE /api/debts/:id               (id format: "Payables|5")
GET    /api/notifications
PUT    /api/notifications           { enabled, times: ["08:00"], notifyEmail }
GET    /api/spreadsheet-url
```

All `/api/*` routes require a valid session (`requireAuth` middleware) — sign in first.

## 6. Deploying

- **Backend**: needs to stay running (for the cron-based reminder check) — Render,
  Railway, Fly.io, or a small VM all work. Set env vars there, including
  `GOOGLE_REDIRECT_URI` pointing at your deployed `/auth/google/callback`, and add that
  exact URL to the OAuth client's authorized redirect URIs in Google Cloud Console.
- **Frontend**: any static host (Vercel, Netlify). Point `APP_URL` (backend env) at
  the deployed frontend URL, and update the Vite proxy / fetch base URL if frontend
  and backend aren't on the same domain.
- **Verification**: while the OAuth consent screen is in "Testing" mode, only test
  users you've added in Google Cloud Console can sign in. Submit for verification
  when you're ready for the public.
- Move `backend/src/db/users.json` to a real database before scaling past a few users.

---

## 7. Deploying to Vercel

This repo is set up as **two separate Vercel projects**: `backend/` (serverless functions)
and `frontend/` (static Vite build). Deploying them separately keeps things simple — the
frontend talks to the backend over a normal cross-origin `fetch`, with cookies enabled.

### 7a. Backend deploy

1. Push `backend/` to a GitHub repo (or just the whole monorepo — Vercel lets you set
   the project's **Root Directory** to `backend`).
2. On vercel.com → New Project → import the repo → set **Root Directory** to `backend`.
3. **Storage tab** → Create Database → KV → attach it to this project. Vercel injects
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically — you don't set those by hand.
4. **Settings → Environment Variables**, add:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://<your-backend>.vercel.app/auth/google/callback
   SESSION_SECRET=<long random string>
   APP_URL=https://<your-frontend>.vercel.app
   SPREADSHEET_NAME=Budget Tracker — My Data
   SMTP_HOST=...
   SMTP_PORT=465
   SMTP_USER=...
   SMTP_PASS=...
   CRON_SECRET=<another long random string>
   NODE_ENV=production
   ```
5. Deploy. Then go back to Google Cloud Console → your OAuth client → add
   `https://<your-backend>.vercel.app/auth/google/callback` as an authorized redirect URI
   (keep the localhost one too, for local dev).
6. `vercel.json` already declares the cron job (`/api/cron/reminders`). **Note:** on
   Vercel's Hobby (free) plan, cron jobs can only run **once a day**, not every 5
   minutes — fine for a single daily reminder, not for multiple specific times. If you
   need finer-grained reminder times on the free plan, use a free external pinger like
   cron-job.org to hit `https://<your-backend>.vercel.app/api/cron/reminders` every
   minute, sending header `Authorization: Bearer <CRON_SECRET>`. Vercel Pro removes
   this restriction.

### 7b. Frontend deploy

1. New Project → import the same repo → **Root Directory**: `frontend`.
2. Framework preset: Vite (auto-detected). Build command `npm run build`, output `dist`.
3. **Settings → Environment Variables**, add:
   ```
   VITE_API_URL=https://<your-backend>.vercel.app
   ```
4. Deploy. Visit the frontend URL, sign in with Google.

### 7c. Why cookies still work cross-domain

The backend sets the session cookie with `SameSite=None; Secure` when `NODE_ENV=production`
(see `routes/auth.js`), which is required for a cookie to be sent on a cross-origin
`fetch` between two different `*.vercel.app` domains. Locally (`NODE_ENV` unset), it
falls back to `SameSite=Lax` over plain HTTP, which is what `localhost` needs.

### 7d. What changed from the local-only version, for Vercel compatibility

| Before | After (Vercel-compatible) |
|---|---|
| `express-session` (in-memory) | Stateless JWT in an httpOnly cookie (`src/utils/jwt.js`) — no server-side session storage needed, survives serverless cold starts |
| `src/db/users.json` flat file | Vercel KV when `KV_REST_API_URL` is set, same JSON file as a local-dev fallback otherwise (`src/db/userStore.js`) |
| `node-cron` running inside the always-on process | `runReminderCheck()` exposed as `GET /api/cron/reminders`, triggered by Vercel Cron in prod, or a local `setInterval` in `npm run dev` |
| `app.listen()` directly in `server.js` | Express app split into `src/app.js` (no listen) + `api/index.js` (Vercel function entry, just exports the app) + `src/server.js` (thin local-dev wrapper that calls `.listen()`) |
