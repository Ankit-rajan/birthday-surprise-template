import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import BirthdaySite from '../../components/BirthdaySite.jsx';
import { Loading } from '../../components/RouteGuards.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';

/** The owner's own page, as visitors will see it, even while it is still a private draft. Full screen, no dashboard chrome. */
export default function Preview() {
  useDocumentMeta({ title: 'Preview', noindex: true });
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    api.app.preview().then((data) => setState({ status: 'ready', data })).catch((err) => err.status !== 401 && setState({ status: 'error', message: err.message }));
  }, []);

  const data = useMemo(() => (state.status === 'ready' ? state.data : null), [state]);
  if (state.status === 'loading') return <Loading label="Preparing your preview" />;
  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-burgundy-dark px-6 text-center text-ivory">
        <div><p className="mb-4">{state.message}</p><Link to="/dashboard" className="btn-gold">Back to My Dashboard</Link></div>
      </main>
    );
  }
  return <BirthdaySite data={data} mode="preview" published={data.published} />;
}
