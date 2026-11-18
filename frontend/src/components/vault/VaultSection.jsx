import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '../../hooks/VaultContext.jsx';
import LockScreen from './LockScreen.jsx';
import UnlockedVault from './UnlockedVault.jsx';

export default function VaultSection({ site }) {
  const vault = useVault();
  const unlocked = vault.status === 'unlocked';

  return (
    <section id="vault" className="relative bg-gradient-to-b from-burgundy-dark to-burgundy-deep" aria-label="Private love vault">
      <AnimatePresence mode="wait" initial={false}>
        {unlocked ? (
          <motion.div key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <UnlockedVault site={site} />
          </motion.div>
        ) : (
          <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <LockScreen herName={site.herName} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
