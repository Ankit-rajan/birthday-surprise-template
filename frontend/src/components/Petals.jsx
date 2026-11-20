import { useEffect, useRef } from 'react';
import { useSiteFx } from '../hooks/SiteFx.jsx';

const PALETTE = ['#8c1d3a', '#b3294f', '#d9728a', '#e8a3b0', '#f4cfd3'];
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Canvas of drifting rose petals and softly glowing gold particles.
 * Pauses when the tab is hidden; renders a single still frame for reduced-motion users.
 */
function PetalsCanvas({ density = 1, glow = true, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    let petals = [];
    let sparks = [];

    const makePetal = (anywhere) => ({
      x: rand(0, w),
      y: anywhere ? rand(-20, h) : rand(-60, -10),
      s: rand(7, 15),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.02, 0.02),
      vy: rand(0.35, 0.9),
      sway: rand(0.5, 1.6),
      phase: rand(0, Math.PI * 2),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      alpha: rand(0.45, 0.85),
    });
    const makeSpark = () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.6, 2.2),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.002, 0.006),
      vy: rand(-0.12, -0.02),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = canvas.clientWidth;
      const nextH = canvas.clientHeight;
      const widthChanged = Math.abs(nextW - w) >= 1;
      w = nextW;
      h = nextH;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Mobile browsers resize constantly as the address bar moves; only reseed when the width really changes.
      if (widthChanged || petals.length === 0) {
        const count = Math.max(10, Math.min(34, Math.round(((w * h) / 42000) * density)));
        petals = Array.from({ length: count }, () => makePetal(true));
        sparks = glow ? Array.from({ length: Math.round(count * 1.2) }, makeSpark) : [];
      }
    };

    const drawPetal = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const s = p.s;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.8, s * 0.55, 0, s);
      ctx.bezierCurveTo(-s * 0.8, s * 0.55, -s * 0.95, -s * 0.55, 0, -s);
      ctx.fill();
      ctx.restore();
    };

    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of sparks) {
        const a = 0.12 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ecd9b0';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.y += s.vy;
        if (s.y < -5) s.y = h + 5;
      }
      for (const p of petals) {
        drawPetal(p);
        p.y += p.vy;
        p.x += Math.sin(t * 0.001 * p.sway + p.phase) * 0.6;
        p.rot += p.vr;
        if (p.y > h + 30) {
          Object.assign(p, makePetal(false));
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    };

    resize();
    if (reduce) {
      running = false;
      frame(0); // one calm still frame
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density, glow]);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}

export default function Petals(props) {
  const { petals } = useSiteFx();
  return petals ? <PetalsCanvas {...props} /> : null;
}
