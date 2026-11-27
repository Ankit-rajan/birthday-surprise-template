import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Compass, Film, Home, Images, Lock, Mail, MailOpen, Sparkles, BookOpen } from 'lucide-react';
import { VaultProvider } from '../hooks/VaultContext.jsx';
import { SiteFxProvider } from '../hooks/SiteFx.jsx';
import { SiteConfigProvider, useCopy, useSiteConfig } from '../hooks/SiteConfig.jsx';
import Intro from './Intro.jsx';
import NavBar from './NavBar.jsx';
import Hero from './Hero.jsx';
import Gallery from './Gallery.jsx';
import Videos from './Videos.jsx';
import Timeline from './Timeline.jsx';
import Reasons from './Reasons.jsx';
import HeartLetter from './HeartLetter.jsx';
import OpenWhen from './OpenWhen.jsx';
import Future from './Future.jsx';
import VaultSection from './vault/VaultSection.jsx';
import FinalSurprise from './FinalSurprise.jsx';
import MusicPlayer from './MusicPlayer.jsx';
import CursorEffects from './CursorEffects.jsx';

const BANNER_H = 44;

function Banner({ mode, children }) {
  const tone = mode === 'demo' ? 'bg-gold text-burgundy-dark' : 'bg-midnight text-gold-light border-b border-gold/30';
  return (
    <div
      role="region"
      aria-label={mode === 'demo' ? 'Demo notice' : 'Preview notice'}
      style={{ height: BANNER_H }}
      className={`fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-3 px-3 text-center text-[11px] uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.18em] ${tone}`}
    >
      {children}
    </div>
  );
}

/**
 * One complete birthday page. The SAME component renders all three experiences:
 *   mode "public"  - a published customer page (/birthday/:slug)
 *   mode "demo"    - the read-only fictional sample (/demo)
 *   mode "preview" - the owner looking at their own page, published or not (/dashboard/preview, also inside the live-preview panel)
 * `vaultApi` is the vault API for that page, or null when the private area is unavailable (preview).
 * `overrides` (preview only) lets the dashboard try an appearance or wording draft before it is saved.
 */
export default function BirthdaySite(props) {
  return (
    <SiteConfigProvider site={props.data.site} overrides={props.overrides}>
      <Page {...props} />
    </SiteConfigProvider>
  );
}

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

function Page({ data, mode = 'public', vaultApi = null, vaultHint = '', published = true, embedded = false }) {
  const { features: f } = useSiteConfig();
  const t = useCopy();
  const { site, gallery, videos = [], timeline, letters } = data;
  const [opened, setOpened] = useState(!f.envelope);
  const banner = (mode === 'demo' || mode === 'preview') && !embedded;
  const fxSettings = useMemo(() => site.settings, [site.settings]);

  // Which sections exist: switched on AND have something to show. The same list drives the page and its navigation.
  const sections = useMemo(() => {
    const list = [];
    const futureHasItems = ['places', 'dreams', 'promises', 'memories'].some((k) => site.future?.[k]?.length);
    const add = (id, label, Icon, on) => on && list.push({ id, label, Icon });
    add('home', t('navHome'), Home, f.hero || f.cake);
    add('gallery', t('navGallery'), Images, f.gallery && gallery.length > 0);
    add('videos', 'Videos', Film, f.videoGallery && videos.length > 0);
    add('story', t('navStory'), BookOpen, f.timeline && timeline.length > 0);
    add('reasons', t('navReasons'), Sparkles, f.flipCards && site.reasons.length > 0);
    add('letter', t('navLetter'), Mail, f.letters && f.mainLetter && hasText(letters.heart.body));
    add('open-when', t('navOpenWhen'), MailOpen, f.letters && f.openWhenLetters && letters.openWhen.length > 0);
    add('future', t('navFuture'), Compass, f.future && (futureHasItems || (f.futureLetter && hasText(letters.futureWife.body))));
    add('vault', t('navVault'), Lock, Boolean(site.vaultEnabled));
    return list;
  }, [f, t, gallery, videos, timeline, letters, site.reasons, site.future, site.vaultEnabled]);
  const has = (id) => sections.some((s) => s.id === id);
  // The page shows nothing under "Videos" when there is a gallery: its link stays under the photos' label only if there are no photos.
  const navLinks = sections.filter((s) => s.id !== 'videos' || !has('gallery'));
  const showFinale = f.closing && (hasText(site.finalQuote) || hasText(site.finalMessage) || site.photos.final);
  const showNav = f.navigation && navLinks.length > 1;

  return (
    <MotionConfig reducedMotion={f.animatedTransitions ? 'user' : 'always'}>
      <SiteFxProvider settings={fxSettings}>
        <VaultProvider api={mode === 'preview' ? null : vaultApi} hint={vaultHint}>
          {f.cursorEffects && <CursorEffects />}
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
                    Back to Dashboard
                  </Link>
                </>
              )}
            </Banner>
          )}

          {f.envelope && !opened && <Intro site={site} onOpened={() => setOpened(true)} />}

          {opened && (
            <div style={{ paddingTop: banner ? BANNER_H : 0 }}>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-burgundy-dark"
              >
                Skip to content
              </a>
              {showNav && <NavBar siteName={site.siteName} links={navLinks} topOffset={banner ? BANNER_H : 0} />}
              <main id="main">
                {has('home') && <Hero site={site} />}
                {has('gallery') && <Gallery gallery={gallery} />}
                {has('videos') && <Videos videos={videos} />}
                {has('story') && <Timeline timeline={timeline} />}
                {has('reasons') && <Reasons reasons={site.reasons} />}
                {has('letter') && <HeartLetter letter={letters.heart} partnerName={site.partnerName} />}
                {has('open-when') && <OpenWhen letters={letters.openWhen} partnerName={site.partnerName} />}
                {has('future') && <Future future={site.future} letter={f.futureLetter ? letters.futureWife : { title: '', body: '' }} partnerName={site.partnerName} />}
                {has('vault') && <VaultSection site={site} />}
                {showFinale && <FinalSurprise site={site} />}
              </main>
              {f.footer && (
                <footer className={`bg-midnight px-6 pt-10 text-center text-[11px] uppercase tracking-[0.3em] text-ivory/45 ${showNav ? 'pb-28 lg:pb-10' : 'pb-10'}`}>
                  <p className="break-words">{t('footerText')}</p>
                  {mode !== 'preview' && f.studioCredit && (
                    <p className="mt-4 normal-case tracking-normal">
                      <Link to="/" className="text-gold-light/80 underline-offset-4 hover:text-gold-light hover:underline">
                        {t('footerCredit')}
                      </Link>
                    </p>
                  )}
                </footer>
              )}
              {!f.footer && showNav && <div className="h-20 lg:hidden" aria-hidden="true" />}
              <MusicPlayer title={site.music.title} src={site.music.url} hasNav={showNav} />
            </div>
          )}
        </VaultProvider>
      </SiteFxProvider>
    </MotionConfig>
  );
}
