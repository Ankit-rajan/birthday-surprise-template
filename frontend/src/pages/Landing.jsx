import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookHeart, Cake as CakeIcon, ChevronDown, Gift, Image as ImageIcon, Link2, Lock, Mail, Music2, Palette, Sparkles, UserPlus, PencilLine, Share2,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import Petals from '../components/Petals.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { BRAND } from '../brand.js';

const FEATURES = [
  [Gift, 'Opens like a real surprise', 'A sealed envelope, falling petals and a countdown to the big day. They open it, and the page opens with them.'],
  [ImageIcon, 'Photos and a timeline', 'A gallery of your favourite pictures and the story of how you got here, chapter by chapter.'],
  [Mail, 'Letters they open one by one', 'A letter from the heart, sealed "open when\u2026" notes, and a letter to the future.'],
  [CakeIcon, 'A cake they can blow out', 'Pick the flavour and candles. They make a wish, the song plays, the confetti flies.'],
  [Lock, 'A private secret place', 'Photos, videos, diary notes and a journal behind a password only the two of you know.'],
  [Music2, 'Your song, your sounds', 'Upload a song of your own, and switch celebration sounds, confetti and petals on or off.'],
  [Link2, 'One private link', 'Publish when it is ready and share a link that looks like /birthday/their-name. Unpublish any time.'],
  [Palette, 'Yours alone', 'Your own account, your own dashboard. Nobody else can see or change what you make.'],
];

const STEPS = [
  [UserPlus, 'Create your account', 'It takes under a minute. You get a private workspace that is only yours.'],
  [PencilLine, 'Make it personal', 'Add their name, photos, wishes, memories, a song and the secret letters. Preview as you go.'],
  [Share2, 'Publish and share', 'Choose your link name, press Publish, and send it. They open it on their birthday.'],
];

const FAQ = [
  ['Who can see my birthday page?', 'Only people you share the link with, and only once you publish. Until then it is a private draft that nobody else can open. You can unpublish at any moment.'],
  ['Is the secret area really private?', 'Yes. It sits behind its own password that you choose. Private photos and videos are stored separately and are only served to someone who has unlocked that exact page.'],
  ['Do I need to know how to code?', 'No. Everything is edited with simple forms in your dashboard, and a live preview shows exactly what they will see.'],
  ['Can I use my own music and photos?', 'Yes. Upload your own photos and a song. Please only use music you own or have the right to use. Photos are re-encoded and their location data is removed.'],
  ['Does it work on phones?', 'It is designed phone-first, because that is where most surprises are opened. It also looks great on tablets and computers.'],
  ['Can I delete everything?', 'Yes. In Account Settings you can permanently delete your account together with every photo, letter and message you stored.'],
];

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.7 } };

function Section({ id, eyebrow, title, intro, children, tone = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 px-5 py-20 md:py-28 ${tone}`}>
      <div className="mx-auto max-w-6xl">
        <motion.header {...fade} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h2 className="font-serif text-4xl text-ivory md:text-5xl">{title}</h2>
          {intro && <p className="mt-4 text-ivory/65">{intro}</p>}
        </motion.header>
        {children}
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto h-[540px] w-[270px] sm:h-[600px] sm:w-[300px]" aria-hidden="true">
      <div className="absolute -left-14 top-16 hidden w-28 rotate-[-8deg] overflow-hidden rounded-xl border border-gold/30 shadow-soft sm:block">
        <img src="/demo/gallery-06.jpg" alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
      </div>
      <div className="absolute -right-12 bottom-24 hidden w-32 rotate-[7deg] overflow-hidden rounded-xl border border-gold/30 shadow-soft sm:block">
        <img src="/demo/gallery-01.jpg" alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
      </div>
      <div className="relative h-full overflow-hidden rounded-[2.4rem] border-[7px] border-[#1b0d14] bg-burgundy-dark shadow-glow ring-1 ring-gold/40">
        <img src="/demo/hero.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-burgundy-dark via-burgundy-dark/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-center">
          <p className="font-script text-5xl text-gold-light">Aanya</p>
          <p className="mt-1 font-serif text-sm italic text-ivory/85">&ldquo;If I could choose again, I would still choose you.&rdquo;</p>
          <div className="mx-auto mt-4 grid grid-cols-4 gap-1.5 text-[9px] uppercase tracking-widest text-ivory/70">
            {[['25', 'Days'], ['04', 'Hrs'], ['18', 'Min'], ['32', 'Sec']].map(([n, l]) => (
              <div key={l} className="rounded-lg bg-white/10 py-1.5 backdrop-blur"><b className="block font-serif text-lg font-medium text-ivory">{n}</b>{l}</div>
            ))}
          </div>
        </div>
        <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/60" />
      </div>
    </div>
  );
}

function Faq() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-white/10 rounded-2xl border border-gold/20 bg-white/[0.02]">
      {FAQ.map(([q, a], i) => {
        const open = openIdx === i;
        return (
          <div key={q}>
            <h3 className="font-sans">
              <button
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base text-ivory"
                aria-expanded={open}
                aria-controls={`faq-${i}`}
                onClick={() => setOpenIdx(open ? -1 : i)}
              >
                {q}
                <ChevronDown size={18} className={`shrink-0 text-gold transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </h3>
            {open && <p id={`faq-${i}`} className="px-6 pb-6 text-sm leading-relaxed text-ivory/70">{a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function Landing() {
  useDocumentMeta({
    title: `${BRAND.name}: Create a Birthday Surprise They'll Never Forget`,
    description: 'Build a personal birthday website with photos, letters, music and a cake to blow out. Private by default, and ready in an evening.',
  });
  const { hash } = useLocation();

  // Smooth-scroll to #features / #how-it-works / #faq, also when arriving from another page.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="bg-midnight">
      <SiteHeader transparent />

      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_70%_20%,#5a0f23,#240610_55%,#0b0709)] px-5 pb-20 pt-32 md:pt-40">
        <Petals density={0.6} />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center lg:text-left">
            <p className="eyebrow mb-5 inline-flex items-center gap-2"><Sparkles size={14} aria-hidden="true" /> Birthday websites, made personal</p>
            <h1 className="font-serif text-5xl leading-[1.05] text-ivory md:text-7xl">
              Create a Birthday Surprise <span className="gold-text italic">They&rsquo;ll Never Forget.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ivory/75 lg:mx-0">
              Turn your photos, memories and words into a beautiful private website: a sealed envelope to open, letters to read, a song to play and a cake to blow out.
              Personal to them, and ready in an evening.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link to="/register" className="btn-gold w-full sm:w-auto">Create Your Own</Link>
              <Link to="/demo" className="btn-ghost w-full sm:w-auto">Explore Live Demo</Link>
            </div>
            <p className="mt-5 text-xs text-ivory/45">Private until you publish &middot; No coding needed &middot; Ready in an evening</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }}>
            <PhoneMock />
          </motion.div>
        </div>
      </section>

      <Section id="features" eyebrow="Features" title="Everything a surprise needs" intro="Every part of the page is yours to change, and every detail is designed to feel like a gift.">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([Icon, title, text], i) => (
            <motion.li key={title} {...fade} transition={{ duration: 0.6, delay: (i % 4) * 0.07 }} className="rounded-2xl border border-gold/20 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold-light"><Icon size={20} aria-hidden="true" /></span>
              <h3 className="mb-2 font-serif text-2xl text-ivory">{title}</h3>
              <p className="text-sm leading-relaxed text-ivory/65">{text}</p>
            </motion.li>
          ))}
        </ul>
      </Section>

      <Section id="how-it-works" eyebrow="How it works" title="From idea to surprise in three steps" tone="bg-burgundy-deep/40">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map(([Icon, title, text], i) => (
            <motion.li key={title} {...fade} transition={{ duration: 0.6, delay: i * 0.1 }} className="relative rounded-2xl border border-gold/25 bg-midnight/60 p-8">
              <span className="absolute -top-4 left-8 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-gold-light to-gold font-serif text-lg font-semibold text-burgundy-dark">{i + 1}</span>
              <Icon size={26} className="mb-4 mt-2 text-gold" aria-hidden="true" />
              <h3 className="mb-2 font-serif text-2xl text-ivory">{title}</h3>
              <p className="text-sm leading-relaxed text-ivory/65">{text}</p>
            </motion.li>
          ))}
        </ol>
      </Section>

      <Section id="demo" eyebrow="Live demo" title="See a finished surprise" intro="Meet Aanya and Aarav, a fictional couple. Everything you see here, the cake, the letters, the secret place, is something you can make for someone you love.">
        <motion.div {...fade} className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4">
          {[['/demo/gallery-01.jpg', 'Golden hour'], ['/demo/gallery-06.jpg', 'Lanterns'], ['/demo/gallery-08.jpg', 'Flowers'], ['/demo/gallery-10.jpg', 'Under the stars']].map(([src, label]) => (
            <Link key={src} to="/demo" className="group relative block overflow-hidden rounded-2xl border border-gold/25">
              <img src={src} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-ivory">{label}</span>
              <span className="sr-only">Open the live demo</span>
            </Link>
          ))}
        </motion.div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/demo" className="btn-gold">Explore Live Demo</Link>
          <Link to="/register" className="btn-ghost">Create Your Own</Link>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-ivory/45">
          <BookHeart size={14} aria-hidden="true" /> The demo&rsquo;s secret-area password is shown on its lock screen.
        </p>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Questions, answered" tone="bg-burgundy-deep/40">
        <Faq />
      </Section>

      <section className="relative overflow-hidden px-5 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,#5a0f23,#0b0709_70%)]" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl text-ivory md:text-6xl">Make their next birthday unforgettable.</h2>
          <p className="mt-4 text-ivory/70">It only takes an evening, and they will keep it forever.</p>
          <Link to="/register" className="btn-gold mt-9">Create Your Own</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
