import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import Petals from '../components/Petals.jsx';
import { useAuth } from '../hooks/AuthContext.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { safeNext } from '../components/RouteGuards.jsx';
import { api } from '../services/api.js';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#5a0f23,#240610_60%,#0b0709)] px-5 py-12">
      <Petals density={0.4} />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center"><Logo className="justify-center" /></div>
        <div className="rounded-3xl border border-gold/30 bg-midnight/70 p-7 shadow-soft backdrop-blur sm:p-9">
          <h1 className="text-center font-serif text-4xl text-ivory">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-sm text-ivory/60">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-ivory/60">{footer}</p>
      </div>
    </main>
  );
}

const Label = ({ children }) => <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-ivory/60">{children}</span>;
const ErrorLine = ({ children }) => (children ? <p role="alert" className="rounded-xl border border-blush-deep/40 bg-blush-deep/10 px-4 py-3 text-sm text-blush">{children}</p> : null);

function PasswordField({ value, onChange, autoComplete, label = 'Password', hint, id }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block" htmlFor={id}>
      <Label>{label}</Label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} required value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="field pr-12" maxLength={72} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-ivory/50 hover:text-gold-light" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-ivory/45">{hint}</span>}
    </label>
  );
}

export function Login() {
  useDocumentMeta({ title: 'Login', noindex: true });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email: form.email, password: form.password, remember: form.remember });
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setForm((f) => ({ ...f, password: '' }));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your dashboard." footer={<>New here? <Link to="/register" className="text-gold-light underline-offset-4 hover:underline">Create your own</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <Label>Email</Label>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" maxLength={254} />
        </label>
        <PasswordField id="login-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="current-password" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-ivory/70">
            <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} className="accent-[#d4b483]" /> Keep me signed in
          </label>
          <Link to="/forgot-password" className="text-gold-light/90 underline-offset-4 hover:underline">Forgot password?</Link>
        </div>
        <ErrorLine>{error}</ErrorLine>
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Logging in\u2026' : 'Login'}</button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  useDocumentMeta({ title: 'Create your account', noindex: true });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.details?.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <AuthShell title="Create your own" subtitle="Your private workspace is ready in seconds." footer={<>Already have an account? <Link to="/login" className="text-gold-light underline-offset-4 hover:underline">Login</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <Label>Your name</Label>
          <input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" maxLength={80} />
        </label>
        <label className="block">
          <Label>Email</Label>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" maxLength={254} />
        </label>
        <PasswordField id="reg-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" hint="At least 10 characters, with letters and a number or symbol." />
        <PasswordField id="reg-confirm" label="Repeat password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" />
        <ErrorLine>{error}</ErrorLine>
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Creating\u2026' : 'Create my account'}</button>
        <p className="text-center text-xs text-ivory/45">Your page stays private until you decide to publish it.</p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  useDocumentMeta({ title: 'Forgot password', noindex: true });
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.auth.forgotPassword(email);
      setDone(r.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We will email you a link to choose a new one." footer={<Link to="/login" className="text-gold-light underline-offset-4 hover:underline">Back to login</Link>}>
      {done ? (
        <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-sm text-gold-light">{done}</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <Label>Email</Label>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" maxLength={254} />
          </label>
          <ErrorLine>{error}</ErrorLine>
          <button className="btn-gold w-full" disabled={busy}>{busy ? 'Sending\u2026' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  useDocumentMeta({ title: 'Choose a new password', noindex: true });
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await api.auth.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login" className="text-gold-light underline-offset-4 hover:underline">Back to login</Link>}>
      {!token ? (
        <ErrorLine>This reset link is incomplete. Please request a new one.</ErrorLine>
      ) : done ? (
        <div className="space-y-5 text-center">
          <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-sm text-gold-light">Your password has been changed.</p>
          <Link to="/login" className="btn-gold w-full">Login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <PasswordField id="rp-new" label="New password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" hint="At least 10 characters, with letters and a number or symbol." />
          <PasswordField id="rp-confirm" label="Repeat new password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" />
          <ErrorLine>{error}</ErrorLine>
          <button className="btn-gold w-full" disabled={busy}>{busy ? 'Saving\u2026' : 'Change password'}</button>
        </form>
      )}
    </AuthShell>
  );
}
