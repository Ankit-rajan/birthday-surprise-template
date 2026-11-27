import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { PageTitle } from './DashboardLayout.jsx';
import ContentTab from '../../components/dashboard/ContentTab.jsx';
import PhotosTab from '../../components/dashboard/SiteMediaTab.jsx';
import { GalleryTab, PrivateMediaTab } from '../../components/dashboard/MediaTabs.jsx';
import { TimelineTab, LettersTab, MessagesTab } from '../../components/dashboard/TextTabs.jsx';
import SecurityTab from '../../components/dashboard/SecurityTab.jsx';

const TABS = [
  ['content', 'Text & wishes', ContentTab],
  ['photos', 'Cover photos', PhotosTab],
  ['gallery', 'Gallery', GalleryTab],
  ['timeline', 'Timeline', TimelineTab],
  ['letters', 'Letters', LettersTab],
  ['private-media', 'Private photos & videos', PrivateMediaTab],
  ['messages', 'Private messages', MessagesTab],
  ['security', 'Passwords & privacy', SecurityTab],
];

/** "My Birthday Website": every part of the page, one tab each. */
export default function Website() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'content');
  const Active = TABS.find(([id]) => id === tab)[2];
  return (
    <>
      <PageTitle title="My Birthday Website" subtitle="Change anything on your page. Use Preview in the menu to see it exactly as they will." />
      <div role="tablist" aria-label="Sections of your website" className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition ${tab === id ? 'bg-gold text-burgundy-dark' : 'border border-white/15 text-ivory/70 hover:border-gold/50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel"><Active /></div>
    </>
  );
}
