// All network access lives here. CSRF tokens are kept in memory only (never localStorage / sessionStorage).
//
// Three separate API surfaces, three separate sessions:
//   api.app       customers: auth + their own dashboard             (/api/app/*,   cookie user_sid)
//   api.platform  the platform owner: user management               (/api/admin/*, cookie admin_sid)
//   api.birthday  anonymous visitors: a published page + its vault  (/api/birthday/:slug/*)

import { ApiError } from './errors.js';

const ROOT = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const API_BASE = `${ROOT}/api`;

const csrfTokens = { app: null, admin: null, vault: null };
let onVaultUnauthorized = null;
let onAppUnauthorized = null;

export const setCsrf = (scope, token) => {
  csrfTokens[scope] = token;
};
export const setVaultUnauthorizedHandler = (fn) => {
  onVaultUnauthorized = fn;
};
export const setAppUnauthorizedHandler = (fn) => {
  onAppUnauthorized = fn;
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
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, credentials: 'include', cache: 'no-store' });
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
    if (res.status === 401 && scope === 'vault' && !path.endsWith('/vault/unlock')) onVaultUnauthorized?.();
    if (res.status === 401 && scope === 'app' && !path.startsWith('/app/auth/')) onAppUnauthorized?.();
    throw new ApiError(res.status, data?.error || 'Something went wrong. Please try again.', data?.details || data);
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

const app = (method, path, opts) => request('app', method, `/app${path}`, opts);
const platform = (method, path, opts) => request('admin', method, `/admin${path}`, opts);

/** The private vault API of ONE published page. */
export const makeVaultApi = (slug) => {
  const s = encodeURIComponent(slug);
  const v = (method, path, opts) => request('vault', method, `/birthday/${s}/vault${path}`, opts);
  return {
    unlock: (password, role) => v('POST', '/unlock', { body: { password, role } }),
    lock: () => v('POST', '/lock'),
    heartbeat: () => v('POST', '/heartbeat'),
    overview: () => v('GET', '/overview'),
    lockUrl: `${API_BASE}/birthday/${s}/vault/lock`,
    journal: {
      list: () => v('GET', '/journal'),
      create: (entry) => v('POST', '/journal', { body: entry }),
      update: (id, entry) => v('PUT', `/journal/${id}`, { body: entry }),
      remove: (id) => v('DELETE', `/journal/${id}`),
    },
  };
};

export const api = {
  birthday: (slug) => request('public', 'GET', `/birthday/${encodeURIComponent(slug)}`),
  unlockSite: (slug, password) => request('public', 'POST', `/birthday/${encodeURIComponent(slug)}/unlock-site`, { body: { password } }),

  auth: {
    me: () => app('GET', '/auth/me'),
    register: (body) => app('POST', '/auth/register', { body }),
    login: (body) => app('POST', '/auth/login', { body }),
    logout: () => app('POST', '/auth/logout'),
    forgotPassword: (email) => app('POST', '/auth/forgot-password', { body: { email } }),
    resetPassword: (token, password) => app('POST', '/auth/reset-password', { body: { token, password } }),
  },

  app: {
    // The whole dashboard payload: link name, publish state, storage, and the editable content.
    site: () => app('GET', '/site'),
    preview: () => app('GET', '/preview'),
    // Unsaved feature / relationship choices rendered by the server without saving anything.
    previewDraft: (body) => app('POST', '/preview', { body }),
    publish: (acknowledgePlaceholders = false) => app('POST', '/site/publish', { body: { acknowledgePlaceholders } }),
    unpublish: () => app('POST', '/site/unpublish'),
    checkSlug: (slug) => app('GET', `/site/slug-available?slug=${encodeURIComponent(slug)}`),
    saveSlug: (slug) => app('PUT', '/site/slug', { body: { slug } }),
    saveSettings: (settings) => app('PUT', '/site/settings', { body: settings }),
    // Universal builder: each call returns the whole dashboard payload (content.features, content.relationship, ...).
    saveFeatures: (body) => app('PUT', '/site/features', { body }),
    saveRelationship: (body) => app('PUT', '/site/relationship', { body }),
    saveAppearance: (body) => app('PUT', '/site/appearance', { body }),
    saveCopy: (copy) => app('PUT', '/site/copy', { body: { copy } }),
    setPagePassword: (accountPassword, password) => app('PUT', '/site/password', { body: { accountPassword, password } }),
    removePagePassword: (accountPassword) => app('DELETE', '/site/password', { body: { accountPassword } }),
    applyStarter: (template) => app('POST', '/site/starter', { body: { template } }),

    // Content helpers return just the editable content object.
    getContent: () => app('GET', '/site').then((p) => p.content),
    saveContent: (data) => app('PUT', '/site', { body: data }).then((p) => p.content),
    setSitePhoto: (slot, file) => app('POST', `/site-photo/${slot}`, { form: toForm({ file }) }).then((p) => p.content),
    clearSitePhoto: (slot) => app('DELETE', `/site-photo/${slot}`).then((p) => p.content),
    setMusic: (file) => app('POST', '/music', { form: toForm({ file }) }).then((p) => p.content),
    clearMusic: () => app('DELETE', '/music').then((p) => p.content),

    list: (resource) => app('GET', `/${resource}`),
    create: (resource, fields, file) => app('POST', `/${resource}`, { form: toForm({ ...fields, file }) }),
    createJson: (resource, body) => app('POST', `/${resource}`, { body }),
    update: (resource, id, body) => app('PUT', `/${resource}/${id}`, { body }),
    remove: (resource, id) => app('DELETE', `/${resource}/${id}`),

    saveVaultPassword: (accountPassword, newPassword) => app('PUT', '/vault-password', { body: { accountPassword, newPassword } }),
    removeVault: (accountPassword) => app('DELETE', '/vault-password', { body: { accountPassword } }),

    updateAccount: (name) => app('PUT', '/account', { body: { name } }),
    changePassword: (currentPassword, newPassword) => app('PUT', '/account/password', { body: { currentPassword, newPassword } }),
    deleteAccount: (password) => app('DELETE', '/account', { body: { password } }),
  },

  platform: {
    me: () => platform('GET', '/auth/me'),
    login: (email, password) => platform('POST', '/auth/login', { body: { email, password } }),
    logout: () => platform('POST', '/auth/logout'),
    stats: () => platform('GET', '/stats'),
    users: (params = {}) => platform('GET', `/users?${new URLSearchParams(params)}`),
    setUserStatus: (id, status) => platform('PATCH', `/users/${id}/status`, { body: { status } }),
  },
};
