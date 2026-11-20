import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setCsrf, setAppUnauthorizedHandler } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/**
 * Who is logged in as a CUSTOMER. (The platform owner is a separate session handled inside /platform.)
 * Holds only the account name/email and the link name. No password and no private content ever live here.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, site: null });

  const apply = useCallback((r) => {
    setCsrf('app', r.csrfToken);
    setState({ status: 'in', user: r.user, site: r.site });
  }, []);

  const signedOut = useCallback(() => {
    setCsrf('app', null);
    setState({ status: 'out', user: null, site: null });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await api.auth.me();
      if (r.authenticated) apply(r);
      else signedOut();
    } catch {
      signedOut();
    }
  }, [apply, signedOut]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // An expired customer session anywhere in the dashboard returns the person to the login page.
  useEffect(() => {
    setAppUnauthorizedHandler(signedOut);
    return () => setAppUnauthorizedHandler(null);
  }, [signedOut]);

  const login = useCallback(
    async (credentials) => {
      const r = await api.auth.login(credentials);
      apply(r);
      return r;
    },
    [apply],
  );

  const register = useCallback(
    async (details) => {
      const r = await api.auth.register(details);
      apply(r);
      return r;
    },
    [apply],
  );

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    signedOut();
  }, [signedOut]);

  const setSite = useCallback((site) => setState((s) => ({ ...s, site })), []);
  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), []);
  const setCsrfAfterPasswordChange = useCallback((token) => setCsrf('app', token), []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, refresh, setSite, setUser, setCsrfAfterPasswordChange }),
    [state, login, register, logout, refresh, setSite, setUser, setCsrfAfterPasswordChange],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
