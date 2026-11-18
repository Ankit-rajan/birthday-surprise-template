// DEMO MODE ONLY. A tiny in-browser stand-in for the backend so the whole site (vault, journal, admin) can be
// tried with just `npm run demo`: no server, no database. NOT secure and not for real use:
// the password check happens in the browser. Real use needs the backend (see README).
//
// Text edits and journal entries are kept in localStorage so they survive a refresh while you test.
// Files you upload in demo mode are only held in memory (they disappear on refresh).

import { ApiError } from './errors.js';
import {
  DEMO_CREDENTIALS,
  demoSite,
  demoGallery,
  demoTimeline,
  demoLetters,
  demoPrivateMedia,
  demoMessages,
  demoJournal,
} from '../demo/demoData.js';

const KEY = 'demo-db-v1';
const clone = (v) => JSON.parse(JSON.stringify(v));
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
let uid = 100;
const nextId = (p) => `${p}${(uid += 1)}`;

function fresh() {
  return {
    site: clone(demoSite),
    gallery: clone(demoGallery),
    timeline: clone(demoTimeline),
    letters: clone(demoLetters),
    privateMedia: clone(demoPrivateMedia),
    messages: clone(demoMessages),
    journal: clone(demoJournal),
    vaultPassword: DEMO_CREDENTIALS.vaultPassword,
  };
}

const isTemp = (u) => typeof u === 'string' && u.startsWith('blob:');

let db = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved?.site) {
    db = { ...fresh(), ...saved };
    db.gallery = db.gallery.filter((g) => !isTemp(g.url));
    db.privateMedia = db.privateMedia.filter((m) => !isTemp(m.url));
    db.timeline.forEach((t) => isTemp(t.photoUrl) && (t.photoUrl = null));
    ['intro', 'hero', 'final'].forEach((s) => isTemp(db.site.photos[s]) && (db.site.photos[s] = demoSite.photos[s]));
    if (isTemp(db.site.music.url)) db.site.music = clone(demoSite.music);
  }
} catch {
  /* storage unavailable: run in memory */
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

const session = { vault: null, admin: false };

const byDate = (a, b) => (a.date ? new Date(a.date).getTime() : Infinity) - (b.date ? new Date(b.date).getTime() : Infinity);
const needVault = () => {
  if (!session.vault) throw new ApiError(401, 'locked');
};
const needAdmin = () => {
  if (!session.admin) throw new ApiError(401, 'unauthenticated');
};
const lettersByKey = () => Object.fromEntries(db.letters.map((l) => [l.key, l]));
const objUrl = (file) => URL.createObjectURL(file);
const dim = (file) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve({ width: 0, height: 0 });
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = objUrl(file);
    return undefined;
  });

const adminContent = () => ({
  ...clone(db.site),
  reasons: Array.from({ length: 20 }, (_, i) => db.site.reasons[i] || ''),
});

export const demoApi = {
  async content() {
    await delay();
    const lk = lettersByKey();
    const pick = (k) => ({ title: lk[k]?.title || '', body: lk[k]?.body || '' });
    return {
      site: {
        ...clone(db.site),
        reasons: Array.from({ length: 20 }, (_, i) => db.site.reasons[i] || ''),
      },
      gallery: clone(db.gallery).sort(byDate),
      timeline: clone(db.timeline).sort(byDate),
      letters: {
        heart: pick('heart'),
        openWhen: ['open-when-miss', 'open-when-sad', 'open-when-hug'].map((key) => ({ key, ...pick(key) })),
        futureWife: pick('future-wife'),
      },
    };
  },

  vault: {
    async unlock(password, role) {
      await delay(350);
      if (password !== db.vaultPassword) throw new ApiError(401, 'Incorrect password');
      session.vault = { role };
      return { unlocked: true, role, csrfToken: 'demo', idleSeconds: 180 };
    },
    async lock() {
      session.vault = null;
      return { unlocked: false };
    },
    async heartbeat() {
      needVault();
      return { ok: true };
    },
    async overview() {
      await delay();
      needVault();
      const of = (kind) => clone(db.messages.filter((m) => m.kind === kind)).sort(byDate);
      return { media: clone(db.privateMedia).sort(byDate), secrets: of('secret'), diary: of('diary'), letters: of('letter') };
    },
    journal: {
      async list() {
        await delay();
        needVault();
        const entries = clone(db.journal).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return { entries: entries.map((e) => ({ ...e, edited: new Date(e.updatedAt) - new Date(e.createdAt) > 2000 })) };
      },
      async create({ title = '', body = '' }) {
        await delay(250);
        needVault();
        if (session.vault.role !== 'her') throw new ApiError(403, 'Not allowed for this role');
        if (!body.trim()) throw new ApiError(400, 'Please write something first.');
        const now = new Date().toISOString();
        const entry = { id: nextId('j'), title: title.trim(), body: body.trim(), createdAt: now, updatedAt: now };
        db.journal.push(entry);
        persist();
        return { entry: { ...entry, edited: false } };
      },
      async update(id, { title = '', body = '' }) {
        await delay(250);
        needVault();
        if (session.vault.role !== 'her') throw new ApiError(403, 'Not allowed for this role');
        const entry = db.journal.find((e) => e.id === id);
        if (!entry) throw new ApiError(404, 'Entry not found');
        if (!body.trim()) throw new ApiError(400, 'Please write something first.');
        Object.assign(entry, { title: title.trim(), body: body.trim(), updatedAt: new Date(Date.now() + 5000).toISOString() });
        persist();
        return { entry: { ...entry, edited: true } };
      },
      async remove(id) {
        await delay(200);
        needVault();
        if (session.vault.role !== 'her') throw new ApiError(403, 'Not allowed for this role');
        db.journal = db.journal.filter((e) => e.id !== id);
        persist();
        return { ok: true };
      },
    },
  },

  admin: {
    async me() {
      return session.admin ? { authenticated: true, email: DEMO_CREDENTIALS.adminEmail, role: 'admin', csrfToken: 'demo' } : { authenticated: false };
    },
    async login(email, password) {
      await delay(300);
      if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.adminEmail || password !== DEMO_CREDENTIALS.adminPassword) {
        throw new ApiError(401, 'Invalid email or password');
      }
      session.admin = true;
      return { authenticated: true, email: DEMO_CREDENTIALS.adminEmail, role: 'admin', csrfToken: 'demo' };
    },
    async logout() {
      session.admin = false;
      return { ok: true };
    },

    async getContent() {
      await delay();
      needAdmin();
      return adminContent();
    },
    async saveContent(data) {
      await delay(250);
      needAdmin();
      const { musicTitle, future, ...rest } = data;
      Object.assign(db.site, rest);
      if (musicTitle !== undefined) db.site.music.title = musicTitle;
      if (future) Object.assign(db.site.future, future);
      persist();
      return adminContent();
    },
    async setSitePhoto(slot, file) {
      await delay(300);
      needAdmin();
      db.site.photos[slot] = objUrl(file);
      persist();
      return adminContent();
    },
    async clearSitePhoto(slot) {
      needAdmin();
      db.site.photos[slot] = null;
      persist();
      return adminContent();
    },
    async setMusic(file) {
      await delay(300);
      needAdmin();
      db.site.music.url = objUrl(file);
      persist();
      return adminContent();
    },
    async clearMusic() {
      needAdmin();
      db.site.music.url = null;
      persist();
      return adminContent();
    },

    async list(resource) {
      await delay();
      needAdmin();
      switch (resource) {
        case 'gallery':
          return { items: clone(db.gallery).reverse() };
        case 'timeline':
          return { items: clone(db.timeline).sort(byDate).map((t) => ({ ...t, thumbUrl: t.photoUrl })) };
        case 'letters':
          return { items: clone(db.letters) };
        case 'private-media':
          return { items: clone(db.privateMedia).map((m) => ({ ...m, previewUrl: m.kind === 'image' ? m.thumbUrl : m.url })) };
        case 'private-messages':
          return { items: clone(db.messages).reverse() };
        default:
          throw new ApiError(404, 'Not found');
      }
    },
    async create(resource, fields, file) {
      await delay(400);
      needAdmin();
      if (resource === 'gallery') {
        if (!file) throw new ApiError(400, 'No file uploaded');
        const { width, height } = await dim(file);
        const url = objUrl(file);
        const item = { id: nextId('g'), url, thumbUrl: url, width, height, caption: fields.caption || '', date: fields.date || null };
        db.gallery.push(item);
        persist();
        return { item: clone(item) };
      }
      if (resource === 'private-media') {
        if (!file) throw new ApiError(400, 'No file uploaded');
        const kind = file.type.startsWith('video/') ? 'video' : 'image';
        const { width, height } = await dim(file);
        const url = objUrl(file);
        const item = { id: nextId('p'), kind, url, thumbUrl: kind === 'image' ? url : null, width, height, caption: fields.caption || '', date: fields.date || null };
        db.privateMedia.push(item);
        persist();
        return { item: { ...clone(item), previewUrl: kind === 'image' ? url : url } };
      }
      if (resource === 'timeline') {
        if (!fields.title?.trim()) throw new ApiError(400, 'A title is required');
        const item = { id: nextId('t'), title: fields.title.trim(), description: fields.description || '', date: fields.date || null, photoUrl: file ? objUrl(file) : null };
        db.timeline.push(item);
        persist();
        return { item: clone(item) };
      }
      throw new ApiError(404, 'Not found');
    },
    async createJson(resource, body) {
      await delay(250);
      needAdmin();
      if (resource !== 'private-messages') throw new ApiError(404, 'Not found');
      if (!body.body?.trim()) throw new ApiError(400, 'Please write a message');
      const item = { id: nextId('m'), kind: body.kind, title: body.title || '', body: body.body.trim(), date: body.date || null };
      db.messages.push(item);
      persist();
      return { item: clone(item) };
    },
    async update(resource, id, body) {
      await delay(200);
      needAdmin();
      const lists = { gallery: db.gallery, timeline: db.timeline, letters: db.letters, 'private-media': db.privateMedia, 'private-messages': db.messages };
      const item = lists[resource]?.find((x) => x.id === id);
      if (!item) throw new ApiError(404, 'Not found');
      Object.entries(body).forEach(([k, v]) => {
        if (v !== undefined) item[k] = k === 'date' && v === '' ? null : v;
      });
      persist();
      return { item: clone(item) };
    },
    async remove(resource, id) {
      await delay(200);
      needAdmin();
      const map = { gallery: 'gallery', timeline: 'timeline', 'private-media': 'privateMedia', 'private-messages': 'messages' };
      const key = map[resource];
      if (!key) throw new ApiError(404, 'Not found');
      db[key] = db[key].filter((x) => x.id !== id);
      persist();
      return { ok: true };
    },

    async changeVaultPassword(adminPassword, newPassword) {
      await delay(300);
      needAdmin();
      if (adminPassword !== DEMO_CREDENTIALS.adminPassword) throw new ApiError(403, 'Your admin password was not correct.');
      if (newPassword.length < 10) throw new ApiError(400, 'The vault password must be at least 10 characters.');
      if (/19[\s./_-]?11[\s./_-]?(20)?04|(20)?04[\s./_-]?11[\s./_-]?19|11[\s./_-]?19[\s./_-]?(20)?04/.test(newPassword)) {
        throw new ApiError(400, 'The vault password must not contain her date of birth.');
      }
      db.vaultPassword = newPassword;
      session.vault = null; // everyone inside gets locked
      persist();
      return { ok: true, message: 'Vault password changed.' };
    },
  },
};

export const resetDemo = () => {
  db = fresh();
  persist();
};
