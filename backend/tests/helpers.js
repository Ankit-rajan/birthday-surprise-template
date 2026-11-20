import sharp from 'sharp';

let ipCounter = 10;

/** Minimal browser-like client: cookie jar, CSRF token, Origin header and its own fake IP (own rate-limit bucket). */
export class Client {
  constructor(base, origin = 'http://localhost:5173') {
    this.base = base;
    this.origin = origin;
    this.cookies = {};
    this.csrf = null;
    this.ip = `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter += 1) % 250}`;
  }

  async call(method, path, { body, form, csrf = true, origin = this.origin, headers = {} } = {}) {
    const h = { 'X-Forwarded-For': this.ip, ...headers };
    if (origin && method !== 'GET' && method !== 'HEAD') h.Origin = origin;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      h['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    if (csrf && this.csrf) h['X-CSRF-Token'] = this.csrf;
    const jar = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (jar) h.Cookie = jar;
    const res = await fetch(this.base + path, { method, headers: h, body: payload, redirect: 'manual' });
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      if (/expires=thu, 01 jan 1970/i.test(c) || v.join('=') === '') delete this.cookies[k];
      else this.cookies[k] = v.join('=');
    }
    let json = null;
    const type = res.headers.get('content-type') || '';
    if (type.includes('json')) json = await res.clone().json().catch(() => null);
    return { status: res.status, json, headers: res.headers, setCookies: raw, res };
  }

  get(path, o) { return this.call('GET', path, o); }
  post(path, body, o) { return this.call('POST', path, { body, ...o }); }
  put(path, body, o) { return this.call('PUT', path, { body, ...o }); }
  patch(path, body, o) { return this.call('PATCH', path, { body, ...o }); }
  del(path, body, o) { return this.call('DELETE', path, { body, ...o }); }
}

export async function pngBuffer(color = '#d4607a', w = 64, h = 48) {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
}

export function fileForm(buffer, filename, mime, fields = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', new Blob([buffer], { type: mime }), filename);
  return form;
}

export const STRONG = 'Sunflower-Moon-42';
