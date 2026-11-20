# Multi-user platform: technical reference

The single-site template is now a multi-tenant product: many customers, each with a private workspace, dashboard and
public link (`/birthday/<link-name>`), plus a separate platform-owner console.

## Who is who

| Role | Collection | Cookie (path) | API | Can do |
|---|---|---|---|---|
| Visitor | none | none | `/api/birthday/:slug`, `/api/media/:id` | Open **published** pages. Unlock a page's vault with its password. |
| Customer | `users` | `user_sid` (`/api/app`) | `/api/app/*` | Manage **only their own** site, media, vault password and account. |
| Platform owner | `adminusers` | `admin_sid` (`/api/admin`) | `/api/admin/*` | List users, see counts, activate/deactivate. **No endpoint reads customer content.** |

A customer cannot become the platform owner by any data change: different collection, cookie, session type and route prefix.
The platform area is not linked from any customer or public page (`/platform`, `/admin` redirects there).

## Tenancy model

* Every content document carries `owner` (the customer's `_id`): `sitecontents`, `letters`, `timelineentries`,
  `gallerymemories`, `privatemedias`, `privatemessages`, `journalentries`, `mediaassets`, `vaultconfigs`.
* The owner id **only ever comes from the server-side session** (`req.user._id`). It is never read from a body, query or URL.
  Request bodies are validated with strict schemas, so a body containing `owner` is rejected (400).
* Every read/update/delete filters on `owner`. A record that belongs to someone else answers 404, the same as one that does not exist.
* Uploaded files are stamped with the owner, count against that owner's quota, and can only be attached to or deleted by them.
* Public routes resolve the tenant from the URL slug, and serve content only when the site is **published** and its owner is **active**.
  Unknown, unpublished and deactivated pages all return the same 404.
* A vault session records which site it unlocked; it is rejected on every other site, even in the same browser.

## Database schema changes

| Collection | Change |
|---|---|
| `users` | **new**: `name`, `email` (unique), `passwordHash` (bcrypt, `select:false`), `status` (`active`/`disabled`), lockout counters, `lastLoginAt`, hashed single-use reset token + expiry |
| `sitecontents` | `key:'main'` removed. Added `owner` (unique), `slug` (unique), `previousSlugs[]`, `published`, `publishedAt`, `settings.cake{theme,candles,showAge}`, `settings.effects{petals,confetti,celebrationSounds}` |
| `letters` | `owner` added. Unique index `key_1` replaced by unique `(owner, key)` |
| `vaultconfigs` | `key:'main'` removed. `owner` (unique): one vault password per site |
| `timelineentries`, `gallerymemories`, `privatemedias`, `privatemessages`, `journalentries`, `mediaassets` | `owner` added (required, indexed) |
| `sessions` | new type `user`; new `owner` field (which site a vault session belongs to) |
| `adminusers` | unchanged |

## API

**Public** (no login)
`GET /api/birthday/:slug` · `GET /api/media/:id` (only while the owner's page is published) ·
`POST /api/birthday/:slug/vault/unlock|lock` · `GET …/vault/session` · after unlock: `POST …/vault/heartbeat`, `GET …/vault/overview`,
`GET …/vault/media/:id`, `GET|POST …/vault/journal`, `PUT|DELETE …/vault/journal/:id` (`her` role writes)

**Customer** (`/api/app`; session + CSRF token + Origin check on every write)
`POST auth/register|login|logout|forgot-password|reset-password` · `GET auth/me` ·
`PUT account` · `PUT account/password` · `DELETE account` ·
`GET|PUT site` · `PUT site/settings` · `GET site/slug-available` · `PUT site/slug` · `POST site/publish|unpublish` · `POST site/starter` ·
`GET preview` · `GET media/:id` (owner's own files, any state) ·
`POST|DELETE site-photo/:slot` · `POST|DELETE music` ·
`gallery`, `timeline`, `private-media`, `private-messages` (list/create/update/delete) · `letters` (list/update) ·
`PUT|DELETE vault-password`

**Platform owner** (`/api/admin`)
`POST auth/login|logout` · `GET auth/me` · `GET stats` · `GET users?search&status&page&limit` · `PATCH users/:id/status`

## Security controls

* **Passwords**: bcrypt cost 12; policy: 10 to 72 bytes (bcrypt ignores more), not common, not the email or name. Unknown email and wrong password are indistinguishable (same response, uniform timing).
* **Sessions**: random 256-bit token in an `HttpOnly; Secure (prod); SameSite=Strict` cookie scoped to its own API prefix; only the SHA-256 hash is stored; sliding idle + absolute expiry; rotated on login; all of a user's sessions end on password change/reset, deactivation and deletion.
* **CSRF**: per-session token header on every write **and** an Origin allow-list check (login, register, reset included).
* **Rate limits**: login (per IP), registration, password reset, uploads, slug changes, vault unlock (per IP + site), public pages; plus per-account lockout (10 failures, 15 min).
* **Input**: strict zod schemas everywhere; request guard rejects `$`/`.`-prefixed keys (NoSQL operator injection) and strips control characters; React escapes all output.
* **Uploads**: type is decided by file *content* (magic bytes), not the name; images are re-encoded (metadata/EXIF removed); SVG/HTML/scripts refused; size limits per type; per-account quota (`MAX_USER_STORAGE_MB`); private files go in a separate GridFS bucket.
* **Secrets**: only in environment variables; production refuses to start without `JOURNAL_ENCRYPTION_KEY`. Hashes and tokens are `select:false` and never in a response.
* **Slugs**: 3 to 40 chars, `a-z0-9-`, reserved words blocked, unique at the database level; changing one keeps the old name reserved for the same owner and forwards it, so shared links cannot be hijacked.

## Testing performed (all on the final code)

| Suite | Result |
|---|---|
| `cd backend && npm test`: 52 integration tests against a real MongoDB 8.3 | **52 / 52 pass** |
| `python3 tools/e2e/browser_e2e.py`: headless Chromium through the real UI (landing, CTAs, demo, vault, register, dashboard, customize, publish, preview, public page, logout, platform) | **59 / 59 pass** |
| `python3 tools/e2e/mobile_audit.py`: 390 px phone width, 15 screens | no horizontal overflow, no broken images |
| `npm audit --omit=dev` (backend and frontend) | **0 vulnerabilities** (after upgrading multer 2, sharp 0.35, nodemailer 10, zod 4, react-router 7) |
| `npm run build` (frontend) | succeeds |
| Production-mode smoke (`NODE_ENV=production`) | cookie is `HttpOnly; Secure; SameSite=Strict`, HSTS on, foreign Origin refused (403), refuses to start without secrets |
| Legacy migration on a simulated old single-site database | dry-run, real run, re-run (idempotent), page then served at `/birthday/<slug>`, owner can log in |

Security scenarios covered by the 52 tests: duplicate/weak passwords; CSRF token + Origin; NoSQL injection; login/registration rate limits;
single-use and expiring reset tokens; User B reading, editing, deleting User A's gallery/timeline/letters/messages/media by ID (404 + data intact);
attacker-supplied `owner` (rejected/ignored); slug hijack; unpublished pages and their media hidden; vault cookie from site A useless on site B;
journal private per site and encrypted at rest; platform endpoints unreachable for customers and vice versa; platform user list contains no content;
deactivation signs out, hides the page and blocks login; disguised uploads (HTML/SVG/script/text as `.jpg`); storage quota; account deletion removes every document and file of that user and none of anyone else's.

## Known limitations (please read)

1. **Not deployed or tested against your real Atlas, Render or Vercel**, because deployments are manual by your rule. Everything was tested locally (Node 22, MongoDB 8.3). Use the checklist in `INSTRUCTIONS.md` after deploying.
2. **Storage**: files live in MongoDB GridFS. Atlas free tier is 512 MB total; with the default 100 MB quota a handful of heavy users fill it. For 100+ real users, use a paid Atlas tier, lower `MAX_USER_STORAGE_MB`, or move media to object storage (S3, Cloudflare R2, Cloudinary). That would be a follow-up change in `services/media.js`.
3. **Password-reset email needs SMTP**. Until `SMTP_URL` is configured, customers cannot reset a forgotten password in production (the link is deliberately never logged there).
4. **No email verification** and no payments/plans. Anyone can register (turn off with `REGISTRATION_OPEN=false`). Registering with an existing email reveals that it exists; rate limiting limits abuse.
5. **Rate limiting is in memory**: correct for one Render instance. With several instances, add a shared store (e.g. Redis).
6. **No 2FA** for the platform owner; the platform owner can deactivate users but not delete them or read their content (by design).
7. Demo pictures are **generated illustrations** (original artwork, no people), not photographs. The demo song is original synthesised audio. Customers must only upload music they have the right to use.
8. The journal key (`JOURNAL_ENCRYPTION_KEY`) is one key for the whole platform.
9. Tested in headless Chromium only (not Safari/Firefox); the sandbox had no internet, so the Google Fonts typography was not verified visually.
10. The old public URL `/` used to be the birthday page. It is now the marketing page; the migrated page lives at `/birthday/<slug>`. Links already shared must be re-sent.
11. "Surprise Studio" is a working brand name; change it in `frontend/src/brand.js`.
