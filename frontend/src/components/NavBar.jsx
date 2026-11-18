import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const LINKS = [
  ['home', 'Home'],
  ['gallery', 'Our world'],
  ['story', 'Our story'],
  ['reasons', 'Reasons'],
  ['letter', 'Letter'],
  ['open-when', 'Read when'],
  ['future', 'Future'],
  ['vault', 'Secret place'],
];

export default function NavBar({ siteName }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition duration-500 ${solid ? 'bg-burgundy-dark/80 shadow-soft backdrop-blur-md' : ''}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Main">
        <a href="#home" className="font-script text-2xl text-gold-light">
          {siteName}
        </a>
        <ul className="hidden items-center gap-6 lg:flex">
          {LINKS.slice(1).map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-[11px] uppercase tracking-[0.25em] text-ivory/70 transition hover:text-gold-light">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <button
          className="rounded-full p-2 text-ivory hover:bg-white/10 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-2 space-y-1 rounded-2xl border border-gold/20 bg-burgundy-dark/95 p-3 backdrop-blur-md lg:hidden"
          >
            {LINKS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.25em] text-ivory/80 hover:bg-white/10"
                >
                  {label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
