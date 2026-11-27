import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/SiteConfig.jsx';
import { useSiteFx } from '../hooks/SiteFx.jsx';

const COLORS = ['#ecd9b0', '#d4b483', '#f4cfd3', '#e8a3b0', '#b3294f', '#fff8ec'];

/** Fires a confetti burst from both bottom corners every time `trigger` changes to a truthy number. */
function ConfettiCanvas({ trigger }) {
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

    const parts = Array.from({ length: 150 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const deg = fromLeft ? 50 + Math.random() * 30 : 100 + Math.random() * 30;
      const angle = -(Math.PI / 180) * deg;
      const speed = 9 + Math.random() * 9;
      return {
        x: fromLeft ? 0 : w,
        y: h * 0.92,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        pw: 6 + Math.random() * 6,
        ph: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const started = performance.now();
    let raf = 0;
    const frame = (now) => {
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < h + 30) alive += 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.pw / 2, -p.ph / 2, p.pw, p.ph);
        ctx.restore();
      }
      if (alive > 0 && now - started < 5000) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [trigger, reduce]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />;
}

export default function Confetti(props) {
  const { confetti } = useSiteFx();
  return confetti ? <ConfettiCanvas {...props} /> : null;
}
