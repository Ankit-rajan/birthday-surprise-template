import { useEffect, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Pause, Play } from 'lucide-react';
import { getSnapshot, setSource, subscribe, toggleMusic } from '../utils/sound.js';

/**
 * Play/pause button for the background song. The song itself lives in utils/sound.js so that
 * the opening envelope can start it with the very first tap.
 */
export default function MusicPlayer({ title, src }) {
  const { playing, unavailable } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    setSource(src);
  }, [src]);

  return (
    <div className="fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6">
      <motion.div layout className="glass flex items-center gap-2 rounded-full bg-midnight/70 py-1.5 pl-1.5 pr-4 shadow-soft">
        <button
          onClick={toggleMusic}
          disabled={unavailable}
          aria-label={playing ? 'Pause music' : 'Play music'}
          className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-gold-light to-gold text-burgundy-dark transition hover:brightness-110 disabled:opacity-40"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>
        <div className="flex max-w-[9.5rem] items-center gap-2 text-xs text-ivory/80">
          <Music size={14} className={`shrink-0 text-gold ${playing ? 'animate-pulse' : ''}`} aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={unavailable ? 'off' : 'title'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="truncate"
            >
              {unavailable ? 'No song added yet' : title}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
