<div align="center">

# 🎂 Birthday Surprise Website Template

**A private, cinematic birthday website you can personalise in minutes, with no code.**
Opening envelope · photo wall · story timeline · 20 reasons · sealed letters · password-protected vault · private journal · final surprise.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

[Try the demo](#-try-it-in-5-minutes-no-backend-no-database) ·
[Go live (free)](#-deploy-for-free) ·
[Full guide: INSTRUCTIONS.md](INSTRUCTIONS.md)

</div>

---

## ✨ What you get

| | |
|---|---|
| 💌 **Opening envelope** | A blurred photo background, wax seal and a gentle intro song |
| 🎉 **Birthday hero** | Animated name, rotating wishes, live countdown, a cake with candles to blow out |
| 🖼️ **Photo wall** | Masonry gallery with captions, dates and a full-screen lightbox |
| 📖 **Story timeline** | "How we became us", with dates, stories and photos |
| 🃏 **20 reasons** | Tap-to-flip cards |
| ✉️ **Letters** | A big paper letter plus three sealed "Open when…" letters and a future letter |
| 🔐 **Private vault** | Password-protected: private photos and videos, secret messages, diary notes, letters |
| 📓 **Her Heart journal** | A private journal the birthday person writes herself, **encrypted** in the database |
| 🛠️ **Admin Panel** | Edit **everything** from the browser. Nothing needs code. |
| 📱 **Mobile first** | Built to be opened on a phone |

> **Everything is a placeholder until you fill it in.** Every spot on the site says exactly which
> Admin Panel field controls it, with an example, e.g.
> `Edit in Admin Panel > Website text > Birthday message. Example: Today the world got a little brighter...`

## 🚀 Try it in 5 minutes (no backend, no database)

You only need [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/frontend
npm install
npm run demo        # opens http://localhost:5173
```

| | |
|---|---|
| Vault password | `demo-vault-2026` |
| Admin Panel | <http://localhost:5173/admin> |
| Admin login | `demo@example.com` / `demo-admin-1234` |

Demo mode runs entirely in your browser with generated placeholder pictures, a sample video and an original sample song.
It is **not secure** and uploads disappear on refresh. It exists so you can explore the design and the Admin Panel.

## 🧭 How it works

```
Browser ──▶ Frontend (React + Vite, Vercel) ──/api──▶ Backend (Express, Render) ──▶ MongoDB Atlas
                │
                └── /admin  → sign in and edit all text, photos, videos, music, letters
```

1. **Deploy** the three pieces (all have free tiers).
2. **Run the seed once** to create your admin account and vault password.
3. **Open `/admin`** and fill in the tabs. The public site updates immediately.

## 🌐 Deploy for free

| Part | Where | Root directory |
|---|---|---|
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0) | n/a |
| Backend | [Render](https://render.com) Web Service | `backend` |
| Frontend | [Vercel](https://vercel.com) (framework: Vite) | `frontend` |

**Short version**

```bash
# 1. backend
cd backend
cp .env.example .env     # fill MONGODB_URI, JOURNAL_ENCRYPTION_KEY, ADMIN_*, VAULT_PASSWORD
npm install
npm run seed             # creates starter content, admin account and vault password
npm run dev              # http://localhost:5000

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173  → sign in at /admin
```

For production, set `frontend/vercel.json` → replace `REPLACE-WITH-YOUR-RENDER-SERVICE` with your Render host.
The click-by-click version (with every environment variable) is in **[INSTRUCTIONS.md → A2](INSTRUCTIONS.md#a2-put-it-online-for-real-free)**.

> After seeding, delete `ADMIN_PASSWORD` and `VAULT_PASSWORD` from `.env`. Only bcrypt hashes are stored.
> **Back up `JOURNAL_ENCRYPTION_KEY`.** Lose it and saved journal entries are unreadable.

## 🎛️ Customise

| I want to change… | Where |
|---|---|
| Any text, name, birth date, wishes, reasons, future lists | **Admin Panel → Website text** |
| Opening / hero / final photos and the song | **Admin Panel → Photos & music** |
| Gallery photos, captions, dates | **Admin Panel → Gallery** |
| Story chapters | **Admin Panel → Timeline** |
| The five letters | **Admin Panel → Letters** |
| Private photos/videos, secrets, diary, letters | **Admin Panel → Private media / Private messages** |
| Vault password | **Admin Panel → Vault password** |
| Colours and fonts | `frontend/tailwind.config.js`, `frontend/index.html` |
| Fixed headings and button text | see [INSTRUCTIONS.md → B4](INSTRUCTIONS.md#b4-change-fixed-headings-and-button-text) |
| Starter text for new databases | `backend/services/defaults.js` |
| Link-preview image | `frontend/public/og-image.png` (1200×630) |

## 🔒 Security model

- **Vault password:** bcrypt (cost 12) hash in MongoDB. Never in frontend code, never returned by any API. Must not contain the birth date or just the name.
- **Sessions:** random 256-bit token in an `HttpOnly`, `Secure` (production), `SameSite=Strict` cookie. Only a SHA-256 of the token is stored server-side.
- **Expiry:** vault idle timeout 3 min, absolute 60 min. Admin idle 30 min, absolute 8 h. Closing or reloading the tab locks the vault.
- **CSRF:** Origin allow-list on every write, a per-session CSRF token, and SameSite cookies.
- **Brute force:** rate limiting per IP plus a global lockout after repeated failures; admin login is limited too.
- **Private media:** separate GridFS bucket, served only after session validation with `Cache-Control: private, no-store`. Uploads are sniffed by content, photos are re-encoded and stripped of EXIF/GPS.
- **Journal:** title and body are AES-256-GCM encrypted before they reach MongoDB. Only the `her` role can write.
- **Privacy:** `noindex` meta tag and `robots.txt` keep the site out of search engines.

### Honest limitations

- One shared password means the "I am …" / "I'm her person" choice on the lock screen is **self-declared**. Anyone who knows the password could pick either. For stronger separation, give the birthday person a separate password (needs a small backend change).
- The journal is encrypted at rest, but the server decrypts it for an unlocked session, and **you control the server and database**. It is a shared space by design.
- Private videos stream through your backend. Render's free tier sleeps, so the first request can take ~30 s. Use a paid instance for the big day.
- GridFS stores media in your Atlas cluster (free tier: 512 MB). For many videos use a bigger cluster or move media to private object storage behind signed URLs.
- Testing status: when this template was prepared, both frontend production builds (normal and demo) succeeded, every backend file passed a syntax check, and demo mode opened with working Admin login. The backend's end-to-end smoke test (`npm run smoke`) needs a running MongoDB and was not run here, so run it on your own setup before relying on the real backend.

## 🗂️ Project structure

```
.
├── frontend/        React 18 + Vite + Tailwind + Framer Motion + GSAP   (deploy to Vercel)
├── backend/         Express 4 + Mongoose + GridFS, Node 20+            (deploy to Render)
├── tools/           make_demo_assets.py → generates the placeholder media
├── INSTRUCTIONS.md  step-by-step guide for non-coders and coders
└── LICENSE
```

## 🧪 Useful commands

```bash
# frontend/
npm run demo         # demo mode, no backend
npm run dev          # real mode, talks to the backend
npm run build        # production build

# backend/
npm run dev          # API with auto-reload
npm run seed         # create missing starter content, admin and vault password
npm run smoke        # security smoke test against a running local API
```

## 🙌 Contributing

Issues and pull requests are welcome: new themes, translations, more section types, a separate password for the birthday person, S3/R2 media storage.
Please never commit real photos, `.env` files or personal letters.

## 📄 License

[MIT](LICENSE). Use it, remix it, give it as a gift. Only upload music, photos and videos you have the right to use.

<div align="center">Made with ♥ for the people who deserve a little world of their own.</div>
