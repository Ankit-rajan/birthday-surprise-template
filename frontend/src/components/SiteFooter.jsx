import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Logo from './Logo.jsx';
import { BRAND } from '../brand.js';

export default function SiteFooter() {
  const col = 'space-y-2.5 text-sm text-ivory/65';
  const a = 'inline-block py-1.5 transition hover:text-gold-light';
  return (
    <footer className="border-t border-gold/15 bg-midnight px-6 pb-10 pt-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/60">
            Personal birthday websites with photos, letters, music and a cake to blow out. Made to be opened, not just seen.
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.3em] text-gold">Product</h2>
          <ul className={col}>
            <li><Link className={a} to="/demo">Explore the live demo</Link></li>
            <li><Link className={a} to="/#features">Features</Link></li>
            <li><Link className={a} to="/#how-it-works">How it works</Link></li>
            <li><Link className={a} to="/#faq">FAQ</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.3em] text-gold">Account</h2>
          <ul className={col}>
            <li><Link className={a} to="/register">Create your own</Link></li>
            <li><Link className={a} to="/login">Login</Link></li>
            <li><Link className={a} to="/forgot-password">Forgot password</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.3em] text-gold">Contact</h2>
          <ul className={col}>
            {BRAND.contactEmail ? (
              <li>
                <a className={`${a} inline-flex items-center gap-2`} href={`mailto:${BRAND.contactEmail}`}>
                  <Mail size={15} aria-hidden="true" /> {BRAND.contactEmail}
                </a>
              </li>
            ) : (
              <li><Link className={a} to="/#faq">Questions? Read the FAQ</Link></li>
            )}
            {BRAND.social.map(([label, url]) => (
              <li key={label}>
                <a className={a} href={url} target="_blank" rel="noopener noreferrer">{label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-14 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-ivory/40">
        &copy; {new Date().getFullYear()} {BRAND.name}. Every demo name, story and picture is fictional.
      </p>
    </footer>
  );
}
