import { useEffect, useRef, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { Sheet, useMediaQuery } from './ui.jsx';
import { useDashboard } from '../../pages/dashboard/DashboardLayout.jsx';

/**
 * The owner's own page, rendered by the SAME BirthdaySite component as the published page (route /dashboard/preview?embed=1 inside an iframe,
 * so its own CSS, fixed navigation and theme variables are isolated). It reloads after every save, and unsaved appearance / wording drafts are
 * sent to it with postMessage so colour and label changes show instantly.
 *
 * xl screens: a phone-shaped panel docked beside the form. Smaller screens: a "Live preview" button that opens it full height.
 */
function Frame({ draft, className = '' }) {
  const { previewRev } = useDashboard();
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const send = () => ref.current?.contentWindow?.postMessage({ type: 'preview-draft', draft: draft || {} }, window.location.origin);

  useEffect(() => setLoaded(false), [previewRev]);
  useEffect(() => {
    if (loaded) send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, JSON.stringify(draft || {})]);

  return (
    <iframe
      ref={ref}
      key={previewRev}
      title="Live preview of your page"
      src="/dashboard/preview?embed=1"
      onLoad={() => setLoaded(true)}
      className={`block border-0 bg-midnight ${className}`}
    />
  );
}

export function PreviewDock({ draft }) {
  const { bumpPreview } = useDashboard();
  return (
    <aside aria-label="Live preview" className="sticky top-8 hidden self-start xl:block">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-ivory/55">
        <span>Live preview</span>
        <button type="button" onClick={bumpPreview} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 hover:bg-white/10"><RefreshCw size={13} aria-hidden="true" /> Refresh</button>
      </div>
      <div className="mx-auto w-[390px] max-w-full rounded-[2.2rem] border-[7px] border-[#0b0709] bg-[#0b0709] shadow-soft ring-1 ring-gold/30">
        <Frame draft={draft} className="h-[min(780px,calc(100vh-9rem))] w-full rounded-[1.7rem]" />
      </div>
    </aside>
  );
}

export function PreviewButton({ draft }) {
  const [open, setOpen] = useState(false);
  const wide = useMediaQuery('(min-width: 1280px)');
  if (wide) return null; // the dock is already on screen
  return (
    <>
      <button type="button" className="btn-ghost !px-4 !py-2.5" onClick={() => setOpen(true)}>
        <Eye size={15} aria-hidden="true" /> Live preview
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Live preview">
        <Frame draft={draft} className="h-[68dvh] w-full rounded-xl" />
      </Sheet>
    </>
  );
}

/** Two-column wrapper: form on the left, docked preview on the right (xl and up). */
export function WithPreview({ draft, children }) {
  const wide = useMediaQuery('(min-width: 1280px)');
  return (
    <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_420px] gap-10' : ''}>
      <div className="min-w-0">{children}</div>
      {wide && <PreviewDock draft={draft} />}
    </div>
  );
}
