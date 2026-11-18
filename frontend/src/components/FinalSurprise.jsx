import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Petals from './Petals.jsx';

export default function FinalSurprise({ site }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() < 0.15 ? 3 : 1.5,
        delay: Math.random() * 4,
        dur: 2.5 + Math.random() * 3,
      })),
    [],
  );

  return (
    <section id="finale" className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#2a0a16,#0b0709_70%)] px-5 py-28 text-center md:py-40">
      <div aria-hidden="true" className="absolute inset-0">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute animate-twinkle rounded-full bg-gold-light"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
      </div>
      <Petals density={0.35} />

      <div className="relative z-10 mx-auto max-w-3xl">
        {site.photos.final && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="mx-auto mb-14 h-64 w-64 overflow-hidden rounded-full shadow-glow ring-1 ring-gold/60 ring-offset-8 ring-offset-midnight sm:h-80 sm:w-80"
          >
            <img src={site.photos.final} alt="" loading="lazy" className="h-full w-full object-cover" />
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.4 }}
          className="font-serif text-4xl italic leading-tight text-ivory md:text-6xl"
        >
          {site.finalQuote}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.6, delay: 1.2 }}
        >
          <div className="mx-auto my-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="gold-text font-script text-5xl leading-tight md:text-7xl">{site.finalMessage}</p>
        </motion.div>
      </div>
    </section>
  );
}
