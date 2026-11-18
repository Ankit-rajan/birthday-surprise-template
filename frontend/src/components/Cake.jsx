import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Confetti from './Confetti.jsx';
import { playCelebration, playHappyBirthday, playSparkle } from '../utils/sound.js';

const CANDLES = [112, 136, 160, 184, 208];

export default function Cake({ name = 'Birthday Star', age, wishPrompt, afterWishMessage }) {
  const [stage, setStage] = useState('lit'); // lit -> wishing -> blown
  const [burst, setBurst] = useState(0);
  const [lyric, setLyric] = useState(-1);
  const tuneRef = useRef(null);
  const reduce = useReducedMotion();
  const lit = stage !== 'blown';

  const lyrics = useMemo(
    () => ['Happy birthday to you\u2026', 'Happy birthday to you\u2026', `Happy birthday dear ${name}\u2026`, 'Happy birthday to you! \ud83c\udf82'],
    [name],
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
    playSparkle();
    tuneRef.current = playHappyBirthday({ onLine: setLyric });
  };

  // Blow out: whoosh, pop, applause, cheer and "Happy birthday <name>!"
  const blowOut = () => {
    stopTune();
    setStage('blown');
    setBurst((n) => n + 1);
    playCelebration(name);
  };

  const relight = () => {
    stopTune();
    setLyric(-1);
    setStage('lit');
    playSparkle();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <Confetti trigger={burst} />

      <svg viewBox="0 0 320 300" className="w-full max-w-[360px]" role="img" aria-label={`A birthday cake with ${lit ? 'lit' : 'blown-out'} candles`}>
        <defs>
          <linearGradient id="tierBottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a1f40" />
            <stop offset="1" stopColor="#4a0c1d" />
          </linearGradient>
          <linearGradient id="tierTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbe3e6" />
            <stop offset="1" stopColor="#f0b7c0" />
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ecd9b0" />
            <stop offset="1" stopColor="#b08d57" />
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
          fill="#fbe3e6"
        />
        <text x="160" y="233" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontStyle="italic" fontSize="44" fill="#ecd9b0">
          {age}
        </text>

        <rect x="90" y="122" width="140" height="50" rx="9" fill="url(#tierTop)" />
        <path
          d="M90 130 Q103 150 116 130 Q130 154 144 130 Q158 152 172 130 Q186 154 200 130 Q214 150 230 130 L230 122 L90 122Z"
          fill="#fff8ec"
        />
        <circle cx="105" cy="158" r="3" fill="#b3294f" />
        <circle cx="160" cy="162" r="3" fill="#b3294f" />
        <circle cx="215" cy="158" r="3" fill="#b3294f" />

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
              <p className="mx-auto mb-3 max-w-sm font-serif text-xl italic text-gold-light">{wishPrompt}</p>
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
              <p className="mx-auto max-w-sm font-serif text-2xl italic leading-snug text-gold-light">{afterWishMessage}</p>
              <button className="btn-ghost mt-6" onClick={relight}>
                Light them again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
