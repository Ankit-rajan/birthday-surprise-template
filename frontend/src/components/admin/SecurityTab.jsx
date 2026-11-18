import { useState } from 'react';
import { api } from '../../services/api.js';
import { useAdminCall, Status } from './useAdminCall.jsx';

export default function SecurityTab({ onExpired }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const { busy, error, ok, run } = useAdminCall(onExpired);

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (next !== confirm) return setLocalError('The two new passwords do not match.');
    const r = await run(() => api.admin.changeVaultPassword(adminPassword, next), 'Vault password changed. Everyone inside the vault was locked out.');
    if (r) {
      setAdminPassword('');
      setNext('');
      setConfirm('');
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h2 className="font-serif text-3xl text-ivory">Change the vault password</h2>
      <p className="text-sm text-ivory/60">
        The shared password for both of you. At least 10 characters, and it must not contain her date of birth. Changing it locks everyone currently inside the vault.
        Tell her the new password in person, not over a channel you do not trust.
      </p>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        Your admin password (to confirm it&rsquo;s you)
        <input type="password" required autoComplete="current-password" className="field mt-1" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        New vault password
        <input type="password" required autoComplete="new-password" className="field mt-1" value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        Repeat new vault password
        <input type="password" required autoComplete="new-password" className="field mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {localError && <p role="alert" className="text-sm text-blush-deep">{localError}</p>}
      <Status error={error} ok={ok} />
      <button className="btn-gold" disabled={busy}>{busy ? 'Changing…' : 'Change vault password'}</button>
    </form>
  );
}
