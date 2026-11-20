import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import LetterPaper from '../LetterPaper.jsx';
import LetterModal from '../LetterModal.jsx';
import { formatDate } from '../../utils/format.js';

const Empty = ({ children }) => <p className="text-center font-serif text-xl italic text-ivory/60">{children}</p>;

/** Click-to-reveal cards with a soft unveiling animation. */
export function SecretMessages({ items }) {
  const [revealed, setRevealed] = useState(() => new Set());
  if (items.length === 0) return <Empty>Edit in My Dashboard &rsaquo; My Birthday Website &rsaquo; Private messages &rarr; type &ldquo;secret&rdquo;. Example: a short note that is revealed on tap. &#9825;</Empty>;

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      {items.map((m) => {
        const isOpen = revealed.has(m.id);
        return (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => setRevealed((prev) => new Set(prev).add(m.id))}
            aria-expanded={isOpen}
            disabled={isOpen}
            layout
            className={`relative overflow-hidden rounded-2xl border p-7 text-left shadow-soft transition ${
              isOpen ? 'border-gold/40 bg-ivory' : 'border-gold/40 bg-gradient-to-br from-burgundy-soft to-burgundy-dark hover:border-gold hover:shadow-glow'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.div key="open" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9 }}>
                  {m.title && <h3 className="mb-2 font-serif text-2xl italic text-burgundy">{m.title}</h3>}
                  <p className="whitespace-pre-line font-hand text-[1.45rem] leading-snug text-burgundy-dark">{m.body}</p>
                  {m.date && <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-burgundy/60">{formatDate(m.date)}</p>}
                </motion.div>
              ) : (
                <motion.div key="closed" exit={{ opacity: 0 }} className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/50">
                    <Heart size={20} className="text-gold-light" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-serif text-xl italic text-ivory">{m.title || 'A secret for you'}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold">Tap to reveal</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Diary: dated notes in a quiet list. */
export function SecretDiary({ items }) {
  if (items.length === 0) return <Empty>Edit in My Dashboard &rsaquo; My Birthday Website &rsaquo; Private messages &rarr; type &ldquo;diary&rdquo;. Example: a dated memory you want to keep. &#9825;</Empty>;
  return (
    <ol className="mx-auto max-w-3xl space-y-6">
      {items.map((m, i) => (
        <motion.li
          key={m.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.06 }}
          className="paper rounded-sm p-7 md:p-9"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-burgundy/70">{formatDate(m.date, 'Undated')}</p>
          {m.title && <h3 className="mt-1 font-serif text-3xl italic text-burgundy">{m.title}</h3>}
          <p className="mt-3 whitespace-pre-line font-hand text-[1.5rem] leading-snug text-burgundy-dark">{m.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}

/** Future letters and occasion messages, each opened in the letter reader. */
export function LettersForYou({ items }) {
  const [openId, setOpenId] = useState(null);
  const current = items.find((l) => l.id === openId);
  if (items.length === 0) return <Empty>Edit in My Dashboard &rsaquo; My Birthday Website &rsaquo; Private messages &rarr; type &ldquo;letter&rdquo;. Example: a letter to open on a future date. &#9825;</Empty>;

  return (
    <>
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {items.map((l) => (
          <button
            key={l.id}
            onClick={() => setOpenId(l.id)}
            className="rounded-2xl border border-gold/40 bg-gradient-to-br from-burgundy-soft to-burgundy-dark p-7 text-left shadow-soft transition hover:border-gold hover:shadow-glow"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold">{l.date ? formatDate(l.date) : 'Sealed'}</span>
            <span className="mt-2 block font-serif text-2xl italic text-ivory">{l.title || 'A letter for you'}</span>
            <span className="mt-4 block text-[11px] uppercase tracking-[0.3em] text-gold-light/80">Open the letter</span>
          </button>
        ))}
      </div>
      <LetterModal open={!!current} onClose={() => setOpenId(null)} label={current?.title || 'Letter'}>
        {current && <LetterPaper title={current.title} body={current.body} typewriter />}
      </LetterModal>
    </>
  );
}
