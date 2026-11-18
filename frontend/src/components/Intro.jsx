import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from 'framer-motion';
import Petals from './Petals.jsx';
import { playOpenMoment, startMusic, unlockAudio } from '../utils/sound.js';

/**
 * Cinematic opening. The envelope is built from layered clip-paths; GSAP drives the open sequence:
 * flap lifts -> letter rises -> letter glows toward the camera -> whole scene dissolves into the site.
 */
export default function Intro({ site, onOpened }) {
  const rootRef = useRef(null);
  const flapRef = useRef(null);
  const letterRef = useRef(null);
  const textRef = useRef(null);
  const timelineRef = useRef(null);
  const [opening, setOpening] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      timelineRef.current?.kill();
    };
  }, []);

  const open = () => {
    if (opening) return;
    setOpening(true);
    // First tap on the page: this is the moment browsers allow sound, so the song starts here.
    unlockAudio();
    startMusic(site.music?.url);
    playOpenMoment();
    const k = reduce ? 0.01 : 1;
    const tl = gsap.timeline({ onComplete: onOpened });
    timelineRef.current = tl;
    tl.to(textRef.current, { opacity: 0, y: -20, duration: 0.5 * k, ease: 'power2.in' })
      .to(flapRef.current, { rotateX: 180, duration: 0.9 * k, ease: 'power2.inOut' }, '<')
      .set(flapRef.current, { zIndex: 1 }, '-=0.45')
      .to(letterRef.current, { y: -90, duration: 0.8 * k, ease: 'power2.out' }, '-=0.2')
      .to(letterRef.current, { y: -140, scale: 1.25, duration: 0.8 * k, ease: 'power2.in' }, '+=0.2')
      .to(rootRef.current, { opacity: 0, scale: 1.06, filter: 'blur(14px)', duration: 1 * k, ease: 'power2.inOut' }, '-=0.4');
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] overflow-hidden bg-burgundy-dark"
      role="dialog"
      aria-label="Welcome"
    >
      {site.photos.intro && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
          style={{ backgroundImage: `url(${site.photos.intro})` }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(123,26,53,0.75),rgba(36,6,16,0.96)_70%)]"
      />
      <Petals density={1.1} />

      <div className="relative z-10 mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div ref={textRef} className="mb-10 md:mb-14">
          <p className="eyebrow mb-5">{site.herName}</p>
          <h1 className="font-serif text-[2.4rem] italic leading-[1.1] text-ivory sm:text-5xl md:text-7xl">
            {site.introHeading}
          </h1>
          <p className="mt-5 font-serif text-lg italic text-gold-light/90 md:text-2xl">{site.introSubtitle}</p>
        </div>

        {/* Envelope */}
        <div className="relative" style={{ perspective: 900 }} aria-hidden="true">
          <div className="relative h-44 w-72 sm:h-52 sm:w-80">
            <div className="absolute inset-0 rounded-md bg-gradient-to-b from-burgundy-soft to-burgundy-deep shadow-soft ring-1 ring-gold/30" />
            <div
              ref={letterRef}
              className="absolute inset-x-5 top-4 bottom-3 z-[2] flex items-center justify-center rounded-sm bg-ivory shadow-md"
            >
              <span className="font-script text-4xl text-burgundy">{site.herName} &hearts;</span>
            </div>
            <div
              className="absolute inset-0 z-[3] rounded-md bg-gradient-to-b from-burgundy to-burgundy-deep"
              style={{ clipPath: 'polygon(0 36%, 50% 64%, 100% 36%, 100% 100%, 0 100%)' }}
            />
            <div
              ref={flapRef}
              className="absolute left-0 top-0 z-[4] h-[64%] w-full bg-gradient-to-b from-gold-light to-gold-dark"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transformOrigin: 'top center' }}
            />
            <div className="absolute left-1/2 top-[56%] z-[5] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-burgundy-soft to-burgundy-dark shadow-lg ring-2 ring-gold/60" />
          </div>
        </div>

        <button onClick={open} disabled={opening} className="btn-gold mt-12 md:mt-16">
          Open your surprise &#9825;
        </button>
        <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-ivory/45">Turn your sound on &#9835;</p>
      </div>
    </div>
  );
}
