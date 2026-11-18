import { useEffect, useState } from 'react';
import { useContent } from '../hooks/useContent.js';
import { DEMO } from '../services/api.js';
import Intro from '../components/Intro.jsx';
import NavBar from '../components/NavBar.jsx';
import Hero from '../components/Hero.jsx';
import Gallery from '../components/Gallery.jsx';
import Timeline from '../components/Timeline.jsx';
import Reasons from '../components/Reasons.jsx';
import HeartLetter from '../components/HeartLetter.jsx';
import OpenWhen from '../components/OpenWhen.jsx';
import Future from '../components/Future.jsx';
import VaultSection from '../components/vault/VaultSection.jsx';
import FinalSurprise from '../components/FinalSurprise.jsx';
import MusicPlayer from '../components/MusicPlayer.jsx';

export default function Home() {
  const { status, data, reload } = useContent();
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (data?.site?.siteName) document.title = data.site.siteName;
  }, [data]);

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-burgundy-dark" role="status" aria-live="polite">
        <p className="animate-pulse font-script text-4xl text-gold-light">Just a moment&hellip;</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-burgundy-dark px-6 text-center">
        <div>
          <h1 className="font-serif text-3xl italic text-ivory">The little world is taking a nap.</h1>
          <p className="mt-3 text-ivory/70">We couldn&rsquo;t reach the server. Please check your connection and try again.</p>
          <button className="btn-gold mt-8" onClick={reload}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { site, gallery, timeline, letters } = data;

  return (
    <>
      {!opened && <Intro site={site} onOpened={() => setOpened(true)} />}

      {opened && (
        <>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-burgundy-dark"
          >
            Skip to content
          </a>
          <NavBar siteName={site.siteName} />
          <main id="main">
            <Hero site={site} />
            <Gallery gallery={gallery} />
            <Timeline timeline={timeline} />
            <Reasons reasons={site.reasons} />
            <HeartLetter letter={letters.heart} partnerName={site.partnerName} />
            <OpenWhen letters={letters.openWhen} partnerName={site.partnerName} />
            <Future future={site.future} letter={letters.futureWife} partnerName={site.partnerName} />
            <VaultSection site={site} />
            <FinalSurprise site={site} />
          </main>
          <footer className="bg-midnight px-6 py-10 text-center text-[11px] uppercase tracking-[0.35em] text-ivory/35">
            Made with love, for {site.herName}
          </footer>
          <MusicPlayer title={site.music.title} src={site.music.url} />
          {DEMO && (
            <div className="fixed bottom-4 left-4 z-[60] rounded-full border border-dashed border-gold/60 bg-midnight/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-gold-light backdrop-blur">
              Demo mode &middot; <a href="/admin" className="underline">Admin</a>
            </div>
          )}
        </>
      )}
    </>
  );
}
