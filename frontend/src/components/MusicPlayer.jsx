import { useEffect, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Pause, Play } from 'lucide-react';
import { getSnapshot, setSource, subscribe, toggleMusic } from '../utils/sound.js';
import { useFeatures } from '../hooks/SiteConfig.jsx';

/**
 * Play/pause button for the background song. The song itself lives in utils/sound.js so the opening envelope can start it
 * with the very first tap. Music OFF: nothing renders and no source is loaded. Music controls OFF: no button (the song may still start).
 */
export default function MusicPlayer({ title, src, hasNav = false }) {
  const f = useFeatures();
  const { playing, unavailable } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (f.music) setSource(src);
  }, [src, f.music]);

  if (!f.music || !f.musicControls) return null;

  return (
    <div
      className={`fixed right-3 z-[60] sm:right-6 sm:bottom-6 ${hasNav ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'}`}
    >
      <motion.div layout className="glass flex items-center gap-2 rounded-full bg-midnight/70 py-1.5 pl-1.5 pr-4 shadow-soft">
        <button
          onClick={toggleMusic}
          disabled={unavailable}
          aria-label={playing ? 'Pause music' : 'Play music'}
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-btn-light to-btn text-btn-text transition hover:brightness-110 disabled:opacity-40"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>
        <div className="flex max-w-[8rem] items-center gap-2 text-xs text-ivory/80 sm:max-w-[9.5rem]">
          <Music size={14} className={`shrink-0 text-gold ${playing ? 'animate-pulse' : ''}`} aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={unavailable ? 'off' : 'title'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate">
              {unavailable ? 'No song added yet' : title}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
