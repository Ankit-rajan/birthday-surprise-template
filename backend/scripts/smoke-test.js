/**
 * End-to-end security smoke test against a RUNNING server.
 *
 *   # terminal 1
 *   npm run dev
 *   # terminal 2
 *   VAULT_PASSWORD='your vault password' npm run smoke
 *
 * Optional env:
 *   BASE_URL=http://localhost:5000     target server
 *   ADMIN_EMAIL / ADMIN_PASSWORD       also test admin login + authorisation
 *   SLOW=1                             also test the server-side idle expiry (waits ~4 minutes)
 *   RATE_LIMIT_TEST=1                  also test the unlock rate limiter (locks YOUR IP for ~10 minutes)
 *
 * Creates and deletes one journal entry. Exits non-zero if any check fails.
 */
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const ORIGIN = process.env.TEST_ORIGIN || 'http://localhost:5173';
const VAULT_PASSWORD = process.env.VAULT_PASSWORD;

let passed = 0;
let failed = 0;
const check = (name, ok, extra = '') => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${!ok && extra ? `  -> ${extra}` : ''}`);
};

class Client {
  constructor() {
    this.cookies = {};
    this.csrf = null;
  }
  async call(method, path, { body, headers = {}, csrf = true, origin = ORIGIN } = {}) {
    const h = { ...headers };
    if (origin && method !== 'GET') h.Origin = origin;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (csrf && this.csrf) h['X-CSRF-Token'] = this.csrf;
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) h.Cookie = cookie;
    const res = await fetch(BASE + path, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const [k, ...v] = pair.split('=');
      if (/expires=thu, 01 jan 1970/i.test(raw) || v.join('=') === '') delete this.cookies[k];
      else this.cookies[k] = v.join('=');
    }
    let json = null;
    try {
      json = await res.clone().json();
    } catch {
      /* not json (media) */
    }
    return { status: res.status, json, setCookies, res };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Target: ${BASE}\n`);

  console.log('Public surface');
  const anon = new Client();
  check('GET /api/health', (await anon.call('GET', '/api/health')).status === 200);
  const content = await anon.call('GET', '/api/content');
  check('GET /api/content is public', content.status === 200 && !!content.json?.site);
  check('public content has no private fields', !JSON.stringify(content.json).includes('/api/vault/'));

  console.log('\nUnauthorised access is refused');
  for (const [method, path] of [
    ['GET', '/api/vault/overview'],
    ['GET', '/api/vault/journal'],
    ['POST', '/api/vault/journal'],
    ['POST', '/api/vault/heartbeat'],
    ['GET', '/api/vault/media/000000000000000000000000'],
    ['GET', '/api/admin/content'],
    ['GET', '/api/admin/private-media'],
    ['PUT', '/api/admin/vault-password'],
  ]) {
    const r = await anon.call(method, path, { body: method === 'GET' ? undefined : {} });
    check(`${method} ${path} -> 401`, r.status === 401, `got ${r.status}`);
  }
  const forgedOrigin = await anon.call('POST', '/api/vault/unlock', {
    body: { password: 'x', role: 'her' },
    origin: 'https://evil.example',
  });
  check('unlock from a foreign Origin -> 403', forgedOrigin.status === 403, `got ${forgedOrigin.status}`);

  if (!VAULT_PASSWORD) {
    console.log('\n(Set VAULT_PASSWORD to test the unlocked vault.)');
  } else {
    console.log('\nVault login');
    const wrong = await anon.call('POST', '/api/vault/unlock', { body: { password: 'definitely-wrong-password', role: 'her' } });
    check('wrong password -> 401', wrong.status === 401, `got ${wrong.status}`);
    check('wrong password sets no cookie', wrong.setCookies.length === 0);

    const her = new Client();
    const ok = await her.call('POST', '/api/vault/unlock', { body: { password: VAULT_PASSWORD, role: 'her' } });
    check('correct password -> 200', ok.status === 200, `got ${ok.status}`);
    her.csrf = ok.json?.csrfToken;
    const cookie = ok.setCookies.find((c) => c.startsWith('vault_sid=')) || '';
    check('cookie is HttpOnly', /httponly/i.test(cookie));
    check('cookie has SameSite', /samesite=(strict|lax|none)/i.test(cookie));
    check('cookie has no Max-Age/Expires (dies with the browser)', !/max-age|expires/i.test(cookie));
    check('response body does not echo the password or a hash', !JSON.stringify(ok.json).includes(VAULT_PASSWORD) && !/\$2[aby]\$/.test(JSON.stringify(ok.json)));

    const overview = await her.call('GET', '/api/vault/overview');
    check('overview with session -> 200', overview.status === 200 && Array.isArray(overview.json?.media));

    console.log('\nCSRF and roles');
    const noCsrf = await her.call('POST', '/api/vault/journal', { body: { body: 'x' }, csrf: false });
    check('journal write without CSRF token -> 403', noCsrf.status === 403, `got ${noCsrf.status}`);

    const him = new Client();
    const hi = await him.call('POST', '/api/vault/unlock', { body: { password: VAULT_PASSWORD, role: 'him' } });
    him.csrf = hi.json?.csrfToken;
    check('second person can unlock the same vault', hi.status === 200);
    const hisWrite = await him.call('POST', '/api/vault/journal', { body: { body: 'should not be allowed' } });
    check('role "him" cannot write journal entries -> 403', hisWrite.status === 403, `got ${hisWrite.status}`);
    const hisRead = await him.call('GET', '/api/vault/journal');
    check('role "him" can read journal -> 200', hisRead.status === 200);

    console.log('\nJournal (her)');
    const created = await her.call('POST', '/api/vault/journal', { body: { title: 'smoke test', body: 'temporary entry' } });
    check('her can create an entry -> 201', created.status === 201, `got ${created.status}`);
    const id = created.json?.entry?.id;
    const seenByHim = await him.call('GET', '/api/vault/journal');
    check('him can read her saved entry', seenByHim.json?.entries?.some((e) => e.id === id));
    const hisEdit = await him.call('PUT', `/api/vault/journal/${id}`, { body: { body: 'tampered' } });
    check('him cannot edit her entry -> 403', hisEdit.status === 403, `got ${hisEdit.status}`);
    const hisDelete = await him.call('DELETE', `/api/vault/journal/${id}`);
    check('him cannot delete her entry -> 403', hisDelete.status === 403, `got ${hisDelete.status}`);
    const herDelete = await her.call('DELETE', `/api/vault/journal/${id}`);
    check('her can delete her entry -> 200', herDelete.status === 200, `got ${herDelete.status}`);

    console.log('\nPrivate media');
    const first = overview.json?.media?.[0];
    if (first) {
      const noCookie = await anon.call('GET', first.url);
      check('private media without cookie -> 401', noCookie.status === 401, `got ${noCookie.status}`);
      const withCookie = await her.call('GET', first.url);
      check('private media with session -> 200', withCookie.status === 200, `got ${withCookie.status}`);
      check('private media is Cache-Control: private, no-store', /no-store/.test(withCookie.res.headers.get('cache-control') || ''));
      const id = first.url.split('/').pop().split('?')[0];
      const viaPublic = await anon.call('GET', `/api/media/${id}`);
      check('private asset is NOT served by the public media route -> 404', viaPublic.status === 404, `got ${viaPublic.status}`);
    } else {
      console.log('  (no private media uploaded yet - upload one in the admin dashboard to test this section)');
    }

    console.log('\nLock Again');
    const lockRes = await her.call('POST', '/api/vault/lock', { csrf: false });
    check('lock -> 200', lockRes.status === 200);
    const after = await her.call('GET', '/api/vault/overview');
    check('overview after lock -> 401', after.status === 401, `got ${after.status}`);
    const reuse = new Client();
    reuse.cookies = { vault_sid: cookie.split(';')[0].split('=').slice(1).join('=') };
    const replay = await reuse.call('GET', '/api/vault/overview');
    check('the old session token is dead server-side (replay) -> 401', replay.status === 401, `got ${replay.status}`);
    await him.call('POST', '/api/vault/lock', { csrf: false });

    if (process.env.SLOW) {
      console.log('\nIdle expiry (waiting ~4 minutes)');
      const idle = new Client();
      const r = await idle.call('POST', '/api/vault/unlock', { body: { password: VAULT_PASSWORD, role: 'her' } });
      idle.csrf = r.json?.csrfToken;
      await sleep((Number(process.env.VAULT_IDLE_SECONDS || 180) + 50) * 1000);
      const expired = await idle.call('GET', '/api/vault/overview');
      check('session expires after the idle limit -> 401', expired.status === 401, `got ${expired.status}`);
    }
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    console.log('\nAdmin');
    const admin = new Client();
    const bad = await admin.call('POST', '/api/admin/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: 'wrong-wrong-wrong' } });
    check('admin wrong password -> 401', bad.status === 401, `got ${bad.status}`);
    const good = await admin.call('POST', '/api/admin/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    check('admin login -> 200', good.status === 200, `got ${good.status}`);
    admin.csrf = good.json?.csrfToken;
    check('admin cookie is HttpOnly', /httponly/i.test(good.setCookies.find((c) => c.startsWith('admin_sid=')) || ''));
    check('admin GET /content -> 200', (await admin.call('GET', '/api/admin/content')).status === 200);
    const noCsrf = await admin.call('PUT', '/api/admin/content', { body: {}, csrf: false });
    check('admin write without CSRF -> 403', noCsrf.status === 403, `got ${noCsrf.status}`);
    // a vault session must not grant admin access
    if (VAULT_PASSWORD) {
      const v = new Client();
      await v.call('POST', '/api/vault/unlock', { body: { password: VAULT_PASSWORD, role: 'her' } });
      const cross = await v.call('GET', '/api/admin/content');
      check('vault session cannot reach admin API -> 401', cross.status === 401, `got ${cross.status}`);
      await v.call('POST', '/api/vault/lock', { csrf: false });
    }
    await admin.call('POST', '/api/admin/auth/logout');
    check('admin after logout -> 401', (await admin.call('GET', '/api/admin/content')).status === 401);
  }

  if (process.env.RATE_LIMIT_TEST) {
    console.log('\nRate limiting (this will block your IP from unlocking for ~10 minutes)');
    const rl = new Client();
    let saw429 = false;
    for (let i = 0; i < 10; i += 1) {
      const r = await rl.call('POST', '/api/vault/unlock', { body: { password: `wrong-${i}-wrong`, role: 'her' } });
      if (r.status === 429) saw429 = true;
    }
    check('repeated wrong passwords eventually -> 429', saw429);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err.message);
  console.error('Is the server running at', BASE, '?');
  process.exit(2);
});
