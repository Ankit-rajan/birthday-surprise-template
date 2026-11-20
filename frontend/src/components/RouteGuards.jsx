import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext.jsx';

export const Loading = ({ label = 'Loading' }) => (
  <div className="grid min-h-screen place-items-center bg-burgundy-dark" role="status" aria-live="polite">
    <p className="animate-pulse font-script text-3xl text-gold-light">{label}&hellip;</p>
  </div>
);

/** Only a safe, same-site, in-app path may be used as a post-login destination (no open redirects). */
export const safeNext = (value, fallback = '/dashboard') => (typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback);

/** Customer-only pages. Anyone else is sent to the login page and brought back afterwards. */
export function RequireCustomer({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  if (status === 'out') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

/** Login / register pages: someone who is already signed in goes straight to their dashboard. */
export function GuestOnly({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  if (status === 'in') return <Navigate to="/dashboard" replace />;
  return children;
}
