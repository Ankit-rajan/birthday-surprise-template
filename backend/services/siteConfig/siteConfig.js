/**
 * Pure helpers shared by the API and the website (this exact file is duplicated in
 * frontend/src/config/siteConfig/, see siteConfig.json). No I/O, no framework imports.
 */
import config from './configData.js';

export const CONFIG = config;
export const MODES = Object.keys(config.modes);
export const FEATURES = config.features;
export const FEATURE_KEYS = FEATURES.map((f) => f.key);
export const FEATURE_BY_KEY = Object.fromEntries(FEATURES.map((f) => [f.key, f]));
export const THEMES = config.themes;
export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const FONTS = config.fonts;
export const FONT_BY_ID = Object.fromEntries(FONTS.map((f) => [f.id, f]));
export const COPY_KEYS = Object.keys(config.copy.love);

export const DEFAULT_MODE = 'love';

export const typesFor = (mode) => config.modes[mode]?.types ?? [];
export const isValidType = (mode, type) => typesFor(mode).some((t) => t.id === type);
export const defaultTypeFor = (mode) => config.modes[mode]?.defaultType ?? 'partner';

/** Defaults for every feature. */
export const FEATURE_DEFAULTS = Object.fromEntries(FEATURES.map((f) => [f.key, f.default]));

/**
 * `stored` is whatever the owner saved (possibly partial, possibly empty for old sites). Missing keys fall back to the
 * registry default, so adding a feature later never needs a data migration.
 * Returns the owner's own switch positions ("raw"), without applying dependencies.
 */
export function rawFeatures(stored = {}, legacy = {}) {
  const out = {};
  for (const f of FEATURES) {
    const own = stored?.[f.key];
    if (typeof own === 'boolean') out[f.key] = own;
    else if (typeof legacy?.[f.key] === 'boolean') out[f.key] = legacy[f.key];
    else out[f.key] = f.default;
  }
  return out;
}

/** Applies dependencies: a feature is ON only if its own switch AND everything it `requires` is ON. */
export function effectiveFeatures(raw) {
  const memo = {};
  const visiting = new Set();
  const resolve = (key) => {
    if (key in memo) return memo[key];
    if (visiting.has(key)) return false; // defensive: dependency cycle
    visiting.add(key);
    const f = FEATURE_BY_KEY[key];
    let on = Boolean(f && raw[key]);
    if (on) for (const parent of f.requires || []) if (!resolve(parent)) { on = false; break; }
    visiting.delete(key);
    memo[key] = on;
    return on;
  };
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, resolve(k)]));
}

/** The first required parent that is OFF, or null. Used by the dashboard to explain a greyed-out switch. */
export function blockedBy(key, raw) {
  const eff = effectiveFeatures(raw);
  const f = FEATURE_BY_KEY[key];
  for (const parent of f?.requires || []) if (!eff[parent]) return parent;
  return null;
}

export const resolveFeatures = (stored, legacy) => effectiveFeatures(rawFeatures(stored, legacy));

/** Convenience for components: accepts either an effective map or a partial one. */
export const featuresOf = (site) => effectiveFeatures(rawFeatures(site?.features));

/* ------------------------------------------------------------------ copy */

const interpolate = (text, vars) =>
  String(text).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));

export function addressFor(mode, type) {
  return typesFor(mode).find((t) => t.id === type)?.address ?? 'my love';
}

/**
 * Final text of every label: the owner's override if they wrote one, otherwise the default for their relationship mode.
 * Placeholders: {name} birthday person, {sender} who made the page, {address}, {age}, {n}, {total}.
 */
export function resolveCopy({ mode, type, overrides = {}, name = '', sender = '' } = {}) {
  const m = config.copy[mode] ? mode : DEFAULT_MODE;
  const base = config.copy[m];
  const vars = { name, sender, address: addressFor(m, type) };
  const out = {};
  for (const key of COPY_KEYS) {
    const custom = typeof overrides?.[key] === 'string' && overrides[key].trim() ? overrides[key] : null;
    out[key] = interpolate(custom ?? base[key], vars);
  }
  return out;
}

/** Fills the remaining per-render placeholders ({age}, {n}, {total}). */
export const fill = (text, vars) => interpolate(text, vars);

/* ----------------------------------------------------------------- themes */

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v) => typeof v === 'string' && HEX.test(v);

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const rgbTriplet = (hex) => toRgb(hex).join(' ');

/** The five colours the owner can choose, after merging the preset with their own overrides. Null = classic look. */
export function resolvePalette(appearance = {}) {
  const preset = THEME_BY_ID[appearance?.theme]?.colors ?? null;
  const pick = (key) => (isHex(appearance?.[`${key}Color`]) ? appearance[`${key}Color`] : preset?.[key] ?? null);
  const palette = {
    primary: pick('primary'),
    secondary: pick('secondary'),
    background: pick('background'),
    text: pick('text'),
    button: pick('button'),
  };
  return Object.values(palette).every((v) => v === null) ? null : palette;
}

/**
 * CSS custom properties for a palette. Tailwind colours (burgundy, gold, ivory, midnight, btn) read these variables,
 * so the whole page re-themes without touching any component. Anything not chosen keeps the classic value.
 */
export function themeVars(appearance = {}) {
  const vars = {};
  const p = resolvePalette(appearance);
  if (p) {
    const bg = p.background ?? '#0b0709';
    const sec = p.secondary ?? '#5a0f23';
    if (p.background || p.secondary) {
      vars['--c-midnight'] = rgbTriplet(bg);
      vars['--c-burgundy'] = rgbTriplet(sec);
      vars['--c-burgundy-dark'] = rgbTriplet(mix(sec, bg, 0.66));
      vars['--c-burgundy-deep'] = rgbTriplet(mix(sec, bg, 0.36));
      vars['--c-burgundy-soft'] = rgbTriplet(mix(sec, '#ffffff', 0.12));
    }
    if (p.primary) {
      vars['--c-gold'] = rgbTriplet(p.primary);
      vars['--c-gold-light'] = rgbTriplet(mix(p.primary, '#ffffff', 0.35));
      vars['--c-gold-dark'] = rgbTriplet(mix(p.primary, '#000000', 0.22));
    }
    if (p.text) {
      vars['--c-ivory'] = rgbTriplet(p.text);
      vars['--c-cream'] = rgbTriplet(mix(p.text, '#ffffff', 0.3));
    }
    const button = p.button ?? p.primary;
    if (button) {
      vars['--c-btn'] = rgbTriplet(button);
      vars['--c-btn-light'] = rgbTriplet(mix(button, '#ffffff', 0.35));
      vars['--c-btn-text'] = luminance(button) > 0.38 ? '20 8 12' : '250 244 232';
    }
  }
  const font = FONT_BY_ID[appearance?.font];
  if (font && font.id !== 'elegant') {
    vars['--font-serif'] = font.serif;
    vars['--font-script'] = font.script;
    vars['--font-hand'] = font.hand;
  }
  return vars;
}

export const themesFor = (mode) => THEMES.filter((t) => !t.legacy && t.modes.includes(mode));
