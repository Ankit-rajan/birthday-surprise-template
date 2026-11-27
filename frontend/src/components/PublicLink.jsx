import { useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { useToast } from './dashboard/ui.jsx';

/**
 * A public link shown the way a phone user expects: ONE line that never wraps or stretches its card, ellipsis when it is too long
 * (the full address stays in the `title`, in the Copy button and in Share), plus Copy, Share (native sheet where the browser has one)
 * and Open. The URL itself is never altered.
 */
export default function PublicLink({ url, canOpen = true, label = 'Share this link', title = 'My birthday surprise' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else throw new Error('no clipboard');
    } catch {
      // Older browsers / insecure contexts: fall back to a hidden textarea + execCommand, and finally to selecting the text.
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, { position: 'fixed', top: 0, left: 0, opacity: 0 });
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (!ok) throw new Error('copy failed');
      } catch {
        document.getElementById('public-link-text')?.focus();
        toast.error('Could not copy automatically. The link is selected: press and hold to copy.');
        return;
      }
    }
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    try {
      await navigator.share({ title, text: 'I made you a birthday surprise', url });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing did not work here. Use Copy link instead.');
      }
    }
  };

  return (
    <div className="min-w-0 rounded-xl border border-gold/25 bg-black/20 p-3 sm:p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-ivory/50">{label}</p>
      <input
        id="public-link-text"
        readOnly
        value={url}
        title={url}
        aria-label="Public link"
        onFocus={(e) => e.target.select()}
        className="block w-full min-w-0 truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-gold-light [text-overflow:ellipsis]"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className="btn-gold !px-4 !py-3 !text-xs sm:!px-5" onClick={copy}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {canShare ? (
          <button type="button" className="btn-ghost !px-4 !py-3" onClick={share}>
            <Share2 size={15} aria-hidden="true" /> Share
          </button>
        ) : (
          <a
            className="btn-ghost !px-4 !py-3"
            href={`https://wa.me/?text=${encodeURIComponent(`I made you a birthday surprise: ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 size={15} aria-hidden="true" /> Share
          </a>
        )}
        {canOpen && (
          <a className="btn-ghost col-span-2 !px-4 !py-3 sm:col-span-1" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> Open
          </a>
        )}
      </div>
    </div>
  );
}
