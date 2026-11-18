import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import Lightbox from '../Lightbox.jsx';
import { formatDate } from '../../utils/format.js';

export default function PrivateMemories({ media }) {
  const [openIndex, setOpenIndex] = useState(null);
  const items = useMemo(
    () => media.map((m) => ({ type: m.kind === 'video' ? 'video' : 'image', src: m.url, caption: m.caption, date: m.date })),
    [media],
  );

  if (media.length === 0) {
    return <p className="text-center font-serif text-xl italic text-ivory/60">Edit in Admin Panel &rarr; Private media. Photos and videos uploaded there appear here, only after the vault is unlocked. &#9825;</p>;
  }

  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {media.map((m, i) => (
          <motion.figure
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05 }}
            className="mb-4 break-inside-avoid"
          >
            <button
              onClick={() => setOpenIndex(i)}
              aria-label={m.caption ? `Open ${m.kind}: ${m.caption}` : `Open ${m.kind}`}
              className="group relative block w-full overflow-hidden rounded-xl bg-burgundy-deep text-left ring-1 ring-gold/30 transition hover:ring-gold"
            >
              {m.kind === 'video' ? (
                <div className="grid aspect-video place-items-center bg-gradient-to-br from-burgundy-soft to-burgundy-dark">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/90 text-burgundy-dark">
                    <Play size={24} className="translate-x-0.5" />
                  </span>
                </div>
              ) : (
                <img
                  src={m.thumbUrl}
                  alt={m.caption || 'Private photograph'}
                  loading="lazy"
                  decoding="async"
                  style={m.width && m.height ? { aspectRatio: `${m.width} / ${m.height}` } : undefined}
                  className="w-full object-cover transition duration-700 group-hover:scale-105"
                />
              )}
              {(m.caption || m.date) && (
                <figcaption className="bg-midnight/70 px-3 py-2">
                  {m.caption && <p className="font-hand text-xl leading-tight text-gold-light">{m.caption}</p>}
                  {m.date && <p className="text-[10px] uppercase tracking-[0.25em] text-ivory/50">{formatDate(m.date)}</p>}
                </figcaption>
              )}
            </button>
          </motion.figure>
        ))}
      </div>
      <Lightbox items={items} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
    </>
  );
}
