import { useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useVault } from '../../hooks/VaultContext.jsx';
import { DEMO, DEMO_CREDENTIALS } from '../../services/api.js';
import Petals from '../Petals.jsx';

function GoldLock({ opening }) {
  return (
    <div className="relative mx-auto mb-8 grid h-28 w-28 place-items-center" aria-hidden="true">
      <motion.span
        className="absolute inset-0 rounded-full bg-gold/20 blur-xl"
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-b from-gold-light to-gold-dark shadow-glow"
        animate={opening ? { rotate: 0, scale: 1.1 } : { y: [0, -4, 0] }}
        transition={opening ? { duration: 0.4 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {opening ? <Unlock size={38} className="text-burgundy-dark" /> : <Lock size={38} className="text-burgundy-dark" />}
      </motion.span>
    </div>
  );
}

export default function LockScreen({ herName = 'the birthday person' }) {
  const vault = useVault();
  const controls = useAnimationControls();
  const inputRef = useRef(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('her');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      await vault.unlock(password, role);
      setSuccess(true);
      setPassword(''); // never keep the password around
    } catch (err) {
      setPassword('');
      setError(
        err.status === 401
          ? 'That is not the password. Try again, my love.'
          : err.status === 429
            ? err.message
            : err.status === 503
              ? 'The vault has not been set up yet.'
              : err.message,
      );
      controls.start({ x: [0, -12, 10, -7, 4, 0], transition: { duration: 0.5 } });
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden px-5 py-24 md:py-32">
      <Petals density={0.25} />
      <motion.div animate={controls} className="relative z-10 mx-auto max-w-md text-center">
        <GoldLock opening={success} />
        <p className="eyebrow mb-3">Private love vault</p>
        <h2 className="font-serif text-4xl text-ivory md:text-5xl">Our Little Secret Place</h2>
        <p className="mt-3 font-serif text-xl italic text-gold-light/90">Some memories are just for us.</p>

        {DEMO && (
          <p className="mx-auto mt-6 rounded-xl border border-dashed border-gold/50 px-4 py-3 text-sm text-gold-light">
            Demo mode &mdash; the password is <code className="rounded bg-white/10 px-1.5 py-0.5">{DEMO_CREDENTIALS.vaultPassword}</code>
          </p>
        )}

        {vault.notice && (
          <p role="status" className="mx-auto mt-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-light">
            {vault.notice}
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5 text-left" autoComplete="off">
          <fieldset>
            <legend className="mb-2 block text-center text-[11px] uppercase tracking-[0.3em] text-ivory/60">Who is opening it?</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['her', `I am ${herName}`],
                ['him', "I'm her person"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${
                    role === value ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70 hover:border-gold/50'
                  }`}
                >
                  <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="vault-password" className="sr-only">
              Vault password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="vault-password"
                name="vault-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Our secret password"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'vault-error' : undefined}
                className="field pr-12 text-center"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-ivory/60 hover:text-gold-light"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p id="vault-error" role="alert" className="mt-3 text-center text-sm text-blush-deep">
                {error}
              </p>
            )}
          </div>

          <button type="submit" disabled={busy || !password} className="btn-gold w-full">
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
