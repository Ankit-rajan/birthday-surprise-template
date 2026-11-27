import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, makeVaultApi } from '../services/api.js';
import BirthdaySite from '../components/BirthdaySite.jsx';
import { Loading } from '../components/RouteGuards.jsx';
import Petals from '../components/Petals.jsx';
import PageLock from '../components/PageLock.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

function Unavailable() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-b from-burgundy-dark to-midnight px-6 text-center">
      <Petals density={0.5} />
      <div className="relative z-10 max-w-lg">
        <p className="eyebrow mb-4">Birthday page</p>
        <h1 className="gold-text font-script text-6xl md:text-8xl">Not available</h1>
        <p className="mx-auto mt-4 font-serif text-xl italic text-ivory/75">
          This page doesn&rsquo;t exist, or its owner hasn&rsquo;t shared it yet. Double-check the link you were given.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-gold">Create your own</Link>
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
      </div>
    </main>
  );
}

/** /birthday/:slug. Anyone can open a published page; unpublished and unknown names look identical. */
export default function PublicBirthday() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const vaultApi = useMemo(() => makeVaultApi(slug), [slug]);
  const title = state.status === 'ready' ? state.data.site.siteName : 'Birthday surprise';
  useDocumentMeta({ title, noindex: true }); // private gifts: keep them out of search engines

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api.birthday(slug)
      .then((data) => !cancelled && setState(data.redirectTo ? { status: 'redirect', to: data.redirectTo } : data.locked ? { status: 'locked' } : { status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'missing' }));
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  if (state.status === 'loading') return <Loading label="Opening your surprise" />;
  if (state.status === 'redirect') return <Navigate to={`/birthday/${state.to}`} replace />;
  if (state.status === 'missing') return <Unavailable />;
  if (state.status === 'locked') return <PageLock slug={slug} onUnlocked={() => setReloadKey((n) => n + 1)} />;
  return <BirthdaySite key={slug} data={state.data} mode="public" vaultApi={vaultApi} />;
}
