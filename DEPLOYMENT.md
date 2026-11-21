# AADRIQUE — Deployment Guide

No Docker required. The stack is three plain pieces:

| Piece | What it is | How it runs |
|---|---|---|
| **MongoDB** | Content + enquiry storage | System service, or MongoDB Atlas |
| **Backend** | FastAPI (`backend/server.py`) | `uvicorn` under systemd |
| **Frontend** | React build (static files) | nginx, or any static host |

The frontend is a static bundle — it does not need Node.js on the server, only to build.

---

## 1. Local development

```bash
cp backend/.env.example backend/.env      # fill in ADMIN_TOKEN
cp frontend/.env.example frontend/.env
brew services start mongodb-community     # macOS

./scripts/dev.sh                          # starts API :8000 + web :3000
```

`scripts/dev.sh` creates the virtualenv, installs dependencies, checks MongoDB is
listening, and runs both processes. Ctrl-C stops everything.

---

## 2. Configuration

Every variable lives in `backend/.env` (see `backend/.env.example`). The app
**refuses to start in production** if any of these are wrong:

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URL` | always | `mongodb://localhost:27017` or an Atlas SRV URI |
| `DB_NAME` | always | e.g. `aadrique` |
| `ENVIRONMENT` | always | set to `production` on the server |
| `CORS_ORIGINS` | production | exact origins, comma-separated. `*` is rejected |
| `ADMIN_TOKEN` | production | ≥24 chars; guards the enquiry inbox |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `OWNER_EMAIL` | optional | without them enquiries are stored but no email is sent |
| `GOOGLE_CLIENT_ID` | for programme applications | Google OAuth Web client ID; blank disables online applications (see below) |
| `ADMIN_EMAILS` | for the admin dashboard | comma-separated Google accounts allowed into `/admin` |
| `RAZORPAY_PAYMENT_LINK` | for programme payments | e.g. `https://razorpay.me/@kondusrivardhanrao`; blank hides online payment |
| `TRUST_PROXY` | optional | `true` **only** behind a proxy you control |

Generate the admin token:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

> **Why `ADMIN_TOKEN` is mandatory:** `GET /api/enquiries` returns every enquiry
> ever submitted — names, emails, phone numbers, company details. It used to be
> completely open. Without a token set, the endpoint is disabled entirely.

### Programme applications (Sign in with Google)

Students apply for the AI Engineering Programme at `/ai-engineering/apply` after
signing in with Google. The browser receives a Google ID token; the API verifies
it (signature, expiry, audience = `GOOGLE_CLIENT_ID`, verified email) before
storing anything, in the `programme_applications` collection — one record per
Google account. Without `GOOGLE_CLIENT_ID` the apply page falls back to the
contact form.

1. <https://console.cloud.google.com> → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → External; app name "AADRIQUE",
   support email, authorised domain `aadrique.in`. Only the default scopes
   (email, profile, openid) are used, so no Google verification review is needed.
   **Publish** the app — in "Testing" mode only listed test users can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   type **Web application**. Under **Authorized JavaScript origins** add
   `https://www.aadrique.in`, `https://aadrique.in` and, for local work,
   `http://localhost:3000` and `http://localhost`. No redirect URIs and no client
   secret are needed.
4. Copy the client ID (`…apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID` on
   the API and restart it. The frontend reads it from `GET /api/programme/config`,
   so no frontend rebuild is needed.

**Admin dashboard:** open `/admin` and **Sign in with Google** with an account
listed in `ADMIN_EMAILS` (anyone else is refused by the API). Sessions last 12
hours; rotating `ADMIN_TOKEN` signs everyone out. The dashboard shows totals,
payments waiting for verification, confirmed seats and early-bird seats left;
click a student to call/WhatsApp them, verify or reject their payment, set their
admission status and keep notes. **CSV** downloads everything. `ADMIN_TOKEN`
also works ("Use admin token instead") and for scripts:

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://YOUR-API/api/programme/applications
curl -H "X-Admin-Token: $ADMIN_TOKEN" -o applications.csv https://YOUR-API/api/programme/applications.csv
```

### Programme payments (Razorpay payment link)

Fees: **₹14,999** early-bird for the first 20 seats, then **₹17,999**; no GST
for now; **non-refundable** (`/refund-policy`). Set in `backend/programme.py` →
`FEE_BASE_PAISE`, `REGULAR_FEE_PAISE`, `EARLY_BIRD_SEATS`, `GST_RATE_PERCENT` (0).
A student's price is locked when they submit their first payment, so a deposit
holds an early-bird seat; revoking them or rejecting all their payments releases
it. Once 20 seats are held, the site, apply page and payment step switch to
₹17,999 automatically. To add GST later, set `GST_RATE_PERCENT = 18` (and
`FEE` in `frontend/src/lib/programme.js`) — summaries, balances and the
dashboard follow.

Until Razorpay API keys are available, students pay through
`RAZORPAY_PAYMENT_LINK` and then submit each payment's **transaction ID and
amount** on the apply page. Paying in parts is supported (e.g. a deposit, then
the balance); each transaction ID can only be claimed once across all students.
In `/admin`, the **Transactions** view lists every transaction with the student
beside it (and exports as CSV) for matching against the Razorpay dashboard; open
a student to **Verify** each transaction with the amount actually received, or
reject it. Once verified payments cover the fee the seat is confirmed and the
student is emailed. **Revoke seat** cancels an application — the student sees
it's cancelled and can't submit further payments (refunds happen outside the site).

### Transactional email (Resend)

The contact form sends two emails per submission via the [Resend](https://resend.com)
API: a "new enquiry" notification to `OWNER_EMAIL`, and an auto-reply to the person
who submitted the form. Both are skipped (enquiry is still saved to MongoDB) if any
of `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` / `OWNER_EMAIL` is unset.

1. Create a free account at <https://resend.com>.
2. **Domains → Add Domain** → enter `aadrique.in`. Resend gives you a handful of
   DNS records (SPF `TXT`, DKIM `CNAME`s, and optionally a DMARC `TXT`) — add them
   at your domain registrar/DNS host. Verification usually completes within
   minutes to a few hours after the records propagate.
3. **API Keys → Create API Key** → copy it into `RESEND_API_KEY`.
4. Set `EMAIL_FROM_ADDRESS` to any address on that verified domain — it does not
   need to be a real mailbox, e.g. `no-reply@aadrique.in`. This is what recipients
   see as the sender; replies go to whoever the enquiry names as `reply_to`
   (the enquirer for the owner notification, `OWNER_EMAIL` for the auto-reply).
5. Set `OWNER_EMAIL` to the mailbox that should actually receive new-enquiry
   notifications (currently `gunasanjaysagar.m@aadrique.in`) — this one **does**
   need to be a real, working inbox.
6. Restart the API (env vars are only read at startup), then submit a test
   enquiry through the live site and confirm it arrives.

Frontend variables are baked in **at build time** (Create React App behaviour).
Changing `REACT_APP_BACKEND_URL` requires a rebuild — setting it on the server does
nothing.

---

## 3. Single-server deploy (VPS: Hetzner, DigitalOcean, EC2, Lightsail)

Assumes Ubuntu with the repo at `/srv/aadrique`.

### 3.1 System packages

```bash
sudo apt update
sudo apt install -y python3-venv nginx
# MongoDB: follow https://www.mongodb.com/docs/manual/administration/install-on-linux/
sudo systemctl enable --now mongod
```

### 3.2 Backend

```bash
cd /srv/aadrique
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
# edit: ENVIRONMENT=production, CORS_ORIGINS=https://www.aadrique.in, ADMIN_TOKEN=...
sudo chown www-data:www-data backend/.env && sudo chmod 600 backend/.env

sudo cp deploy/aadrique-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aadrique-api
curl -s localhost:8000/api/health
```

### 3.3 Frontend

Build on any machine with Node 20 (your laptop is fine), then copy the output up:

```bash
./scripts/build.sh                    # same-origin build; nginx proxies /api
rsync -av frontend/build/ user@server:/var/www/aadrique/
```

### 3.4 nginx + TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/aadrique
sudo ln -s /etc/nginx/sites-available/aadrique /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d aadrique.in -d www.aadrique.in
```

nginx serves the static build and forwards `/api` to uvicorn on `127.0.0.1:8000`,
so the browser only ever sees one origin — no CORS preflight at all.

---

## 4. Render (API) + Vercel (site) + Atlas (database)

Three services, deployed in this order. Order matters: Vercel needs the Render URL
at **build** time, and Render needs the Vercel domain for CORS.

### Step 1 — MongoDB Atlas

1. <https://cloud.mongodb.com> → **Create** a free M0 cluster.
2. **Database Access** → Add New Database User (username + strong password). Save them.
3. **Network Access** → Add IP Address → **Allow access from anywhere (`0.0.0.0/0`)**.
   Render's free plan has no static outbound IP, so an allowlist is not workable;
   the database user password is what protects the cluster. Keep it strong.
4. **Connect → Drivers** → copy the SRV string:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Substitute the real password (URL-encode any special characters).

### Step 2 — Render (backend API)

1. <https://dashboard.render.com> → **New → Blueprint** → connect this repo.
   Render reads `render.yaml` and configures the service automatically.
2. It will prompt for the variables not stored in git:
   - `MONGO_URL` → the Atlas SRV string from step 1
   - `CORS_ORIGINS` → leave as a placeholder for now, corrected in step 4
   - `OWNER_EMAIL` / `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` → optional; blank disables email
     (see "Transactional email" below to set these up)
3. Deploy. First build takes a few minutes.
4. Copy the service URL, e.g. `https://aadrique-api.onrender.com`.
5. Verify: `curl https://aadrique-api.onrender.com/api/health` → `{"status":"ok","database":"ok",...}`

   If it says `"database":"unavailable"`, the Atlas URL, password or Network Access
   setting is wrong — check the Render logs.
6. **Environment → `ADMIN_TOKEN`** — Render generated this. Copy and store it; it is
   the credential for reading enquiries.

> **Free plan caveat:** the service sleeps after ~15 minutes idle, so the first
> request afterwards takes ~50 seconds. Fine while launching; upgrade to the paid
> Starter plan before you send traffic to the site.

*Prefer not to use the Blueprint?* New → Web Service, then set Root Directory `backend`,
Build `pip install -r requirements.txt`, Start
`uvicorn server:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'`,
Health Check Path `/api/health`, and add every variable from §2 by hand.

### Step 3 — Vercel (frontend)

1. <https://vercel.com/new> → import this repo.
2. **Root Directory → `frontend`** (this is the setting people miss — without it the
   build fails). `frontend/vercel.json` supplies the rest.
3. **Environment Variables** — add before the first build:

   | Name | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | `https://aadrique-api.onrender.com` (no trailing slash, no `/api`) |
   | `REACT_APP_SITE_URL` | `https://www.aadrique.in` |
   | `CI` | `false` |

4. **Deploy**, then open the generated URL.

> CRA inlines `REACT_APP_*` at **build** time. Changing either variable later requires
> a **redeploy** — editing it in the dashboard alone changes nothing.

### Step 4 — Connect them (do not skip)

Back in **Render → Environment**, set `CORS_ORIGINS` to your real frontend origins,
comma-separated, no trailing slashes:

```
https://www.aadrique.in,https://aadrique.in,https://aadrique.vercel.app
```

Save — Render redeploys. Until this matches, the site loads but every API call fails
with a CORS error and the pages stay empty.

### Step 5 — Custom domain

1. **Vercel → Settings → Domains** → add `aadrique.in` and `www.aadrique.in`, then
   point your registrar's DNS at the records Vercel shows. TLS is automatic.
2. Add the final domains to `CORS_ORIGINS` on Render (step 4) if they aren't there.

### Step 6 — Verify the deploy

```bash
curl -s https://aadrique-api.onrender.com/api/health
curl -s https://www.aadrique.in/ -o /dev/null -w '%{http_code}\n'                 # 200
curl -s https://www.aadrique.in/work/crowd-headcount-monitoring -o /dev/null -w '%{http_code}\n'  # 200, SPA fallback
curl -s -o /dev/null -w '%{http_code}\n' https://aadrique-api.onrender.com/api/enquiries          # 401
```

Then open the site and submit the contact form — the enquiry should appear in:

```bash
curl -H "X-Admin-Token: YOUR_ADMIN_TOKEN" https://aadrique-api.onrender.com/api/enquiries
```

### Common failures

| Symptom | Cause |
|---|---|
| Pages load but all content is empty | `CORS_ORIGINS` on Render doesn't match the Vercel domain exactly |
| Requests go to `undefined/api/...` | `REACT_APP_BACKEND_URL` wasn't set **before** the Vercel build |
| Vercel build fails immediately | Root Directory not set to `frontend` |
| `"database":"unavailable"` | Atlas Network Access or the password in `MONGO_URL` |
| API refuses to start | Read the Render log — the config validator names the exact missing variable |
| First request takes ~50s | Render free plan cold start |

---

## 5. Content updates

Content is seeded from `backend/seed_data.py` into MongoDB on startup.

To publish an edit: change the content **and bump `SEED_VERSION`**, then restart the
API. The seed is a no-op unless the version changed, so restarts are cheap and it's
safe to run multiple workers — a lock ensures only one seeds.

After changing routes or adding content, regenerate the sitemap:

```bash
python3 scripts/generate_sitemap.py --base-url https://www.aadrique.in
```

---

## 6. Reading enquiries

Enquiries are stored in the `enquiries` collection and emailed to `OWNER_EMAIL`.
To read them over the API:

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://aadrique.onrender.com/api/enquiries
curl -H "X-Admin-Token: $ADMIN_TOKEN" "https://aadrique.onrender.com/api/enquiries?limit=20&skip=20"
```

Treat the token like a password — anyone holding it can read all customer data.

---

## 7. Verifying a deploy

```bash
curl -s https://aadrique.onrender.com/api/health        # {"status":"ok","database":"ok","email":"enabled",...}
curl -s https://aadrique.onrender.com/api/services | head -c 200
curl -o /dev/null -w '%{http_code}\n' https://www.aadrique.in/capabilities/ai-consulting   # 200 (SPA fallback)
curl -o /dev/null -w '%{http_code}\n' https://aadrique.onrender.com/api/enquiries          # 401
curl -s https://www.aadrique.in/robots.txt
```

Run the API test suite against a running server:

```bash
cd backend && CONTACT_RATE_LIMIT=1000 ADMIN_TOKEN=test-token-long-enough-for-validation \
  ../.venv/bin/uvicorn server:app --port 8000 &
API_BASE_URL=http://127.0.0.1:8000 ADMIN_TOKEN=test-token-long-enough-for-validation \
  .venv/bin/pytest backend/tests -c backend/pytest.ini
```

`CONTACT_RATE_LIMIT` must be raised for the run, or the contact tests trip the
5-per-minute limiter.

---

## 8. Operations

```bash
sudo systemctl restart aadrique-api     # restart API
journalctl -u aadrique-api -f           # follow logs
sudo systemctl reload nginx             # after an nginx config change
```

**Backups** — the enquiry data is the only thing not reproducible from source:

```bash
mongodump --uri="$MONGO_URL" --db=aadrique --collection=enquiries --out=/backups/$(date +%F)
```

### Known limits

- **Rate limiting is per-process and in-memory.** With multiple uvicorn workers each
  keeps its own counter, so the effective limit is `CONTACT_RATE_LIMIT × workers`.
  Fine for a marketing site; move to Redis if it ever matters.
- **Owner notification delivery to `OWNER_EMAIL`** (currently `gunasanjaysagar.m@aadrique.in`)
  depends on that mailbox being active in Google Workspace and passing the provider's
  deliverability check — verify a test enquiry actually lands there. If it doesn't
  arrive, the auto-reply to the enquirer still delivers regardless (separate send).
- **CRA build-time env vars** mean the frontend must be rebuilt to change API host.
