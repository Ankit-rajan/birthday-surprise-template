import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, API_BASE, setCsrf, setVaultUnauthorizedHandler } from '../services/api.js';

const VaultCtx = createContext(null);
export const useVault = () => useContext(VaultCtx);

const DEFAULT_IDLE_SECONDS = 180;
const WARN_SECONDS = 20;
const HEARTBEAT_EVERY_MS = 30_000;

/**
 * Holds ONLY the unlock state (never the password, never private content).
 *
 * Locking behaviour:
 *   - "Lock Again", inactivity, a 401 from any vault API, or leaving the page all lock immediately
 *   - Closing/reloading the tab sends a beacon that destroys the server session
 *   - A fresh page load always starts locked (and clears any stale server session)
 */
export function VaultProvider({ children }) {
  const [state, setState] = useState({ status: 'locked', role: null, idleSeconds: DEFAULT_IDLE_SECONDS, notice: '' });
  const [warnSeconds, setWarnSeconds] = useState(null);

  const lock = useCallback(async (notice = '') => {
    setCsrf('vault', null);
    setWarnSeconds(null);
    // Hide everything first, then tell the server.
    setState((s) => ({ status: 'locked', role: null, idleSeconds: s.idleSeconds, notice }));
    try {
      await api.vault.lock();
    } catch {
      /* the cookie is session-only and the server expires it anyway */
    }
  }, []);

  const unlock = useCallback(async (password, role) => {
    const result = await api.vault.unlock(password, role);
    setCsrf('vault', result.csrfToken);
    setState({ status: 'unlocked', role: result.role, idleSeconds: result.idleSeconds || DEFAULT_IDLE_SECONDS, notice: '' });
  }, []);

  // Any 401 from a vault API means the server ended the session.
  useEffect(() => {
    setVaultUnauthorizedHandler(() => lock('Your session ended. Please unlock again.'));
    return () => setVaultUnauthorizedHandler(null);
  }, [lock]);

  // Fresh page load / refresh => start locked and destroy any leftover server session.
  useEffect(() => {
    api.vault.lock().catch(() => {});
  }, []);

  // Closing or reloading the tab destroys the server session (beacons cannot set headers, so /lock needs no CSRF token).
  useEffect(() => {
    const onPageHide = () => {
      try {
        navigator.sendBeacon?.(`${API_BASE}/vault/lock`);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  // Inactivity lock + keep-alive while the person is actually using the vault.
  useEffect(() => {
    if (state.status !== 'unlocked') return undefined;
    const idleMs = state.idleSeconds * 1000;
    let lastActive = Date.now();
    let lastBeat = Date.now();

    const bump = () => {
      lastActive = Date.now();
      if (Date.now() - lastBeat > HEARTBEAT_EVERY_MS) {
        lastBeat = Date.now();
        api.vault.heartbeat().catch(() => {});
      }
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    // Watching a private video counts as activity (media events do not bubble, so capture them).
    document.addEventListener('timeupdate', bump, true);

    const notice = `Locked after ${Math.round(state.idleSeconds / 60)} minutes of inactivity.`;
    const tick = setInterval(() => {
      const idle = Date.now() - lastActive;
      if (idle >= idleMs) {
        lock(notice);
      } else if (idle >= idleMs - WARN_SECONDS * 1000) {
        setWarnSeconds(Math.ceil((idleMs - idle) / 1000));
      } else {
        setWarnSeconds(null);
      }
    }, 1000);

    // Background tabs throttle timers, so re-check when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActive >= idleMs) lock(notice);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('timeupdate', bump, true);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(tick);
    };
  }, [state.status, state.idleSeconds, lock]);

  const value = useMemo(
    () => ({ ...state, warnSeconds, unlock, lock }),
    [state, warnSeconds, unlock, lock],
  );
  return <VaultCtx.Provider value={value}>{children}</VaultCtx.Provider>;
}
