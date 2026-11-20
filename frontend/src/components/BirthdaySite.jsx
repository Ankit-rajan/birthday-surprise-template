import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VaultProvider } from '../hooks/VaultContext.jsx';
import { SiteFxProvider } from '../hooks/SiteFx.jsx';
import Intro from './Intro.jsx';
import NavBar from './NavBar.jsx';
import Hero from './Hero.jsx';
import Gallery from './Gallery.jsx';
import Timeline from './Timeline.jsx';
import Reasons from './Reasons.jsx';
import HeartLetter from './HeartLetter.jsx';
import OpenWhen from './OpenWhen.jsx';
import Future from './Future.jsx';
import VaultSection from './vault/VaultSection.jsx';
import FinalSurprise from './FinalSurprise.jsx';
import MusicPlayer from './MusicPlayer.jsx';

const BANNER_H = 44;

function Banner({ mode, children }) {
  const tone = mode === 'demo' ? 'bg-gold text-burgundy-dark' : 'bg-midnight text-gold-light border-b border-gold/30';
  return (
    <div
      role="region"
      aria-label={mode === 'demo' ? 'Demo notice' : 'Preview notice'}
      style={{ height: BANNER_H }}
      className={`fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-3 px-3 text-center text-[11px] uppercase tracking-[0.18em] sm:text-xs ${tone}`}
    >
      {children}
    </div>
  );
}

/**
 * One complete birthday page. The SAME component renders all three experiences:
 *   mode "public"  - a published customer page (/birthday/:slug)
 *   mode "demo"    - the read-only fictional sample (/demo)
 *   mode "preview" - the owner looking at their own page, published or not (/dashboard/preview)
 * `vaultApi` is the vault API for that page, or null when the private area is unavailable (preview).
 */
export default function BirthdaySite({ data, mode = 'public', vaultApi = null, vaultHint = '', published = true }) {
  const [opened, setOpened] = useState(false);
  const { site, gallery, timeline, letters } = data;
  const showVault = Boolean(site.vaultEnabled);
  const banner = mode === 'demo' || mode === 'preview';
  const fxSettings = useMemo(() => site.settings, [site.settings]);

  return (
    <SiteFxProvider settings={fxSettings}>
      <VaultProvider api={mode === 'preview' ? null : vaultApi} hint={vaultHint}>
        {banner && (
          <Banner mode={mode}>
            {mode === 'demo' ? (
              <>
                <span>Live demo with sample content</span>
                <Link to="/register" className="rounded-full bg-burgundy-dark px-4 py-1.5 text-ivory no-underline hover:brightness-125">
                  Create your own
                </Link>
              </>
            ) : (
              <>
                <span>{published ? 'Preview of your live page' : 'Preview: only you can see this'}</span>
                <Link to="/dashboard" className="rounded-full border border-gold/60 px-4 py-1.5 text-gold-light hover:bg-gold/10">
                  Back to My Dashboard
                </Link>
              </>
            )}
          </Banner>
        )}

        {!opened && <Intro site={site} onOpened={() => setOpened(true)} />}

        {opened && (
          <div style={{ paddingTop: banner ? BANNER_H : 0 }}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-burgundy-dark"
            >
              Skip to content
            </a>
            <NavBar siteName={site.siteName} showVault={showVault} topOffset={banner ? BANNER_H : 0} />
            <main id="main">
              <Hero site={site} />
              <Gallery gallery={gallery} />
              <Timeline timeline={timeline} />
              <Reasons reasons={site.reasons} />
              <HeartLetter letter={letters.heart} partnerName={site.partnerName} />
              <OpenWhen letters={letters.openWhen} partnerName={site.partnerName} />
              <Future future={site.future} letter={letters.futureWife} partnerName={site.partnerName} />
              {showVault && <VaultSection site={site} />}
              <FinalSurprise site={site} />
            </main>
            <footer className="bg-midnight px-6 py-10 text-center text-[11px] uppercase tracking-[0.35em] text-ivory/45">
              <p>Made with love, for {site.herName}</p>
              {mode !== 'preview' && (
                <p className="mt-4 normal-case tracking-normal">
                  <Link to="/" className="text-gold-light/80 underline-offset-4 hover:text-gold-light hover:underline">
                    Create a birthday surprise like this with Surprise Studio
                  </Link>
                </p>
              )}
            </footer>
            <MusicPlayer title={site.music.title} src={site.music.url} />
          </div>
        )}
      </VaultProvider>
    </SiteFxProvider>
  );
}
