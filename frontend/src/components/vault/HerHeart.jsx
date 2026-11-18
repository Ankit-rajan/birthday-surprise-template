import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { useVault } from '../../hooks/VaultContext.jsx';
import { formatDateTime } from '../../utils/format.js';

const PLACEHOLDER =
  "Whatever is on your mind, whatever is in your heart… you can write it all here. I'll always want to listen.";

function ConfirmDelete({ onCancel, onConfirm, busy }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <motion.div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/70 px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="del-title"
      aria-describedby="del-desc"
    >
      <motion.div
        initial={{ scale: 0.94, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="paper w-full max-w-sm rounded-md p-7 text-center"
      >
        <h3 id="del-title" className="font-serif text-2xl text-burgundy-dark">
          Delete this entry?
        </h3>
        <p id="del-desc" className="mt-2 text-sm text-burgundy-dark/75">
          This will permanently remove it. It cannot be undone.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button ref={cancelRef} onClick={onCancel} disabled={busy} className="btn-burgundy !bg-burgundy-dark/10 !text-burgundy-dark hover:!bg-burgundy-dark/20">
            Keep it
          </button>
          <button onClick={onConfirm} disabled={busy} className="btn-burgundy">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Editor({ initial, onSave, onCancel, saving, error, autoFocus }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const isEdit = !!initial;

  const submit = (e) => {
    e.preventDefault();
    onSave({ title: title.trim(), body: body.trim() }, () => {
      if (!isEdit) {
        setTitle('');
        setBody('');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={`jt-${initial?.id || 'new'}`} className="mb-1 block text-[11px] uppercase tracking-[0.25em] text-burgundy/70">
          Title <span className="normal-case tracking-normal text-burgundy/50">(optional, just for you)</span>
        </label>
        <input
          id={`jt-${initial?.id || 'new'}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Something I wanted to tell you"
          className="field-light font-serif text-xl italic"
        />
      </div>
      <div>
        <label htmlFor={`jb-${initial?.id || 'new'}`} className="sr-only">
          Your entry
        </label>
        <textarea
          id={`jb-${initial?.id || 'new'}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={isEdit ? 8 : 9}
          maxLength={20000}
          autoFocus={autoFocus}
          className="field-light min-h-[14rem] resize-y font-hand text-[1.5rem] leading-[1.5]"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 2.1rem, rgba(90,15,35,0.12) 2.1rem, rgba(90,15,35,0.12) calc(2.1rem + 1px))',
            backgroundAttachment: 'local',
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || !body.trim()} className="btn-burgundy">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save my feelings ❤️'}
        </button>
        {isEdit && (
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-full px-5 py-3 text-xs uppercase tracking-[0.2em] text-burgundy/70 hover:bg-burgundy/10">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function HerHeart() {
  const { role } = useVault();
  const isHer = role === 'her';
  const [entries, setEntries] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const toastTimer = useRef(null);

  const load = useCallback(() => {
    setLoadError('');
    api.vault.journal
      .list()
      .then((r) => setEntries(r.entries))
      .catch((err) => err.status !== 401 && setLoadError(err.message));
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(toastTimer.current);
  }, [load]);

  const flash = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  // Nothing is sent to the server until she presses Save, so a draft stays on her device only.
  const create = async (values, reset) => {
    setSaving(true);
    setSaveError('');
    try {
      const { entry } = await api.vault.journal.create(values);
      setEntries((list) => [entry, ...(list || [])]);
      reset();
      flash('Saved. Your feelings are safe here ❤️');
    } catch (err) {
      if (err.status !== 401) setSaveError(err.details?.[0]?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, values) => {
    setSaving(true);
    setSaveError('');
    try {
      const { entry } = await api.vault.journal.update(id, values);
      setEntries((list) => list.map((e) => (e.id === id ? entry : e)));
      setEditingId(null);
      flash('Changes saved ❤️');
    } catch (err) {
      if (err.status !== 401) setSaveError(err.details?.[0]?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.vault.journal.remove(deleting);
      setEntries((list) => list.filter((e) => e.id !== deleting));
      setDeleting(null);
      flash('Entry deleted.');
    } catch (err) {
      if (err.status !== 401) {
        setDeleting(null);
        flash(err.message);
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="paper rounded-md px-6 py-10 md:px-12 md:py-14">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.42em] text-burgundy">Her heart &mdash; a space just for you</p>
        <h3 className="mt-3 text-center font-script text-5xl text-burgundy md:text-6xl">Tell me what&rsquo;s on your heart &#10084;&#65039;</h3>

        <p className="mx-auto mt-6 max-w-xl rounded-xl border border-burgundy/15 bg-burgundy/[0.04] px-4 py-3 text-center text-sm leading-relaxed text-burgundy-dark/80">
          This is a <strong>shared private space</strong>. Only the two of you can open it, but anything you <em>save</em> here can be read by him.
          Nothing is shared while you are still typing. Only what you choose to save.
        </p>

        <div className="mt-8">
          {isHer ? (
            <Editor onSave={create} saving={saving} error={saveError} />
          ) : (
            <p className="rounded-xl border border-burgundy/15 bg-white/50 px-5 py-6 text-center font-serif text-lg italic text-burgundy-dark/80">
              Only the birthday person writes here. You can read whatever she chooses to save, but her words stay exactly as she wrote them.
            </p>
          )}
        </div>

        <AnimatePresence>
          {toast && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-burgundy px-5 py-2.5 text-center text-sm text-ivory"
            >
              <Check size={16} aria-hidden="true" /> {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-14">
        <h4 className="mb-6 text-center font-serif text-3xl italic text-ivory">The journal</h4>
        {loadError && (
          <p role="alert" className="mb-4 text-center text-blush-deep">
            {loadError}{' '}
            <button onClick={load} className="underline">
              Try again
            </button>
          </p>
        )}
        {!entries && !loadError && <p className="animate-pulse text-center font-serif text-xl italic text-ivory/60">Opening the journal&hellip;</p>}
        {entries && entries.length === 0 && (
          <p className="text-center font-serif text-xl italic text-ivory/60">
            {isHer ? 'Your first entry will live here.' : 'Nothing has been saved here yet.'}
          </p>
        )}

        <ul className="space-y-6">
          {entries?.map((entry) => (
            <motion.li key={entry.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="paper rounded-md p-6 md:p-9">
              {editingId === entry.id ? (
                <Editor initial={entry} onSave={(v) => update(entry.id, v)} onCancel={() => { setEditingId(null); setSaveError(''); }} saving={saving} error={saveError} autoFocus />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-burgundy/70">
                        {formatDateTime(entry.createdAt)}
                        {entry.edited && <span className="ml-2 normal-case tracking-normal text-burgundy/50">(edited {formatDateTime(entry.updatedAt)})</span>}
                      </p>
                      {entry.title && <h5 className="mt-1 break-words font-serif text-3xl italic text-burgundy">{entry.title}</h5>}
                    </div>
                    {isHer && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => { setEditingId(entry.id); setSaveError(''); }}
                          aria-label="Edit this entry"
                          className="rounded-full p-2 text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => setDeleting(entry.id)}
                          aria-label="Delete this entry"
                          className="rounded-full p-2 text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words font-hand text-[1.55rem] leading-[1.5] text-burgundy-dark/90">{entry.body}</p>
                </>
              )}
            </motion.li>
          ))}
        </ul>
      </div>

      <p className="mx-auto mt-16 max-w-xl text-center font-serif text-xl italic leading-relaxed text-gold-light">
        Your feelings matter to me. You never have to hide what&rsquo;s in your heart. This little space is always yours. &#10084;&#65039;
      </p>

      <AnimatePresence>
        {deleting && <ConfirmDelete busy={deleteBusy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
      </AnimatePresence>
    </div>
  );
}
