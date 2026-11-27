import { useMemo } from 'react';
import { useSiteConfig, useReducedMotion } from '../hooks/SiteConfig.jsx';

const SYMBOLS = { love: ['♥', '✦', '♡', '✧'], friendship: ['★', '✦', '♪', '✧', '☺'] };

/** A light layer of symbols that drift upward. Pure CSS (transform + opacity), never captures taps, never causes overflow. */
export default function FloatingElements({ count = 14 }) {
  const { mode } = useSiteConfig();
  const reduce = useReducedMotion();
  const items = useMemo(() => {
    const set = SYMBOLS[mode] || SYMBOLS.love;
    return Array.from({ length: count }, (_, i) => ({
      ch: set[i % set.length],
      left: (i * 97) % 100,
      size: 12 + ((i * 7) % 14),
      delay: (i * 1.3) % 9,
      dur: 11 + ((i * 3) % 8),
    }));
  }, [mode, count]);
  if (reduce) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className="floaty absolute bottom-[-24px] text-gold-light/40"
          style={{ left: `${it.left}%`, fontSize: it.size, animationDelay: `${it.delay}s`, animationDuration: `${it.dur}s` }}
        >
          {it.ch}
        </span>
      ))}
    </div>
  );
}
