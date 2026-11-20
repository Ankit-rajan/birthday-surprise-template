import { createContext, useContext, useMemo } from 'react';

/**
 * Per-page look-and-feel switches chosen by the page owner in Customize:
 * falling petals, confetti, built-in celebration sounds, and the cake.
 */
export const DEFAULT_FX = {
  petals: true,
  confetti: true,
  sounds: true,
  cake: { theme: 'rose', candles: 5, showAge: true },
};

const Ctx = createContext(DEFAULT_FX);
export const useSiteFx = () => useContext(Ctx);

export function SiteFxProvider({ settings, children }) {
  const value = useMemo(
    () => ({
      petals: settings?.effects?.petals ?? true,
      confetti: settings?.effects?.confetti ?? true,
      sounds: settings?.effects?.celebrationSounds ?? true,
      cake: { ...DEFAULT_FX.cake, ...(settings?.cake || {}) },
    }),
    [settings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
