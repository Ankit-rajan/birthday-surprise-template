import { createContext, useContext, useEffect, useMemo } from 'react';
import { useReducedMotion as useOsReducedMotion } from 'framer-motion';
import { effectiveFeatures, rawFeatures, resolveCopy, fill, themeVars, FONT_BY_ID, DEFAULT_MODE, defaultTypeFor } from '../config/siteConfig/siteConfig.js';
import { playSparkle } from '../utils/sound.js';

/**
 * ONE resolved configuration per page: relationship, switches, wording and appearance. The published page, the owner's preview
 * and the demo all build it from the same payload with the same code, so they can never disagree.
 *
 * Old pages and the demo carry no `features` / `relationship` / `copy`: every one of those falls back to the classic romantic page.
 */
const Ctx = createContext(null);

export function resolveSiteConfig(site) {
  const mode = site?.relationship?.mode || DEFAULT_MODE;
  const type = site?.relationship?.type || defaultTypeFor(mode);
  // The server sends switches with dependencies already applied; applying them again is harmless and covers old/demo payloads.
  const features = effectiveFeatures(rawFeatures(site?.features || {}));
  const copy = resolveCopy({ mode, type, overrides: site?.copy || {}, name: site?.herName || '', sender: site?.partnerName || '' });
  return { mode, type, features, copy, appearance: site?.appearance || {}, vars: themeVars(site?.appearance || {}) };
}

/** Loads the Google font of the chosen typography once. */
function ensureFont(fontId) {
  const font = FONT_BY_ID[fontId];
  if (!font?.google) return;
  const id = `site-font-${font.id}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${font.google}&display=swap`;
  document.head.appendChild(link);
}

/** Puts the theme's CSS variables on <html> while a birthday page is on screen (the dashboard keeps its own look). */
function useApplyTheme(vars, fontId) {
  const key = JSON.stringify(vars);
  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(vars);
    entries.forEach(([k, v]) => root.style.setProperty(k, v));
    ensureFont(fontId);
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    if (vars['--c-burgundy-dark'] && meta) meta.setAttribute('content', `rgb(${vars['--c-burgundy-dark'].split(' ').join(',')})`);
    return () => {
      entries.forEach(([k]) => root.style.removeProperty(k));
      if (meta && before) meta.setAttribute('content', before);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fontId]);
}

export function SiteConfigProvider({ site, overrides, children }) {
  const merged = useMemo(() => (overrides ? { ...site, ...overrides } : site), [site, overrides]);
  const value = useMemo(() => resolveSiteConfig(merged), [merged]);
  useApplyTheme(value.vars, value.appearance.font);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSiteConfig = () => useContext(Ctx) || resolveSiteConfig({});
export const useFeatures = () => useSiteConfig().features;

/** Wording of the page: `t('galleryTitle')`, `t('reasonsRevealed', { n: 3, total: 20 })`. */
export function useCopy() {
  const { copy } = useSiteConfig();
  return useMemo(() => {
    const t = (key, vars) => (vars ? fill(copy[key] ?? '', vars) : copy[key] ?? '');
    t.copy = copy;
    return t;
  }, [copy]);
}

/** True when animation should be minimised: the visitor's OS asks for it, or the owner switched "Animated transitions" off. */
export function useReducedMotion() {
  const os = useOsReducedMotion();
  const cfg = useContext(Ctx);
  return Boolean(os || (cfg && !cfg.features.animatedTransitions));
}

/** The small "tick" sound of flipping a card or opening a letter, only when the owner left "Sound effects" on. */
export function useSfx() {
  const { features } = useSiteConfig();
  return useMemo(() => () => { if (features.soundEffects) playSparkle(); }, [features.soundEffects]);
}
