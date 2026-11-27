import SectionHeading from './SectionHeading.jsx';
import { formatDate } from '../utils/format.js';
import { useCopy } from '../hooks/SiteConfig.jsx';

/** Short videos from the gallery. Native controls, fully responsive, nothing downloads until the visitor presses play. */
export default function Videos({ videos }) {
  const t = useCopy();
  return (
    <section id="videos" className="section-pad bg-gradient-to-b from-burgundy-dark to-midnight">
      <SectionHeading eyebrow={t('videosEyebrow')} title={t('videosTitle')} subtitle={t('videosSubtitle')} />
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        {videos.map((v) => (
          <figure key={v.id} className="min-w-0 overflow-hidden rounded-2xl border border-gold/25 bg-black/30 p-2 shadow-soft sm:p-3">
            <video
              src={v.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-xl bg-black object-contain"
              aria-label={v.caption || 'Video'}
            />
            {(v.caption || v.date) && (
              <figcaption className="px-2 pb-1 pt-3 text-center">
                {v.caption && <p className="font-hand text-2xl leading-tight text-ivory">{v.caption}</p>}
                {v.date && <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-gold/70">{formatDate(v.date)}</p>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
