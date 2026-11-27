import { createContext, useContext, useMemo } from 'react';
import { useSiteConfig } from './SiteConfig.jsx';

/**
 * Per-page effects. Everything is derived from the owner's feature switches (the single source of truth);
 * `settings.cake` (flavour, candles) is the only part that is not a switch.
 */
export const DEFAULT_FX = {
  petals: true,
  confetti: true,
  fireworks: false,
  sounds: true,
  candles: true,
  floating: false,
  particles: true,
  background: true,
  cursor: false,
  cake: { theme: 'rose', candles: 5, showAge: true },
};

const Ctx = createContext(DEFAULT_FX);
export const useSiteFx = () => useContext(Ctx);

export function SiteFxProvider({ settings, children }) {
  const { features: f } = useSiteConfig();
  const value = useMemo(
    () => ({
      petals: f.petals,
      confetti: f.confetti,
      fireworks: f.fireworks,
      sounds: f.celebrationSounds,
      candles: f.candles,
      floating: f.floatingElements,
      particles: f.particleEffects,
      background: f.backgroundAnimations,
      cursor: f.cursorEffects,
      cake: { ...DEFAULT_FX.cake, ...(settings?.cake || {}), showAge: f.showAge },
    }),
    [f, settings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
