import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/SiteConfig.jsx';
import Confetti from './Confetti.jsx';
import Fireworks from './Fireworks.jsx';
import { playCelebration, playHappyBirthday, playSparkle } from '../utils/sound.js';
import { useSiteFx } from '../hooks/SiteFx.jsx';

const THEMES = {
  rose: { bottom: ['#8a1f40', '#4a0c1d'], top: ['#fbe3e6', '#f0b7c0'], icing: '#fbe3e6', icing2: '#fff8ec', dots: '#b3294f' },
  chocolate: { bottom: ['#6b3f2a', '#3a1d10'], top: ['#a8714f', '#7a4a30'], icing: '#e9d3b8', icing2: '#f6e8d4', dots: '#3a1d10' },
  vanilla: { bottom: ['#f1dba8', '#d9bd7e'], top: ['#fff3d6', '#f6dfae'], icing: '#fffaf0', icing2: '#ffffff', dots: '#e0a45c' },
  berry: { bottom: ['#7a2a63', '#44123a'], top: ['#f6c9e8', '#d98ec0'], icing: '#fdeaf6', icing2: '#ffffff', dots: '#7a2a63' },
  midnight: { bottom: ['#27306b', '#10153a'], top: ['#cfd6ff', '#97a2f0'], icing: '#e8ecff', icing2: '#f6f8ff', dots: '#27306b' },
};

/** n candle x-positions, centred on the top tier (which spans x 90..230). */
const candlePositions = (n) => {
  if (n <= 1) return [160];
  const step = Math.min(24, 100 / (n - 1));
  return Array.from({ length: n }, (_, i) => 160 - ((n - 1) * step) / 2 + i * step);
};

export default function Cake({ name = 'Birthday Star', age, wishPrompt, afterWishMessage }) {
  const fx = useSiteFx();
  const theme = THEMES[fx.cake.theme] || THEMES.rose;
  const CANDLES = useMemo(() => candlePositions(fx.cake.candles), [fx.cake.candles]);
  const firstName = String(name).trim().split(/\s+/)[0] || name;
  const [stage, setStage] = useState('lit'); // lit -> wishing -> blown
  const [burst, setBurst] = useState(0);
  const [lyric, setLyric] = useState(-1);
  const tuneRef = useRef(null);
  const reduce = useReducedMotion();
  const lit = stage !== 'blown';

  const lyrics = useMemo(
    () => ['Happy birthday to you\u2026', 'Happy birthday to you\u2026', `Happy birthday dear ${firstName}\u2026`, 'Happy birthday to you! \ud83c\udf82'],
    [firstName],
  );

  const stopTune = () => {
    tuneRef.current?.stop();
    tuneRef.current = null;
  };
  useEffect(() => stopTune, []);

  // "Make a wish": sparkle, then the Happy Birthday tune with the words shown line by line.
  const startWish = () => {
    stopTune();
    setStage('wishing');
    setLyric(-1);
    if (fx.sounds) {
      playSparkle();
      tuneRef.current = playHappyBirthday({ onLine: setLyric });
    } else {
      // Silent mode: still show the song words, one line at a time.
      [0, 1, 2, 3].forEach((i) => setTimeout(() => setLyric(i), 900 * (i + 1)));
    }
  };

  // Blow out: whoosh, pop, applause, cheer and "Happy birthday <name>!"
  const blowOut = () => {
    stopTune();
    setStage('blown');
    setBurst((n) => n + 1);
    if (fx.sounds) playCelebration(firstName);
  };

  const relight = () => {
    stopTune();
    setLyric(-1);
    setStage('lit');
    if (fx.sounds) playSparkle();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <Confetti trigger={burst} />
      <Fireworks trigger={burst} />

      <svg viewBox="0 0 320 300" className="w-full max-w-[360px]" role="img" aria-label={`A birthday cake with ${lit ? 'lit' : 'blown-out'} candles`}>
        <defs>
          <linearGradient id="tierBottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.bottom[0]} />
            <stop offset="1" stopColor={theme.bottom[1]} />
          </linearGradient>
          <linearGradient id="tierTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.top[0]} />
            <stop offset="1" stopColor={theme.top[1]} />
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'rgb(var(--c-gold-light, 236 217 176))' }} />
            <stop offset="1" style={{ stopColor: 'rgb(var(--c-gold-dark, 176 141 87))' }} />
          </linearGradient>
          <radialGradient id="flameGlow">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="160" cy="268" rx="140" ry="16" fill="#000" opacity="0.35" />
        <ellipse cx="160" cy="258" rx="130" ry="14" fill="url(#gold)" />

        <rect x="55" y="170" width="210" height="88" rx="10" fill="url(#tierBottom)" />
        <path
          d="M55 180 Q70 205 85 180 Q100 210 118 180 Q135 208 152 180 Q170 212 188 180 Q205 206 222 180 Q240 208 265 180 L265 170 L55 170Z"
          fill={theme.icing}
        />
        <text x="160" y="233" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontStyle="italic" fontSize="44" fill="#ecd9b0">
          {fx.cake.showAge ? age : '\u2665'}
        </text>

        <rect x="90" y="122" width="140" height="50" rx="9" fill="url(#tierTop)" />
        <path
          d="M90 130 Q103 150 116 130 Q130 154 144 130 Q158 152 172 130 Q186 154 200 130 Q214 150 230 130 L230 122 L90 122Z"
          fill={theme.icing2}
        />
        <circle cx="105" cy="158" r="3" fill={theme.dots} />
        <circle cx="160" cy="162" r="3" fill={theme.dots} />
        <circle cx="215" cy="158" r="3" fill={theme.dots} />

        {CANDLES.map((x, i) => (
          <g key={x}>
            <rect x={x - 4} y="86" width="8" height="38" rx="2" fill={i % 2 ? '#fff8ec' : 'url(#gold)'} />
            <rect x={x - 4} y="94" width="8" height="3" fill="#b3294f" opacity="0.5" />
            <motion.g
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
              initial={false}
              animate={lit ? { opacity: 1, scaleY: reduce ? 1 : [1, 1.18, 0.94, 1.1, 1] } : { opacity: 0, scaleY: 0.2 }}
              transition={lit ? { duration: 0.9 + i * 0.13, repeat: reduce ? 0 : Infinity } : { duration: 0.35 }}
            >
              <circle cx={x} cy="72" r="16" fill="url(#flameGlow)" />
              <path d={`M${x} 60 C${x + 7} 70 ${x + 6} 82 ${x} 84 C${x - 6} 82 ${x - 7} 70 ${x} 60Z`} fill="#ffb347" />
              <path d={`M${x} 68 C${x + 3} 74 ${x + 3} 80 ${x} 82 C${x - 3} 80 ${x - 3} 74 ${x} 68Z`} fill="#fff1b8" />
            </motion.g>
            {!lit && !reduce && (
              <motion.path
                d={`M${x} 84 q-5 -10 0 -18 q5 -8 0 -16`}
                fill="none"
                stroke="#ecd9b0"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ opacity: 0.6, y: 0 }}
                animate={{ opacity: 0, y: -26 }}
                transition={{ duration: 2.2, delay: i * 0.08 }}
              />
            )}
          </g>
        ))}
      </svg>

      {fx.candles && (
      <div className="mt-6 min-h-[200px] text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {stage === 'lit' && (
            <motion.div key="lit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="mb-5 font-serif text-xl italic text-ivory/80">The candles are lit. Ready?</p>
              <button className="btn-gold" onClick={startWish}>
                Make a wish &#10022;
              </button>
            </motion.div>
          )}
          {stage === 'wishing' && (
            <motion.div key="wishing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {wishPrompt && <p className="mx-auto mb-3 max-w-sm font-serif text-xl italic text-gold-light">{wishPrompt}</p>}
              <div className="mb-5 min-h-[2.25rem]">
                <AnimatePresence mode="wait">
                  {lyric >= 0 && (
                    <motion.p
                      key={lyric}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="font-hand text-2xl text-ivory/90"
                    >
                      &#9835; {lyrics[lyric]} &#9835;
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <button className="btn-gold" onClick={blowOut}>
                Blow out the candles
              </button>
            </motion.div>
          )}
          {stage === 'blown' && (
            <motion.div key="blown" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {afterWishMessage && <p className="mx-auto max-w-sm font-serif text-2xl italic leading-snug text-gold-light">{afterWishMessage}</p>}
              <button className="btn-ghost mt-6" onClick={relight}>
                Light them again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
