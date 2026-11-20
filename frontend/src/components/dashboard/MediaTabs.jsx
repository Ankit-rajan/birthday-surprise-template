import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { toDateInput } from '../../utils/format.js';
import { useApiCall, Status } from './useApiCall.jsx';

function MediaManager({ resource, accept, allowVideo, intro, onExpired }) {
  const [items, setItems] = useState(null);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const fileRef = useRef(null);
  const { busy, error, ok, run } = useApiCall(onExpired);

  const load = useCallback(() => {
    run(() => api.app.list(resource), '').then((r) => r && setItems(r.items));
  }, [run, resource]);
  useEffect(load, [load]);

  const upload = async (e) => {
    e.preventDefault();
    const files = [...(fileRef.current?.files || [])];
    if (!files.length) return;
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const r = await run(() => api.app.create(resource, { caption, date }, file), `Uploaded ${file.name}`);
      if (r) setItems((list) => [r.item, ...(list || [])]);
      else break;
    }
    fileRef.current.value = '';
    setCaption('');
  };

  const saveItem = (item, patch) =>
    run(() => api.app.update(resource, item.id, patch), 'Saved.').then((r) => r && setItems((l) => l.map((x) => (x.id === item.id ? r.item : x))));

  const remove = (item) => {
    if (!window.confirm('Delete this permanently?')) return;
    run(() => api.app.remove(resource, item.id), 'Deleted.').then((r) => r && setItems((l) => l.filter((x) => x.id !== item.id)));
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-ivory/60">{intro}</p>
      <form onSubmit={upload} className="grid gap-3 rounded-2xl border border-gold/25 p-4 md:grid-cols-[1fr_1fr_auto]">
        <input ref={fileRef} type="file" multiple accept={accept} required className="field md:col-span-3" aria-label="Files to upload" />
        <input className="field" placeholder="Caption (applies to this upload)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={400} />
        <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <button className="btn-gold" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      </form>
      <Status error={error} ok={ok} />

      {items && items.length === 0 && <p className="text-ivory/50">Nothing here yet.</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => (
          <MediaCard key={item.id} item={item} allowVideo={allowVideo} onSave={saveItem} onDelete={remove} busy={busy} />
        ))}
      </ul>
    </div>
  );
}

function MediaCard({ item, onSave, onDelete, busy }) {
  const [caption, setCaption] = useState(item.caption || '');
  const [date, setDate] = useState(toDateInput(item.date));
  const src = item.thumbUrl || item.previewUrl;
  return (
    <li className="space-y-2 rounded-2xl border border-gold/20 p-3">
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-black/30">
        {item.kind === 'video' ? (
          <video src={item.previewUrl.replace('?thumb=1', '')} controls preload="metadata" className="h-full w-full object-contain" />
        ) : (
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <input className="field !py-2" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" maxLength={400} aria-label="Caption" />
      <input type="date" className="field !py-2" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      <div className="flex gap-2">
        <button className="btn-ghost !px-4 !py-2" disabled={busy} onClick={() => onSave(item, { caption, date })}>Save</button>
        <button className="btn-ghost !px-4 !py-2 !border-blush-deep/50 !text-blush-deep" disabled={busy} onClick={() => onDelete(item)}>Delete</button>
      </div>
    </li>
  );
}

export const GalleryTab = ({ onExpired }) => (
  <MediaManager
    resource="gallery"
    accept="image/jpeg,image/png,image/webp"
    intro="Public gallery photographs (20 to 50 works well). Use your real photographs only."
    onExpired={onExpired}
  />
);

export const PrivateMediaTab = ({ onExpired }) => (
  <MediaManager
    resource="private-media"
    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
    allowVideo
    intro="Private photos and videos. These are stored in a separate private bucket and only ever served to someone who has unlocked the vault. Videos up to 200 MB."
    onExpired={onExpired}
  />
);
