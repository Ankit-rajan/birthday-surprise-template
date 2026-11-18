import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDate } from '../utils/format.js';

/**
 * Full-screen viewer for photos and videos.
 * items: [{ type: 'image' | 'video', src, caption, date }]
 * Keyboard: Esc closes, arrow keys navigate, Tab is trapped inside. Touch: swipe left/right.
 */
export default function Lightbox({ items, index, onClose, onIndex }) {
  const open = index !== null && index !== undefined && items[index];
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const count = items.length;

  const go = useCallback(
    (delta) => {
      if (count > 1) onIndex((index + delta + count) % count);
    },
    [count, index, onIndex],
  );

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button, video[controls], [href], [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, go, onClose]);

  // Warm the cache for neighbouring photos.
  useEffect(() => {
    if (!open || count < 2) return;
    [index - 1, index + 1].forEach((i) => {
      const item = items[(i + count) % count];
      if (item?.type === 'image') new Image().src = item.src;
    });
  }, [open, index, items, count]);

  const item = open ? items[index] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen viewer"
          className="fixed inset-0 z-[90] flex flex-col bg-midnight/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <div className="flex items-center justify-between px-4 py-3 text-ivory/70" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs tracking-[0.3em]">
              {index + 1} / {count}
            </span>
            <button ref={closeRef} onClick={onClose} aria-label="Close viewer" className="rounded-full p-2 hover:bg-white/10">
              <X size={24} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
            <motion.div
              key={item.src}
              className="flex max-h-full max-w-full items-center justify-center"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              drag={count > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, info) => {
                if (info.offset.x < -80) go(1);
                else if (info.offset.x > 80) go(-1);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === 'video' ? (
                <video
                  src={item.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[70vh] max-w-full rounded-lg shadow-soft"
                />
              ) : (
                <img
                  src={item.src}
                  alt={item.caption || 'Photograph'}
                  draggable={false}
                  className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-soft"
                />
              )}
            </motion.div>

            {count > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Previous"
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-ivory hover:bg-black/60 md:left-4"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Next"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-ivory hover:bg-black/60 md:right-4"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          <div className="px-6 pb-8 pt-4 text-center" onClick={(e) => e.stopPropagation()}>
            {item.caption && <p className="font-hand text-2xl text-gold-light">{item.caption}</p>}
            {item.date && <p className="mt-1 text-xs uppercase tracking-[0.3em] text-ivory/50">{formatDate(item.date)}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
