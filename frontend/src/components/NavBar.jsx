import { useEffect, useState } from 'react';

/**
 * Navigation of a birthday page. `links` already contains ONLY the sections that exist (switched on and not empty), so a
 * disabled section never has a link.
 *  - large screens: links in the top bar
 *  - phones: a bottom bar with every section visible as icon + label (swipe sideways when there are many). No hidden menu.
 */
export default function NavBar({ siteName, links, topOffset = 0 }) {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState(links[0]?.id);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section that is on screen.
  useEffect(() => {
    const els = links.map((l) => document.getElementById(l.id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [links]);

  // Keep the active chip visible in the scrolling bottom bar.
  useEffect(() => {
    document.getElementById(`nav-chip-${active}`)?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <>
      <header style={{ top: topOffset }} className={`fixed inset-x-0 z-50 transition duration-500 ${solid ? 'bg-burgundy-dark/80 shadow-soft backdrop-blur-md' : ''}`}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:py-4" aria-label="Main">
          <a href="#home" className="max-w-[70vw] truncate font-script text-2xl text-gold-light">
            {siteName}
          </a>
          <ul className="hidden items-center gap-6 lg:flex">
            {links.filter((l) => l.id !== 'home').map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active === id ? 'true' : undefined}
                  className={`text-[11px] uppercase tracking-[0.25em] transition hover:text-gold-light ${active === id ? 'text-gold-light' : 'text-ivory/70'}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-[55] border-t border-gold/20 bg-burgundy-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="no-scrollbar flex snap-x gap-1 overflow-x-auto px-2 py-1.5">
          {links.map(({ id, label, Icon }) => (
            <li key={id} className="shrink-0 snap-start">
              <a
                id={`nav-chip-${id}`}
                href={`#${id}`}
                aria-current={active === id ? 'true' : undefined}
                className={`flex min-h-[52px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 text-[11px] leading-tight transition ${
                  active === id ? 'bg-gold/15 text-gold-light' : 'text-ivory/65 active:bg-white/10'
                }`}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="max-w-[5.5rem] truncate">{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
