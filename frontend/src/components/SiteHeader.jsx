import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../hooks/AuthContext.jsx';

const PUBLIC_LINKS = [
  ['/', 'Home'],
  ['/demo', 'Explore Demo'],
  ['/#features', 'Features'],
  ['/#how-it-works', 'How It Works'],
];

/**
 * Header of the public pages. What it shows depends on who is looking:
 *   visitor  -> Home, Explore Demo, Features, How It Works, Login, Create Your Own
 *   customer -> My Dashboard, My Birthday Website, Customize, Preview, Account Settings, Logout
 * The platform-administration area is never linked from here, for anyone.
 */
export default function SiteHeader({ transparent = false }) {
  const { status, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(!transparent);
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = status === 'in';

  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    if (!transparent) return undefined;
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [transparent]);

  const links = loggedIn
    ? [
        ['/dashboard', 'My Dashboard', true],
        ['/dashboard/website', 'My Birthday Website'],
        ['/dashboard/customize', 'Customize'],
        ['/dashboard/preview', 'Preview'],
        ['/dashboard/account', 'Account Settings'],
      ]
    : PUBLIC_LINKS;

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkCls = 'text-[13px] tracking-wide text-ivory/75 transition hover:text-gold-light';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${solid ? 'bg-burgundy-dark/90 shadow-soft backdrop-blur-md' : ''}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-6 lg:flex">
          {links.map(([to, label, end]) => (
            <li key={to}>
              {to.includes('#') ? (
                <Link to={to} className={linkCls}>{label}</Link>
              ) : (
                <NavLink to={to} end={end ?? to === '/'} className={({ isActive }) => `${linkCls} ${isActive ? '!text-gold-light' : ''}`}>
                  {label}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 lg:flex">
          {loggedIn ? (
            <>
              <span className="max-w-[10rem] truncate text-xs text-ivory/50">{user?.name}</span>
              <button onClick={doLogout} className="btn-ghost !px-5 !py-2 !text-xs">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkCls}>Login</Link>
              <Link to="/register" className="btn-gold !px-5 !py-2 !text-xs">Create Your Own</Link>
            </>
          )}
        </div>
        <button
          className="rounded-full p-2 text-ivory hover:bg-white/10 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <ul id="site-menu" className="mx-4 mb-3 space-y-1 rounded-2xl border border-gold/20 bg-burgundy-dark/95 p-3 backdrop-blur-md lg:hidden">
          {links.map(([to, label]) => (
            <li key={to}>
              <Link to={to} className="block rounded-xl px-4 py-3 text-sm text-ivory/85 hover:bg-white/10">{label}</Link>
            </li>
          ))}
          <li className="flex gap-2 px-1 pt-2">
            {loggedIn ? (
              <button onClick={doLogout} className="btn-ghost w-full">Logout</button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost flex-1">Login</Link>
                <Link to="/register" className="btn-gold flex-1">Create Your Own</Link>
              </>
            )}
          </li>
        </ul>
      )}
    </header>
  );
}
