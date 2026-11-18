import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setCsrf, DEMO, DEMO_CREDENTIALS } from '../services/api.js';
import ContentTab from '../components/admin/ContentTab.jsx';
import SiteMediaTab from '../components/admin/SiteMediaTab.jsx';
import { GalleryTab, PrivateMediaTab } from '../components/admin/MediaTabs.jsx';
import { TimelineTab, LettersTab, MessagesTab } from '../components/admin/TextTabs.jsx';
import SecurityTab from '../components/admin/SecurityTab.jsx';

const TABS = [
  ['content', 'Website text', ContentTab],
  ['site-media', 'Photos & music', SiteMediaTab],
  ['gallery', 'Gallery', GalleryTab],
  ['timeline', 'Timeline', TimelineTab],
  ['letters', 'Letters', LettersTab],
  ['private-media', 'Private media', PrivateMediaTab],
  ['messages', 'Private messages', MessagesTab],
  ['security', 'Vault password', SecurityTab],
];

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.admin.login(email, password);
      setCsrf('admin', r.csrfToken);
      setPassword('');
      onDone(r);
    } catch (err) {
      setPassword('');
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-burgundy-dark px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-gold/30 bg-midnight/60 p-8">
        <h1 className="text-center font-serif text-3xl text-ivory">Admin sign in</h1>
        {DEMO && (
          <p className="rounded-xl border border-dashed border-gold/50 px-3 py-2 text-xs text-gold-light">
            Demo mode. Email <code className="rounded bg-white/10 px-1">{DEMO_CREDENTIALS.adminEmail}</code>, password{' '}
            <code className="rounded bg-white/10 px-1">{DEMO_CREDENTIALS.adminPassword}</code>
          </p>
        )}
        <label className="block text-xs uppercase tracking-widest text-ivory/60">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="field mt-1" />
        </label>
        <label className="block text-xs uppercase tracking-widest text-ivory/60">
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="field mt-1" />
        </label>
        {error && <p role="alert" className="text-sm text-blush-deep">{error}</p>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="block text-center text-xs text-ivory/50 hover:text-gold-light">Back to the site</Link>
      </form>
    </main>
  );
}

export default function Admin() {
  const [auth, setAuth] = useState({ status: 'loading' });
  const [tab, setTab] = useState('content');

  useEffect(() => {
    document.title = 'Admin';
    api.admin
      .me()
      .then((r) => {
        if (r.authenticated) {
          setCsrf('admin', r.csrfToken);
          setAuth({ status: 'in', email: r.email });
        } else setAuth({ status: 'out' });
      })
      .catch(() => setAuth({ status: 'out' }));
  }, []);

  const logout = useCallback(async () => {
    await api.admin.logout().catch(() => {});
    setCsrf('admin', null);
    setAuth({ status: 'out' });
  }, []);

  // Any admin API 401 (expired session) sends the user back to the login form.
  const onExpired = useCallback(() => {
    setCsrf('admin', null);
    setAuth({ status: 'out' });
  }, []);

  if (auth.status === 'loading') return <div className="grid min-h-screen place-items-center bg-burgundy-dark text-gold">Loading&hellip;</div>;
  if (auth.status === 'out') return <Login onDone={(r) => setAuth({ status: 'in', email: r.email })} />;

  const Active = TABS.find(([id]) => id === tab)[2];
  return (
    <div className="min-h-screen bg-burgundy-dark">
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-midnight/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="font-serif text-xl text-gold-light">Admin dashboard</h1>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-ivory/50 sm:inline">{auth.email}</span>
            <Link to="/" className="btn-ghost !px-4 !py-2">View site</Link>
            <button onClick={logout} className="btn-ghost !px-4 !py-2">Sign out</button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-widest ${tab === id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/65'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Active onExpired={onExpired} />
      </main>
    </div>
  );
}
