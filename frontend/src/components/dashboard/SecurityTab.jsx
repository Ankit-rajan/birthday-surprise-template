import { useState } from 'react';
import { api } from '../../services/api.js';
import { useApiCall, Status } from './useApiCall.jsx';

/** Turn the private "secret place" on, change its password, or switch it off. */
export default function SecurityTab({ onExpired }) {
  const [account, setAccount] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const { busy, error, ok, run } = useApiCall(onExpired);

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (next !== confirm) return setLocalError('The two new passwords do not match.');
    const r = await run(() => api.app.saveVaultPassword(account, next), 'Saved. Your private area is on, and anyone who was inside was locked out.');
    if (r) {
      setAccount('');
      setNext('');
      setConfirm('');
    }
    return undefined;
  };

  const switchOff = async () => {
    if (!account) return setLocalError('Enter your account password above to switch the private area off.');
    if (!window.confirm('Switch off the private area? Visitors will no longer see it. Your private photos and messages are kept.')) return undefined;
    setLocalError('');
    const r = await run(() => api.app.removeVault(account), 'The private area is switched off.');
    if (r) setAccount('');
    return undefined;
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h2 className="font-serif text-3xl text-ivory">Private area password</h2>
      <p className="text-sm text-ivory/60">
        Your page can have a secret place with private photos, videos, notes and a shared journal. It appears on your published page only after you set a password here.
        Use at least 10 characters, and not their date of birth. Changing it locks out everyone who is currently inside. Share the password in person, not over a channel you do not trust.
      </p>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        Your account password (to confirm it&rsquo;s you)
        <input type="password" required autoComplete="current-password" className="field mt-1" value={account} onChange={(e) => setAccount(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        New private area password
        <input type="password" autoComplete="new-password" className="field mt-1" value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-widest text-ivory/60">
        Repeat new private area password
        <input type="password" autoComplete="new-password" className="field mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {localError && <p role="alert" className="text-sm text-blush-deep">{localError}</p>}
      <Status error={error} ok={ok} />
      <div className="flex flex-wrap gap-3">
        <button className="btn-gold" disabled={busy || !next}>{busy ? 'Saving\u2026' : 'Save password'}</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={switchOff}>Switch off private area</button>
      </div>
    </form>
  );
}
