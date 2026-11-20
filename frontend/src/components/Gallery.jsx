import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './SectionHeading.jsx';
import Lightbox from './Lightbox.jsx';
import { formatDate } from '../utils/format.js';

function Polaroid({ photo, index, onOpen }) {
  const tilt = [-2.2, 1.6, -1.2, 2.4, -0.6, 1.1][index % 6];
  const ratio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : '4 / 5';
  return (
    <motion.figure
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.06 }}
      className="mb-6 break-inside-avoid"
    >
      <button
        onClick={() => onOpen(index)}
        aria-label={photo.caption ? `Open photo: ${photo.caption}` : 'Open photo'}
        className="group block w-full rotate-[var(--tilt)] bg-ivory p-3 pb-4 text-left shadow-soft transition duration-500 ease-out hover:z-10 hover:rotate-0 hover:scale-[1.03] hover:shadow-glow"
        style={{ '--tilt': `${tilt}deg` }}
      >
        <div className="overflow-hidden bg-burgundy-deep/10" style={{ aspectRatio: ratio }}>
          <img
            src={photo.thumbUrl}
            alt={photo.caption || 'A memory of us'}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
        {(photo.caption || photo.date) && (
          <figcaption className="px-1 pt-3 text-center">
            {photo.caption && <p className="font-hand text-[1.4rem] leading-tight text-burgundy-dark">{photo.caption}</p>}
            {photo.date && <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-burgundy/60">{formatDate(photo.date)}</p>}
          </figcaption>
        )}
      </button>
    </motion.figure>
  );
}

export default function Gallery({ gallery }) {
  const [openIndex, setOpenIndex] = useState(null);
  const items = useMemo(
    () => gallery.map((g) => ({ type: 'image', src: g.url, caption: g.caption, date: g.date })),
    [gallery],
  );

  return (
    <section id="gallery" className="section-pad bg-gradient-to-b from-midnight to-burgundy-dark">
      <SectionHeading eyebrow="Our little world" title="Moments I keep close" subtitle="Every picture is a small door back to a day I never want to forget." />

      {gallery.length === 0 ? (
        <p className="mx-auto max-w-md text-center font-serif text-xl italic text-ivory/60">
          Edit in My Dashboard &rsaquo; My Birthday Website &rsaquo; Gallery. Upload photos here, each with a caption and date. Example: &ldquo;Our first trip, 2024&rdquo;. &#9825;
        </p>
      ) : (
        <div className="mx-auto max-w-6xl columns-2 gap-5 sm:gap-6 md:columns-3 lg:columns-4">
          {gallery.map((photo, i) => (
            <Polaroid key={photo.id} photo={photo} index={i} onOpen={setOpenIndex} />
          ))}
        </div>
      )}

      <Lightbox items={items} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
    </section>
  );
}
