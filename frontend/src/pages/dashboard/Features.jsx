import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock, RotateCcw, SlidersHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../services/api.js';
import { CONFIG, FEATURES, FEATURE_BY_KEY, effectiveFeatures, rawFeatures } from '../../config/siteConfig/siteConfig.js';
import { PageTitle } from './DashboardLayout.jsx';
import { useDashboard } from './DashboardLayout.jsx';
import { ConfirmDialog, SaveBar, Switch, useToast } from '../../components/dashboard/ui.jsx';
import { PreviewButton, WithPreview } from '../../components/dashboard/LivePreview.jsx';

// Where "Customize" leads for the switches that have their own settings.
const CUSTOMIZE = {
  cake: ['/dashboard/customize?tab=cake', 'Cake & candles'],
  music: ['/dashboard/customize?tab=cake', 'Choose song'],
  vault: ['/dashboard/website?tab=security', 'Set password'],
  pagePassword: ['/dashboard/website?tab=security', 'Set password'],
};

const sameMap = (a, b) => FEATURES.every((f) => a[f.key] === b[f.key]);

export default function Features() {
  const toast = useToast();
  const { bumpPreview } = useDashboard();
  const [saved, setSaved] = useState(null); // what the server has (raw switch positions)
  const [draft, setDraft] = useState(null); // what the screen shows
  const [passwordSet, setPasswordSet] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState({ main: true });
  const [confirm, setConfirm] = useState(null); // 'none' | 'defaults' | 'all'

  const apply = useCallback((payload) => {
    const raw = rawFeatures(payload.content.featuresRaw);
    setSaved(raw);
    setDraft(raw);
    setPasswordSet(Boolean(payload.passwordSet));
  }, []);

  const load = useCallback(() => {
    setError('');
    api.app.site().then(apply).catch((e) => e.status !== 401 && setError(e.message));
  }, [apply]);
  useEffect(load, [load]);

  const dirty = draft && saved && !sameMap(draft, saved);
  // Unsaved switch changes are sent to the live preview, which asks the server to render them (nothing is saved).
  const previewDraft = useMemo(
    () => (dirty ? { features: Object.fromEntries(FEATURES.filter((f) => draft[f.key] !== saved[f.key]).map((f) => [f.key, draft[f.key]])) } : null),
    [dirty, draft, saved],
  );

  // Browsers warn before leaving with unsaved switches.
  useEffect(() => {
    if (!dirty) return undefined;
    const on = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  const effective = useMemo(() => (draft ? effectiveFeatures(draft) : null), [draft]);
  const grouped = useMemo(
    () => CONFIG.categories.map((c) => ({ ...c, items: FEATURES.filter((f) => f.category === c.id) })),
    [],
  );

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      apply(await fn());
      bumpPreview();
      toast.success(okMsg);
    } catch (e) {
      if (e.status !== 401) toast.error(e.details?.[0]?.message || e.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const changes = Object.fromEntries(FEATURES.filter((f) => draft[f.key] !== saved[f.key]).map((f) => [f.key, draft[f.key]]));
    return run(() => api.app.saveFeatures({ features: changes }), 'Your changes are saved.');
  };

  const bulk = async () => {
    const preset = confirm;
    setConfirm(null);
    await run(() => api.app.saveFeatures({ preset }), preset === 'all' ? 'Every feature is on.' : preset === 'none' ? 'Every feature is off.' : 'Default settings restored.');
  };

  if (error) return <p role="alert" className="text-blush-deep">{error} <button className="underline" onClick={load}>Try again</button></p>;
  if (!draft) return <p className="text-ivory/60" role="status">Loading your features&hellip;</p>;

  const onCount = (items) => items.filter((f) => effective[f.key]).length;
  const bulkText = {
    none: ['Turn everything off?', 'Every section and effect will be hidden from your page. Your photos, letters, texts and settings are all kept, and you can turn things back on any time.', 'Turn everything off'],
    all: ['Turn everything on?', 'Every section and effect will be switched on, including the private area and page lock if you set them up.', 'Turn everything on'],
    defaults: ['Restore the default settings?', 'All switches go back to how a new page starts. Your content is not touched.', 'Restore defaults'],
  };

  return (
    <WithPreview draft={previewDraft}>
      <PageTitle title="Features" subtitle="Choose exactly what appears on your page. A switch that is off removes the section, its menu link and its content for visitors.">
        <PreviewButton draft={previewDraft} />
      </PageTitle>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <button className="btn-ghost !px-3 !py-3 !text-[11px] sm:!px-5" disabled={busy} onClick={() => setConfirm('all')}><ToggleRight size={15} aria-hidden="true" /> Enable all</button>
        <button className="btn-ghost !px-3 !py-3 !text-[11px] sm:!px-5" disabled={busy} onClick={() => setConfirm('none')}><ToggleLeft size={15} aria-hidden="true" /> Disable all</button>
        <button className="btn-ghost !px-3 !py-3 !text-[11px] sm:!px-5" disabled={busy} onClick={() => setConfirm('defaults')}><RotateCcw size={15} aria-hidden="true" /> Defaults</button>
      </div>

      <div className="space-y-4">
        {grouped.map((cat) => {
          const isOpen = Boolean(open[cat.id]);
          return (
            <section key={cat.id} className="rounded-2xl border border-gold/20 bg-white/[0.03]">
              <h2>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`cat-${cat.id}`}
                  onClick={() => setOpen((o) => ({ ...o, [cat.id]: !o[cat.id] }))}
                  className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left sm:px-6"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold-light"><SlidersHorizontal size={18} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-xl text-ivory">{cat.label}</span>
                    <span className="block truncate text-xs text-ivory/50">{cat.description}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-ivory/80">{onCount(cat.items)}/{cat.items.length} on</span>
                  <ChevronDown size={20} className={`shrink-0 text-ivory/60 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </h2>
              {isOpen && (
                <ul id={`cat-${cat.id}`} className="divide-y divide-white/10 border-t border-white/10">
                  {cat.items.map((f) => {
                    const own = draft[f.key];
                    const live = effective[f.key];
                    const parent = own && !live ? (FEATURE_BY_KEY[f.key].requires || []).find((p) => !effective[p]) : null;
                    const custom = CUSTOMIZE[f.customize];
                    return (
                      <li key={f.key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[15px] text-ivory">
                            <label htmlFor={`sw-${f.key}`} className="cursor-pointer">{f.label}</label>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${live ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-ivory/50'}`}>
                              {live ? 'Enabled' : 'Disabled'}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-ivory/55">{f.description}</p>
                          {parent && <p className="mt-1 text-xs text-gold-light/80">Off for now because &ldquo;{FEATURE_BY_KEY[parent].label}&rdquo; is off.</p>}
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                          {custom && (
                            <Link to={custom[0]} className="inline-flex min-h-[44px] items-center text-xs text-gold-light underline-offset-4 hover:underline">{custom[1]}</Link>
                          )}
                          {f.key === 'passwordProtection' && !passwordSet && own && (
                            <span className="inline-flex items-center gap-1 text-xs text-ivory/50"><Lock size={12} aria-hidden="true" /> needs a password</span>
                          )}
                          <Switch id={`sw-${f.key}`} label={f.label} checked={own} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? bulkText[confirm][0] : ''}
        confirmLabel={confirm ? bulkText[confirm][2] : ''}
        danger={confirm === 'none'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={bulk}
      >
        <p>{confirm && bulkText[confirm][1]}</p>
        {dirty && <p className="text-gold-light">You have unsaved switch changes. They will be replaced.</p>}
      </ConfirmDialog>
    </WithPreview>
  );
}
