import { Link } from 'react-router-dom';
import { BRAND } from '../brand.js';

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="lm-bg" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#7b1a35" />
          <stop offset="1" stopColor="#240610" />
        </radialGradient>
        <linearGradient id="lm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecd9b0" />
          <stop offset="1" stopColor="#b08d57" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lm-bg)" />
      <path d="M32 47 C14 35 16 20 26 19 C29 19 31 21 32 24 C33 21 35 19 38 19 C48 20 50 35 32 47Z" fill="url(#lm-gold)" />
      <path d="M44 12 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6z" fill="#fff8ec" opacity="0.9" />
    </svg>
  );
}

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label={`${BRAND.name} home`}>
      <LogoMark />
      <span className="font-script text-3xl leading-none text-gold-light">{BRAND.name}</span>
    </Link>
  );
}
