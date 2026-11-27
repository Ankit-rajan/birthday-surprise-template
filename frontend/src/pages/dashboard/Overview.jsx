import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, Copy, ExternalLink, Eye, Globe, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/AuthContext.jsx';
import { PageTitle, Card } from './DashboardLayout.jsx';
import PublicLink from '../../components/PublicLink.jsx';
import { Status } from '../../components/dashboard/useApiCall.jsx';

const mb = (b) => (b / 1024 / 1024).toFixed(b > 10 * 1024 * 1024 ? 0 : 1);

function LinkNameEditor({ site, onChanged }) {
  const [value, setValue] = useState(site.slug);
  const [check, setCheck] = useState({ state: 'idle', reason: '' });
  const [msg, setMsg] = useState({ error: '', ok: '' });
  const timer = useRef();
  const dirty = value !== site.slug;

  useEffect(() => setValue(site.slug), [site.slug]);
  useEffect(() => {
    clearTimeout(timer.current);
    if (!dirty) return setCheck({ state: 'idle', reason: '' });
    setCheck({ state: 'checking', reason: '' });
    timer.current = setTimeout(async () => {
      try {
        const r = await api.app.checkSlug(value.trim().toLowerCase());
        setCheck({ state: r.available ? 'ok' : 'bad', reason: r.reason });
      } catch {
        setCheck({ state: 'idle', reason: '' });
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [value, dirty]);

  const save = async () => {
    setMsg({ error: '', ok: '' });
    try {
      const next = await api.app.saveSlug(value.trim().toLowerCase());
      onChanged(next);
      setMsg({ error: '', ok: 'Link updated. Your old link will forward to the new one.' });
    } catch (err) {
      setMsg({ error: err.message, ok: '' });
    }
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-ivory/60" htmlFor="slug">Link name</label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ivory/50">{window.location.host}/birthday/</span>
        <input id="slug" className="field !w-auto min-w-[10rem] flex-1" value={value} onChange={(e) => setValue(e.target.value.toLowerCase())} maxLength={40} autoCapitalize="none" spellCheck={false} />
        <button className="btn-ghost !py-2" disabled={!dirty || check.state !== 'ok'} onClick={save}>Save link</button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-xs" role="status">
        {check.state === 'checking' && <span className="text-ivory/50">Checking&hellip;</span>}
        {check.state === 'ok' && <span className="text-gold-light">That link name is available.</span>}
        {check.state === 'bad' && <span className="text-blush-deep">{check.reason}</span>}
      </p>
      <Status error={msg.error} ok={msg.ok} />
    </div>
  );
}

export default function Overview() {
  const { user, setSite } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const apply = useCallback((d) => {
    setData(d);
    setSite({ slug: d.slug, published: d.published });
  }, [setSite]);

  useEffect(() => {
    api.app.site().then(apply).catch((e) => e.status !== 401 && setError(e.message));
  }, [apply]);

  if (!data) return <p className="text-ivory/60" role="status">{error || 'Loading your dashboard\u2026'}</p>;

  const url = `${window.location.origin}${data.publicPath}`;
  const run = async (fn) => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      apply(await fn());
    } catch (err) {
      if (err.status === 409 && err.details?.placeholders) {
        if (window.confirm(`${err.message}\n\nStill unedited: ${err.details.placeholders.length} item(s).\n\nPublish anyway?`)) {
          try {
            apply(await api.app.publish(true));
          } catch (e2) {
            setError(e2.message);
          }
        }
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const useSample = () => {
    if (!window.confirm('Replace your current text with the fictional sample (Aanya and Aarav)? Your photos are not changed. You can then edit every line.')) return;
    run(() => api.app.applyStarter('aanya')).then(() => setNotice('Sample text loaded. Make it yours in My Birthday Website.'));
  };

  const c = data.content;
  const checklist = [
    ['Add their name and yours', c.herName !== 'Their Name' && c.partnerName !== 'Your Name', '/dashboard/website'],
    ['Write your birthday message and wishes', !data.placeholders.length, '/dashboard/website'],
    ['Add a cover photo', Boolean(c.photos.hero), '/dashboard/website'],
    ['Choose your cake and music', Boolean(c.music.url), '/dashboard/customize'],
    ['Preview your page', false, '/dashboard/preview'],
    ['Publish and share the link', data.published, '/dashboard'],
  ];
  const pct = Math.min(100, (data.storage.usedBytes / data.storage.quotaBytes) * 100);

  return (
    <>
      <PageTitle title={`Hello, ${user.name.split(' ')[0]}`} subtitle="This is your private workspace. Only you can see and change what is inside it." />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Your birthday website">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest ${data.published ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-ivory/70'}`}>
              <Globe size={14} aria-hidden="true" /> {data.published ? 'Published' : 'Draft (private)'}
            </span>
            {data.published ? (
              <button className="btn-ghost !py-2" disabled={busy} onClick={() => run(api.app.unpublish)}>Unpublish</button>
            ) : (
              <button className="btn-gold !py-2" disabled={busy} onClick={() => run(() => api.app.publish(false))}>Publish my page</button>
            )}
            <Link to="/dashboard/preview" className="btn-ghost !py-2"><Eye size={15} className="mr-2" aria-hidden="true" />Preview</Link>
          </div>

          <div className="mb-6 rounded-xl border border-gold/25 bg-black/20 p-4">
            <PublicLink url={url} canOpen={data.published} />
            {!data.published && <p className="mt-2 text-xs text-ivory/50">The link works once you publish. Until then, only you can see the page.</p>}
          </div>

          <LinkNameEditor site={data} onChanged={apply} />
          <div aria-live="polite" className="mt-4">
            {error && <p role="alert" className="text-sm text-blush-deep">{error}</p>}
            {notice && <p role="status" className="text-sm text-gold-light">{notice}</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Getting started">
            <ul className="space-y-3">
              {checklist.map(([label, done, to]) => (
                <li key={label}>
                  <Link to={to} className="flex items-center gap-3 py-1.5 text-sm text-ivory/80 hover:text-gold-light">
                    {done ? <Check size={16} className="text-green-400" aria-label="Done" /> : <Circle size={16} className="text-ivory/30" aria-label="To do" />}
                    <span className={done ? 'line-through opacity-60' : ''}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Storage">
            <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ivory/55">{mb(data.storage.usedBytes)} MB of {mb(data.storage.quotaBytes)} MB used by your photos, videos and music.</p>
          </Card>
        </div>
      </div>

      <Card title="Need inspiration?" className="mt-6">
        <p className="mb-4 max-w-2xl text-sm text-ivory/65">
          Explore the fictional demo to see every section, or load its sample text into your own workspace as a starting point. Nothing from the demo is copied unless you choose it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/demo" className="btn-ghost !py-2">Explore the live demo</Link>
          <button className="btn-ghost !py-2" disabled={busy} onClick={useSample}><Sparkles size={15} className="mr-2" aria-hidden="true" />Start from the sample text</button>
        </div>
      </Card>
    </>
  );
}
