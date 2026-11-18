# INSTRUCTIONS: how to use this template

This file explains **where every piece of content goes and how to put it there**.
It is written twice: **Part A is for non-coders** (you only click and type), **Part B is for coders** (you want to change the code).

> **The golden rule:** you never have to edit code to personalise this site.
> Every text, photo, video, song and letter is changed from the **Admin Panel** at `/admin`.
> Until you do, every spot on the site shows a line like `Edit in Admin Panel > Website text > ...`
> followed by an example, so you always know which field controls it.

---

## Contents

- [How it works in 60 seconds](#how-it-works-in-60-seconds)
- **Part A: no coding needed**
  - [A1. Try it on your computer in 5 minutes (demo mode)](#a1-try-it-on-your-computer-in-5-minutes-demo-mode)
  - [A2. Put it online for real (free)](#a2-put-it-online-for-real-free)
  - [A3. Fill in the content: the full field map](#a3-fill-in-the-content-the-full-field-map)
  - [A4. Photos, videos and music: formats and limits](#a4-photos-videos-and-music-formats-and-limits)
  - [A5. Passwords](#a5-passwords)
  - [A6. Checklist before you share the link](#a6-checklist-before-you-share-the-link)
- **Part B: for coders**
  - [B1. Project map](#b1-project-map)
  - [B2. Environment variables](#b2-environment-variables)
  - [B3. Change the look (colours, fonts)](#b3-change-the-look-colours-fonts)
  - [B4. Change fixed headings and button text](#b4-change-fixed-headings-and-button-text)
  - [B5. Change the starter text everyone gets](#b5-change-the-starter-text-everyone-gets)
  - [B6. Add a new section or field](#b6-add-a-new-section-or-field)
  - [B7. Scripts, tests and API](#b7-scripts-tests-and-api)
  - [B8. Publishing your fork on GitHub safely](#b8-publishing-your-fork-on-github-safely)
- [Troubleshooting](#troubleshooting)

---

## How it works in 60 seconds

```
Visitor's phone/laptop  ->  Frontend (React, on Vercel)  ->  Backend (Express, on Render)  ->  Database (MongoDB Atlas)
                                   |                                  ^
                                   +---- /admin  (you log in and edit everything)
```

- The **public page** shows: opening envelope, birthday hero, photo gallery, story timeline, 20 reasons, letters, "open when" letters, future section, a **password-protected vault**, and a final surprise.
- The **vault** ("Our Little Secret Place") is locked with a password you choose. Inside: private photos/videos, secret messages, diary notes, letters, and a private journal the birthday person can write in.
- The **Admin Panel** (`/admin`) is where you, the owner, sign in and add content. Nobody else can.

There are two ways to run it:

| Mode | Needs | Good for | Saves data? |
|---|---|---|---|
| **Demo mode** | Only Node.js | Looking around, testing the Admin Panel | Text edits stay in your browser; uploaded files vanish on refresh. **Not secure.** |
| **Real mode** | Node.js + MongoDB + hosting | The actual gift | Yes, in your own database. Secure. |

---

# Part A: no coding needed

## A1. Try it on your computer in 5 minutes (demo mode)

1. Install **Node.js 20 or newer** from <https://nodejs.org> (choose the "LTS" button).
2. Download this project (green **Code** button on GitHub > **Download ZIP**) and unzip it.
3. Open a terminal inside the `frontend` folder:
   - **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
   - **Mac:** right-click the folder > *New Terminal at Folder*.
4. Type these two commands, one at a time:
   ```bash
   npm install
   npm run demo
   ```
5. Open <http://localhost:5173> in your browser.

Demo logins (shown on screen as well):

| What | Value |
|---|---|
| Vault password | `demo-vault-2026` |
| Admin Panel | <http://localhost:5173/admin> |
| Admin email | `demo@example.com` |
| Admin password | `demo-admin-1234` |

The placeholder pictures are plain colour cards that say **where each photo goes** (for example *"Gallery photo 3 - Admin Panel > Gallery"*).

## A2. Put it online for real (free)

You need four free accounts: **GitHub**, **MongoDB Atlas** (database), **Render** (backend), **Vercel** (website).
Do the steps in this order.

### Step 1: Put the code on your own GitHub
1. Create a **private** repository on GitHub (private is recommended for a personal gift).
2. Upload this project to it (GitHub Desktop, or drag-and-drop in the browser).
3. **Never upload a file called `.env`.** Only `.env.example` belongs on GitHub. (The `.gitignore` already protects you if you use Git.)

### Step 2: Create the database (MongoDB Atlas)
1. Sign up at <https://www.mongodb.com/atlas>, create a free **M0** cluster.
2. **Database Access** > add a database user (username + password, save them).
3. **Network Access** > add IP address `0.0.0.0/0` (allow from anywhere; fine for getting started).
4. **Connect** > *Drivers* > copy the connection string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/birthday-surprise`
   Replace `USER` and `PASSWORD` with the ones from step 2. Keep it secret.

### Step 3: Deploy the backend (Render)
1. <https://render.com> > **New** > **Web Service** > connect your GitHub repo.
2. Settings: **Root Directory** `backend`, **Build Command** `npm install`, **Start Command** `npm start`.
3. Add these **Environment Variables** (see [B2](#b2-environment-variables) for what each means):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | the string from Step 2 |
   | `JOURNAL_ENCRYPTION_KEY` | a long random key (generate below) |
   | `FRONTEND_URL` | your Vercel URL from Step 4, e.g. `https://my-gift.vercel.app` (set it after Step 4, then redeploy) |
   | `TRUST_PROXY` | `2` |
   | `COOKIE_SAMESITE` | `strict` |

   Generate the encryption key on any computer with Node installed:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   **Back this key up somewhere safe.** If you lose it, saved journal entries can never be read again.
4. Deploy. Copy the service address, e.g. `my-gift-api.onrender.com`.

### Step 4: Deploy the website (Vercel)
1. In your repo, open `frontend/vercel.json` and replace `REPLACE-WITH-YOUR-RENDER-SERVICE` with your Render address (just the part before `.onrender.com`). Commit the change.
2. <https://vercel.com> > **Add New Project** > pick the repo > **Root Directory** `frontend` > Framework **Vite** > Deploy.
3. Copy your Vercel URL and put it into Render as `FRONTEND_URL` (Step 3), then redeploy the backend.

### Step 5: Create your admin account and vault password (one time)
In the Render dashboard open your service > **Shell**, set the three temporary variables and run the seed:

```bash
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-admin-password" VAULT_PASSWORD="our-secret-phrase-123" npm run seed
```

- Admin password: at least **12** characters.
- Vault password: at least **10** characters, and it **cannot contain the birth date or be just the name**.
- Passwords are stored only as hashes. Don't leave them in any `.env` file afterwards.

### Step 6: Open your site
- Public site: `https://your-site.vercel.app`
- Admin Panel: `https://your-site.vercel.app/admin`

Render's free plan "sleeps" after inactivity, so the first load can take about 30 seconds. For the big day, wake it up a few minutes before, or use a paid instance.

## A3. Fill in the content: the full field map

Sign in at `/admin`. Work through the tabs **left to right**. The first column tells you what you are looking at on the site.

### Tab 1: Website text

| You see on the site | Admin field | What to write | Example |
|---|---|---|---|
| Browser tab title, menu top-left | **Website name** | The site's title | `A Little World Made For You` |
| Big animated name, envelope, cake song, footer, "I am ..." button | **Birthday person's name** | Her/his first name or nickname | `Asha` |
| Age on the cake + countdown to the next birthday | **Birth date** | `YYYY-MM-DD` | `2000-01-31` |
| Signature at the bottom of letters | **Your name** | How you sign | `Rohan` |
| Opening screen, big text | **Opening heading** | One emotional line | `For the one who makes my world beautiful.` |
| Opening screen, smaller text | **Opening subtitle** | A teaser | `I made something special just for you.` |
| Home screen paragraph under the name | **Birthday message** | 2 to 4 sentences | `Today the world got a little brighter...` |
| Rotating lines on the home screen | **Birthday wishes** | **One wish per line** (max 12) | `May this year be gentle with you.` |
| Text above the birthday cake | **Make-a-wish prompt** | Instruction | `Close your eyes and think of something you want.` |
| Text shown after blowing out the candles | **Message after blowing out candles** | A reply to the wish | `Whatever you wished for, I hope it comes true.` |
| Last section, quote | **Final quote** | One line | `If I could choose again, I would still choose you.` |
| Last section, headline | **Final message** | Short | `Happy Birthday!` |
| Song name in the music player | **Song title** | Title of your song | `Our Song` |
| 20 flip cards "Why I love you" | **Reason 1 ... Reason 20** | One short sentence each | `Your laugh.` |
| "Our future" section, four lists | **Places / Dreams / Promises / Future memories** | **One item per line** | `A quiet town by the sea` |

Press **Save all** at the bottom. Refresh the public page to see it.
Empty reasons show *"Coming soon"*, so you can fill them gradually.

### Tab 2: Photos & music

| Slot | Where it appears | Tip |
|---|---|---|
| **Opening screen background** | Blurred behind the envelope | A calm, wide-ish photo |
| **Birthday portrait** | Large arch-shaped photo on the home screen | Portrait orientation (4:5) works best |
| **Final surprise photo** | Last section | Your favourite photo together |
| **Background music** | Plays after the visitor taps "Open your surprise" | MP3, M4A or OGG, up to 20 MB. Only use music you own or have a licence for. |

### Tab 3: Gallery (public photo wall)
Choose one or many photos, type a **caption** (shown under the photo) and a **date**, then upload.
After upload you can change each caption/date or delete a photo. Captions apply to everything uploaded in that batch, so upload photos with similar captions together, or edit them afterwards.
Example caption: `Our first trip, Goa`.

### Tab 4: Timeline ("How we became us")
For each chapter fill: **Title**, **Date** (optional), **The story**, and an optional **photo**.
Chapters are sorted by date; undated chapters go to the end.
Example: Title `The day we met`, Date `2023-06-14`, Story `It was raining and you...`.

### Tab 5: Letters
Five fixed letters. You edit the **title** and the **text** of each, but not how many there are:

| Letter | Where it shows |
|---|---|
| **A Letter From My Heart** | The big paper letter in the "For you" section |
| **Open when you miss me** | Sealed letter card in "Read this when" |
| **Open when you feel sad** | Same section |
| **Open when you need a hug** | Same section |
| **To My Future Wife** | End of the "Our future" section (rename it freely, e.g. *To my future husband*) |

Tip: write in your own voice and press Enter for new paragraphs; line breaks are kept.

### Tab 6: Private media (inside the vault only)
Private photos and videos. They are **only** shown after the vault is unlocked and are never public.
Add a caption and date as in the Gallery.

### Tab 7: Private messages (inside the vault only)
Choose the **type**, then write a title, date (optional) and the message:

| Type | Where it shows in the vault | Example |
|---|---|---|
| **Secret message** | Tap-to-reveal cards | `I smile every time I think of you.` |
| **Diary note** | Dated diary pages | `10 Sept: a quiet evening that I want to remember.` |
| **Letter for her** | Letters to open on a special day (set a future date) | `For your next birthday...` |

### Tab 8: Vault password
Change the shared vault password here any time. You must type your admin password first. Changing it logs everybody out of the vault.

> **What is "Her Heart"?** It is a private journal inside the vault. The birthday person unlocks the vault, picks **"I am (name)"**, and can write entries. You, picking **"I'm her person"**, can read them but not edit them. Entries are encrypted in the database. There is nothing to fill in for it in the Admin Panel.

## A4. Photos, videos and music: formats and limits

| Type | Accepted formats | Max size | Notes |
|---|---|---|---|
| Photo | JPG, PNG, WebP | 25 MB | Re-encoded and location data (GPS) is removed automatically |
| Video (vault only) | MP4, MOV, WebM | 200 MB | Streams through your backend; MP4 (H.264) plays everywhere |
| Music | MP3, M4A, OGG | 20 MB | One song for the whole site |

Free MongoDB Atlas gives **512 MB** storage in total, shared by every photo, video and song. For lots of videos, resize them first or use a bigger cluster.

Optional extras:
- **Spoken wish:** after the candles go out the browser says "Happy birthday ...". To use your own voice recording, save it as `frontend/public/music/wish-voice.mp3`.
- **Link preview image** (what WhatsApp shows when you share the link): replace `frontend/public/og-image.png` with your own 1200x630 image.

## A5. Passwords

| Password | Who uses it | Rules |
|---|---|---|
| **Admin password** | Only you, at `/admin` | 12+ characters |
| **Vault password** | You and the birthday person, on the lock screen | 10+ characters, not the birth date, not just the name. A phrase you both remember works well, e.g. `blue-moon-garden-7` |

The vault locks itself after **3 minutes** of no activity, when you press *Lock again*, and when the tab is closed or refreshed.

## A6. Checklist before you share the link

- [ ] Opened the live site on a **real phone** and tapped through everything
- [ ] Every `Edit in Admin Panel ...` text is gone (search the page for the word "Admin")
- [ ] Name and birth date are correct (the age on the cake is right)
- [ ] All 20 reasons are filled in (or you are happy with "Coming soon")
- [ ] All 5 letters are written in your own words
- [ ] Gallery, hero photo, final photo and song uploaded
- [ ] Vault opens with the right password, and wrong passwords are refused
- [ ] Journal encryption key is **backed up**
- [ ] Render service is awake (open the site a few minutes before gifting)

---

# Part B: for coders

## B1. Project map

```
.
├── README.md                  GitHub landing page
├── INSTRUCTIONS.md            this file
├── LICENSE
├── tools/make_demo_assets.py  generates the placeholder photos/video/song + og-image
├── frontend/                  React 18 + Vite 5 + Tailwind 3 + Framer Motion + GSAP
│   ├── index.html             <title>, meta tags, Google Fonts
│   ├── vercel.json            /api rewrite to Render + security headers (edit the Render host!)
│   ├── tailwind.config.js     colours, fonts, shadows
│   ├── public/                favicon, robots.txt, og-image.png, demo/ (placeholders), music/
│   └── src/
│       ├── pages/             Home.jsx (public page), Admin.jsx (dashboard + login), NotFound.jsx
│       ├── components/        one file per section (Hero, Gallery, Timeline, Reasons, ...)
│       │   ├── admin/         one file per Admin tab
│       │   └── vault/         lock screen, unlocked vault, private media/messages, journal
│       ├── hooks/             useContent, useBirthday (age + countdown), VaultContext, useTypewriter
│       ├── services/          api.js (real API), mockApi.js (demo mode), errors.js
│       ├── demo/demoData.js  sample content used only in demo mode
│       └── utils/             sound.js (background song + synthesized effects), format.js
└── backend/                   Express 4 + Mongoose, ES modules, Node 20+
    ├── server.js, config/     app boot, env validation, DB connection
    ├── routes/                public.js, vault.js, admin.js
    ├── controllers/           publicController, vaultController, adminController, journalController
    ├── models/                SiteContent, Letter, TimelineEntry, GalleryMemory, MediaAsset,
    │                          PrivateMedia, PrivateMessage, JournalEntry, Session, AdminUser, VaultConfig
    ├── middleware/            auth, csrf, rateLimit, security (helmet/CORS), upload, errors
    ├── services/              content.js, media.js (GridFS), sessions.js, crypto.js, defaults.js
    ├── scripts/               seed.js, smoke-test.js
    └── utils/                 passwordPolicy.js, httpError.js
```

**Demo mode** (`npm run demo` = `vite --mode demo`, sets `VITE_DEMO=true`) swaps `services/api.js` for `services/mockApi.js`, an in-browser fake backend. Nothing in `backend/` runs.

## B2. Environment variables

**`backend/.env`** (copy from `.env.example`; never commit it)

| Variable | Default / example | Meaning |
|---|---|---|
| `NODE_ENV` | `development` / `production` | Production enables secure cookies |
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/birthday-surprise` | Local MongoDB or an Atlas string |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed origin(s), comma-separated, no trailing slash. Used for CORS and CSRF origin checks |
| `TRUST_PROXY` | `0` locally, `2` on Vercel + Render | Number of reverse proxies in front of the API |
| `COOKIE_SAMESITE` | `strict` | Keep `strict`; works because Vercel proxies `/api` |
| `COOKIE_SECURE` | true in production | Override only if you know why |
| `VAULT_IDLE_SECONDS` | `180` | Vault auto-lock |
| `VAULT_MAX_MINUTES` | `60` | Vault absolute session limit |
| `ADMIN_IDLE_MINUTES` / `ADMIN_MAX_HOURS` | `30` / `8` | Admin session limits |
| `JOURNAL_ENCRYPTION_KEY` | `openssl rand -base64 32` | AES-256-GCM key for journal entries. **Back it up** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VAULT_PASSWORD` | | Read **only by `npm run seed`**; remove after seeding |

**`frontend/.env.*`**: `VITE_API_BASE` (leave empty; the app calls `/api` on its own origin), `VITE_DEV_API` (where Vite proxies `/api` in dev, default `http://localhost:5000`), `VITE_DEMO` (set by `.env.demo`).

## B3. Change the look (colours, fonts)

- **Colours / fonts / shadows:** `frontend/tailwind.config.js` (`burgundy`, `gold`, `ivory`, `blush`, `midnight`; fonts Cormorant Garamond, Great Vibes, Caveat, Jost).
- **Load different Google Fonts:** `<link href="https://fonts.googleapis.com/css2?...">` in `frontend/index.html`, then update `fontFamily` in the Tailwind config. If you change font hosts, also update the CSP in `frontend/vercel.json`.
- **Global component classes** (`btn-gold`, `btn-ghost`, `field`, `eyebrow`, `section-pad`): `frontend/src/index.css`.
- **Favicon / theme colour / meta description / social tags:** `frontend/public/favicon.svg`, `frontend/index.html`.
- **Placeholder art:** edit palettes and labels in `tools/make_demo_assets.py`, then run `python3 tools/make_demo_assets.py` (needs Pillow, NumPy, ffmpeg).

## B4. Change fixed headings and button text

These strings are **in the code**, not in the Admin Panel. They are generic on purpose; change them if your theme is not romantic (friend, parent, sibling, ...).

| Text | File |
|---|---|
| Menu labels (*Our world, Our story, Reasons, ...*) | `frontend/src/components/NavBar.jsx` |
| *Happy birthday, my love!* eyebrow, *Make a wish, my love.* | `frontend/src/components/Hero.jsx` |
| Gallery heading + subtitle | `components/Gallery.jsx` |
| Timeline heading + subtitle | `components/Timeline.jsx` |
| Reasons heading, subtitle, "Coming soon" | `components/Reasons.jsx` |
| Letter section heading, "Tap to open", signature | `components/HeartLetter.jsx` |
| "Read this when" heading, "Break the seal" | `components/OpenWhen.jsx` |
| Future heading, the four list titles | `components/Future.jsx` |
| Vault title/tagline, "Who is opening it?", wrong-password message | `components/vault/LockScreen.jsx` |
| Vault tab names (*Her heart*, ...) | `components/vault/UnlockedVault.jsx` |
| Journal wording | `components/vault/HerHeart.jsx` |
| Footer *Made with love, for {name}* | `pages/Home.jsx` |
| Admin tab names | `pages/Admin.jsx` (`TABS` array) |
| Admin field labels | `components/admin/ContentTab.jsx` (`TEXT_FIELDS`) |

## B5. Change the starter text everyone gets

The text that fills a **new** database comes from `backend/services/defaults.js` (`DEFAULT_SITE`, `DEFAULT_LETTERS`, `DEFAULT_TIMELINE`). It is written on the **first** `npm run seed` and **never overwrites** later edits. To re-apply new defaults to an existing database, edit the content in the Admin Panel or drop the collection and reseed.

Demo mode has its own copy in `frontend/src/demo/demoData.js`. Keep both in sync if you change one.

## B6. Add a new section or field

**A new editable text field** (example: `anniversaryNote`):
1. `backend/services/defaults.js` > add a default in `DEFAULT_SITE`.
2. `backend/models/SiteContent.js` > add the field to the schema.
3. `backend/services/content.js` > include it in `buildPublicContent()` (`site: { ... }`).
4. `backend/controllers/adminController.js` > add it to `adminContent()` and to `contentSchema` (zod, with a max length).
5. `frontend/src/components/admin/ContentTab.jsx` > add `['anniversaryNote', 'Label', multiline]` to `TEXT_FIELDS`.
6. `frontend/src/demo/demoData.js` (`demoSite`) so demo mode has it too. `mockApi.js` already saves any extra field generically.
7. Read it as `site.anniversaryNote` in your component.

**A new public section:** create `frontend/src/components/MySection.jsx`, add it to the `<main>` block of `pages/Home.jsx`, and add an `['id', 'Label']` entry to `NavBar.jsx`.

## B7. Scripts, tests and API

```bash
# backend/
npm run dev      # node --watch
npm start
npm run seed     # creates missing starter content, admin, vault password
npm run seed -- --reset-admin     # reset admin password from env
npm run seed -- --reset-vault     # reset vault password from env
npm run check    # syntax check of server.js
npm run smoke    # end-to-end security checks against a running local API

# frontend/
npm run dev | build | preview
npm run demo | build:demo
```

Smoke test:
```bash
VAULT_PASSWORD='...' ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run smoke
# optional: SLOW=1 (idle expiry, ~4 min), RATE_LIMIT_TEST=1 (locks your IP out for ~10 min)
```

API overview (all under `/api`):

| Area | Endpoints |
|---|---|
| Public | `GET /content`, `GET /media/:id` (refuses private assets) |
| Vault | `POST /vault/unlock`, `POST /vault/lock`, `GET /vault/session`, `POST /vault/heartbeat`, `GET /vault/overview`, `GET /vault/media/:id`, `GET/POST/PUT/DELETE /vault/journal` (writes need the `her` role) |
| Admin | `/admin/login`, `/admin/logout`, `/admin/me`, content, site photos/music, gallery, timeline, letters, private media, private messages, vault password (cookie session + CSRF token on every write) |

Security model in brief: bcrypt-hashed passwords, random 256-bit session tokens in `HttpOnly` + `SameSite=Strict` cookies (only a SHA-256 of the token is stored), per-session CSRF token plus an Origin allow-list, rate limiting and lockout on unlock/login, private media in a separate GridFS bucket behind session checks, uploads sniffed by content and re-encoded, journal encrypted with AES-256-GCM. See the README for the honest limitations (the shared vault password means the "her/him" choice is self-declared).

## B8. Publishing your fork on GitHub safely

Before every public push:

- [ ] `git status` shows **no** `.env` (only `.env.example` / `.env.demo` are tracked)
- [ ] No real names, photos, videos, songs, letters or Render/Vercel URLs left (`git grep -i "yourname"`)
- [ ] `frontend/vercel.json` still has the `REPLACE-WITH-YOUR-RENDER-SERVICE` placeholder in the public repo (put your real host in your private deployment repo, or in Vercel's project settings)
- [ ] You started from a **fresh** `git init` (old history can still contain deleted secrets and personal files)
- [ ] If a secret was ever committed: **rotate it** (new Mongo password, new encryption key, new admin/vault passwords); deleting the file is not enough
- [ ] Music in the repo is only music you may redistribute

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Install Node.js 20+ from nodejs.org, then reopen the terminal |
| Demo page is blank | Run `npm install` first; make sure you ran the commands inside `frontend/` |
| "The little world is taking a nap" | The frontend can't reach the backend. Check `vercel.json` host, that Render is awake and `FRONTEND_URL` matches your site URL exactly |
| Admin login always fails | Re-run the seed with `--reset-admin`; check you are using the email from `ADMIN_EMAIL` |
| Vault says "has not been set up yet" | Run `npm run seed` once with `VAULT_PASSWORD` set |
| Vault password rejected when changing | It must be 10+ chars, not the birth date, not just the name |
| Journal entries unreadable after redeploy | `JOURNAL_ENCRYPTION_KEY` changed. Restore the original key |
| Upload fails | Check format and size limits in [A4](#a4-photos-videos-and-music-formats-and-limits) |
| First load takes ~30 s | Render free tier was asleep; open the site a few minutes early |
| Music does not start | Browsers need a tap first; the song starts when the visitor taps "Open your surprise" |
| Changed text but site looks the same | Hard refresh (Ctrl+Shift+R), or check you pressed **Save all** |
