import { useCallback, useEffect, useState } from 'react';
import { api, setCsrf } from '../../services/api.js';
import Logo from '../../components/Logo.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never');
const fmtMb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

function Login({ onDone }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.platform.login(form.email, form.password);
      setCsrf('admin', r.csrfToken);
      onDone(r);
    } catch (err) {
      setForm((f) => ({ ...f, password: '' }));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-midnight px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border border-gold/30 bg-white/[0.03] p-8">
        <h1 className="text-center font-serif text-3xl text-ivory">Platform Administration</h1>
        <p className="text-center text-xs text-ivory/50">For the owner of this service only.</p>
        <label className="block text-xs uppercase tracking-widest text-ivory/60">Email<input type="email" required autoComplete="username" className="field mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block text-xs uppercase tracking-widest text-ivory/60">Password<input type="password" required autoComplete="current-password" className="field mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p role="alert" className="text-sm text-blush-deep">{error}</p>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in\u2026' : 'Sign in'}</button>
      </form>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-widest text-ivory/50">{label}</p>
      <p className="mt-1 font-serif text-4xl text-ivory">{value}</p>
    </div>
  );
}

function Console({ me, onLogout }) {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ users: [], total: 0, page: 1, limit: 25 });
  const [q, setQ] = useState({ search: '', status: '', page: 1 });
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const expired = useCallback((err) => {
    if (err.status === 401) onLogout();
    else setError(err.message);
  }, [onLogout]);

  const load = useCallback(() => {
    api.platform.stats().then(setStats).catch(expired);
    const params = { page: q.page, limit: 25 };
    if (q.search) params.search = q.search;
    if (q.status) params.status = q.status;
    api.platform.users(params).then(setList).catch(expired);
  }, [q, expired]);

  useEffect(() => {
    const t = setTimeout(load, q.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q.search]);

  const toggle = async (u) => {
    const next = u.status === 'active' ? 'disabled' : 'active';
    const verb = next === 'disabled' ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${verb} ${u.name} (${u.email})?${next === 'disabled' ? ' They will be signed out and their page will go offline.' : ''}`)) return;
    setBusyId(u.id);
    setError('');
    try {
      await api.platform.setUserStatus(u.id, next);
      load();
    } catch (err) {
      expired(err);
    } finally {
      setBusyId('');
    }
  };

  const pages = Math.max(1, Math.ceil(list.total / list.limit));

  return (
    <div className="min-h-screen bg-midnight text-ivory">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4"><Logo to="/platform" /><span className="hidden text-xs uppercase tracking-widest text-gold sm:inline">Platform Administration</span></div>
          <div className="flex items-center gap-3 text-xs text-ivory/60"><span className="hidden sm:inline">{me.email}</span><button className="btn-ghost !px-4 !py-2 !text-xs" onClick={onLogout}>Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <section aria-label="Platform statistics" className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Registered users" value={stats?.totalUsers ?? '\u2026'} />
          <Stat label="Active accounts" value={stats?.activeUsers ?? '\u2026'} />
          <Stat label="Published pages" value={stats?.publishedSites ?? '\u2026'} />
          <Stat label="New (7 days)" value={stats?.newUsersLast7Days ?? '\u2026'} />
          <Stat label="Deactivated" value={stats?.disabledUsers ?? '\u2026'} />
          <Stat label="New (30 days)" value={stats?.newUsersLast30Days ?? '\u2026'} />
          <Stat label="Stored files" value={stats?.storedFiles ?? '\u2026'} />
          <Stat label="Storage used" value={stats ? fmtMb(stats.storedBytes) : '\u2026'} />
        </section>

        <section aria-label="Users">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto font-serif text-3xl">Users</h2>
            <input className="field !w-64" placeholder="Search name or email" aria-label="Search users" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} />
            <select className="field !w-40" aria-label="Filter by status" value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value, page: 1 })}>
              <option value="">All accounts</option><option value="active">Active</option><option value="disabled">Deactivated</option>
            </select>
          </div>
          <p className="mb-3 text-xs text-ivory/45">Account information only. Customers&rsquo; photos, letters and private messages are never shown here.</p>
          {error && <p role="alert" className="mb-3 text-sm text-blush-deep">{error}</p>}
          <div className="overflow-x-auto rounded-2xl border border-gold/20">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-widest text-ivory/55">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Joined</th><th className="p-3">Last login</th><th className="p-3">Page</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3">{u.name}</td>
                    <td className="p-3 text-ivory/70">{u.email}</td>
                    <td className="p-3 text-ivory/60">{fmtDate(u.createdAt)}</td>
                    <td className="p-3 text-ivory/60">{fmtDate(u.lastLoginAt)}</td>
                    <td className="p-3 text-ivory/60">{u.slug ? `/birthday/${u.slug}` : '-'} {u.published ? '(live)' : '(draft)'}</td>
                    <td className="p-3"><span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-widest ${u.status === 'active' ? 'bg-green-500/15 text-green-300' : 'bg-blush-deep/20 text-blush'}`}>{u.status === 'active' ? 'Active' : 'Deactivated'}</span></td>
                    <td className="p-3 text-right"><button className="btn-ghost !px-4 !py-1.5 !text-xs" disabled={busyId === u.id} onClick={() => toggle(u)}>{u.status === 'active' ? 'Deactivate' : 'Reactivate'}</button></td>
                  </tr>
                ))}
                {!list.users.length && <tr><td colSpan={7} className="p-8 text-center text-ivory/50">No users match.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-ivory/55">
            <span>{list.total} user{list.total === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-3">
              <button className="btn-ghost !px-4 !py-1.5 !text-xs" disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })}>Previous</button>
              Page {q.page} of {pages}
              <button className="btn-ghost !px-4 !py-1.5 !text-xs" disabled={q.page >= pages} onClick={() => setQ({ ...q, page: q.page + 1 })}>Next</button>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

/** /platform: the platform owner's own login and console. Not linked from anywhere a customer can see. */
export default function PlatformApp() {
  useDocumentMeta({ title: 'Platform Administration', noindex: true });
  const [me, setMe] = useState({ status: 'loading' });

  useEffect(() => {
    api.platform.me().then((r) => {
      if (r.authenticated) {
        setCsrf('admin', r.csrfToken);
        setMe({ status: 'in', email: r.email });
      } else setMe({ status: 'out' });
    }).catch(() => setMe({ status: 'out' }));
  }, []);

  const logout = useCallback(async () => {
    await api.platform.logout().catch(() => {});
    setCsrf('admin', null);
    setMe({ status: 'out' });
  }, []);

  if (me.status === 'loading') return <div className="grid min-h-screen place-items-center bg-midnight text-gold" role="status">Loading&hellip;</div>;
  if (me.status === 'out') return <Login onDone={(r) => setMe({ status: 'in', email: r.email })} />;
  return <Console me={me} onLogout={logout} />;
}
