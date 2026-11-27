import { useEffect, useRef } from 'react';
import { useSiteFx } from '../hooks/SiteFx.jsx';
import { useReducedMotion } from '../hooks/SiteConfig.jsx';

const COLORS = ['#ffd98a', '#ff8fb1', '#9ad7ff', '#c9a7ff', '#ffffff', '#ffb347'];

/** A few rockets that burst into sparks. Canvas, no assets. Fires whenever `trigger` changes to a truthy number. */
function FireworksCanvas({ trigger }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!trigger || reduce) return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sparks = [];
    const burst = (x, y) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < 56; i += 1) {
        const a = (Math.PI * 2 * i) / 56;
        const v = 1.5 + Math.random() * 3.2;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
      }
    };
    const timers = [0, 380, 760, 1140].map((ms, i) =>
      setTimeout(() => burst(w * (0.2 + 0.2 * i + Math.random() * 0.1), h * (0.18 + Math.random() * 0.3)), ms),
    );

    let raf = 0;
    const started = performance.now();
    const frame = (now) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.035;
        s.vx *= 0.985;
        s.life -= 0.012;
        if (s.life > 0) {
          ctx.globalAlpha = s.life;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (now - started < 4200) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [trigger, reduce]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] h-full w-full" />;
}

export default function Fireworks({ trigger }) {
  const { fireworks } = useSiteFx();
  return fireworks ? <FireworksCanvas trigger={trigger} /> : null;
}
