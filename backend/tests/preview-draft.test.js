/**
 * Draft preview: POST /api/app/preview shows UNSAVED feature / relationship choices to the owner, persists nothing, and keeps every write protection.
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


describe('Draft preview (POST /api/app/preview)', () => {
  let a;
  let b;
  before(async () => {
    a = await newUser('Draft A', 'draft-a@example.com');
    b = await newUser('Draft B', 'draft-b@example.com');
  });

  it('applies unsaved feature switches to the preview and persists nothing', async () => {
    const savedBefore = (await site(a)).content.featuresRaw;
    const live = (await a.get('/api/app/preview')).json;
    assert.equal(live.site.features.timeline, true);
    const r = await a.post('/api/app/preview', { features: { timeline: false } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.draft, true);
    assert.equal(r.json.site.features.timeline, false);
    assert.deepEqual((await site(a)).content.featuresRaw, savedBefore, 'saved switches must be unchanged');
    assert.equal((await a.get('/api/app/preview')).json.site.features.timeline, true, 'the normal preview is unchanged');
    assert.notEqual((await publicPage(a.slug)).site?.features?.timeline, false, 'visitors are unaffected');
  });

  it('applies dependencies to a draft: turning a parent off turns its children off', async () => {
    const parent = cfg.FEATURES.find((f) => cfg.FEATURES.some((c) => (c.requires || []).includes(f.key)));
    const child = cfg.FEATURES.find((f) => (f.requires || []).includes(parent.key));
    const r = await a.post('/api/app/preview', { features: { [parent.key]: false } });
    assert.equal(r.json.site.features[parent.key], false);
    assert.equal(r.json.site.features[child.key], false);
  });

  it('previews an unsaved relationship mode without saving it', async () => {
    const r = await a.post('/api/app/preview', { relationship: { mode: 'friendship', type: 'best-friend' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.site.relationship.mode, 'friendship');
    assert.equal((await site(a)).content.relationship.mode, 'love', 'stored relationship is unchanged');
    const bad = await a.post('/api/app/preview', { relationship: { mode: 'friendship', type: 'husband' } });
    assert.equal(bad.status, 200);
    assert.equal(bad.json.site.relationship.type, cfg.defaultTypeFor('friendship'), 'an unknown type falls back to the mode default');
  });

  it('rejects unknown keys, extra fields and bad modes', async () => {
    assert.equal((await a.post('/api/app/preview', { features: { notAFeature: true } })).status, 400);
    assert.equal((await a.post('/api/app/preview', { features: { timeline: 'yes' } })).status, 400);
    assert.equal((await a.post('/api/app/preview', { owner: String(b.id) })).status, 400);
    assert.equal((await a.post('/api/app/preview', { relationship: { mode: 'enemies' } })).status, 400);
  });

  it('needs a session, the CSRF token and a same-site Origin', async () => {
    assert.equal((await new Client(base).post('/api/app/preview', {}, { csrf: false })).status, 401);
    assert.equal((await a.post('/api/app/preview', {}, { csrf: false })).status, 403);
    assert.equal((await a.post('/api/app/preview', {}, { origin: 'https://evil.example' })).status, 403);
  });

  it('is scoped to the caller: user B only ever previews user B', async () => {
    const r = await b.post('/api/app/preview', { features: { timeline: false } });
    assert.equal(r.status, 200);
    assert.equal(r.json.slug, b.slug);
    assert.notEqual(r.json.slug, a.slug);
    assert.equal((await site(a)).content.featuresRaw.timeline !== false, true, "A's switches were not touched by B's preview");
  });
});
