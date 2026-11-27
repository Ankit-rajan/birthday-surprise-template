import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import BirthdaySite from '../../components/BirthdaySite.jsx';
import { Loading } from '../../components/RouteGuards.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';

/** The owner's own page, as visitors will see it, even while it is still a private draft. Full screen, no dashboard chrome. */
export default function Preview() {
  useDocumentMeta({ title: 'Preview', noindex: true });
  const [params] = useSearchParams();
  const embedded = params.get('embed') === '1';
  const [state, setState] = useState({ status: 'loading' });
  const [draft, setDraft] = useState(null);

  // Inside the dashboard's live-preview panel: apply unsaved appearance / wording drafts sent by the parent (same origin only).
  useEffect(() => {
    if (!embedded) return undefined;
    const on = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'preview-draft') return;
      setDraft(e.data.draft || null);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [embedded]);

  // Unsaved feature / relationship choices change WHAT the server may send, so they are rendered by the server (POST /preview, never saved).
  const serverDraft = useMemo(() => {
    const d = {};
    if (draft?.features && Object.keys(draft.features).length) d.features = draft.features;
    if (draft?.relationship) d.relationship = draft.relationship;
    return Object.keys(d).length ? d : null;
  }, [draft]);
  const serverKey = serverDraft ? JSON.stringify(serverDraft) : '';

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      (serverDraft ? api.app.previewDraft(serverDraft) : api.app.preview())
        .then((data) => live && setState({ status: 'ready', data }))
        .catch((err) => live && err.status !== 401 && setState((s) => (s.status === 'ready' ? s : { status: 'error', message: err.message })));
    }, serverDraft ? 250 : 0); // debounce rapid toggling
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const data = useMemo(() => (state.status === 'ready' ? state.data : null), [state]);
  if (state.status === 'loading') return <Loading label="Preparing your preview" />;
  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-burgundy-dark px-6 text-center text-ivory">
        <div><p className="mb-4">{state.message}</p><Link to="/dashboard" className="btn-gold">Back to My Dashboard</Link></div>
      </main>
    );
  }
  return <BirthdaySite data={data} mode="preview" published={data.published} embedded={embedded} overrides={draft ? { appearance: draft.appearance, copy: draft.copy } : null} />;
}
