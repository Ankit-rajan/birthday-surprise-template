import { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/SiteConfig.jsx';
import SectionHeading from './SectionHeading.jsx';
import { pad } from '../utils/format.js';
import { useCopy, useSfx } from '../hooks/SiteConfig.jsx';

function ReasonCard({ number, text, flipped, onFlip }) {
  const reduce = useReducedMotion();
  const t = useCopy();
  const message = text || t('reasonEmpty');

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={flipped}
      aria-label={flipped ? `${t('reasonCardLabel')} ${number}: ${message}` : `${t('reasonCardLabel')} ${number}`}
      className="group relative aspect-[3/4] w-full text-left [perspective:1000px]"
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped && !reduce ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-burgundy-soft to-burgundy-dark p-4 shadow-soft transition group-hover:border-gold group-hover:shadow-glow [backface-visibility:hidden] ${
            reduce && flipped ? 'invisible' : ''
          }`}
        >
          <span className="eyebrow !tracking-[0.3em]">{t('reasonCardLabel')}</span>
          <span className="gold-text mt-2 font-serif text-6xl">{pad(number)}</span>
          <span aria-hidden="true" className="mt-4 text-gold/70">&#9825;</span>
        </div>
        {/* Back */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-2xl bg-ivory p-4 text-center shadow-soft [backface-visibility:hidden] ${
            reduce ? (flipped ? '' : 'invisible') : '[transform:rotateY(180deg)]'
          }`}
        >
          <p className="font-hand text-[1.45rem] leading-snug text-burgundy-dark sm:text-[1.6rem]">{message}</p>
        </div>
      </motion.div>
    </button>
  );
}

export default function Reasons({ reasons }) {
  const t = useCopy();
  const sfx = useSfx();
  const [flipped, setFlipped] = useState(() => new Set());
  const toggle = (i) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else {
        next.add(i);
        sfx();
      }
      return next;
    });

  return (
    <section id="reasons" className="section-pad bg-gradient-to-b from-burgundy-dark to-midnight">
      <SectionHeading eyebrow={t('reasonsEyebrow')} title={t('reasonsTitle')} subtitle={t('reasonsSubtitle')} />
      <p className="-mt-8 mb-10 text-center text-xs uppercase tracking-[0.3em] text-gold/70" aria-live="polite">
        {t('reasonsRevealed', { n: flipped.size, total: reasons.length })}
      </p>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-6">
        {reasons.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.07 }}
          >
            <ReasonCard number={i + 1} text={text} flipped={flipped.has(i)} onFlip={() => toggle(i)} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
