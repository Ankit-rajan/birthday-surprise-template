import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/AuthContext.jsx';
import { PageTitle, Card } from './DashboardLayout.jsx';
import { Status, useApiCall } from '../../components/dashboard/useApiCall.jsx';

const Field = ({ label, children }) => <label className="block text-xs uppercase tracking-widest text-ivory/60">{label}{children}</label>;

export default function Account() {
  const { user, setUser, setCsrfAfterPasswordChange, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [localError, setLocalError] = useState('');
  const [del, setDel] = useState('');
  const profile = useApiCall();
  const password = useApiCall();
  const danger = useApiCall();

  const saveName = (e) => {
    e.preventDefault();
    profile.run(() => api.app.updateAccount(name), 'Name updated.').then((r) => r && setUser(r.user));
  };

  const changePw = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (pw.next !== pw.confirm) return setLocalError('The two new passwords do not match.');
    const r = await password.run(() => api.app.changePassword(pw.current, pw.next), 'Password changed. Your other devices were signed out.');
    if (r) {
      setCsrfAfterPasswordChange(r.csrfToken);
      setPw({ current: '', next: '', confirm: '' });
    }
    return undefined;
  };

  const remove = async (e) => {
    e.preventDefault();
    if (!window.confirm('Permanently delete your account and everything in it? This cannot be undone.')) return;
    const r = await danger.run(() => api.app.deleteAccount(del), 'Account deleted.');
    if (r) {
      await refresh();
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      <PageTitle title="Account Settings" subtitle="Your name, password and account." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your details">
          <form onSubmit={saveName} className="space-y-4">
            <Field label="Name"><input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
            <Field label="Email"><input className="field mt-1 opacity-60" value={user.email} readOnly aria-readonly="true" /></Field>
            <Status error={profile.error} ok={profile.ok} />
            <button className="btn-gold" disabled={profile.busy || name === user.name}>Save name</button>
          </form>
        </Card>
        <Card title="Change password">
          <form onSubmit={changePw} className="space-y-4">
            <Field label="Current password"><input type="password" required autoComplete="current-password" className="field mt-1" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password"><input type="password" required autoComplete="new-password" className="field mt-1" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} maxLength={72} /></Field>
            <Field label="Repeat new password"><input type="password" required autoComplete="new-password" className="field mt-1" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} maxLength={72} /></Field>
            {localError && <p role="alert" className="text-sm text-blush-deep">{localError}</p>}
            <Status error={password.error} ok={password.ok} />
            <button className="btn-gold" disabled={password.busy}>Change password</button>
          </form>
        </Card>
        <Card title="Delete my account" className="border-blush-deep/40 lg:col-span-2">
          <p className="mb-4 max-w-2xl text-sm text-ivory/65">This permanently removes your account, your published page and every photo, video, letter and message you stored. It cannot be undone.</p>
          <form onSubmit={remove} className="flex flex-wrap items-end gap-3">
            <Field label="Confirm with your password"><input type="password" required autoComplete="current-password" className="field mt-1 !w-72" value={del} onChange={(e) => setDel(e.target.value)} /></Field>
            <button className="btn-ghost !border-blush-deep/60 !text-blush" disabled={danger.busy}>Delete everything</button>
          </form>
          <div className="mt-3"><Status error={danger.error} ok={danger.ok} /></div>
        </Card>
      </div>
    </>
  );
}
