import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookHeart, Camera, Lock, Mail, MessageCircleHeart, NotebookPen } from 'lucide-react';
import { useVault } from '../../hooks/VaultContext.jsx';
import PrivateMemories from './PrivateMemories.jsx';
import { SecretMessages, SecretDiary, LettersForYou } from './MessageTabs.jsx';
import HerHeart from './HerHeart.jsx';

const TABS = [
  { id: 'memories', label: 'Private memories', Icon: Camera },
  { id: 'messages', label: 'Secret messages', Icon: MessageCircleHeart },
  { id: 'diary', label: 'Secret diary', Icon: NotebookPen },
  { id: 'letters', label: 'Letters for you', Icon: Mail },
  { id: 'heart', label: 'Her heart', Icon: BookHeart },
];

export default function UnlockedVault() {
  const vault = useVault();
  const [tab, setTab] = useState('memories');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    vault.api
      .overview()
      .then(setData)
      .catch((err) => {
        if (err.status !== 401) setError(err.message); // 401 is handled globally (it re-locks)
      });
  }, [vault.api]);

  useEffect(() => {
    load();
    // Private content lives only in this component's state, so locking (unmount) discards it.
  }, [load]);

  return (
    <div className="relative px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="eyebrow mb-2">Unlocked</p>
            <h2 className="font-serif text-4xl text-ivory md:text-5xl">Our Little Secret Place</h2>
            <p className="mt-2 font-serif text-lg italic text-gold-light/90">Some memories are just for us.</p>
          </div>
          <button onClick={() => vault.lock()} className="btn-gold shrink-0">
            <Lock size={16} aria-hidden="true" /> Lock again &#128274;
          </button>
        </header>

        {vault.warnSeconds !== null && (
          <p role="alert" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-gold-light">
            Still there? The vault will lock itself in {vault.warnSeconds} seconds. Touch the screen to stay.
          </p>
        )}

        <div role="tablist" aria-label="Vault sections" className="no-scrollbar mb-10 flex gap-2 overflow-x-auto pb-2 md:justify-center">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition ${
                tab === id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/65 hover:border-gold/50'
              }`}
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-6 text-center text-blush-deep">
            {error}{' '}
            <button className="underline" onClick={load}>
              Try again
            </button>
          </p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tab === 'heart' ? (
              <HerHeart />
            ) : !data ? (
              !error && <p className="animate-pulse text-center font-serif text-xl italic text-ivory/60">Opening&hellip;</p>
            ) : tab === 'memories' ? (
              <PrivateMemories media={data.media} />
            ) : tab === 'messages' ? (
              <SecretMessages items={data.secrets} />
            ) : tab === 'diary' ? (
              <SecretDiary items={data.diary} />
            ) : (
              <LettersForYou items={data.letters} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
