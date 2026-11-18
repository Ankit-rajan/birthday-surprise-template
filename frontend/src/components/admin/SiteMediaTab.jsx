import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAdminCall, Status } from './useAdminCall.jsx';

const SLOTS = [
  ['intro', 'Opening screen background (shown blurred behind the envelope)'],
  ['hero', 'Birthday portrait (shown big on the home screen)'],
  ['final', 'Final surprise photo (last section of the page)'],
];

export default function SiteMediaTab({ onExpired }) {
  const [content, setContent] = useState(null);
  const { busy, error, ok, run } = useAdminCall(onExpired);

  useEffect(() => {
    run(() => api.admin.getContent(), '').then((c) => c && setContent(c));
  }, [run]);

  if (!content) return <Status error={error} ok="" />;

  const upload = (fn, msg) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) run(fn(file), msg).then((c) => c && setContent(c));
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-ivory/60">Upload only your real photographs. They are re-encoded and location data is removed.</p>
      <div className="grid gap-6 md:grid-cols-3">
        {SLOTS.map(([slot, label]) => (
          <div key={slot} className="rounded-2xl border border-gold/25 p-4">
            <h2 className="mb-3 text-sm text-gold-light">{label}</h2>
            <div className="mb-3 grid aspect-[4/5] place-items-center overflow-hidden rounded-lg bg-black/30">
              {content.photos[slot] ? <img src={content.photos[slot]} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-ivory/40">None yet</span>}
            </div>
            <label className="btn-ghost w-full cursor-pointer">
              Choose photo
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={upload((f) => () => api.admin.setSitePhoto(slot, f), 'Photo updated.')} />
            </label>
            {content.photos[slot] && (
              <button className="mt-2 w-full text-xs text-ivory/50 hover:text-blush-deep" disabled={busy} onClick={() => run(() => api.admin.clearSitePhoto(slot), 'Photo removed.').then((c) => c && setContent(c))}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gold/25 p-4">
        <h2 className="mb-1 text-sm text-gold-light">Background music</h2>
        <p className="mb-3 text-xs text-ivory/50">MP3, M4A or OGG, up to 20 MB. Use only music you own or are licensed to use.</p>
        {content.music.url && <audio controls src={content.music.url} className="mb-3 w-full" />}
        <div className="flex flex-wrap gap-3">
          <label className="btn-ghost cursor-pointer">
            {content.music.url ? 'Replace song' : 'Upload song'}
            <input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,.mp3,.m4a,.ogg" className="sr-only" disabled={busy} onChange={upload((f) => () => api.admin.setMusic(f), 'Song updated.')} />
          </label>
          {content.music.url && (
            <button className="btn-ghost" disabled={busy} onClick={() => run(() => api.admin.clearMusic(), 'Song removed.').then((c) => c && setContent(c))}>Remove</button>
          )}
        </div>
      </div>
      <Status error={error} ok={ok} />
    </div>
  );
}
