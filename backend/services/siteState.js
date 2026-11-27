import {
  rawFeatures,
  effectiveFeatures,
  resolveFeatures,
  DEFAULT_MODE,
  defaultTypeFor,
  isValidType,
  THEME_BY_ID,
  FEATURE_KEYS,
  CONFIG,
} from './siteConfig/siteConfig.js';

const plain = (v) => (v?.toObject ? v.toObject() : v ?? {});

/** Values chosen on the old Customize page, before feature switches existed. Used only while a switch has no value of its own. */
export function legacyFeatureValues(site) {
  const s = plain(site.settings);
  const out = {};
  for (const [key, path] of Object.entries(CONFIG.legacyFeatureSources)) {
    const [, group, field] = path.split('.');
    const v = s?.[group]?.[field];
    if (typeof v === 'boolean') out[key] = v;
  }
  return out;
}

/** The owner's own switch positions (dependencies NOT applied). */
export const siteRawFeatures = (site) => rawFeatures(plain(site.features), legacyFeatureValues(site));

/** What visitors actually get: switch positions with dependencies applied. */
export const siteFeatures = (site) => resolveFeatures(plain(site.features), legacyFeatureValues(site));

export const siteRelationship = (site) => {
  const mode = CONFIG.modes[site.relationship?.mode] ? site.relationship.mode : DEFAULT_MODE;
  const type = isValidType(mode, site.relationship?.type) ? site.relationship.type : defaultTypeFor(mode);
  return { mode, type };
};

export const siteAppearance = (site) => {
  const a = plain(site.appearance);
  return {
    theme: a.theme && THEME_BY_ID[a.theme] ? a.theme : null,
    primaryColor: a.primaryColor || null,
    secondaryColor: a.secondaryColor || null,
    backgroundColor: a.backgroundColor || null,
    textColor: a.textColor || null,
    buttonColor: a.buttonColor || null,
    font: a.font || null,
  };
};

/** Only the labels the owner rewrote. Everything else is resolved from the relationship mode by the page. */
export const siteCopyOverrides = (site) => {
  const m = site.copyOverrides;
  const entries = m instanceof Map ? [...m.entries()] : Object.entries(m || {});
  return Object.fromEntries(entries.filter(([k, v]) => typeof v === 'string' && v.trim()));
};

export { FEATURE_KEYS, effectiveFeatures };
