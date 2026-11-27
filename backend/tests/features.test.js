/**
 * Universal Birthday Surprise Builder: relationship modes, feature switches, appearance, page password.
 * Same approach as multitenant.test.js: the REAL app over HTTP against a REAL MongoDB (database `bst_test`, dropped first).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { Client, pngBuffer, fileForm, STRONG } from './helpers.js';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/bst_test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.TRUST_PROXY = '1';
process.env.MAX_USER_STORAGE_MB = '5';
process.env.JOURNAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

let server;
let base;
let mongoose;
let M;
let cfg;

async function newUser(name, email, extra = {}) {
  const c = new Client(base);
  const r = await c.post('/api/app/auth/register', { name, email, password: STRONG, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  c.csrf = r.json.csrfToken;
  c.slug = r.json.site.slug;
  c.id = r.json.user.id;
  c.email = email;
  return c;
}

const site = async (c) => (await c.get('/api/app/site')).json;
const publicPage = async (slug, client = new Client(base)) => (await client.get(`/api/birthday/${slug}`)).json;
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(64, 1)]);

before(async () => {
  const { connectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  const { ensureIndexes } = await import('../services/indexes.js');
  mongoose = (await import('mongoose')).default;
  M = {
    Site: (await import('../models/SiteContent.js')).SiteContent,
    Letter: (await import('../models/Letter.js')).Letter,
    Gallery: (await import('../models/GalleryMemory.js')).GalleryMemory,
    Timeline: (await import('../models/TimelineEntry.js')).TimelineEntry,
    Media: (await import('../models/MediaAsset.js')).MediaAsset,
  };
  cfg = await import('../services/siteConfig/siteConfig.js');
  await connectDB();
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
  await mongoose.disconnect();
});

describe('A. Shared configuration', () => {
  it('the backend and frontend copies of the shared config are identical', () => {
    for (const file of ['siteConfig.json', 'siteConfig.js']) {
      const a = fs.readFileSync(new URL(`../services/siteConfig/${file}`, import.meta.url), 'utf8');
      const b = fs.readFileSync(new URL(`../../frontend/src/config/siteConfig/${file}`, import.meta.url), 'utf8');
      assert.equal(a, b, `${file} differs between backend/services/siteConfig and frontend/src/config/siteConfig`);
    }
  });

  it('every dependency points at a real feature, there are no cycles and every spec category exists', () => {
    const keys = new Set(cfg.FEATURE_KEYS);
    for (const f of cfg.FEATURES) {
      for (const p of f.requires || []) assert.ok(keys.has(p), `${f.key} requires unknown ${p}`);
      assert.ok(cfg.CONFIG.categories.some((c) => c.id === f.category), `${f.key} has an unknown category`);
    }
    // a cycle would make effectiveFeatures return false for a feature that is switched on
    const all = Object.fromEntries(cfg.FEATURE_KEYS.map((k) => [k, true]));
    assert.ok(Object.values(cfg.effectiveFeatures(all)).every(Boolean));
    assert.equal(cfg.CONFIG.categories.length, 8);
  });

  it('every copy key exists for both relationship modes', () => {
    assert.deepEqual(Object.keys(cfg.CONFIG.copy.love).sort(), Object.keys(cfg.CONFIG.copy.friendship).sort());
  });

  it('dependencies are applied: a child is off when its parent is off', () => {
    const e = cfg.resolveFeatures({ music: false, hero: false, vault: false });
    assert.equal(e.backgroundMusic, false);
    assert.equal(e.musicControls, false);
    assert.equal(e.countdown, false);
    assert.equal(e.greeting, false);
    assert.equal(e.privatePhotos, false);
    assert.equal(e.secretMessages, false);
    assert.equal(e.journal, false);
    assert.equal(e.gallery, true);
  });
});

describe('B. Backward compatibility', () => {
  it('a legacy site (no relationship, features or appearance saved) renders exactly the romantic experience', async () => {
    const c = await newUser('Legacy Lara', 'legacy@example.com');
    await M.Site.collection.updateOne(
      { owner: new mongoose.Types.ObjectId(c.id) },
      { $unset: { relationship: '', features: '', appearance: '', copyOverrides: '' }, $set: { published: true } },
    );
    const page = await publicPage(c.slug);
    assert.equal(page.site.relationship.mode, 'love');
    assert.equal(page.site.relationship.type, 'partner');
    assert.equal(page.site.appearance.theme, null);
    for (const f of cfg.FEATURES) assert.equal(page.site.features[f.key], f.default, `${f.key} keeps its default`);
    assert.equal(page.letters.openWhen.length, 3);
    assert.equal(page.site.reasons.length, 20);
  });

  it('old Customize choices (petals off, age hidden) still apply until a switch is saved', async () => {
    const c = await newUser('Legacy Leo', 'legacyleo@example.com');
    await M.Site.collection.updateOne(
      { owner: new mongoose.Types.ObjectId(c.id) },
      { $set: { 'settings.effects.petals': false, 'settings.cake.showAge': false } },
    );
    const s = await site(c);
    assert.equal(s.content.features.petals, false);
    assert.equal(s.content.features.showAge, false);
    assert.equal(s.content.settings.effects.petals, false);
    assert.equal(s.content.settings.cake.showAge, false);
    // the old API still works and writes through to the new switches
    assert.equal((await c.put('/api/app/site/settings', { effects: { petals: true } })).status, 200);
    assert.equal((await site(c)).content.features.petals, true);
  });
});

describe('C. Relationship modes', () => {
  let c;
  before(async () => {
    c = await newUser('Mode Mia', 'mode@example.com');
  });

  it('new accounts start in Love Mode; registration can pick Friendship Mode with friendly starter text and a friendship theme', async () => {
    const s = await site(c);
    assert.deepEqual(s.content.relationship, { mode: 'love', type: 'partner' });
    assert.equal(s.content.appearance.theme, null);

    const f = await newUser('Friend Fay', 'friendfay@example.com', { relationshipMode: 'friendship', relationshipType: 'bestie' });
    const fs_ = await site(f);
    assert.deepEqual(fs_.content.relationship, { mode: 'friendship', type: 'bestie' });
    assert.match(fs_.content.heroMessage, /^Edit in My Dashboard/);
    assert.match(fs_.content.heroMessage, /friend|stories/i);
    assert.ok(cfg.themesFor('friendship').some((t) => t.id === fs_.content.appearance.theme));
    const letters = (await f.get('/api/app/letters')).json.items;
    assert.ok(letters.some((l) => l.title === 'To My Best Friend'));
    assert.ok(!JSON.stringify(letters).includes('My Forever'));
  });

  it('rejects an unknown mode, and a type that does not belong to the mode', async () => {
    assert.equal((await c.put('/api/app/site/relationship', { mode: 'family' })).status, 400);
    assert.equal((await c.put('/api/app/site/relationship', { mode: 'friendship', type: 'boyfriend' })).status, 400);
    assert.equal((await c.put('/api/app/site/relationship', { mode: 'love', type: 'bestie' })).status, 400);
    assert.equal((await c.put('/api/app/site/relationship', { mode: 'love', type: 'wife', owner: 'x' })).status, 400, 'extra keys are refused');
    assert.deepEqual((await site(c)).content.relationship, { mode: 'love', type: 'partner' });
  });

  it('changing only the type inside a mode never touches the text', async () => {
    const r = await c.put('/api/app/site/relationship', { mode: 'love', type: 'wife' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.content.relationship, { mode: 'love', type: 'wife' });
    assert.equal(r.json.change.modeChanges, false);
    assert.deepEqual(r.json.change.willReplace, []);
  });

  it('switching mode swaps starter text but keeps everything the customer wrote, and never touches uploads', async () => {
    const png = await pngBuffer();
    const g = await c.call('POST', '/api/app/gallery', { form: fileForm(png, 'a.png', 'image/png', { caption: 'Kept caption' }) });
    assert.equal(g.status, 201);
    assert.equal((await c.put('/api/app/site', { heroMessage: 'My own words, written by me.', finalMessage: 'Custom ending' })).status, 200);
    const letters = (await c.get('/api/app/letters')).json.items;
    const heart = letters.find((l) => l.key === 'heart');
    assert.equal((await c.put(`/api/app/letters/${heart.id}`, { title: 'My own letter title', body: 'Dear you, this is mine.' })).status, 200);

    const dry = await c.put('/api/app/site/relationship', { mode: 'friendship', type: 'best-friend', dryRun: true });
    assert.equal(dry.status, 200);
    assert.equal(dry.json.dryRun, true);
    assert.ok(dry.json.keepsCustom.includes('heroMessage'));
    assert.ok(dry.json.keepsCustom.includes('letter:heart'));
    assert.ok(dry.json.willReplace.includes('introHeading'));
    assert.deepEqual((await site(c)).content.relationship, { mode: 'love', type: 'wife' }, 'a dry run saves nothing');

    const r = await c.put('/api/app/site/relationship', { mode: 'friendship', type: 'best-friend' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.content.relationship, { mode: 'friendship', type: 'best-friend' });
    assert.equal(r.json.content.heroMessage, 'My own words, written by me.');
    assert.equal(r.json.content.finalMessage, 'Custom ending');
    assert.match(r.json.content.finalQuote, /Friends like you/);
    assert.match(r.json.content.introSubtitle, /Best Friend/);
    const after = (await c.get('/api/app/letters')).json.items;
    assert.equal(after.find((l) => l.key === 'heart').body, 'Dear you, this is mine.');
    assert.equal(after.find((l) => l.key === 'open-when-miss').title, 'Open when you miss me');
    assert.match(after.find((l) => l.key === 'open-when-sad').title, /rough day/);
    assert.equal((await c.get('/api/app/gallery')).json.items[0].caption, 'Kept caption', 'uploads are preserved');
    assert.ok(r.json.change.suggestedThemes.includes('sky-blue'));
    assert.equal(r.json.content.appearance.theme, null, 'the theme is only suggested, never silently changed');
  });

  it('switching back restores the romantic starter text, still keeping custom text', async () => {
    const r = await c.put('/api/app/site/relationship', { mode: 'love', type: 'girlfriend' });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.heroMessage, 'My own words, written by me.');
    assert.match(r.json.content.finalQuote, /choose you/);
    assert.ok(!/friend/i.test(r.json.content.afterWishMessage));
  });

  it('overwriteCustom replaces custom text only when explicitly confirmed', async () => {
    const r = await c.put('/api/app/site/relationship', { mode: 'friendship', type: 'bestie', overwriteCustom: true });
    assert.equal(r.status, 200);
    assert.match(r.json.content.heroMessage, /^Edit in My Dashboard/);
    assert.equal((await c.get('/api/app/gallery')).json.items.length, 1, 'photos are still there');
  });
});

describe('D. Feature switches: persistence, validation and presets', () => {
  let c;
  before(async () => {
    c = await newUser('Switch Sam', 'switch@example.com');
  });

  it('saves switches in MongoDB and they survive logout and a new session', async () => {
    const r = await c.put('/api/app/site/features', { features: { gallery: false, countdown: false, cake: false } });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.featuresRaw.gallery, false);
    const stored = await M.Site.findOne({ owner: c.id }).lean();
    assert.equal(stored.features.gallery, false);
    assert.equal(stored.features.countdown, false);
    assert.equal(stored.features.hero, undefined, 'untouched switches stay unset, so registry defaults can evolve');

    await c.post('/api/app/auth/logout');
    const again = new Client(base);
    const login = await again.post('/api/app/auth/login', { email: c.email, password: STRONG });
    assert.equal(login.status, 200);
    again.csrf = login.json.csrfToken;
    const s = await site(again);
    assert.equal(s.content.features.gallery, false);
    assert.equal(s.content.features.cake, false);
    assert.equal(s.content.features.candles, false, 'candles depend on the cake');
    assert.equal(s.content.featuresRaw.candles, true, 'the customer\'s own candle switch is remembered');
    again.id = c.id;
    again.slug = c.slug;
    again.email = c.email;
    c = again;
  });

  it('rejects unknown features, non-boolean values and mass-assignment attempts', async () => {
    assert.equal((await c.put('/api/app/site/features', { features: { notAFeature: true } })).status, 400);
    assert.equal((await c.put('/api/app/site/features', { features: { gallery: 'yes' } })).status, 400);
    assert.equal((await c.put('/api/app/site/features', { features: { gallery: true }, owner: '000000000000000000000000' })).status, 400);
    assert.equal((await c.put('/api/app/site/features', { features: { gallery: true }, published: true, slug: 'hacked-slug' })).status, 400);
    assert.equal((await c.put('/api/app/site/features', {})).status, 400);
    assert.equal((await c.put('/api/app/site/features', { preset: 'everything' })).status, 400);
    const stored = await M.Site.findOne({ owner: c.id }).lean();
    assert.notEqual(stored.slug, 'hacked-slug');
    assert.equal(stored.published, false);
  });

  it('Disable All, Enable All and Restore Defaults', async () => {
    let r = await c.put('/api/app/site/features', { preset: 'none' });
    assert.ok(Object.values(r.json.content.features).every((v) => v === false));
    r = await c.put('/api/app/site/features', { preset: 'all' });
    assert.ok(Object.values(r.json.content.features).every((v) => v === true));
    r = await c.put('/api/app/site/features', { preset: 'defaults' });
    for (const f of cfg.FEATURES) assert.equal(r.json.content.featuresRaw[f.key], f.default, f.key);
    assert.equal(r.json.content.features.fireworks, false);
    assert.equal(r.json.content.features.petals, true);
  });

  it('requires a session and a CSRF token', async () => {
    assert.equal((await new Client(base).put('/api/app/site/features', { preset: 'all' })).status, 401);
    const noCsrf = await c.put('/api/app/site/features', { preset: 'all' }, { csrf: false });
    assert.equal(noCsrf.status, 403);
    const badOrigin = await c.put('/api/app/site/features', { preset: 'all' }, { origin: 'https://evil.example' });
    assert.equal(badOrigin.status, 403);
  });
});

describe('E. The published page only contains what is switched on', () => {
  let c;
  const VP = 'purple coconut sunrise';
  let heroAssetUrl;
  let galleryAssetId;
  let videoAssetId;

  before(async () => {
    c = await newUser('Public Pia', 'public@example.com');
    const png = await pngBuffer();
    await c.call('POST', '/api/app/site-photo/hero', { form: fileForm(png, 'h.png', 'image/png') });
    const g = await c.call('POST', '/api/app/gallery', { form: fileForm(png, 'a.png', 'image/png', { caption: 'Pic' }) });
    galleryAssetId = (await M.Media.findOne({ owner: c.id, visibility: 'public' }).sort({ createdAt: -1 }))._id;
    assert.equal(g.status, 201);
    const v = await c.call('POST', '/api/app/gallery', { form: fileForm(mp4(), 'clip.mp4', 'video/mp4', { caption: 'Clip' }) });
    assert.equal(v.status, 201, JSON.stringify(v.json));
    assert.equal(v.json.item.kind, 'video');
    videoAssetId = (await M.Media.findOne({ owner: c.id, kind: 'video' }))._id;
    await c.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: VP });
    await c.post('/api/app/private-messages', { kind: 'secret', title: 'S', body: 'secret body' });
    await c.post('/api/app/private-messages', { kind: 'diary', title: 'D', body: 'diary body' });
    await c.post('/api/app/private-messages', { kind: 'letter', title: 'L', body: 'letter body' });
    await c.call('POST', '/api/app/private-media', { form: fileForm(png, 'p.png', 'image/png', { caption: 'private pic' }) });
    assert.equal((await c.post('/api/app/site/publish', { acknowledgePlaceholders: true })).status, 200);
    heroAssetUrl = (await publicPage(c.slug)).site.photos.hero;
  });

  const set = async (features) => assert.equal((await c.put('/api/app/site/features', { features })).status, 200);
  const reset = async () => c.put('/api/app/site/features', { preset: 'defaults' });

  it('with everything on, photos and videos are separate lists and the vault is announced', async () => {
    const p = await publicPage(c.slug);
    assert.equal(p.gallery.length, 1);
    assert.equal(p.videos.length, 1);
    assert.equal(p.site.vaultEnabled, true);
    assert.ok(p.site.music);
  });

  it('Gallery OFF: no photos in the payload and the photo URL stops working', async () => {
    await set({ gallery: false });
    const p = await publicPage(c.slug);
    assert.deepEqual(p.gallery, []);
    assert.equal(p.videos.length, 1, 'videos have their own switch');
    assert.equal((await new Client(base).get(`/api/media/${galleryAssetId}`)).status, 404);
    await reset();
    assert.equal((await new Client(base).get(`/api/media/${galleryAssetId}`)).status, 200);
  });

  it('Video Gallery OFF: videos are not sent or streamed', async () => {
    await set({ videoGallery: false });
    assert.deepEqual((await publicPage(c.slug)).videos, []);
    assert.equal((await new Client(base).get(`/api/media/${videoAssetId}`)).status, 404);
    await reset();
    assert.equal((await new Client(base).get(`/api/media/${videoAssetId}`)).status, 200);
  });

  it('Letters OFF removes every letter; individual letter switches work', async () => {
    await set({ letters: false });
    let p = await publicPage(c.slug);
    assert.equal(p.letters.heart.body, '');
    assert.deepEqual(p.letters.openWhen, []);
    assert.equal(p.letters.futureWife.body, '');
    await reset();
    await set({ openWhenLetters: false });
    p = await publicPage(c.slug);
    assert.deepEqual(p.letters.openWhen, []);
    assert.ok(p.letters.heart.body);
    await reset();
  });

  it('Music OFF removes the song (payload and file) and background music / controls follow', async () => {
    const png = await pngBuffer();
    void png;
    await set({ music: false });
    const p = await publicPage(c.slug);
    assert.equal(p.site.music.url, null);
    assert.equal(p.site.features.music, false);
    assert.equal(p.site.features.backgroundMusic, false);
    assert.equal(p.site.features.musicControls, false);
    await reset();
  });

  it('Timeline, Reasons, Future, Envelope, Hero, Closing and Wishes OFF drop their content', async () => {
    await set({ timeline: false, flipCards: false, future: false, envelope: false, hero: false, closing: false, celebrationMessages: false });
    const p = await publicPage(c.slug);
    assert.deepEqual(p.timeline, []);
    assert.deepEqual(p.site.reasons, []);
    assert.deepEqual(p.site.future, { places: [], dreams: [], promises: [], memories: [] });
    assert.equal(p.site.introHeading, '');
    assert.equal(p.site.photos.hero, null);
    assert.equal(p.site.finalQuote, '');
    assert.equal(p.site.wishPrompt, '');
    assert.equal(p.site.features.countdown, false, 'countdown needs the hero');
    assert.equal((await new Client(base).get(heroAssetUrl.replace(/^.*\/api/, '/api'))).status, 404, 'hero photo is not served when the hero is off');
    await reset();
  });

  it('Secret Vault OFF: nothing under /vault is reachable any more, and people inside are let out', async () => {
    const v = new Client(base);
    const unlocked = await v.post(`/api/birthday/${c.slug}/vault/unlock`, { password: VP, role: 'her' });
    assert.equal(unlocked.status, 200);
    v.csrf = unlocked.json.csrfToken;
    assert.equal((await v.get(`/api/birthday/${c.slug}/vault/overview`)).status, 200);

    await set({ vault: false });
    assert.equal((await publicPage(c.slug)).site.vaultEnabled, false);
    for (const [method, path, body] of [
      ['get', '/overview'],
      ['get', '/journal'],
      ['get', '/session'],
      ['post', '/unlock', { password: VP, role: 'her' }],
      ['post', '/heartbeat', {}],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const r = await v[method](`/api/birthday/${c.slug}/vault${path}`, body);
      assert.ok([404, 401].includes(r.status), `${path} -> ${r.status}`);
      assert.notEqual(r.status, 200, `${path} must not answer`);
    }
    await reset();
    // the old session was destroyed when the vault was switched off
    assert.equal((await v.get(`/api/birthday/${c.slug}/vault/overview`)).status, 401);
  });

  it('Private photos / messages / journal switches filter what an unlocked vault returns', async () => {
    const v = new Client(base);
    const u = await v.post(`/api/birthday/${c.slug}/vault/unlock`, { password: VP, role: 'her' });
    v.csrf = u.json.csrfToken;
    let o = (await v.get(`/api/birthday/${c.slug}/vault/overview`)).json;
    assert.equal(o.media.length, 1);
    assert.equal(o.secrets.length, 1);

    await set({ privatePhotos: false, secretMessages: false });
    o = (await v.get(`/api/birthday/${c.slug}/vault/overview`)).json;
    assert.equal(o.media.length, 0);
    assert.equal(o.secrets.length, 0);
    assert.equal(o.diary.length, 1);
    assert.equal(o.letters.length, 1);
    const privAsset = await M.Media.findOne({ owner: c.id, visibility: 'private' });
    assert.equal((await v.get(`/api/birthday/${c.slug}/vault/media/${privAsset._id}`)).status, 404);

    await set({ privatePhotos: true, secretMessages: true, privateMessages: false });
    o = (await v.get(`/api/birthday/${c.slug}/vault/overview`)).json;
    assert.deepEqual([o.secrets.length, o.diary.length, o.letters.length], [0, 0, 0], 'the master switch wins over its children');
    assert.equal(o.media.length, 1);

    await set({ journal: false });
    assert.equal((await v.get(`/api/birthday/${c.slug}/vault/journal`)).status, 404);
    await set({ journal: true });
    assert.equal((await v.get(`/api/birthday/${c.slug}/vault/journal`)).status, 200);
    await reset();
  });

  it('Show Age OFF, Navigation OFF, footer credit etc. are delivered as switches for the page to render', async () => {
    await set({ showAge: false, navigation: false, footer: false });
    const p = await publicPage(c.slug);
    assert.equal(p.site.features.showAge, false);
    assert.equal(p.site.features.navigation, false);
    assert.equal(p.site.features.footer, false);
    assert.equal(p.site.features.studioCredit, false, 'the credit lives in the footer');
    assert.equal(p.site.settings.cake.showAge, false, 'the old settings shape agrees');
    await reset();
  });

  it('the owner\'s preview uses the same gating as the published page', async () => {
    await set({ gallery: false });
    const pv = (await c.get('/api/app/preview')).json;
    assert.deepEqual(pv.gallery, []);
    assert.deepEqual(pv.site.features, (await publicPage(c.slug)).site.features);
    await reset();
  });

  it('unpublished sites are still invisible whatever the switches say', async () => {
    assert.equal((await c.post('/api/app/site/unpublish')).status, 200);
    assert.equal((await new Client(base).get(`/api/birthday/${c.slug}`)).status, 404);
    assert.equal((await c.post('/api/app/site/publish', { acknowledgePlaceholders: true })).status, 200);
  });
});

describe('F. Appearance and wording', () => {
  let c;
  before(async () => {
    c = await newUser('Look Lia', 'look@example.com');
  });

  it('saves a theme preset and custom colours, lower-cased and validated', async () => {
    let r = await c.put('/api/app/site/appearance', { theme: 'rose-gold', primaryColor: '#AABBCC', font: 'playful' });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.appearance.theme, 'rose-gold');
    assert.equal(r.json.content.appearance.primaryColor, '#aabbcc');
    assert.equal(r.json.content.appearance.font, 'playful');
    assert.equal((await c.put('/api/app/site/appearance', { primaryColor: 'red' })).status, 400);
    assert.equal((await c.put('/api/app/site/appearance', { primaryColor: 'url(javascript:alert(1))' })).status, 400);
    assert.equal((await c.put('/api/app/site/appearance', { theme: 'made-up' })).status, 400);
    assert.equal((await c.put('/api/app/site/appearance', { font: 'Comic Sans' })).status, 400);
    assert.equal((await c.put('/api/app/site/appearance', { theme: 'x', extra: 1 })).status, 400);
    r = await c.put('/api/app/site/appearance', { theme: null, primaryColor: null, font: null });
    assert.equal(r.json.content.appearance.theme, null);
    assert.equal(r.json.content.appearance.primaryColor, null);
  });

  it('every preset has valid colours for all five roles, for both modes', () => {
    for (const mode of ['love', 'friendship']) {
      const themes = cfg.themesFor(mode);
      assert.equal(themes.length, 5, `${mode} has five presets`);
      for (const t of themes) for (const role of ['primary', 'secondary', 'background', 'text', 'button']) assert.ok(cfg.isHex(t.colors[role]), `${t.id}.${role}`);
    }
    assert.deepEqual(cfg.themeVars({}), {}, 'classic look = no overrides');
  });

  it('label overrides: saved, applied to the page payload, validated and removable', async () => {
    let r = await c.put('/api/app/site/copy', { copy: { galleryTitle: '  Our greatest hits  ', reasonsTitle: 'Why you rule' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.content.copy, { galleryTitle: 'Our greatest hits', reasonsTitle: 'Why you rule' });
    await c.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    assert.equal((await publicPage(c.slug)).site.copy.galleryTitle, 'Our greatest hits');
    assert.equal((await c.put('/api/app/site/copy', { copy: { notALabel: 'x' } })).status, 400);
    assert.equal((await c.put('/api/app/site/copy', { copy: { galleryTitle: 'x'.repeat(301) } })).status, 400);
    r = await c.put('/api/app/site/copy', { copy: { galleryTitle: null, reasonsTitle: '' } });
    assert.deepEqual(r.json.content.copy, {});
  });

  it('copy text is returned as plain data (the page renders it as text, never HTML)', async () => {
    const r = await c.put('/api/app/site/copy', { copy: { galleryTitle: '<img src=x onerror=alert(1)>' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.copy.galleryTitle, '<img src=x onerror=alert(1)>');
    await c.put('/api/app/site/copy', { copy: { galleryTitle: null } });
  });
});

describe('G. Multi-user isolation of the new settings', () => {
  let A;
  let B;
  before(async () => {
    A = await newUser('Iso Alice', 'isoa@example.com');
    B = await newUser('Iso Bob', 'isob@example.com', { relationshipMode: 'friendship' });
    for (const u of [A, B]) {
      // eslint-disable-next-line no-await-in-loop
      await u.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    }
  });

  it('each customer changes only their own site, whatever ids they send', async () => {
    const bBefore = await M.Site.findOne({ owner: B.id }).lean();
    assert.equal((await A.put('/api/app/site/features', { features: { gallery: false, vault: false }, owner: B.id })).status, 400);
    assert.equal((await A.put('/api/app/site/features', { features: { gallery: false, vault: false } })).status, 200);
    assert.equal((await A.put('/api/app/site/appearance', { theme: 'elegant-red' })).status, 200);
    assert.equal((await A.put('/api/app/site/copy', { copy: { galleryTitle: 'Alice only' } })).status, 200);
    assert.equal((await A.put('/api/app/site/relationship', { mode: 'friendship', type: 'bestie' })).status, 200);

    const bAfter = await M.Site.findOne({ owner: B.id }).lean();
    assert.deepEqual(bAfter.features, bBefore.features);
    assert.deepEqual(bAfter.appearance, bBefore.appearance);
    assert.deepEqual(bAfter.relationship, bBefore.relationship);
    assert.equal(bAfter.copyOverrides?.galleryTitle, undefined);
    assert.equal((await site(B)).content.features.gallery, true);
  });

  it('each public slug serves its own owner\'s configuration and no private settings', async () => {
    const pa = await publicPage(A.slug);
    const pb = await publicPage(B.slug);
    assert.equal(pa.site.features.gallery, false);
    assert.equal(pb.site.features.gallery, true);
    assert.equal(pa.site.appearance.theme, 'elegant-red');
    assert.notEqual(pb.site.appearance.theme, 'elegant-red');
    assert.equal(pa.site.copy.galleryTitle, 'Alice only');
    assert.equal(pb.site.copy.galleryTitle, undefined);
    const text = JSON.stringify(pa) + JSON.stringify(pb);
    assert.ok(!/passwordHash|sitePassword|featuresRaw|owner|email/i.test(text), 'no internal or private fields leak');
    assert.ok(!text.includes(A.id) && !text.includes(B.id));
  });

  it('a customer cannot reach another customer\'s dashboard settings', async () => {
    const a = await site(A);
    const b = await site(B);
    assert.notEqual(a.slug, b.slug);
    assert.equal(a.content.copy.galleryTitle, 'Alice only');
    assert.equal(b.content.copy.galleryTitle, undefined);
  });
});

describe('H. Page password (feature "Password Protection")', () => {
  let c;
  let heroUrl;
  const PW = 'violet harbour clock 77';

  before(async () => {
    c = await newUser('Locked Lena', 'locked@example.com');
    await c.call('POST', '/api/app/site-photo/hero', { form: fileForm(await pngBuffer(), 'h.png', 'image/png') });
    await c.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: 'quiet harbour lantern' });
    await c.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    heroUrl = (await publicPage(c.slug)).site.photos.hero;
  });

  it('is off by default and does nothing until a password is set', async () => {
    assert.equal((await publicPage(c.slug)).locked, undefined);
    await c.put('/api/app/site/features', { features: { passwordProtection: true } });
    assert.equal((await publicPage(c.slug)).locked, undefined, 'switch on but no password yet: page stays open');
  });

  it('needs the account password and a strong, non-birthday password', async () => {
    assert.equal((await c.put('/api/app/site/password', { accountPassword: 'wrong-account-pw', password: PW })).status, 403);
    assert.equal((await c.put('/api/app/site/password', { accountPassword: STRONG, password: 'short' })).status, 400);
    assert.equal((await c.put('/api/app/site/password', { accountPassword: STRONG, password: '2000-01-01-xyz' })).status, 400);
    const r = await c.put('/api/app/site/password', { accountPassword: STRONG, password: PW });
    assert.equal(r.status, 200);
    assert.equal(r.json.passwordSet, true);
    assert.ok(!JSON.stringify(r.json).includes('Hash'));
  });

  it('a locked page sends NOTHING but the lock notice, and its photos and private area are closed', async () => {
    const anon = new Client(base);
    const r = await anon.get(`/api/birthday/${c.slug}`);
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.json).sort(), ['locked', 'slug']);
    assert.equal((await anon.get(heroUrl.replace(/^.*\/api/, '/api'))).status, 404);
    assert.equal((await anon.post(`/api/birthday/${c.slug}/vault/unlock`, { password: 'quiet harbour lantern', role: 'her' })).status, 403);
  });

  it('rejects the wrong password and accepts the right one, then serves the whole page', async () => {
    const v = new Client(base);
    assert.equal((await v.post(`/api/birthday/${c.slug}/unlock-site`, { password: 'nope nope nope' })).status, 401);
    assert.equal((await v.post(`/api/birthday/${c.slug}/unlock-site`, { password: PW }, { origin: 'https://evil.example' })).status, 403);
    const ok = await v.post(`/api/birthday/${c.slug}/unlock-site`, { password: PW });
    assert.equal(ok.status, 200);
    const cookie = ok.setCookies.find((s) => s.startsWith('site_sid='));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    const page = await publicPage(c.slug, v);
    assert.equal(page.locked, undefined);
    assert.equal(page.slug, c.slug);
    assert.equal((await v.get(heroUrl.replace(/^.*\/api/, '/api'))).status, 200);
    // the unlock is for THIS page only
    const other = await newUser('Other Olly', 'olly@example.com');
    await other.put('/api/app/site/features', { features: { passwordProtection: true } });
    await other.put('/api/app/site/password', { accountPassword: STRONG, password: 'another long phrase 12' });
    await other.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    assert.equal((await publicPage(other.slug, v)).locked, true, 'one page\'s unlock opens no other page');
  });

  it('changing or removing the password logs every visitor out; switching the feature off opens the page', async () => {
    const v = new Client(base);
    await v.post(`/api/birthday/${c.slug}/unlock-site`, { password: PW });
    assert.equal((await publicPage(c.slug, v)).locked, undefined);
    assert.equal((await c.put('/api/app/site/password', { accountPassword: STRONG, password: 'brand new phrase 4321' })).status, 200);
    assert.equal((await publicPage(c.slug, v)).locked, true);

    await c.put('/api/app/site/features', { features: { passwordProtection: false } });
    assert.equal((await publicPage(c.slug)).locked, undefined, 'feature off = open page');
    await c.put('/api/app/site/features', { features: { passwordProtection: true } });
    assert.equal((await publicPage(c.slug)).locked, true);

    assert.equal((await c.del('/api/app/site/password', { accountPassword: 'wrong' })).status, 403);
    const r = await c.del('/api/app/site/password', { accountPassword: STRONG });
    assert.equal(r.status, 200);
    assert.equal(r.json.passwordSet, false);
    assert.equal((await publicPage(c.slug)).locked, undefined);
  });

  it('locks a page out after repeated wrong guesses', async () => {
    await c.put('/api/app/site/password', { accountPassword: STRONG, password: PW });
    let last = 0;
    for (let i = 0; i < 22; i += 1) {
      // a new client (new IP bucket) each time, so only the per-page lockout can answer 429
      // eslint-disable-next-line no-await-in-loop
      last = (await new Client(base).post(`/api/birthday/${c.slug}/unlock-site`, { password: `wrong guess ${i}` })).status;
    }
    assert.equal(last, 429);
    assert.equal((await new Client(base).post(`/api/birthday/${c.slug}/unlock-site`, { password: PW })).status, 429, 'even the right password waits');
    await M.Site.updateOne({ owner: c.id }, { $set: { siteLockedUntil: null, siteFailedAttempts: 0 } });
  });
});

describe('I. Registration and account regressions with the new fields', () => {
  it('rejects a bad relationship mode at registration and still never leaks secrets', async () => {
    const c = new Client(base);
    const bad = await c.post('/api/app/auth/register', { name: 'Bad Mode', email: 'badmode@example.com', password: STRONG, relationshipMode: 'enemies' });
    assert.equal(bad.status, 400);
    const r = await new Client(base).post('/api/app/auth/register', { name: 'Good Mode', email: 'goodmode@example.com', password: STRONG, relationshipMode: 'love', relationshipType: 'fiancee' });
    assert.equal(r.status, 201);
    assert.ok(!/passwordHash|sitePassword/i.test(JSON.stringify(r.json)));
  });

  it('deleting an account removes its page-password sessions too', async () => {
    const c = await newUser('Gone Gail', 'gone@example.com');
    await c.put('/api/app/site/features', { features: { passwordProtection: true } });
    await c.put('/api/app/site/password', { accountPassword: STRONG, password: 'a very long phrase 99' });
    await c.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    const v = new Client(base);
    await v.post(`/api/birthday/${c.slug}/unlock-site`, { password: 'a very long phrase 99' });
    const Session = (await import('../models/Session.js')).Session;
    assert.equal(await Session.countDocuments({ type: 'site', owner: c.id }), 1);
    assert.equal((await c.del('/api/app/account', { password: STRONG })).status, 200);
    assert.equal(await Session.countDocuments({ type: 'site', owner: c.id }), 0);
  });
});
