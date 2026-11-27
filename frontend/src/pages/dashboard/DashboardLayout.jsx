import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Eye, ExternalLink, LayoutDashboard, LogOut, MoreHorizontal, Palette, Settings, SlidersHorizontal, SquarePen, User } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import { useAuth } from '../../hooks/AuthContext.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { Sheet, ToastProvider } from '../../components/dashboard/ui.jsx';

const DashCtx = createContext({ previewRev: 0, bumpPreview: () => {} });
export const useDashboard = () => useContext(DashCtx);

// The five places a customer needs most. On phones these are ALWAYS visible in the bottom bar (no hidden menu for them).
const PRIMARY = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/customize', label: 'Customize', Icon: Palette },
  { to: '/dashboard/features', label: 'Features', Icon: SlidersHorizontal },
  { to: '/dashboard/preview', label: 'Preview', Icon: Eye },
];
// Secondary: "More" on phones, listed in the sidebar on desktop.
const SECONDARY = [
  { to: '/dashboard/website', label: 'My Website', Icon: SquarePen, hint: 'Texts, photos, letters, private area' },
  { to: '/dashboard/account', label: 'Account Settings', Icon: User, hint: 'Name, password, delete account' },
];

const sideLink = ({ isActive }) =>
  `flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm transition ${isActive ? 'bg-gold/15 text-gold-light' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory'}`;

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [previewRev, setPreviewRev] = useState(0);
  const bumpPreview = useCallback(() => setPreviewRev((n) => n + 1), []);
  const value = useMemo(() => ({ previewRev, bumpPreview }), [previewRev, bumpPreview]);

  useEffect(() => setMoreOpen(false), [pathname]);

  const doLogout = async () => {
    await logout();
    navigate('/');
  };
  const moreActive = SECONDARY.some((l) => pathname.startsWith(l.to));

  return (
    <DashCtx.Provider value={value}>
      <div className="min-h-screen bg-gradient-to-b from-burgundy-dark to-midnight text-ivory">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gold/15 bg-black/20 px-4 py-6 lg:flex">
          <Logo className="mb-8 px-2" />
          <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
            {[...PRIMARY.slice(0, 1), SECONDARY[0], ...PRIMARY.slice(1), SECONDARY[1]].map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={sideLink}>
                <Icon size={18} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 truncate px-2 text-xs text-ivory/50">{user?.name}</p>
            <button onClick={doLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 text-sm text-ivory/70 hover:bg-white/5">
              <LogOut size={18} aria-hidden="true" /> Logout
            </button>
          </div>
        </aside>

        {/* Phone top bar: just the brand. Navigation lives in the bottom bar. */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-gold/15 bg-burgundy-dark/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Logo />
          <span className="max-w-[40%] truncate text-xs text-ivory/50">{user?.name}</span>
        </header>

        <main className="px-4 pb-32 pt-6 sm:px-6 lg:pl-[17rem] lg:pr-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto max-w-6xl xl:max-w-[88rem]">
            <Outlet />
          </div>
        </main>

        {/* Phone bottom navigation */}
        <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/20 bg-burgundy-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {PRIMARY.map(({ to, label, Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${isActive ? 'text-gold-light' : 'text-ivory/60'}`}>
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? 'bg-gold/20' : ''}`}><Icon size={20} aria-hidden="true" /></span>
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${moreActive ? 'text-gold-light' : 'text-ivory/60'}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${moreActive ? 'bg-gold/20' : ''}`}><MoreHorizontal size={20} aria-hidden="true" /></span>
                <span>More</span>
              </button>
            </li>
          </ul>
        </nav>

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <ul className="space-y-1">
            {SECONDARY.map(({ to, label, Icon, hint }) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => `flex min-h-[56px] items-center gap-4 rounded-xl px-3 ${isActive ? 'bg-gold/15 text-gold-light' : 'text-ivory/85 hover:bg-white/5'}`}>
                  <Icon size={20} aria-hidden="true" />
                  <span className="min-w-0"><span className="block text-sm">{label}</span><span className="block truncate text-xs text-ivory/50">{hint}</span></span>
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/demo" className="flex min-h-[56px] items-center gap-4 rounded-xl px-3 text-ivory/85 hover:bg-white/5">
                <ExternalLink size={20} aria-hidden="true" />
                <span><span className="block text-sm">Live demo</span><span className="block text-xs text-ivory/50">See every section with sample content</span></span>
              </NavLink>
            </li>
            <li>
              <button onClick={doLogout} className="flex min-h-[56px] w-full items-center gap-4 rounded-xl px-3 text-left text-ivory/85 hover:bg-white/5">
                <Settings size={20} className="hidden" aria-hidden="true" /><LogOut size={20} aria-hidden="true" />
                <span className="text-sm">Logout</span>
              </button>
            </li>
          </ul>
        </Sheet>
      </div>
    </DashCtx.Provider>
  );
}

/** Shell of every customer page: sidebar (desktop) or bottom bar (phone) plus the page itself. Private, never indexed. */
export default function DashboardLayout() {
  useDocumentMeta({ title: 'My Dashboard', noindex: true });
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

export const PageTitle = ({ title, subtitle, children }) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
    <div className="min-w-0">
      <h1 className="font-serif text-3xl text-ivory sm:text-4xl md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-ivory/60">{subtitle}</p>}
    </div>
    {children}
  </header>
);

export const Card = ({ title, children, className = '' }) => (
  <section className={`min-w-0 rounded-2xl border border-gold/20 bg-white/[0.03] p-4 sm:p-6 ${className}`}>
    {title && <h2 className="mb-4 font-serif text-xl text-ivory sm:text-2xl">{title}</h2>}
    {children}
  </section>
);
