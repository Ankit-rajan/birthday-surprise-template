// All network access lives here. Private data is only ever fetched through these functions,
// and CSRF tokens are kept in memory only (never localStorage / sessionStorage).

import { ApiError } from './errors.js';
import { demoApi } from './mockApi.js';
import { DEMO_CREDENTIALS } from '../demo/demoData.js';

/** True when started with `npm run demo`: the whole site runs in the browser with sample data, no backend. */
export const DEMO = import.meta.env.VITE_DEMO === 'true';
export { DEMO_CREDENTIALS };

const ROOT = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const API_BASE = `${ROOT}/api`;

const csrfTokens = { vault: null, admin: null };
let onVaultUnauthorized = null;

export const setCsrf = (scope, token) => {
  csrfTokens[scope] = token;
};
export const setVaultUnauthorizedHandler = (fn) => {
  onVaultUnauthorized = fn;
};

export { ApiError };

async function request(scope, method, path, { body, form } = {}) {
  const headers = {};
  if (method !== 'GET' && csrfTokens[scope]) headers['X-CSRF-Token'] = csrfTokens[scope];

  let payload;
  if (form) {
    payload = form; // the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Please check your connection and try again.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
  }

  if (!res.ok) {
    if (res.status === 401 && scope === 'vault' && path !== '/vault/unlock') onVaultUnauthorized?.();
    throw new ApiError(res.status, data?.error || 'Something went wrong. Please try again.', data?.details);
  }
  return data;
}

const toForm = (fields) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, value);
  }
  return form;
};

const vault = (method, path, opts) => request('vault', method, `/vault${path}`, opts);
const admin = (method, path, opts) => request('admin', method, `/admin${path}`, opts);

const realApi = {
  content: () => request('public', 'GET', '/content'),

  vault: {
    unlock: (password, role) => vault('POST', '/unlock', { body: { password, role } }),
    lock: () => vault('POST', '/lock'),
    heartbeat: () => vault('POST', '/heartbeat'),
    overview: () => vault('GET', '/overview'),
    journal: {
      list: () => vault('GET', '/journal'),
      create: (entry) => vault('POST', '/journal', { body: entry }),
      update: (id, entry) => vault('PUT', `/journal/${id}`, { body: entry }),
      remove: (id) => vault('DELETE', `/journal/${id}`),
    },
  },

  admin: {
    me: () => admin('GET', '/auth/me'),
    login: (email, password) => admin('POST', '/auth/login', { body: { email, password } }),
    logout: () => admin('POST', '/auth/logout'),

    getContent: () => admin('GET', '/content'),
    saveContent: (data) => admin('PUT', '/content', { body: data }),
    setSitePhoto: (slot, file) => admin('POST', `/site-photo/${slot}`, { form: toForm({ file }) }),
    clearSitePhoto: (slot) => admin('DELETE', `/site-photo/${slot}`),
    setMusic: (file) => admin('POST', '/music', { form: toForm({ file }) }),
    clearMusic: () => admin('DELETE', '/music'),

    list: (resource) => admin('GET', `/${resource}`),
    create: (resource, fields, file) => admin('POST', `/${resource}`, { form: toForm({ ...fields, file }) }),
    createJson: (resource, body) => admin('POST', `/${resource}`, { body }),
    update: (resource, id, body) => admin('PUT', `/${resource}/${id}`, { body }),
    remove: (resource, id) => admin('DELETE', `/${resource}/${id}`),

    changeVaultPassword: (adminPassword, newPassword) =>
      admin('PUT', '/vault-password', { body: { adminPassword, newPassword } }),
  },
};

// In demo mode, a 401 from the (mock) vault re-locks the page exactly like the real server would.
function wrapDemoVault(vaultApi) {
  const wrap = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err.status === 401) onVaultUnauthorized?.();
      throw err;
    }
  };
  const out = {};
  for (const [key, value] of Object.entries(vaultApi)) {
    if (key === 'unlock' || key === 'lock') out[key] = value;
    else if (typeof value === 'function') out[key] = wrap(value);
    else out[key] = Object.fromEntries(Object.entries(value).map(([k, f]) => [k, wrap(f)]));
  }
  return out;
}

export const api = DEMO ? { ...demoApi, vault: wrapDemoVault(demoApi.vault) } : realApi;
