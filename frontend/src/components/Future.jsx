import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, Feather, Sunrise } from 'lucide-react';
import SectionHeading from './SectionHeading.jsx';
import LetterModal from './LetterModal.jsx';
import LetterPaper from './LetterPaper.jsx';

const GROUPS = [
  { key: 'places', title: 'Places we want to see', Icon: Compass },
  { key: 'dreams', title: 'Dreams we are building', Icon: Sparkles },
  { key: 'promises', title: 'Small promises', Icon: Feather },
  { key: 'memories', title: 'Memories not yet made', Icon: Sunrise },
];

export default function Future({ future, letter, partnerName }) {
  const [open, setOpen] = useState(false);

  return (
    <section id="future" className="section-pad bg-burgundy-dark">
      <SectionHeading
        eyebrow="Our future"
        title="Our story is still being written."
        subtitle="Not a promise of perfection, just of showing up."
      />

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {GROUPS.map(({ key, title, Icon }, i) => {
          const items = future[key] || [];
          if (items.length === 0) return null;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: (i % 2) * 0.1 }}
              className="rounded-2xl border border-gold/25 bg-gradient-to-br from-white/[0.06] to-transparent p-8"
            >
              <div className="mb-5 flex items-center gap-3">
                <Icon size={20} className="text-gold" aria-hidden="true" />
                <h3 className="font-serif text-2xl text-ivory">{title}</h3>
              </div>
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <li key={idx} className="flex gap-3 font-serif text-lg italic leading-snug text-ivory/75">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {letter.body && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto mt-16 max-w-2xl rounded-2xl border border-gold/40 bg-midnight/60 p-10 text-center shadow-glow"
        >
          <p className="eyebrow mb-4">A letter, for much later</p>
          <h3 className="font-script text-5xl text-gold-light">{letter.title || 'To My Future Wife'}</h3>
          <p className="mx-auto mt-4 max-w-md font-serif text-lg italic text-ivory/65">
            Written long before it is needed, and meant to be read slowly.
          </p>
          <button onClick={() => setOpen(true)} className="btn-gold mt-8">
            Read the letter
          </button>
        </motion.div>
      )}

      <LetterModal open={open} onClose={() => setOpen(false)} label={letter.title}>
        <LetterPaper title={letter.title} body={letter.body} signature={`— ${partnerName}`} typewriter />
      </LetterModal>
    </section>
  );
}
