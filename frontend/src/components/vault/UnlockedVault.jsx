import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookHeart, Camera, Lock, Mail, MessageCircleHeart, NotebookPen } from 'lucide-react';
import { useVault } from '../../hooks/VaultContext.jsx';
import PrivateMemories from './PrivateMemories.jsx';
import { SecretMessages, SecretDiary, LettersForYou } from './MessageTabs.jsx';
import HerHeart from './HerHeart.jsx';
import { useCopy, useFeatures } from '../../hooks/SiteConfig.jsx';

// `on` says which switch must be ON for a tab to exist. A disabled tab is not rendered, and its data is not sent by the server either.
const TABS = [
  { id: 'memories', label: 'vaultTabMemories', Icon: Camera, on: (f) => f.privateMedia && (f.privatePhotos || f.privateVideos) },
  { id: 'messages', label: 'vaultTabMessages', Icon: MessageCircleHeart, on: (f) => f.secretMessages },
  { id: 'diary', label: 'vaultTabDiary', Icon: NotebookPen, on: (f) => f.personalNotes },
  { id: 'letters', label: 'vaultTabLetters', Icon: Mail, on: (f) => f.privateLetters },
  { id: 'heart', label: 'vaultTabHeart', Icon: BookHeart, on: (f) => f.journal },
];

export default function UnlockedVault() {
  const vault = useVault();
  const t = useCopy();
  const f = useFeatures();
  const tabs = TABS.filter((x) => x.on(f));
  const [picked, setTab] = useState(null);
  const tab = tabs.some((x) => x.id === picked) ? picked : tabs[0]?.id;
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
            <h2 className="font-serif text-[2rem] text-ivory sm:text-4xl md:text-5xl">{t('vaultTitle')}</h2>
            <p className="mt-2 font-serif text-lg italic text-gold-light/90">{t('vaultSubtitle')}</p>
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
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs uppercase tracking-[0.18em] transition ${
                tab === id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/65 hover:border-gold/50'
              }`}
            >
              <Icon size={15} aria-hidden="true" /> {t(label)}
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
            {!tab ? (
              <p className="text-center font-serif text-xl italic text-ivory/60">Nothing is in here yet.</p>
            ) : tab === 'heart' ? (
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
