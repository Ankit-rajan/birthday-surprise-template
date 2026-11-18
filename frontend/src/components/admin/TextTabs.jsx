import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { toDateInput } from '../../utils/format.js';
import { useAdminCall, Status } from './useAdminCall.jsx';

/* ------------------------------------------------------------- timeline */

function TimelineRow({ item, onSave, onDelete, busy }) {
  const [v, setV] = useState({ title: item.title, description: item.description, date: toDateInput(item.date) });
  return (
    <li className="space-y-2 rounded-2xl border border-gold/20 p-4">
      <div className="grid gap-2 md:grid-cols-[1fr_12rem]">
        <input className="field" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-label="Title" maxLength={200} />
        <input type="date" className="field" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} aria-label="Date" />
      </div>
      <textarea rows={3} className="field" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Description" maxLength={3000} />
      {item.thumbUrl && <img src={item.thumbUrl} alt="" className="h-20 rounded" />}
      <div className="flex gap-2">
        <button className="btn-ghost !px-4 !py-2" disabled={busy} onClick={() => onSave(item, v)}>Save</button>
        <button className="btn-ghost !px-4 !py-2 !border-blush-deep/50 !text-blush-deep" disabled={busy} onClick={() => onDelete(item)}>Delete</button>
      </div>
    </li>
  );
}

export function TimelineTab({ onExpired }) {
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState({ title: '', description: '', date: '' });
  const [file, setFile] = useState(null);
  const { busy, error, ok, run } = useAdminCall(onExpired);

  const load = useCallback(() => {
    run(() => api.admin.list('timeline'), '').then((r) => r && setItems(r.items));
  }, [run]);
  useEffect(load, [load]);

  const add = async (e) => {
    e.preventDefault();
    const r = await run(() => api.admin.create('timeline', draft, file), 'Added.');
    if (r) {
      setDraft({ title: '', description: '', date: '' });
      setFile(null);
      e.target.reset();
      load();
    }
  };
  const save = (item, v) => run(() => api.admin.update('timeline', item.id, v), 'Saved.').then((r) => r && load());
  const remove = (item) => window.confirm('Delete this timeline entry?') && run(() => api.admin.remove('timeline', item.id), 'Deleted.').then((r) => r && load());

  return (
    <div className="space-y-8">
      <p className="text-sm text-ivory/60">Only add milestones that really happened. Entries without a date show &ldquo;Date to be added&rdquo;.</p>
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-gold/25 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
          <input className="field" required placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} />
          <input type="date" className="field" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="Date" />
        </div>
        <textarea rows={3} className="field" placeholder="The story" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={3000} />
        <input type="file" accept="image/jpeg,image/png,image/webp" className="field" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Optional photo" />
        <button className="btn-gold" disabled={busy}>Add to timeline</button>
      </form>
      <Status error={error} ok={ok} />
      <ul className="space-y-4">{items?.map((it) => <TimelineRow key={`${it.id}-${it.title}-${it.date}`} item={it} onSave={save} onDelete={remove} busy={busy} />)}</ul>
    </div>
  );
}

/* -------------------------------------------------------------- letters */

function LetterEditor({ letter, run, busy }) {
  const [v, setV] = useState({ title: letter.title, body: letter.body });
  return (
    <li className="space-y-2 rounded-2xl border border-gold/20 p-4">
      <input className="field font-serif text-xl" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-label="Letter title" maxLength={200} />
      <textarea rows={12} className="field font-hand text-xl" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} aria-label="Letter text" maxLength={20000} />
      <button className="btn-ghost !px-4 !py-2" disabled={busy} onClick={() => run(() => api.admin.update('letters', letter.id, v), `Saved "${v.title}".`)}>Save letter</button>
    </li>
  );
}

export function LettersTab({ onExpired }) {
  const [items, setItems] = useState(null);
  const { busy, error, ok, run } = useAdminCall(onExpired);
  useEffect(() => {
    run(() => api.admin.list('letters'), '').then((r) => r && setItems(r.items));
  }, [run]);
  return (
    <div className="space-y-6">
      <p className="text-sm text-ivory/60">The heart letter, the three &ldquo;open when&rdquo; letters and the future-wife letter. Blank lines become paragraph breaks.</p>
      <Status error={error} ok={ok} />
      <ul className="space-y-6">{items?.map((l) => <LetterEditor key={l.id} letter={l} run={run} busy={busy} />)}</ul>
    </div>
  );
}

/* ------------------------------------------------------ private messages */

const KINDS = [
  ['secret', 'Secret message'],
  ['diary', 'Diary note'],
  ['letter', 'Letter for her'],
];

function MessageRow({ item, onSave, onDelete, busy }) {
  const [v, setV] = useState({ kind: item.kind, title: item.title, body: item.body, date: toDateInput(item.date) });
  return (
    <li className="space-y-2 rounded-2xl border border-gold/20 p-4">
      <div className="grid gap-2 md:grid-cols-[10rem_1fr_12rem]">
        <select className="field" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} aria-label="Type">
          {KINDS.map(([k, l]) => <option key={k} value={k} className="text-black">{l}</option>)}
        </select>
        <input className="field" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Title" aria-label="Title" maxLength={200} />
        <input type="date" className="field" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} aria-label="Date" />
      </div>
      <textarea rows={5} className="field" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} aria-label="Message" maxLength={20000} />
      <div className="flex gap-2">
        <button className="btn-ghost !px-4 !py-2" disabled={busy} onClick={() => onSave(item, v)}>Save</button>
        <button className="btn-ghost !px-4 !py-2 !border-blush-deep/50 !text-blush-deep" disabled={busy} onClick={() => onDelete(item)}>Delete</button>
      </div>
    </li>
  );
}

export function MessagesTab({ onExpired }) {
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState({ kind: 'secret', title: '', body: '', date: '' });
  const { busy, error, ok, run } = useAdminCall(onExpired);

  const load = useCallback(() => {
    run(() => api.admin.list('private-messages'), '').then((r) => r && setItems(r.items));
  }, [run]);
  useEffect(load, [load]);

  const add = async (e) => {
    e.preventDefault();
    const r = await run(() => api.admin.createJson('private-messages', draft), 'Added.');
    if (r) {
      setDraft({ ...draft, title: '', body: '', date: '' });
      load();
    }
  };
  const save = (item, v) => run(() => api.admin.update('private-messages', item.id, v), 'Saved.').then((r) => r && load());
  const remove = (item) => window.confirm('Delete this message?') && run(() => api.admin.remove('private-messages', item.id), 'Deleted.').then((r) => r && load());

  return (
    <div className="space-y-8">
      <p className="text-sm text-ivory/60">Text that only appears inside the unlocked vault.</p>
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-gold/25 p-4">
        <div className="grid gap-3 md:grid-cols-[10rem_1fr_12rem]">
          <select className="field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} aria-label="Type">
            {KINDS.map(([k, l]) => <option key={k} value={k} className="text-black">{l}</option>)}
          </select>
          <input className="field" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} />
          <input type="date" className="field" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="Date" />
        </div>
        <textarea rows={5} required className="field" placeholder="Write it here" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={20000} />
        <button className="btn-gold" disabled={busy}>Add</button>
      </form>
      <Status error={error} ok={ok} />
      <ul className="space-y-4">{items?.map((it) => <MessageRow key={`${it.id}-${it.body.length}`} item={it} onSave={save} onDelete={remove} busy={busy} />)}</ul>
    </div>
  );
}
