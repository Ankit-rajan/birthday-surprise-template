# Setup, migration and deployment

Stack: React + Vite (Vercel) · Express + Mongoose (Render) · MongoDB Atlas.
Technical reference (schema, endpoints, security, test results, limitations): [`docs/MULTI_USER_PLATFORM.md`](docs/MULTI_USER_PLATFORM.md).

## 1. Run it locally

```bash
# MongoDB: a local mongod on 127.0.0.1:27017, or an Atlas connection string.

cd backend
cp .env.example .env            # then edit it (see the comments inside)
npm install
openssl rand -base64 32         # paste the result into JOURNAL_ENCRYPTION_KEY
# set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in .env, then create the platform owner:
npm run seed
npm run dev                     # API on http://localhost:5000

# new terminal
cd frontend
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173
```

* Landing page `/` · live demo `/demo` · sign up `/register` · customer dashboard `/dashboard`
* Platform owner console: `/platform` (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`). `/admin` redirects there.
* Forgot-password links are printed in the backend console while `NODE_ENV=development`.

## 2. Tests

```bash
cd backend && npm test                                # 52 tests; needs mongod (set TEST_MONGODB_URI to use another)
cd frontend && npm run build                          # production build

# Optional browser tests (pip install playwright && playwright install chromium):
# start the backend + `npm run dev`, seed the platform owner (owner@example.com / owner-passphrase-12345), then
python3 tools/e2e/browser_e2e.py
python3 tools/e2e/mobile_audit.py
```

## 3. Environment variables

**Render (backend)**: full commented list in `backend/.env.example`. Required in production:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas string (database name included) |
| `FRONTEND_URL` | `https://birthday-surprise-template-28t3.vercel.app` (add custom domains, comma-separated) |
| `TRUST_PROXY` | `2` |
| `JOURNAL_ENCRYPTION_KEY` | `openssl rand -base64 32`. **Back it up.** The existing value must be kept, or old journal entries become unreadable. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | platform owner (only needed when you run `npm run seed`) |

Strongly recommended: `SMTP_URL` + `MAIL_FROM` (password-reset email), `MAX_USER_STORAGE_MB`, `REGISTRATION_OPEN`.
New since the single-site version: `USER_IDLE_DAYS`, `USER_MAX_DAYS`, `REGISTRATION_OPEN`, `MAX_USER_STORAGE_MB`, `APP_URL`, `SMTP_URL`, `MAIL_FROM`.
`VAULT_PASSWORD` is **no longer used**: each customer sets their own private-area password.

**Vercel (frontend)**: nothing is required (`vercel.json` rewrites `/api/*` to Render). Optional footer details:
`VITE_CONTACT_EMAIL`, `VITE_INSTAGRAM_URL`, `VITE_YOUTUBE_URL`, `VITE_X_URL`, `VITE_GITHUB_URL`.
If your Render URL ever changes, update the `destination` and `connect-src` in `frontend/vercel.json`.

## 4. Migrate the existing single-site database (one time)

Your current Atlas database holds one website with no owner. The migration turns it into the first customer's workspace.

1. **Back up** the database first (Atlas → Backup, or `mongodump`).
2. From your own computer (Render's free tier has no shell), with the **Atlas** URI:

```bash
cd backend
npm install

# preview, changes nothing:
MONGODB_URI='mongodb+srv://…/yourdb' OWNER_PASSWORD='a-long-password-10+' \
  npm run migrate -- --owner-email you@example.com --owner-name "Your Name" --slug yourname --dry-run

# apply:
MONGODB_URI='mongodb+srv://…/yourdb' OWNER_PASSWORD='a-long-password-10+' \
  npm run migrate -- --owner-email you@example.com --owner-name "Your Name" --slug yourname

# create the platform-owner account (a different email from your customer account is recommended):
MONGODB_URI='mongodb+srv://…/yourdb' ADMIN_EMAIL=owner@yourdomain.com ADMIN_PASSWORD='a-long-admin-password' \
  JOURNAL_ENCRYPTION_KEY='<the same key as on Render>' npm run seed
```

It is safe to re-run. Add `--unpublished` to keep the migrated page private until you are ready. `OWNER_PASSWORD` is only used when the customer account does not exist yet.

What happens to your old data: the site, letters, timeline, gallery, private media/messages, journal entries and files all get your account as `owner`;
the old vault password becomes your page's private-area password; old `key_1` unique indexes are dropped; old sessions are cleared (everyone logs in again).

## 5. Deploy (manual)

Old and new versions are not compatible with each other, so expect a **short maintenance window**, and do steps 2 to 5 close together.

1. Back up Atlas. Set/update the Render environment variables (section 3).
2. Deploy the backend to Render. It will warn "legacy site document(s) have no owner" until you migrate. Expected.
3. Run the migration + seed (section 4).
4. Deploy the frontend to Vercel.
5. Verify:
   * `https://<backend>/api/health` → `{"ok":true}`
   * `https://<site>/` shows the landing page; `/demo` opens the demo
   * log in at `/login` with the migrated customer account → dashboard shows your old content; Preview works
   * `https://<site>/birthday/yourname` opens the page for a logged-out browser (if published)
   * register a second test account → its dashboard is empty and its page is separate
   * `/platform` → log in as platform owner, see both users
   * trigger "Forgot password" (needs SMTP) and confirm the email arrives

Existing shared links to `/` now show the marketing page. Send people the new `/birthday/<slug>` link.

## 6. Day-to-day

* Stop new sign-ups: `REGISTRATION_OPEN=false`.
* Deactivate a customer: `/platform` → Users → Deactivate (signs them out and takes their page offline; Reactivate restores it).
* Rotate the platform password: `ADMIN_PASSWORD=… npm run seed -- --reset-admin`.
* Regenerate demo art: `python3 tools/make_sample_art.py` (song: `tools/make_demo_assets.py`).
* After editing the sample text in `backend/services/starters/aanya.json`, copy it to `frontend/src/demo/aanya.json`.
