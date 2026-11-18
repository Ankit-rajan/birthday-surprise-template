import { motion } from 'framer-motion';
import SectionHeading from './SectionHeading.jsx';
import { formatDate } from '../utils/format.js';

export default function Timeline({ timeline }) {
  return (
    <section id="story" className="section-pad relative bg-burgundy-dark">
      <SectionHeading eyebrow="Our story" title="How we became us" subtitle="A few of the chapters, in the order they happened." />

      <ol className="relative mx-auto max-w-4xl">
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent md:left-1/2"
        />
        {timeline.map((entry, i) => {
          const left = i % 2 === 0;
          return (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              className={`relative mb-14 pl-12 md:w-1/2 md:pl-0 ${left ? 'md:pr-14 md:text-right' : 'md:ml-auto md:pl-14'}`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-2 h-3 w-3 rounded-full bg-gold shadow-glow ring-4 ring-burgundy-dark left-[10px] ${
                  left ? 'md:left-auto md:-right-[6px]' : 'md:-left-[6px]'
                }`}
              />
              <p className="eyebrow mb-2">{formatDate(entry.date, 'Date to be added')}</p>
              <h3 className="font-serif text-3xl text-ivory">{entry.title}</h3>
              {entry.description && (
                <p className="mt-3 whitespace-pre-line font-serif text-lg italic leading-relaxed text-ivory/70">{entry.description}</p>
              )}
              {entry.photoUrl && (
                <img
                  src={entry.photoUrl}
                  alt={entry.title}
                  loading="lazy"
                  decoding="async"
                  className={`mt-5 w-full max-w-xs rounded-sm border-[10px] border-b-[28px] border-ivory shadow-soft ${left ? 'md:ml-auto' : ''}`}
                />
              )}
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
