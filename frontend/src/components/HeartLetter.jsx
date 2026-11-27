import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SectionHeading from './SectionHeading.jsx';
import LetterPaper from './LetterPaper.jsx';
import { useCopy, useSfx } from '../hooks/SiteConfig.jsx';

/** Animated envelope that opens to reveal a typewritten, handwritten-style letter. */
export default function HeartLetter({ letter, partnerName }) {
  const [opened, setOpened] = useState(false);
  const t = useCopy();
  const sfx = useSfx();

  return (
    <section id="letter" className="section-pad bg-midnight">
      <SectionHeading eyebrow={t('letterEyebrow')} title={t('letterTitle')} subtitle={t('letterSubtitle')} />

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait" initial={false}>
          {!opened ? (
            <motion.button
              key="envelope"
              type="button"
              onClick={() => {
                sfx();
                setOpened(true);
              }}
              aria-label="Open the letter"
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="group mx-auto block"
            >
              <div className="relative mx-auto h-48 w-[17.5rem] transition duration-500 group-hover:-translate-y-1 sm:h-60 sm:w-96">
                <div className="absolute inset-0 rounded-md bg-gradient-to-b from-burgundy-soft to-burgundy-deep shadow-soft ring-1 ring-gold/30" />
                <div className="absolute inset-x-6 top-5 bottom-4 rounded-sm bg-ivory/95" />
                <div
                  className="absolute inset-0 rounded-md bg-gradient-to-b from-burgundy to-burgundy-deep"
                  style={{ clipPath: 'polygon(0 36%, 50% 64%, 100% 36%, 100% 100%, 0 100%)' }}
                />
                <div
                  className="absolute left-0 top-0 h-[64%] w-full bg-gradient-to-b from-gold-light to-gold-dark transition duration-500 group-hover:brightness-110"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                />
                <div className="absolute left-1/2 top-[56%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-burgundy-soft to-burgundy-dark shadow-lg ring-2 ring-gold/60" />
              </div>
              <p className="mt-8 text-xs uppercase tracking-[0.4em] text-gold">{t('letterOpen')}</p>
            </motion.button>
          ) : (
            <motion.div
              key="letter"
              initial={{ opacity: 0, y: 60, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <LetterPaper
                title={letter.title}
                body={letter.body}
                signature={t('letterSignature')}
                typewriter
              />
              <div className="mt-8 text-center">
                <button onClick={() => setOpened(false)} className="btn-ghost">
                  {t('letterFold')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
