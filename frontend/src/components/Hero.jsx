import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import Petals from './Petals.jsx';
import Cake from './Cake.jsx';
import { useBirthday } from '../hooks/useBirthday.js';
import { pad } from '../utils/format.js';

function CountdownUnit({ value, label }) {
  return (
    <div className="glass min-w-[68px] rounded-2xl px-3 py-4 text-center sm:min-w-[84px]">
      <div className="font-serif text-3xl tabular-nums text-ivory sm:text-4xl">{pad(value)}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-gold">{label}</div>
    </div>
  );
}

export default function Hero({ site }) {
  const b = useBirthday(site.birthDate);
  const reduce = useReducedMotion();
  const nameRef = useRef(null);
  const [wishIndex, setWishIndex] = useState(0);
  const wishes = site.birthdayWishes;
  const nameLetters = [...site.herName];

  // GSAP: the name rises in letter by letter.
  useLayoutEffect(() => {
    if (reduce || !nameRef.current) return undefined;
    const letters = nameRef.current.querySelectorAll('[data-letter]');
    const tween = gsap.fromTo(
      letters,
      { opacity: 0, y: 40, rotateX: -60 },
      { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.3 },
    );
    return () => tween.kill();
  }, [reduce, site.herName]);

  useEffect(() => {
    if (wishes.length < 2) return undefined;
    const id = setInterval(() => setWishIndex((i) => (i + 1) % wishes.length), 6500);
    return () => clearInterval(id);
  }, [wishes.length]);

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-burgundy-dark via-burgundy-deep to-midnight">
      <Petals density={0.7} />
      <div className="section-pad relative z-10 mx-auto max-w-5xl pt-28 text-center md:pt-36">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="eyebrow mb-6"
        >
          Happy birthday, my love!
        </motion.p>
<h1
          ref={nameRef}
          aria-label={site.herName}
          className="font-script text-[5rem] leading-none sm:text-[7rem] md:text-[9rem]"
        >
          <span aria-hidden="true" className="inline-block [perspective:600px]">
            {nameLetters.map((ch, i) => (
              <span key={i} data-letter className={`inline-block ${ch === ' ' ? 'mx-2 sm:mx-3 md:mx-4' : ''}`}>
                {/*
                  A background-clip:text gradient only paints inside its own box, so the script font's
                  swashes ) were cut off. Padding grows the box, the equal negative margin keeps
                  the letter spacing and line height exactly as before.
                */}
                <span
                  className="gold-text inline-block px-[0.22em] py-[0.2em] -mx-[0.22em] -my-[0.2em]"
                  style={{
                    backgroundSize: `${nameLetters.length * 100}% 100%`,
                    backgroundPosition: `${nameLetters.length > 1 ? (i / (nameLetters.length - 1)) * 100 : 0}% 0`,
                  }}
                >
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              </span>
            ))}
          </span>
        </h1>

        {/* Photograph in an arched frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative mx-auto mt-12 h-[360px] w-[270px] sm:h-[440px] sm:w-[330px]"
        >
          <div className="absolute -inset-3 rounded-t-[999px] rounded-b-3xl border border-gold/40" aria-hidden="true" />
          <div className="absolute -inset-1.5 rounded-t-[999px] rounded-b-3xl bg-gradient-to-b from-gold-light/40 to-transparent blur-md" aria-hidden="true" />
          <div className="relative h-full w-full overflow-hidden rounded-t-[999px] rounded-b-2xl bg-burgundy-deep shadow-soft ring-1 ring-gold/50">
            {site.photos.hero ? (
              <img src={site.photos.hero} alt={`${site.herName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-b from-burgundy-soft to-burgundy-dark">
                <span className="font-script text-8xl text-gold-light/80">{site.herName.charAt(0)}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9 }}
          className="mx-auto mt-14 max-w-2xl whitespace-pre-line font-serif text-xl italic leading-relaxed text-ivory/85 md:text-2xl"
        >
          {site.heroMessage}
        </motion.p>

        {wishes.length > 0 && (
          <div className="mx-auto mt-8 min-h-[3.5rem] max-w-xl" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={wishIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6 }}
                className="font-hand text-2xl text-gold-light"
              >
                {wishes[wishIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {/* Countdown */}
        <div className="mt-16" aria-label="Birthday countdown">
          {b.isToday ? (
            <p className="font-script text-5xl text-gold-light md:text-6xl">Today is the day. You are {b.age}!</p>
          ) : (
            <>
              <p className="eyebrow mb-5">Until you turn {b.upcomingAge}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <CountdownUnit value={b.days} label="Days" />
                <CountdownUnit value={b.hours} label="Hours" />
                <CountdownUnit value={b.minutes} label="Minutes" />
                <CountdownUnit value={b.seconds} label="Seconds" />
              </div>
            </>
          )}
        </div>

        <div className="mt-24 md:mt-32">
          <p className="eyebrow mb-3">Turning {b.age}</p>
          <h2 className="mb-10 font-serif text-3xl italic text-ivory md:text-4xl">Make a wish, my love.</h2>
<Cake name={site.herName} age={b.age} wishPrompt={site.wishPrompt} afterWishMessage={site.afterWishMessage} />        </div>
      </div>
    </section>
  );
}
