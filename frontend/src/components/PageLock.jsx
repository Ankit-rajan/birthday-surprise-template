import { useState } from 'react';
import { Lock } from 'lucide-react';
import { api } from '../services/api.js';

/** Shown instead of a password-protected page. The server sends nothing else until the right password is entered. */
export default function PageLock({ slug, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.unlockSite(slug, password);
      setPassword('');
      onUnlocked();
    } catch (err) {
      setPassword('');
      setError(err.status === 401 ? 'That is not the password. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-burgundy-dark to-midnight px-5 text-center">
      <form onSubmit={submit} className="w-full max-w-sm" autoComplete="off">
        <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-gold/50 bg-gold/10 text-gold-light">
          <Lock size={26} aria-hidden="true" />
        </span>
        <h1 className="font-serif text-3xl text-ivory">This surprise is locked</h1>
        <p className="mt-3 font-serif text-lg italic text-ivory/70">Enter the password you were given to open it.</p>
        <label htmlFor="page-password" className="sr-only">Password</label>
        <input
          id="page-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="off"
          autoCapitalize="none"
          className="field mt-8 text-center"
          aria-invalid={!!error}
        />
        {error && <p role="alert" className="mt-3 text-sm text-blush-deep">{error}</p>}
        <button type="submit" disabled={busy || !password} className="btn-gold mt-6 w-full">{busy ? 'Opening…' : 'Open'}</button>
      </form>
    </main>
  );
}
