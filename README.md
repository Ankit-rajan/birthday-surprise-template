# 🎂 Surprise Studio: multi-user birthday website builder

Customers register, build a private birthday surprise website (photos, timeline, letters, music, a cake to blow out, a secret
vault), publish it at `/birthday/<their-name>` and share the link. A separate platform-owner console manages accounts.

**Live frontend:** https://birthday-surprise-template-28t3.vercel.app/ · **API:** https://birthday-surprise-template.onrender.com/

| Start here | |
|---|---|
| [`INSTRUCTIONS.md`](INSTRUCTIONS.md) | local setup, environment variables, **migration of the existing database**, deployment checklist |
| [`docs/MULTI_USER_PLATFORM.md`](docs/MULTI_USER_PLATFORM.md) | architecture, schema, API, security model, test results, known limitations |

## What's in the product

* **Marketing site** (`/`): hero, features, how it works, demo preview, FAQ, footer; **live demo** (`/demo`) with fictional sample content, read-only.
* **Customers**: register / login / reset password · dashboard (My Dashboard, My Birthday Website, Customize, Preview, Account Settings) ·
  publish / unpublish · change the link name · cake theme & candles, petals, confetti, sounds, your own song.
* **Platform owner** (`/platform`): user list, counts, activate/deactivate. Never sees customers' private content.
* **Isolation**: every record is owned by one customer and every query is scoped to the logged-in customer.

## 🧩 Universal Birthday Surprise Builder

One engine, two modes. A customer picks **Love** (boyfriend, girlfriend, husband, wife, partner, fiancé, fiancée) or **Friendship** (best friend, bestie,
male/female best friend, childhood, school, college, long-distance, brother-like, sister-like) at sign-up and can change it later.

* **Features** (`/dashboard/features`): 49 ON/OFF switches in 8 categories, saved per customer. A switch that is off removes the section, its menu link and its
  content from the public page **and** from the API (the server never sends it). A feature is effective only if its own switch and every parent switch are on.
  Enable all / Disable all / Restore defaults are one click (with a confirmation).
* **Relationship** (Customize → Relationship): wording and starter text adapt to the mode. Switching mode shows exactly what would change; text you wrote yourself is
  **never replaced** unless you tick "also replace my text". Your theme is not changed; matching themes are only suggested.
* **Appearance** (Customize → Appearance): 10 theme presets + classic, 5 custom colours, 3 font styles, Restore default. Unsaved colour and wording changes appear
  instantly in the live preview; a low-contrast colour pair shows a warning.
* **Wording** (Customize → Wording): rewrite any label; empty means "use the suggested wording".
* **Page password** (Website → Passwords & privacy): optional lock for the whole page (feature "Page password protection"). Visitors see a lock screen; content and media are
  not served until the password is entered (rate limited, locks out after repeated failures).
* **Live preview**: the owner's page rendered by the *same* component as the published site, docked beside the form on wide screens, a "Live preview" button on phones. Unsaved appearance and wording show instantly; unsaved feature switches and relationship mode are rendered by the server through `POST /api/app/preview` (owner-only, CSRF-protected, never saved).
* **Mobile dashboard**: bottom navigation (Dashboard · Customize · Features · Preview · More) with safe-area support; the desktop sidebar is unchanged.
* **Public link**: single-line link with Copy, Share (Web Share API, WhatsApp fallback) and Open.

Existing romantic pages keep working unchanged: with no stored settings every switch uses its default and the classic burgundy look is used.

## ✨ What a customer builds

| | |
|---|---|
| 💌 **Opening envelope** | Blurred photo background, wax seal and a gentle intro |
| 🎉 **Birthday hero** | Animated name, rotating wishes, live countdown, a cake with candles to blow out (5 colour themes, 1 to 9 candles) |
| 🖼️ **Photo wall** | Masonry gallery with captions, dates and a full-screen lightbox |
| 📖 **Story timeline** | Dated chapters with stories and photos |
| 🃏 **20 reasons** | Tap-to-flip cards |
| ✉️ **Letters** | A paper letter, three sealed "Open when…" letters and a letter to the future |
| 🔐 **Private area** | Own password per page: private photos and videos, secret messages, diary notes, letters |
| 📓 **Shared journal** | A private journal written inside the private area, **encrypted** in the database |
| 🎛️ **Customize** | Cake, petals, confetti, celebration sounds and the background song |
| 📱 **Mobile first** | Built to be opened on a phone |

New accounts start with **guided, neutral hints** (never anyone else's content). Customers can optionally load the fictional
"Aanya & Aarav" sample *text* as a starting point.

## 🚀 Quick start

```bash
cd backend  && cp .env.example .env && npm install && npm run seed && npm run dev   # API :5000
cd frontend && cp .env.example .env && npm install && npm run dev                  # app :5173
```

Details, environment variables, **database migration** and the deployment checklist are in [`INSTRUCTIONS.md`](INSTRUCTIONS.md).

## 🗂️ Project structure

```
backend/
  app.js, server.js          Express app / entry
  models/                    User, SiteContent (per customer), Letter, Gallery, Timeline, Private*, Journal, MediaAsset, VaultConfig, Session, AdminUser
  routes/                    account.js (/api/app), platform.js (/api/admin), public.js (/api/birthday, /api/media)
  controllers/               accountController, siteController (all owner-scoped), platformController, publicController, vault/journal
  middleware/                auth (userAuth / adminAuth / vaultAuth / resolvePublicSite), csrf, rateLimit, sanitize, upload
  services/                  sessions, media (GridFS + quota), slug, workspace, content, starters/aanya.json
  scripts/                   seed.js (platform owner), migrate-to-multitenant.js
  tests/                     100 integration tests (npm test)
frontend/src/
  pages/                     Landing, Demo, PublicBirthday, AuthPages, dashboard/*, platform/*
  components/                BirthdaySite (shared by public / demo / preview), dashboard tabs, vault, site sections
  demo/                      fictional sample content + read-only demo vault
tools/                       make_sample_art.py (demo art), make_demo_assets.py (song), e2e/ (browser_e2e, mobile_audit, dashboard_ui)
docs/MULTI_USER_PLATFORM.md  architecture, API, security, test results, limitations
```

## 🔒 Security in one paragraph

bcrypt passwords, HttpOnly/Secure/SameSite=Strict session cookies scoped per area, CSRF token + Origin check on every write, rate limits and
lockouts, strict input validation, content-sniffed and re-encoded uploads with a per-account quota, owner-scoped queries with 404-for-foreign-records,
separate platform-owner identity that cannot read customer content, secrets only in environment variables. Full list and test results:
[`docs/MULTI_USER_PLATFORM.md`](docs/MULTI_USER_PLATFORM.md).

## 📄 License

See [`LICENSE`](LICENSE).
