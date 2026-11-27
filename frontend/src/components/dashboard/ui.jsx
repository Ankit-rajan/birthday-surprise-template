import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

/* ------------------------------------------------------------------ toasts */
const ToastCtx = createContext({ success: () => {}, error: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const push = useCallback((kind, message) => {
    id.current += 1;
    const key = id.current;
    setItems((l) => [...l.slice(-2), { key, kind, message }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.key !== key)), kind === 'error' ? 7000 : 3500);
  }, []);
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Above the bottom navigation on phones, bottom-right on desktop. aria-live so screen readers hear it. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[400] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end">
        {items.map((t) => (
          <div
            key={t.key}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-soft backdrop-blur ${
              t.kind === 'error' ? 'border-blush-deep/50 bg-[#3a0f1a]/95 text-blush' : 'border-gold/40 bg-midnight/95 text-gold-light'
            }`}
          >
            {t.kind === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 break-words">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ switch */
/** Accessible ON/OFF switch. 44px tall touch target, clearly labelled On/Off (not colour alone). */
export function Switch({ checked, onChange, label, disabled = false, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-1 disabled:opacity-50"
    >
      <span className={`w-9 text-right text-[11px] font-medium uppercase tracking-wider ${checked ? 'text-gold-light' : 'text-ivory/45'}`}>{checked ? 'On' : 'Off'}</span>
      <span className={`relative h-7 w-12 rounded-full border transition-colors ${checked ? 'border-gold bg-gold/80' : 'border-white/25 bg-white/10'}`}>
        <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-ivory shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ dialogs */
function useLockScroll(on) {
  useEffect(() => {
    if (!on) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [on]);
}

/** Bottom sheet on phones, centred dialog on larger screens. Esc closes. */
export function Sheet({ open, onClose, title, children, footer, wide = false }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} tabIndex={-1} />
      <div className={`relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-gold/30 bg-[#1a0610] shadow-soft sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h2 className="min-w-0 truncate font-serif text-2xl text-ivory">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ivory/70 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/10 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={danger ? 'btn-burgundy !bg-[#8f1d3a]' : 'btn-gold'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-ivory/80">{children}</div>
    </Sheet>
  );
}

/** Sticky bar that holds Save / unsaved changes. Sits above the bottom navigation on phones. */
export function SaveBar({ dirty, busy, onSave, onDiscard, saveLabel = 'Save changes', children }) {
  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-8 lg:bottom-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-midnight/95 px-4 py-3 shadow-soft backdrop-blur">
        <p className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${dirty ? 'text-gold-light' : 'text-ivory/50'}`} role="status">
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dirty ? 'animate-pulse bg-gold' : 'bg-white/25'}`} />
          <span className="truncate">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </p>
        {children}
        {dirty && onDiscard && <button type="button" className="btn-ghost !px-4 !py-2.5 min-h-[44px]" onClick={onDiscard} disabled={busy}>Discard</button>}
        <button type="button" className="btn-gold !px-5 !py-2.5 min-h-[44px]" onClick={onSave} disabled={!dirty || busy}>{busy ? 'Saving…' : saveLabel}</button>
      </div>
    </div>
  );
}

export function useMediaQuery(query) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}
