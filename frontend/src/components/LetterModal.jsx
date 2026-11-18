import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/** Accessible full-screen modal for reading a letter. `backdrop` is an optional animated layer behind it. */
export default function LetterModal({ open, onClose, label, backdrop = null, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-[85] overflow-y-auto bg-midnight/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
            {backdrop}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close letter"
            className="fixed right-4 top-4 z-10 rounded-full bg-black/40 p-2.5 text-ivory hover:bg-black/60"
          >
            <X size={22} />
          </button>
          <div className="relative mx-auto flex min-h-full max-w-2xl items-center px-4 py-16">
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 40, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
