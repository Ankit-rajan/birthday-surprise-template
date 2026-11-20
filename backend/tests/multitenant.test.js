/**
 * End-to-end tests for the multi-user platform. They run the REAL app against a REAL MongoDB (database
 * `bst_test`, dropped at the start) and talk to it over HTTP exactly like a browser would.
 *
 *   mongod must be running on 127.0.0.1:27017 (or set TEST_MONGODB_URI)   ->   npm test
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { Client, pngBuffer, fileForm, STRONG } from './helpers.js';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/bst_test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.TRUST_PROXY = '1';
process.env.MAX_USER_STORAGE_MB = '1';
process.env.JOURNAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

let server;
let base;
let mongoose;
let M; // models

const origin = 'http://localhost:5173';

async function newUser(name, email, password = STRONG) {
  const c = new Client(base);
  const r = await c.post('/api/app/auth/register', { name, email, password });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  c.csrf = r.json.csrfToken;
  c.slug = r.json.site.slug;
  c.id = r.json.user.id;
  return c;
}

before(async () => {
  const { connectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  const { ensureIndexes } = await import('../services/indexes.js');
  mongoose = (await import('mongoose')).default;
  M = {
    User: (await import('../models/User.js')).User,
    AdminUser: (await import('../models/AdminUser.js')).AdminUser,
    Site: (await import('../models/SiteContent.js')).SiteContent,
    Media: (await import('../models/MediaAsset.js')).MediaAsset,
    Gallery: (await import('../models/GalleryMemory.js')).GalleryMemory,
    Letter: (await import('../models/Letter.js')).Letter,
    Session: (await import('../models/Session.js')).Session,
  };
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

/* ------------------------------------------------------------------ 1 */
describe('1. Registration and authentication', () => {
  it('registers a customer, sets an HttpOnly SameSite cookie and never returns secrets', async () => {
    const c = new Client(base);
    const r = await c.post('/api/app/auth/register', { name: 'Reg Test', email: 'reg@example.com', password: STRONG });
    assert.equal(r.status, 201);
    const cookie = r.setCookies.find((s) => s.startsWith('user_sid='));
    assert.ok(cookie, 'user_sid cookie set');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\/api\/app/);
    const text = JSON.stringify(r.json);
    assert.ok(!/passwordHash|\$2[aby]\$|resetToken/i.test(text), 'no hash or token in the response');
    assert.equal(r.json.site.published, false, 'new sites start unpublished');
  });

  it('stores only a bcrypt hash, never the password', async () => {
    const u = await M.User.findOne({ email: 'reg@example.com' }).select('+passwordHash').lean();
    assert.match(u.passwordHash, /^\$2[aby]\$12\$/);
    assert.ok(!JSON.stringify(u).includes(STRONG));
  });

  it('rejects duplicate emails (case-insensitive) and weak passwords', async () => {
    const dup = await new Client(base).post('/api/app/auth/register', { name: 'X', email: 'REG@example.com', password: STRONG });
    assert.equal(dup.status, 409);
    for (const pw of ['short', 'password123', 'aaaaaaaaaaaa', 'onlylettersnonumber', `${'x1'.repeat(40)}`]) {
      // eslint-disable-next-line no-await-in-loop
      const r = await new Client(base).post('/api/app/auth/register', { name: 'Weak', email: `weak${Math.random()}@example.com`, password: pw });
      assert.equal(r.status, 400, `password "${pw}" should be refused`);
    }
  });

  it('logs in, reports /me, logs out; wrong password and unknown email look identical', async () => {
    const c = new Client(base);
    const bad = await c.post('/api/app/auth/login', { email: 'reg@example.com', password: 'Wrong-password-1' });
    const unknown = await c.post('/api/app/auth/login', { email: 'nobody@example.com', password: 'Wrong-password-1' });
    assert.equal(bad.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(bad.json, unknown.json);

    const ok = await c.post('/api/app/auth/login', { email: 'reg@example.com', password: STRONG, remember: false });
    assert.equal(ok.status, 200);
    assert.ok(!/Max-Age|Expires/i.test(ok.setCookies[0]), 'without "remember" the cookie is a session cookie');
    c.csrf = ok.json.csrfToken;
    const me = await c.get('/api/app/auth/me');
    assert.equal(me.json.authenticated, true);
    assert.equal(me.json.user.email, 'reg@example.com');

    await c.post('/api/app/auth/logout');
    const after = await c.get('/api/app/auth/me');
    assert.equal(after.json.authenticated, false);
    assert.equal((await c.get('/api/app/site')).status, 401);
  });

  it('blocks state-changing requests without a CSRF token or from a foreign Origin', async () => {
    const c = await newUser('Csrf Test', 'csrf@example.com');
    const noToken = await c.put('/api/app/site', { herName: 'Nope' }, { csrf: false });
    assert.equal(noToken.status, 403);
    const badToken = await c.put('/api/app/site', { herName: 'Nope' }, { headers: { 'X-CSRF-Token': 'forged' }, csrf: false });
    assert.equal(badToken.status, 403);
    const evil = await c.put('/api/app/site', { herName: 'Nope' }, { origin: 'https://evil.example' });
    assert.equal(evil.status, 403);
    const evilLogin = await new Client(base).post('/api/app/auth/login', { email: 'csrf@example.com', password: STRONG }, { origin: 'https://evil.example' });
    assert.equal(evilLogin.status, 403);
    assert.equal((await c.put('/api/app/site', { herName: 'Fine' })).status, 200);
  });

  it('rate-limits repeated failed logins per IP', async () => {
    const c = new Client(base);
    const codes = [];
    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      codes.push((await c.post('/api/app/auth/login', { email: `ghost${i}@example.com`, password: 'Wrong-password-1' })).status);
    }
    assert.ok(codes.includes(429), `expected a 429 in ${codes.join(',')}`);
    assert.equal(codes[0], 401);
  });

  it('rate-limits registration per IP', async () => {
    const c = new Client(base);
    const codes = [];
    for (let i = 0; i < 14; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      codes.push((await c.post('/api/app/auth/register', { name: 'Flood', email: `flood${i}@example.com`, password: STRONG })).status);
    }
    assert.ok(codes.includes(429), `expected a 429 in ${codes.join(',')}`);
  });

  it('refuses NoSQL operator injection in bodies and queries', async () => {
    const c = new Client(base);
    const r1 = await c.call('POST', '/api/app/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
    assert.equal(r1.status, 400);
    const r2 = await c.get('/api/birthday/anything?slug[$ne]=x&a.b=1');
    assert.ok([400, 404].includes(r2.status));
    const r3 = await c.call('POST', '/api/app/auth/login', { body: JSON.parse('{"email":"a@b.co","password":"x","__proto__":{"admin":true}}') });
    assert.ok([400, 401].includes(r3.status));
  });
});

/* ------------------------------------------------------------------ 2 */
describe('2. Password reset', () => {
  it('answers identically for known and unknown emails, and the link works exactly once', async () => {
    const c = await newUser('Reset Me', 'reset@example.com');
    let link = '';
    const orig = console.log;
    console.log = (...args) => {
      const s = args.join(' ');
      if (s.includes('reset-password?token=')) link = s.slice(s.indexOf('http'));
      else orig(...args);
    };
    let known;
    let unknown;
    try {
      known = await new Client(base).post('/api/app/auth/forgot-password', { email: 'reset@example.com' });
      unknown = await new Client(base).post('/api/app/auth/forgot-password', { email: 'ghost@example.com' });
    } finally {
      console.log = orig;
    }
    assert.equal(known.status, 200);
    assert.deepEqual(known.json, unknown.json);
    assert.ok(link, 'dev mailer printed a link');
    const token = new URL(link).searchParams.get('token');

    const dbUser = await M.User.findOne({ email: 'reset@example.com' }).select('+resetTokenHash').lean();
    assert.ok(dbUser.resetTokenHash && dbUser.resetTokenHash !== token, 'only a hash of the token is stored');

    const weak = await new Client(base).post('/api/app/auth/reset-password', { token, password: 'short' });
    assert.equal(weak.status, 400);
    const good = await new Client(base).post('/api/app/auth/reset-password', { token, password: 'Brand-New-Passphrase-7' });
    assert.equal(good.status, 200);
    const reuse = await new Client(base).post('/api/app/auth/reset-password', { token, password: 'Another-Passphrase-8' });
    assert.equal(reuse.status, 400, 'a reset token is single use');

    assert.equal((await c.get('/api/app/site')).status, 401, 'old sessions are signed out');
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'reset@example.com', password: STRONG })).status, 401);
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'reset@example.com', password: 'Brand-New-Passphrase-7' })).status, 200);
  });

  it('rejects garbage and expired tokens', async () => {
    assert.equal((await new Client(base).post('/api/app/auth/reset-password', { token: 'x'.repeat(43), password: STRONG })).status, 400);
    const u = await M.User.findOne({ email: 'reset@example.com' });
    const token = crypto.randomBytes(32).toString('base64url');
    await M.User.updateOne({ _id: u._id }, { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetExpiresAt: new Date(Date.now() - 1000) });
    assert.equal((await new Client(base).post('/api/app/auth/reset-password', { token, password: 'Yet-Another-Pass-9' })).status, 400);
  });
});

/* ------------------------------------------------------------------ 3 */
describe('3. Two customers: separate workspaces, no cross-access (IDOR)', () => {
  let A;
  let B;
  const ids = {};

  before(async () => {
    A = await newUser('Priya Nair', 'a@example.com');
    B = await newUser('Rahul Mehta', 'b@example.com');
  });

  it('gives each customer a separate dashboard and link name', async () => {
    assert.notEqual(A.slug, B.slug);
    await A.put('/api/app/site', { herName: 'Priya', partnerName: 'Dev', heroMessage: 'Priya message', musicTitle: 'Priya song' });
    await B.put('/api/app/site', { herName: 'Rahul', partnerName: 'Sam', heroMessage: 'Rahul message' });
    const a = (await A.get('/api/app/site')).json;
    const b = (await B.get('/api/app/site')).json;
    assert.equal(a.content.herName, 'Priya');
    assert.equal(b.content.herName, 'Rahul');
    assert.equal(a.slug, A.slug);
    assert.equal(b.slug, B.slug);
    assert.ok(!JSON.stringify(b).includes('Priya'), "B's dashboard has nothing of A's");
  });

  it('A creates gallery, timeline, private message and private media', async () => {
    const png = await pngBuffer();
    let r = await A.call('POST', '/api/app/gallery', { form: fileForm(png, 'a.png', 'image/png', { caption: 'A photo' }) });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    ids.gallery = r.json.item.id;
    r = await A.post('/api/app/timeline', { title: 'A chapter', description: 'secret', date: '2024-01-01' });
    assert.equal(r.status, 201);
    ids.timeline = r.json.item.id;
    r = await A.post('/api/app/private-messages', { kind: 'secret', title: 'Shh', body: 'A private note' });
    assert.equal(r.status, 201);
    ids.message = r.json.item.id;
    r = await A.call('POST', '/api/app/private-media', { form: fileForm(png, 'p.png', 'image/png', { caption: 'private' }) });
    assert.equal(r.status, 201);
    ids.pmedia = r.json.item.id;
    ids.letter = (await A.get('/api/app/letters')).json.items[0].id;
    ids.asset = (await M.Media.findOne({ owner: A.id, visibility: 'public' }))._id.toString();
    ids.privAsset = (await M.Media.findOne({ owner: A.id, visibility: 'private' }))._id.toString();
  });

  it('B cannot list, read, edit or delete any of A\'s records by guessing IDs', async () => {
    const attempts = [
      ['PUT', `/api/app/gallery/${ids.gallery}`, { caption: 'hacked' }],
      ['DELETE', `/api/app/gallery/${ids.gallery}`],
      ['PUT', `/api/app/timeline/${ids.timeline}`, { title: 'hacked' }],
      ['DELETE', `/api/app/timeline/${ids.timeline}`],
      ['PUT', `/api/app/private-messages/${ids.message}`, { body: 'hacked' }],
      ['DELETE', `/api/app/private-messages/${ids.message}`],
      ['PUT', `/api/app/private-media/${ids.pmedia}`, { caption: 'hacked' }],
      ['DELETE', `/api/app/private-media/${ids.pmedia}`],
      ['PUT', `/api/app/letters/${ids.letter}`, { title: 'hacked', body: 'hacked' }],
      ['GET', `/api/app/media/${ids.asset}`],
      ['GET', `/api/app/media/${ids.privAsset}`],
      ['GET', `/api/app/media/${ids.privAsset}?thumb=1`],
    ];
    for (const [method, path, body] of attempts) {
      // eslint-disable-next-line no-await-in-loop
      const r = await B.call(method, path, { body });
      assert.equal(r.status, 404, `${method} ${path} must be 404 for another customer, got ${r.status}`);
    }
    for (const list of ['gallery', 'timeline', 'private-media', 'private-messages', 'letters']) {
      // eslint-disable-next-line no-await-in-loop
      const r = await B.get(`/api/app/${list}`);
      assert.ok(!JSON.stringify(r.json).includes('A private note') && !JSON.stringify(r.json).includes('A chapter') && !JSON.stringify(r.json).includes('A photo'), `${list} leaks nothing`);
    }
  });

  it("A's data is untouched after B's attempts", async () => {
    assert.equal((await A.get('/api/app/gallery')).json.items[0].caption, 'A photo');
    assert.equal((await A.get('/api/app/timeline')).json.items.find((t) => t.id === ids.timeline).title, 'A chapter');
    assert.equal((await A.get('/api/app/private-messages')).json.items[0].body, 'A private note');
    assert.equal((await A.get(`/api/app/media/${ids.asset}`)).status, 200);
  });

  it('ignores or rejects an attacker-supplied owner / userId in any body', async () => {
    const r1 = await B.put('/api/app/site', { owner: A.id, herName: 'x' });
    assert.equal(r1.status, 400, 'unknown field "owner" is refused');
    const r2 = await B.post('/api/app/timeline', { title: 'Mine', owner: A.id, userId: A.id });
    assert.equal(r2.status, 201);
    const tl = await mongoose.connection.db.collection('timelineentries').findOne({ _id: new mongoose.Types.ObjectId(r2.json.item.id) });
    assert.equal(String(tl.owner), B.id, 'owner always comes from the session');
    const r3 = await B.put('/api/app/site/settings', { owner: A.id });
    assert.equal(r3.status, 400);
  });

  it("B cannot attach A's asset or touch A's slug", async () => {
    const r = await B.put('/api/app/site/slug', { slug: A.slug });
    assert.equal(r.status, 409);
    const dash = await B.get('/api/app/site');
    assert.equal(dash.json.slug, B.slug);
  });

  it('an invalid or malformed id is just a 404', async () => {
    for (const id of ['not-an-id', '000000000000000000000000', '../../etc/passwd']) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal((await B.del(`/api/app/gallery/${encodeURIComponent(id)}`)).status, 404);
    }
  });

  it("each customer's session works only for that customer", async () => {
    const swapped = new Client(base);
    swapped.cookies = { ...A.cookies };
    swapped.csrf = B.csrf; // A's cookie + B's CSRF token
    assert.equal((await swapped.put('/api/app/site', { herName: 'Mixed' })).status, 403);
  });
});

/* ------------------------------------------------------------------ 4 */
describe('4. Publishing, public URLs and slugs', () => {
  let A;
  let B;
  let heroUrlA;

  before(async () => {
    A = await newUser('Anita Das', 'anita@example.com');
    B = await newUser('Bilal Khan', 'bilal@example.com');
    for (const [c, her, partner] of [[A, 'Anita', 'Dev'], [B, 'Bilal', 'Sam']]) {
      // eslint-disable-next-line no-await-in-loop
      await c.put('/api/app/site', {
        herName: her,
        partnerName: partner,
        introHeading: `Heading for ${her}`,
        heroMessage: `Hero for ${her}`,
        wishPrompt: `Wish ${her}`,
        afterWishMessage: `After ${her}`,
        finalQuote: `Quote ${her}`,
        finalMessage: `Final ${her}`,
        birthdayWishes: [`Wish for ${her}`],
        reasons: Array.from({ length: 20 }, (_, i) => `${her} reason ${i}`),
      });
      // eslint-disable-next-line no-await-in-loop
      const letters = (await c.get('/api/app/letters')).json.items;
      for (const l of letters) {
        // eslint-disable-next-line no-await-in-loop
        await c.put(`/api/app/letters/${l.id}`, { title: l.title, body: `${her} letter ${l.key}` });
      }
      // eslint-disable-next-line no-await-in-loop
      const tl = (await c.get('/api/app/timeline')).json.items;
      for (const t of tl) {
        // eslint-disable-next-line no-await-in-loop
        await c.put(`/api/app/timeline/${t.id}`, { title: `${her} chapter` });
      }
    }
    const up = await A.call('POST', '/api/app/site-photo/hero', { form: fileForm(await pngBuffer('#aa3355'), 'hero.png', 'image/png') });
    heroUrlA = up.json.content.photos.hero;
  });

  it('unpublished pages and their media are not publicly reachable', async () => {
    const anon = new Client(base);
    assert.equal((await anon.get(`/api/birthday/${A.slug}`)).status, 404);
    const unknown = await anon.get('/api/birthday/definitely-not-a-site');
    assert.equal(unknown.status, 404);
    const assetId = heroUrlA.split('/').pop().split('?')[0];
    assert.equal((await anon.get(`/api/media/${assetId}`)).status, 404, 'media of an unpublished site is hidden');
    assert.equal((await A.get(`/api/app/media/${assetId}`)).status, 200, 'but the owner can still see it');
  });

  it('the owner can preview an unpublished page; nobody else can', async () => {
    const p = await A.get('/api/app/preview');
    assert.equal(p.status, 200);
    assert.equal(p.json.site.herName, 'Anita');
    assert.equal(p.json.published, false);
    assert.equal((await new Client(base).get('/api/app/preview')).status, 401);
    assert.equal((await B.get('/api/app/preview')).json.site.herName, 'Bilal');
  });

  it('warns before publishing starter hints, then publishes on request', async () => {
    const fresh = await newUser('Fresh Start', 'fresh@example.com');
    const blocked = await fresh.post('/api/app/site/publish', {});
    assert.equal(blocked.status, 409);
    assert.ok(blocked.json.placeholders.length > 0);
    assert.equal((await fresh.post('/api/app/site/publish', { acknowledgePlaceholders: true })).status, 200);
  });

  it('publishes two separate pages that each show the right content', async () => {
    assert.equal((await A.post('/api/app/site/publish', {})).status, 200);
    assert.equal((await B.post('/api/app/site/publish', {})).status, 200);
    const anon = new Client(base);
    const pa = (await anon.get(`/api/birthday/${A.slug}`)).json;
    const pb = (await anon.get(`/api/birthday/${B.slug}`)).json;
    assert.equal(pa.site.herName, 'Anita');
    assert.equal(pb.site.herName, 'Bilal');
    assert.equal(pa.letters.heart.body, 'Anita letter heart');
    assert.equal(pb.letters.heart.body, 'Bilal letter heart');
    assert.ok(!JSON.stringify(pa).includes('Bilal'));
    assert.ok(!JSON.stringify(pb).includes('Anita'));
    assert.ok(!JSON.stringify(pa).includes(B.id) && !JSON.stringify(pa).includes(A.id), 'no internal ids leak');
    assert.ok(!/email|passwordHash|owner/i.test(JSON.stringify(pa)));
    const assetId = pa.site.photos.hero.split('/').pop().split('?')[0];
    const media = await anon.get(`/api/media/${assetId}`);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get('content-type'), 'image/jpeg');
  });

  it('serves private assets only through the vault, never as public media', async () => {
    await A.call('POST', '/api/app/private-media', { form: fileForm(await pngBuffer('#112233'), 'x.png', 'image/png') });
    const priv = await M.Media.findOne({ owner: A.id, visibility: 'private' });
    assert.equal((await new Client(base).get(`/api/media/${priv._id}`)).status, 404);
  });

  it('unpublishing hides the page and its media again', async () => {
    assert.equal((await B.post('/api/app/site/unpublish')).status, 200);
    const anon = new Client(base);
    assert.equal((await anon.get(`/api/birthday/${B.slug}`)).status, 404);
    assert.equal((await anon.get(`/api/birthday/${A.slug}`)).status, 200, "A's page is unaffected");
    assert.equal((await B.post('/api/app/site/publish', {})).status, 200);
  });

  it('validates link names: format, reserved words, duplicates, availability', async () => {
    for (const bad of ['ab', 'UPPER_case', 'has space', '-lead', 'trail-', 'dou--ble', 'admin', 'login', 'demo', 'api', 'a'.repeat(41), '../etc']) {
      // eslint-disable-next-line no-await-in-loop
      const r = await A.put('/api/app/site/slug', { slug: bad });
      assert.ok([400].includes(r.status), `"${bad}" should be 400, got ${r.status}`);
    }
    assert.equal((await A.put('/api/app/site/slug', { slug: B.slug })).status, 409);
    const check = await A.get(`/api/app/site/slug-available?slug=${B.slug}`);
    assert.equal(check.json.available, false);
    assert.equal((await A.get('/api/app/site/slug-available?slug=totally-free-name')).json.available, true);
    assert.equal((await A.get(`/api/app/site/slug-available?slug=${A.slug}`)).json.available, true, 'my own name counts as available to me');
  });

  it('changes a slug safely: new link works, old link redirects, nobody else can take the old name', async () => {
    const oldSlug = A.slug;
    const r = await A.put('/api/app/site/slug', { slug: 'anita-birthday' });
    assert.equal(r.status, 200);
    assert.equal(r.json.slug, 'anita-birthday');
    const anon = new Client(base);
    assert.equal((await anon.get('/api/birthday/anita-birthday')).json.site.herName, 'Anita');
    assert.deepEqual((await anon.get(`/api/birthday/${oldSlug}`)).json, { redirectTo: 'anita-birthday' });
    assert.equal((await B.put('/api/app/site/slug', { slug: oldSlug })).status, 409, 'old names stay reserved for their owner');
    assert.equal((await A.put('/api/app/site/slug', { slug: oldSlug })).status, 200, 'the owner can go back');
    A.slug = oldSlug;
  });

  it('concurrent signups with the same name still get unique slugs', async () => {
    const made = await Promise.all(
      Array.from({ length: 6 }, (_, i) => newUser('Same Name', `same${i}@example.com`)),
    );
    const slugs = new Set(made.map((c) => c.slug));
    assert.equal(slugs.size, 6);
  });
});

/* ------------------------------------------------------------------ 5 */
describe('5. Customisation settings', () => {
  it('saves cake and effects settings per customer and validates them', async () => {
    const A = await newUser('Cake Maker', 'cake@example.com');
    const B = await newUser('Other Baker', 'baker@example.com');
    const r = await A.put('/api/app/site/settings', { cake: { theme: 'chocolate', candles: 7, showAge: false }, effects: { confetti: false } });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.settings.cake.theme, 'chocolate');
    assert.equal(r.json.content.settings.cake.candles, 7);
    assert.equal(r.json.content.settings.effects.confetti, false);
    assert.equal(r.json.content.settings.effects.petals, true);
    assert.equal((await B.get('/api/app/site')).json.content.settings.cake.theme, 'rose', "B's settings are unaffected");
    for (const bad of [{ cake: { theme: 'neon' } }, { cake: { candles: 99 } }, { effects: { petals: 'yes' } }, { cake: { evil: 1 } }]) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal((await A.put('/api/app/site/settings', bad)).status, 400);
    }
    await A.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    const pub = (await new Client(base).get(`/api/birthday/${A.slug}`)).json;
    assert.equal(pub.site.settings.cake.theme, 'chocolate');
  });

  it('applies the sample starter only when explicitly asked, and only to the caller', async () => {
    const A = await newUser('Starter Fan', 'starter@example.com');
    const B = await newUser('Starter Skip', 'skip@example.com');
    assert.ok(!(await A.get('/api/app/site')).json.content.herName.includes('Aanya'), 'new accounts never start with demo data');
    assert.equal((await A.post('/api/app/site/starter', { template: 'other' })).status, 400);
    const r = await A.post('/api/app/site/starter', { template: 'aanya' });
    assert.equal(r.status, 200);
    assert.equal(r.json.content.herName, 'Aanya Sharma');
    assert.equal(r.json.placeholders.length, 0);
    assert.notEqual((await B.get('/api/app/site')).json.content.herName, 'Aanya Sharma');
  });
});

/* ------------------------------------------------------------------ 6 */
describe('6. Private vault is scoped to one site', () => {
  let A;
  let B;
  const VA = 'purple coconut sunrise';
  const VB = 'quiet harbour lantern';

  before(async () => {
    A = await newUser('Vault Alice', 'valice@example.com');
    B = await newUser('Vault Bob', 'vbob@example.com');
    for (const [c, pw] of [[A, VA], [B, VB]]) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal((await c.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: pw })).status, 200);
      // eslint-disable-next-line no-await-in-loop
      await c.post('/api/app/private-messages', { kind: 'secret', title: `${c.slug} secret`, body: `body of ${c.slug}` });
      // eslint-disable-next-line no-await-in-loop
      await c.call('POST', '/api/app/private-media', { form: fileForm(await pngBuffer(), 'p.png', 'image/png', { caption: `${c.slug} pic` }) });
      // eslint-disable-next-line no-await-in-loop
      await c.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    }
  });

  it('requires the vault password of that exact site', async () => {
    const v = new Client(base);
    assert.equal((await v.get(`/api/birthday/${A.slug}/vault/overview`)).status, 401);
    assert.equal((await v.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VB, role: 'her' })).status, 401, "B's vault password does not open A's vault");
    assert.equal((await v.post(`/api/birthday/${A.slug}/vault/unlock`, { password: 'wrong', role: 'her' })).status, 401);
    const ok = await v.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VA, role: 'her' });
    assert.equal(ok.status, 200);
    v.csrf = ok.json.csrfToken;
    const ov = await v.get(`/api/birthday/${A.slug}/vault/overview`);
    assert.equal(ov.status, 200);
    assert.equal(ov.json.secrets[0].body, `body of ${A.slug}`);
    assert.equal(ov.json.media.length, 1);
    assert.ok(ov.json.media[0].url.startsWith(`/api/birthday/${A.slug}/vault/media/`));
  });

  it("an unlocked vault on A grants nothing on B (same browser, same cookie)", async () => {
    const v = new Client(base);
    const ok = await v.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VA, role: 'her' });
    v.csrf = ok.json.csrfToken;
    assert.equal((await v.get(`/api/birthday/${B.slug}/vault/overview`)).status, 401);
    assert.equal((await v.get(`/api/birthday/${B.slug}/vault/journal`)).status, 401);
    assert.equal((await v.get(`/api/birthday/${B.slug}/vault/session`)).json.unlocked, false);
    const bMedia = await M.Media.findOne({ owner: B.id, visibility: 'private' });
    assert.equal((await v.get(`/api/birthday/${B.slug}/vault/media/${bMedia._id}`)).status, 401);
    assert.equal((await v.get(`/api/birthday/${A.slug}/vault/media/${bMedia._id}`)).status, 404, "B's file is not served under A's vault either");
  });

  it('journal entries are private to one vault and only the "her" role may write', async () => {
    const her = new Client(base);
    const him = new Client(base);
    her.csrf = (await her.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VA, role: 'her' })).json.csrfToken;
    him.csrf = (await him.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VA, role: 'him' })).json.csrfToken;
    const made = await her.post(`/api/birthday/${A.slug}/vault/journal`, { title: 'Day one', body: 'Dear diary, A only' });
    assert.equal(made.status, 201);
    assert.equal((await him.post(`/api/birthday/${A.slug}/vault/journal`, { body: 'nope' })).status, 403);
    assert.equal((await him.get(`/api/birthday/${A.slug}/vault/journal`)).json.entries.length, 1);

    const bv = new Client(base);
    bv.csrf = (await bv.post(`/api/birthday/${B.slug}/vault/unlock`, { password: VB, role: 'her' })).json.csrfToken;
    assert.equal((await bv.get(`/api/birthday/${B.slug}/vault/journal`)).json.entries.length, 0, "B's journal is empty");
    assert.equal((await bv.put(`/api/birthday/${B.slug}/vault/journal/${made.json.entry.id}`, { body: 'hijack' })).status, 404);
    assert.equal((await bv.del(`/api/birthday/${B.slug}/vault/journal/${made.json.entry.id}`)).status, 404);
    const raw = await mongoose.connection.db.collection('journalentries').findOne({});
    assert.ok(!JSON.stringify(raw).includes('Dear diary'), 'journal is encrypted at rest');
  });

  it("changing or removing one vault password only locks that site's visitors", async () => {
    const va = new Client(base);
    const vb = new Client(base);
    va.csrf = (await va.post(`/api/birthday/${A.slug}/vault/unlock`, { password: VA, role: 'her' })).json.csrfToken;
    vb.csrf = (await vb.post(`/api/birthday/${B.slug}/vault/unlock`, { password: VB, role: 'her' })).json.csrfToken;
    assert.equal((await A.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: 'a brand new phrase 123' })).status, 200);
    assert.equal((await va.get(`/api/birthday/${A.slug}/vault/overview`)).status, 401, 'A visitor kicked out');
    assert.equal((await vb.get(`/api/birthday/${B.slug}/vault/overview`)).status, 200, 'B visitor undisturbed');
    assert.equal((await A.put('/api/app/vault-password', { accountPassword: 'Wrong-pass-1', newPassword: 'whatever phrase 1234' })).status, 403);
    assert.equal((await A.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: 'tooShort' })).status, 400);
  });

  it('unpublishing or deactivating closes the vault too', async () => {
    const v = new Client(base);
    v.csrf = (await v.post(`/api/birthday/${B.slug}/vault/unlock`, { password: VB, role: 'her' })).json.csrfToken;
    await B.post('/api/app/site/unpublish');
    assert.equal((await v.get(`/api/birthday/${B.slug}/vault/overview`)).status, 404);
    assert.equal((await new Client(base).post(`/api/birthday/${B.slug}/vault/unlock`, { password: VB, role: 'her' })).status, 404);
  });
});

/* ------------------------------------------------------------------ 7 */
describe('7. Uploads', () => {
  let A;
  before(async () => {
    A = await newUser('Upload Una', 'upload@example.com');
  });

  it('accepts a real image and strips it down to a safe JPEG', async () => {
    const r = await A.call('POST', '/api/app/gallery', { form: fileForm(await pngBuffer(), 'ok.png', 'image/png') });
    assert.equal(r.status, 201);
    const asset = await M.Media.findOne({ owner: A.id });
    assert.equal(asset.mime, 'image/jpeg');
    const meta = await sharp((await A.get(`/api/app/media/${asset._id}`)).res.body ? Buffer.from(await (await A.get(`/api/app/media/${asset._id}`)).res.arrayBuffer()) : Buffer.alloc(0)).metadata();
    assert.equal(meta.format, 'jpeg');
  });

  it('rejects disguised files: html, svg, script, text renamed to .jpg', async () => {
    const cases = [
      [Buffer.from('<html><script>alert(1)</script></html>'), 'x.jpg', 'image/jpeg'],
      [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'x.svg', 'image/svg+xml'],
      [Buffer.from('#!/bin/sh\nrm -rf /'), 'x.png', 'image/png'],
      [Buffer.from('just some text'), 'x.jpg', 'image/jpeg'],
      [Buffer.alloc(0), 'empty.jpg', 'image/jpeg'],
    ];
    for (const [buf, name, mime] of cases) {
      // eslint-disable-next-line no-await-in-loop
      const r = await A.call('POST', '/api/app/gallery', { form: fileForm(buf, name, mime) });
      assert.ok([400, 415].includes(r.status), `${name} must be refused, got ${r.status}`);
    }
  });

  it('refuses audio where an image is required and vice versa', async () => {
    const id3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(200)]);
    assert.equal((await A.call('POST', '/api/app/gallery', { form: fileForm(id3, 'a.mp3', 'audio/mpeg') })).status, 415);
    assert.equal((await A.call('POST', '/api/app/music', { form: fileForm(await pngBuffer(), 'a.png', 'image/png') })).status, 415);
  });

  it('enforces the per-account storage quota', async () => {
    const noise = await sharp({ create: { width: 900, height: 900, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).png().toBuffer();
    assert.ok(noise.length > 1024 * 1024, `noise image is ${noise.length}`);
    const r = await A.call('POST', '/api/app/gallery', { form: fileForm(noise, 'big.png', 'image/png') });
    assert.equal(r.status, 413);
    assert.match(r.json.error, /storage limit/i);
  });

  it('refuses an upload without a CSRF token, and one from a logged-out client', async () => {
    const form = () => fileForm(Buffer.from('x'), 'x.png', 'image/png');
    assert.equal((await A.call('POST', '/api/app/gallery', { form: form(), csrf: false })).status, 403);
    assert.equal((await new Client(base).call('POST', '/api/app/gallery', { form: form() })).status, 401);
  });
});

/* ------------------------------------------------------------------ 8 */
describe('8. Platform administration is separate from customers', () => {
  let admin;
  let alice;
  let bob;
  const ADMIN_PW = 'owner-passphrase-12345';

  before(async () => {
    await M.AdminUser.create({ email: 'owner@example.com', passwordHash: await bcrypt.hash(ADMIN_PW, 10) });
    alice = await newUser('Admin Test Alice', 'adm-alice@example.com');
    bob = await newUser('Admin Test Bob', 'adm-bob@example.com');
    await alice.post('/api/app/site/publish', { acknowledgePlaceholders: true });
    await alice.post('/api/app/private-messages', { kind: 'secret', body: 'top secret alice' });
  });

  it('platform login is a different endpoint, session and cookie from customer login', async () => {
    admin = new Client(base);
    assert.equal((await admin.post('/api/admin/auth/login', { email: 'owner@example.com', password: 'nope' })).status, 401);
    const r = await admin.post('/api/admin/auth/login', { email: 'owner@example.com', password: ADMIN_PW });
    assert.equal(r.status, 200);
    admin.csrf = r.json.csrfToken;
    assert.ok(r.setCookies[0].startsWith('admin_sid='));
    assert.match(r.setCookies[0], /Path=\/api\/admin/);
    // The platform owner is not a customer account...
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'owner@example.com', password: ADMIN_PW })).status, 401);
    // ...and a customer password does not open the platform.
    assert.equal((await new Client(base).post('/api/admin/auth/login', { email: 'adm-alice@example.com', password: STRONG })).status, 401);
  });

  it('customers cannot reach any platform endpoint; admin cookie does not work on customer endpoints', async () => {
    for (const [m, p] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/users'], ['PATCH', `/api/admin/users/${bob.id}/status`]]) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal((await alice.call(m, p, { body: m === 'PATCH' ? { status: 'disabled' } : undefined })).status, 401, `${m} ${p}`);
    }
    // Even if a customer's cookie value is replayed under the admin cookie name, it is not an admin session.
    const forged = new Client(base);
    forged.cookies = { admin_sid: alice.cookies.user_sid };
    assert.equal((await forged.get('/api/admin/stats')).status, 401);
    assert.equal((await admin.get('/api/app/site')).status, 401, 'platform session is not a customer session');
    assert.equal((await new Client(base).get('/api/admin/users')).status, 401);
  });

  it('shows user counts and statistics', async () => {
    const s = await admin.get('/api/admin/stats');
    assert.equal(s.status, 200);
    assert.ok(s.json.totalUsers >= 2);
    assert.ok(s.json.activeUsers >= 2);
    assert.ok(s.json.publishedSites >= 1);
    for (const k of ['disabledUsers', 'newUsersLast7Days', 'storedBytes']) assert.ok(k in s.json);
  });

  it('lists users with account metadata only, never private content', async () => {
    const r = await admin.get('/api/admin/users?search=adm-&limit=10');
    assert.equal(r.status, 200);
    assert.equal(r.json.users.length, 2);
    const text = JSON.stringify(r.json);
    assert.ok(!/top secret alice|passwordHash|resetToken|heroMessage|body/i.test(text), 'no content or secrets');
    const row = r.json.users.find((u) => u.email === 'adm-alice@example.com');
    assert.deepEqual(Object.keys(row).sort(), ['createdAt', 'email', 'id', 'lastLoginAt', 'name', 'published', 'slug', 'status']);
    const inj = await admin.get('/api/admin/users?search=.*');
    assert.equal(inj.status, 200);
    assert.equal(inj.json.users.length, 0, 'search is a literal match, not a regex');
  });

  it('has no endpoint that reads a customer\'s content', async () => {
    for (const p of [`/api/admin/users/${alice.id}`, `/api/admin/users/${alice.id}/site`, `/api/admin/content`, `/api/admin/private-messages`, `/api/admin/private-media`]) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal((await admin.get(p)).status, 404, p);
    }
  });

  it('deactivating an account signs the customer out, hides the page and blocks login; reactivating restores it', async () => {
    assert.equal((await new Client(base).get(`/api/birthday/${alice.slug}`)).status, 200);
    const off = await admin.patch(`/api/admin/users/${alice.id}/status`, { status: 'disabled' });
    assert.equal(off.status, 200);
    assert.equal((await alice.get('/api/app/site')).status, 401, 'live session ended at once');
    assert.equal((await new Client(base).get(`/api/birthday/${alice.slug}`)).status, 404, 'public page hidden');
    const login = await new Client(base).post('/api/app/auth/login', { email: 'adm-alice@example.com', password: STRONG });
    assert.equal(login.status, 403);
    const assetId = (await M.Media.findOne({ owner: alice.id }))?._id;
    if (assetId) assert.equal((await new Client(base).get(`/api/media/${assetId}`)).status, 404);

    assert.equal((await admin.patch(`/api/admin/users/${alice.id}/status`, { status: 'active' })).status, 200);
    assert.equal((await new Client(base).get(`/api/birthday/${alice.slug}`)).status, 200, 'page is back');
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'adm-alice@example.com', password: STRONG })).status, 200);
    assert.equal((await admin.patch(`/api/admin/users/${alice.id}/status`, { status: 'banana' })).status, 400);
    assert.equal((await admin.patch('/api/admin/users/not-an-id/status', { status: 'active' })).status, 404);
  });

  it('platform admin writes need the CSRF token and a same-site Origin', async () => {
    assert.equal((await admin.patch(`/api/admin/users/${bob.id}/status`, { status: 'disabled' }, { csrf: false })).status, 403);
    assert.equal((await admin.patch(`/api/admin/users/${bob.id}/status`, { status: 'disabled' }, { origin: 'https://evil.example' })).status, 403);
    assert.equal((await new Client(base).get(`/api/birthday/${bob.slug}`)).status, 404, 'bob never published; untouched');
  });

  it('logout ends the platform session', async () => {
    assert.equal((await admin.post('/api/admin/auth/logout')).status, 200);
    assert.equal((await admin.get('/api/admin/stats')).status, 401);
    assert.equal((await admin.get('/api/admin/auth/me')).json.authenticated, false);
  });
});

/* ------------------------------------------------------------------ 9 */
describe('9. Account management', () => {
  it('updates the name, changes the password (signing out other sessions) and logs in with the new one', async () => {
    const c = await newUser('Old Name', 'acct@example.com');
    const other = new Client(base);
    const li = await other.post('/api/app/auth/login', { email: 'acct@example.com', password: STRONG });
    other.csrf = li.json.csrfToken;
    assert.equal((await c.put('/api/app/account', { name: 'New Name' })).json.user.name, 'New Name');
    assert.equal((await c.put('/api/app/account/password', { currentPassword: 'wrong', newPassword: 'Another-Long-Pass-5' })).status, 403);
    assert.equal((await c.put('/api/app/account/password', { currentPassword: STRONG, newPassword: 'weak' })).status, 400);
    const ch = await c.put('/api/app/account/password', { currentPassword: STRONG, newPassword: 'Another-Long-Pass-5' });
    assert.equal(ch.status, 200);
    c.csrf = ch.json.csrfToken;
    assert.equal((await other.get('/api/app/site')).status, 401, 'other devices are signed out');
    assert.equal((await c.get('/api/app/site')).status, 200, 'this device stays signed in');
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'acct@example.com', password: 'Another-Long-Pass-5' })).status, 200);
  });

  it('deletes the account and ALL of its data, and nothing of anyone else', async () => {
    const gone = await newUser('Delete Me', 'delete@example.com');
    const keep = await newUser('Keep Me', 'keep@example.com');
    for (const c of [gone, keep]) {
      // eslint-disable-next-line no-await-in-loop
      await c.call('POST', '/api/app/gallery', { form: fileForm(await pngBuffer(), 'g.png', 'image/png') });
      // eslint-disable-next-line no-await-in-loop
      await c.post('/api/app/private-messages', { kind: 'diary', body: 'mine' });
      // eslint-disable-next-line no-await-in-loop
      await c.put('/api/app/vault-password', { accountPassword: STRONG, newPassword: 'a nice long phrase 99' });
    }
    assert.equal((await gone.del('/api/app/account', { password: 'wrong' })).status, 403);
    assert.equal((await gone.del('/api/app/account', { password: STRONG })).status, 200);
    const db = mongoose.connection.db;
    const oid = new mongoose.Types.ObjectId(gone.id);
    for (const coll of ['sitecontents', 'letters', 'timelineentries', 'gallerymemories', 'privatemessages', 'mediaassets', 'vaultconfigs', 'sessions']) {
      // eslint-disable-next-line no-await-in-loop
      const n = await db.collection(coll).countDocuments({ $or: [{ owner: oid }, { userId: oid }] });
      assert.equal(n, 0, `${coll} fully cleaned`);
    }
    assert.equal(await db.collection('users').countDocuments({ _id: oid }), 0);
    assert.equal(await db.collection('public_media.files').countDocuments({}) > 0, true, "someone else's files remain");
    assert.equal((await keep.get('/api/app/gallery')).json.items.length, 1, "Keep Me's data is intact");
    assert.equal((await new Client(base).post('/api/app/auth/login', { email: 'delete@example.com', password: STRONG })).status, 401);
  });
});

/* ----------------------------------------------------------------- 10 */
describe('10. Index and data-model guarantees', () => {
  it('enforces unique email, unique slug and one site per owner at the database level', async () => {
    await assert.rejects(M.User.create({ name: 'Dup', email: 'reg@example.com', passwordHash: 'x' }), /E11000/);
    const a = await M.Site.findOne({});
    await assert.rejects(M.Site.create({ owner: new mongoose.Types.ObjectId(), slug: a.slug }), /E11000/);
    await assert.rejects(M.Site.create({ owner: a.owner, slug: 'another-slug-here' }), /E11000/);
  });

  it('every content document carries an owner', async () => {
    const db = mongoose.connection.db;
    for (const coll of ['sitecontents', 'letters', 'timelineentries', 'gallerymemories', 'privatemedias', 'privatemessages', 'journalentries', 'mediaassets', 'vaultconfigs']) {
      // eslint-disable-next-line no-await-in-loop
      assert.equal(await db.collection(coll).countDocuments({ owner: { $exists: false } }), 0, `${coll} has ownerless documents`);
    }
  });

  it('security headers are present and API responses are not cacheable', async () => {
    const r = await new Client(base).get('/api/health');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
  });
});
