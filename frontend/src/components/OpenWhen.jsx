import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/SiteConfig.jsx';
import { Heart, CloudRain, Moon } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';
import LetterModal from './LetterModal.jsx';
import LetterPaper from './LetterPaper.jsx';
import { useCopy, useSfx } from '../hooks/SiteConfig.jsx';

/* Three different backdrops, one per letter. */

function MissBackdrop() {
  const reduce = useReducedMotion();
  const dots = useMemo(
    () => Array.from({ length: 26 }, () => ({ x: Math.random() * 100, size: 2 + Math.random() * 4, delay: Math.random() * 6, dur: 9 + Math.random() * 8 })),
    [],
  );
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(236,217,176,0.18),transparent_45%)]" />
      {!reduce &&
        dots.map((d, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gold-light"
            style={{ left: `${d.x}%`, bottom: -10, width: d.size, height: d.size }}
            animate={{ y: ['0vh', '-110vh'], opacity: [0, 0.8, 0] }}
            transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'linear' }}
          />
        ))}
    </>
  );
}

function SadBackdrop() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 h-[120%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(244,207,211,0.45),rgba(212,180,131,0.2)_35%,transparent_65%)]"
      initial={{ y: reduce ? 0 : '60%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 3.5, ease: 'easeOut' }}
    />
  );
}

function HugBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 grid place-items-center">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-blush/40"
          style={{ width: '120vmax', height: '120vmax' }}
          initial={{ scale: reduce ? 0.4 + i * 0.15 : 1, opacity: 0 }}
          animate={reduce ? { opacity: 0.3 } : { scale: [1, 0.15], opacity: [0, 0.45, 0] }}
          transition={{ duration: 6, delay: i * 1.5, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

const THEMES = {
  'open-when-miss': { Icon: Moon, Backdrop: MissBackdrop, hint: 'openWhenHintMiss' },
  'open-when-sad': { Icon: CloudRain, Backdrop: SadBackdrop, hint: 'openWhenHintSad' },
  'open-when-hug': { Icon: Heart, Backdrop: HugBackdrop, hint: 'openWhenHintHug' },
};

export default function OpenWhen({ letters, partnerName }) {
  const [openKey, setOpenKey] = useState(null);
  const t = useCopy();
  const sfx = useSfx();
  const current = letters.find((l) => l.key === openKey);
  const Theme = current ? THEMES[current.key] : null;

  return (
    <section id="open-when" className="section-pad bg-gradient-to-b from-midnight to-burgundy-dark">
      <SectionHeading eyebrow={t('openWhenEyebrow')} title={t('openWhenTitle')} subtitle={t('openWhenSubtitle')} />

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {letters.map((letter, i) => {
          const theme = THEMES[letter.key] || THEMES['open-when-hug'];
          const { Icon } = theme;
          return (
            <motion.button
              key={letter.key}
              type="button"
              onClick={() => {
                sfx();
                setOpenKey(letter.key);
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-burgundy-soft to-burgundy-dark p-6 text-left sm:p-8 shadow-soft transition hover:border-gold hover:shadow-glow"
            >
              <span className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-gold/10 ring-1 ring-gold/50">
                <Icon size={24} className="text-gold-light" />
              </span>
              <h3 className="font-serif text-2xl italic text-ivory">{letter.title}</h3>
              <p className="mt-2 text-sm text-ivory/60">{t(theme.hint)}</p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.35em] text-gold group-hover:text-gold-light">{t('openWhenSeal')}</p>
            </motion.button>
          );
        })}
      </div>

      <LetterModal open={!!current} onClose={() => setOpenKey(null)} label={current?.title} backdrop={Theme ? <Theme.Backdrop /> : null}>
        {current && <LetterPaper title={current.title} body={current.body} signature={t('openWhenSignature')} typewriter />}
      </LetterModal>
    </section>
  );
}
