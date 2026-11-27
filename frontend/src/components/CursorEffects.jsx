import { useEffect } from 'react';
import { useSiteConfig, useReducedMotion } from '../hooks/SiteConfig.jsx';

const GLYPHS = { love: ['♥', '✦', '♡'], friendship: ['★', '✦', '♪'] };

/**
 * Sparkles that follow the mouse (desktop) or burst where a finger taps (phones). Appended to <body> with pointer-events:none,
 * removed after ~0.8s, rate-limited, so it can never block taps or cause overflow. Only mounted when "Cursor effects" is ON.
 */
export default function CursorEffects() {
  const { mode } = useSiteConfig();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const set = GLYPHS[mode] || GLYPHS.love;
    let last = 0;
    const spawn = (x, y, n = 1) => {
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement('span');
        el.textContent = set[Math.floor(Math.random() * set.length)];
        el.setAttribute('aria-hidden', 'true');
        const dx = (Math.random() - 0.5) * (n > 1 ? 90 : 24);
        const dy = -(20 + Math.random() * (n > 1 ? 70 : 30));
        Object.assign(el.style, {
          position: 'fixed', left: `${x}px`, top: `${y}px`, pointerEvents: 'none', zIndex: 9999,
          color: 'rgb(var(--c-gold-light))', fontSize: `${10 + Math.random() * 10}px`, transform: 'translate(-50%,-50%)',
          transition: 'transform .8s ease-out, opacity .8s ease-out', opacity: '1', willChange: 'transform, opacity',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
          el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 850);
      }
    };
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      spawn(e.clientX, e.clientY);
    };
    const onDown = (e) => {
      if (e.pointerType === 'mouse') return;
      spawn(e.clientX, e.clientY, 6);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [mode, reduce]);

  return null;
}
