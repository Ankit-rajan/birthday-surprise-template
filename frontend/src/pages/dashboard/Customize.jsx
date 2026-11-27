import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Heart, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageTitle, Card } from './DashboardLayout.jsx';
import { MusicCard } from '../../components/dashboard/SiteMediaTab.jsx';
import { Status, useApiCall } from '../../components/dashboard/useApiCall.jsx';
import { useDashboard } from './DashboardLayout.jsx';
import { ConfirmDialog, SaveBar, useToast } from '../../components/dashboard/ui.jsx';
import { PreviewButton, WithPreview } from '../../components/dashboard/LivePreview.jsx';
import { CONFIG, COPY_KEYS, FONTS, THEMES as THEME_LIST, THEME_BY_ID, themesFor, typesFor, defaultTypeFor, resolveCopy, isHex, resolvePalette } from '../../config/siteConfig/siteConfig.js';

const CAKE_THEMES = [
  ['rose', 'Rose', '#b3294f'],
  ['chocolate', 'Chocolate', '#7a4a30'],
  ['vanilla', 'Vanilla', '#f1dba8'],
  ['berry', 'Berry', '#7a2a63'],
  ['midnight', 'Midnight', '#27306b'],
];

const Toggle = ({ label, help, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 p-4">
    <span>
      <span className="block text-sm text-ivory">{label}</span>
      <span className="block text-xs text-ivory/50">{help}</span>
    </span>
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#d4b483]" />
  </label>
);

/** Cake, animations and sounds. Saved instantly; preview from the menu to see the result. */
function CakeMusic() {
  const [s, setS] = useState(null);
  const { busy, error, ok, run } = useApiCall();

  useEffect(() => {
    api.app.site().then((d) => setS(d.content.settings)).catch(() => {});
  }, []);

  if (!s) return <p className="text-ivory/60" role="status">Loading&hellip;</p>;

  const save = (patch) => {
    const next = { cake: { ...s.cake, ...patch.cake }, effects: { ...s.effects, ...patch.effects } };
    setS(next);
    run(() => api.app.saveSettings(patch), 'Saved.');
  };

  return (
    <>
      <PageTitle title="Customize" subtitle="Choose the cake, the animations, the sounds and the song. Changes save as you go." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Birthday cake">
          <p className="mb-2 text-xs uppercase tracking-widest text-ivory/60">Flavour and colour</p>
          <div className="mb-6 flex flex-wrap gap-3" role="radiogroup" aria-label="Cake colour">
            {CAKE_THEMES.map(([id, label, color]) => (
              <button
                key={id}
                role="radio"
                aria-checked={s.cake.theme === id}
                onClick={() => save({ cake: { theme: id } })}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${s.cake.theme === id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70 hover:border-gold/50'}`}
              >
                <span className="h-4 w-4 rounded-full border border-white/30" style={{ background: color }} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <label className="mb-6 block text-xs uppercase tracking-widest text-ivory/60">
            Candles: {s.cake.candles}
            <input type="range" min={1} max={9} value={s.cake.candles} onChange={(e) => setS({ ...s, cake: { ...s.cake, candles: Number(e.target.value) } })} onPointerUp={() => save({ cake: { candles: s.cake.candles } })} onKeyUp={() => save({ cake: { candles: s.cake.candles } })} className="mt-2 block w-full accent-[#d4b483]" />
          </label>
          <Toggle label="Show their age on the cake" help="Turn off to show a heart instead." checked={s.cake.showAge} onChange={(v) => save({ cake: { showAge: v } })} />
        </Card>

        <Card title="Animations & sounds">
          <div className="space-y-3">
            <Toggle label="Falling petals" help="Soft rose petals drift across the page." checked={s.effects.petals} onChange={(v) => save({ effects: { petals: v } })} />
            <Toggle label="Confetti" help="Bursts of confetti when they blow out the candles." checked={s.effects.confetti} onChange={(v) => save({ effects: { confetti: v } })} />
            <Toggle label="Celebration sounds" help="The opening chime, the birthday song and the cheer. Your own song is separate." checked={s.effects.celebrationSounds} onChange={(v) => save({ effects: { celebrationSounds: v } })} />
          </div>
        </Card>

        <Card title="Background music" className="lg:col-span-2">
          <MusicCard />
        </Card>
      </div>
      <div className="mt-4 min-h-[1.5rem]" aria-live="polite">{!busy && <Status error={error} ok={ok} />}</div>
    </>
  );
}

const unwrap = (e) => e.details?.[0]?.message || e.message || 'Something went wrong. Please try again.';

/** Pretty names for the dry-run list ("heroMessage" -> "Hero message"). */
const nice = (k) => (k.startsWith('letter:') ? `Letter: ${k.slice(7)}` : k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));

/* ------------------------------------------------------------ Relationship */
function RelationshipTab({ site, apply, setDraft }) {
  const toast = useToast();
  const { bumpPreview } = useDashboard();
  const current = site.content.relationship;
  const [mode, setMode] = useState(current.mode);
  const [type, setType] = useState(current.type);
  const [plan, setPlan] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState(null);

  useEffect(() => { setMode(current.mode); setType(current.type); }, [current.mode, current.type]);
  const dirty = mode !== current.mode || type !== current.type;
  useEffect(() => {
    setDraft((d) => ({ ...d, relationship: dirty ? { mode, type } : undefined }));
    return () => setDraft((d) => ({ ...d, relationship: undefined }));
  }, [dirty, mode, type, setDraft]);

  const pickMode = (m) => {
    setMode(m);
    setType(m === current.mode ? current.type : defaultTypeFor(m));
  };

  const commit = async (overwriteCustom) => {
    setBusy(true);
    try {
      const res = await api.app.saveRelationship({ mode, type, overwriteCustom });
      apply(res);
      bumpPreview();
      setPlan(null);
      setOverwrite(false);
      if (res.change?.modeChanges) setSuggest(res.change.suggestedThemes || []);
      toast.success('Relationship saved.');
    } catch (e) {
      toast.error(unwrap(e));
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    if (mode === current.mode) return commit(false); // only the type changed: wording adapts, nothing is replaced
    setBusy(true);
    try {
      const res = await api.app.saveRelationship({ mode, type, dryRun: true });
      setPlan(res);
    } catch (e) {
      toast.error(unwrap(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Who is this surprise for?">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Relationship mode">
          {Object.entries(CONFIG.modes).map(([id, m]) => {
            const Icon = id === 'love' ? Heart : Users;
            const on = mode === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => pickMode(id)}
                className={`flex min-h-[88px] items-start gap-3 rounded-2xl border p-4 text-left transition ${on ? 'border-gold bg-gold/10' : 'border-white/15 hover:border-gold/50'}`}>
                <Icon size={22} className="mt-0.5 shrink-0 text-gold-light" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-serif text-lg text-ivory">{m.label}{on && <Check size={16} aria-hidden="true" />}</span>
                  <span className="block text-xs text-ivory/60">{m.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mb-2 mt-6 text-xs uppercase tracking-widest text-ivory/60">Relationship type</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Relationship type">
          {typesFor(mode).map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)}
              className={`min-h-[44px] rounded-full border px-4 text-sm transition ${type === t.id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70 hover:border-gold/50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ivory/55">Changing this updates the wording and the starter text. Anything you wrote yourself is never replaced unless you say so.</p>
      </Card>

      {suggest && suggest.length > 0 && (
        <Card title="Want a matching look?">
          <p className="mb-3 text-sm text-ivory/70">Your colours were not changed. These themes suit this mode:</p>
          <div className="flex flex-wrap gap-2">
            {suggest.map((id) => <span key={id} className="rounded-full bg-white/10 px-3 py-1 text-xs">{THEME_BY_ID[id]?.label}</span>)}
          </div>
          <a className="btn-ghost mt-4 inline-flex" href="/dashboard/customize?tab=appearance">Choose a theme</a>
        </Card>
      )}

      <SaveBar dirty={dirty} busy={busy} onSave={review} onDiscard={() => { setMode(current.mode); setType(current.type); }} saveLabel="Review & save" />

      <ConfirmDialog open={Boolean(plan)} title="Switch relationship mode?" confirmLabel="Switch mode" busy={busy} onCancel={() => { setPlan(null); setOverwrite(false); }} onConfirm={() => commit(overwrite)}>
        {plan && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-ivory">Starter text that will be updated ({(overwrite ? [...plan.willReplace, ...plan.keepsCustom] : plan.willReplace).length})</p>
              <p className="text-ivory/60">{(overwrite ? [...plan.willReplace, ...plan.keepsCustom] : plan.willReplace).map(nice).join(', ') || 'Nothing.'}</p>
            </div>
            {!overwrite && (
              <div>
                <p className="font-medium text-ivory">Your own words, kept as they are ({plan.keepsCustom.length})</p>
                <p className="text-ivory/60">{plan.keepsCustom.map(nice).join(', ') || 'Nothing to keep.'}</p>
              </div>
            )}
            {plan.keepsCustom.length > 0 && (
              <label className="flex min-h-[44px] items-start gap-3 rounded-xl border border-white/10 p-3">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-1 h-5 w-5 accent-[#d4b483]" />
                <span>Also replace the text I wrote myself with the new starter text <span className="text-ivory/50">(not recommended)</span></span>
              </label>
            )}
            <p className="text-xs text-ivory/50">Photos, videos, timeline, colours and switches are not touched.</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

/* -------------------------------------------------------------- Appearance */
const COLOR_FIELDS = [
  ['primary', 'Main accent', 'Headings, borders and highlights'],
  ['secondary', 'Secondary', 'Section backgrounds'],
  ['background', 'Background', 'Page background'],
  ['text', 'Text', 'Body text'],
  ['button', 'Buttons', 'Button colour'],
];
const lumOf = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const KEYS = ['theme', 'primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'buttonColor', 'font'];
const pickAppearance = (a = {}) => Object.fromEntries(KEYS.map((k) => [k, a[k] ?? null]));

function AppearanceTab({ site, apply, setDraft }) {
  const toast = useToast();
  const { bumpPreview } = useDashboard();
  const mode = site.content.relationship.mode;
  const saved = useMemo(() => pickAppearance(site.content.appearance), [site.content.appearance]);
  const [a, setA] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // {kind:'theme', id} | {kind:'reset'}
  useEffect(() => setA(saved), [saved]);

  const dirty = KEYS.some((k) => a[k] !== saved[k]);
  useEffect(() => { setDraft((d) => ({ ...d, appearance: a })); return () => setDraft((d) => { const { appearance, ...rest } = d; return rest; }); }, [a, setDraft]);
  useEffect(() => {
    if (!dirty) return undefined;
    const on = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  const hasCustomColors = KEYS.slice(1, 6).some((k) => a[k]);
  const palette = resolvePalette(a);
  const shown = (key) => palette?.[key] ?? { primary: '#d4b483', secondary: '#5a0f23', background: '#0b0709', text: '#f8f1e4', button: '#d4b483' }[key];

  const chooseTheme = (id) => {
    if (hasCustomColors && id !== a.theme) return setConfirm({ kind: 'theme', id });
    setA({ ...a, theme: id === 'classic' ? null : id });
  };
  const applyConfirm = () => {
    if (confirm.kind === 'reset') setA(pickAppearance({}));
    else setA({ ...pickAppearance({}), font: a.font, theme: confirm.id === 'classic' ? null : confirm.id });
    setConfirm(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      apply(await api.app.saveAppearance(a));
      bumpPreview();
      toast.success('Appearance saved.');
    } catch (e) {
      toast.error(unwrap(e));
    } finally {
      setBusy(false);
    }
  };

  const presets = [THEME_BY_ID.classic, ...themesFor(mode)];
  return (
    <div className="space-y-6">
      <Card title="Theme">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {presets.map((t) => {
            const on = (a.theme ?? 'classic') === t.id;
            const c = t.colors || { primary: '#d4b483', secondary: '#5a0f23', background: '#0b0709' };
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => chooseTheme(t.id)}
                className={`rounded-2xl border p-3 text-left transition ${on ? 'border-gold ring-1 ring-gold' : 'border-white/15 hover:border-gold/50'}`}>
                <span className="mb-2 flex h-10 overflow-hidden rounded-lg border border-white/10" aria-hidden="true">
                  <span className="flex-1" style={{ background: c.background }} />
                  <span className="flex-1" style={{ background: c.secondary }} />
                  <span className="flex-1" style={{ background: c.primary }} />
                </span>
                <span className="flex items-center gap-1 text-sm text-ivory">{t.label}{on && <Check size={14} aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Custom colours">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map(([key, label, help]) => {
            const field = `${key}Color`;
            return (
              <div key={key} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 p-3">
                <input type="color" aria-label={label} value={isHex(a[field]) ? a[field] : shown(key)} onChange={(e) => setA({ ...a, [field]: e.target.value })} className="h-11 w-14 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ivory">{label}</span>
                  <span className="block truncate text-xs text-ivory/50">{a[field] ? a[field] : `${help} (from theme)`}</span>
                </span>
                {a[field] && <button type="button" className="min-h-[44px] px-2 text-xs text-gold-light underline" onClick={() => setA({ ...a, [field]: null })}>Reset</button>}
              </div>
            );
          })}
        </div>
      </Card>

      {contrast(shown('text'), shown('background')) < 4.5 && (
        <p role="alert" className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold-light" data-testid="contrast-warning">
          Heads up: your text and background colours are hard to tell apart ({contrast(shown('text'), shown('background')).toFixed(1)}:1). Guests may struggle to read your page. Aim for at least 4.5:1.
        </p>
      )}

      <Card title="Typography">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Font style">
          <button type="button" role="radio" aria-checked={!a.font} onClick={() => setA({ ...a, font: null })} className={`min-h-[44px] rounded-xl border px-3 text-sm ${!a.font ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70'}`}>Default</button>
          {FONTS.filter((f) => f.id !== 'elegant').map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={a.font === f.id} onClick={() => setA({ ...a, font: f.id })} className={`min-h-[44px] rounded-xl border px-3 text-sm ${a.font === f.id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70'}`}>{f.label}</button>
          ))}
        </div>
      </Card>

      <button type="button" className="btn-ghost" onClick={() => setConfirm({ kind: 'reset' })} disabled={!KEYS.some((k) => a[k])}>Restore default appearance</button>

      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setA(saved)} />

      <ConfirmDialog open={Boolean(confirm)} title={confirm?.kind === 'reset' ? 'Restore the default look?' : 'Replace your custom colours?'}
        confirmLabel={confirm?.kind === 'reset' ? 'Restore' : 'Use this theme'} onCancel={() => setConfirm(null)} onConfirm={applyConfirm}>
        <p>{confirm?.kind === 'reset' ? 'Your theme, colours and font go back to the classic look. You can still discard this before saving.' : 'Choosing a theme clears the custom colours you picked. You can still discard this before saving.'}</p>
      </ConfirmDialog>
    </div>
  );
}

/* ----------------------------------------------------------------- Wording */
const nameOf = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function WordingTab({ site, apply, setDraft }) {
  const toast = useToast();
  const { bumpPreview } = useDashboard();
  const { mode, type } = site.content.relationship;
  const saved = site.content.copy || {};
  const [vals, setVals] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  useEffect(() => setVals(saved), [site.content.copy]); // eslint-disable-line react-hooks/exhaustive-deps

  const defaults = useMemo(() => resolveCopy({ mode, type, overrides: {}, name: site.content.herName || '', sender: site.content.partnerName || '' }), [mode, type, site.content.herName, site.content.partnerName]);
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v && v.trim()));
  const dirty = JSON.stringify(clean(vals)) !== JSON.stringify(clean(saved));

  useEffect(() => { setDraft((d) => ({ ...d, copy: clean(vals) })); return () => setDraft((d) => { const { copy, ...rest } = d; return rest; }); }, [vals, setDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const payload = {};
    for (const k of COPY_KEYS) {
      const next = (vals[k] || '').trim() || null;
      if ((saved[k] || null) !== next) payload[k] = next;
    }
    setBusy(true);
    try {
      apply(await api.app.saveCopy(payload));
      bumpPreview();
      toast.success('Wording saved.');
    } catch (e) {
      toast.error(unwrap(e));
    } finally {
      setBusy(false);
    }
  };

  const keys = COPY_KEYS.filter((k) => !filter || nameOf(k).toLowerCase().includes(filter.toLowerCase()) || String(defaults[k]).toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-4">
      <p className="text-sm text-ivory/65">Rewrite any label on your page. Leave a box empty to use the suggested wording for your relationship.</p>
      <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search labels" aria-label="Search labels" className="field w-full" />
      <ul className="space-y-3">
        {keys.map((k) => (
          <li key={k} className="rounded-xl border border-white/10 p-3">
            <label htmlFor={`copy-${k}`} className="mb-1 block text-xs uppercase tracking-widest text-ivory/60">{nameOf(k)}</label>
            <textarea id={`copy-${k}`} rows={2} maxLength={400} value={vals[k] || ''} placeholder={defaults[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className="field w-full" />
            {vals[k] && <button type="button" className="min-h-[44px] text-xs text-gold-light underline" onClick={() => setVals({ ...vals, [k]: '' })}>Use suggested wording</button>}
          </li>
        ))}
        {keys.length === 0 && <li className="text-sm text-ivory/50">No labels match.</li>}
      </ul>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setVals(saved)} />
    </div>
  );
}

/* -------------------------------------------------------------------- Page */
const TABS = [
  ['relationship', 'Relationship'],
  ['appearance', 'Appearance'],
  ['wording', 'Wording'],
  ['cake', 'Cake & music'],
];

export default function Customize() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'relationship';
  const [site, setSite] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({});
  const apply = useCallback((p) => setSite(p), []);

  const load = useCallback(() => {
    setError('');
    api.app.site().then(setSite).catch((e) => e.status !== 401 && setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <p role="alert" className="text-blush-deep">{error} <button className="underline" onClick={load}>Try again</button></p>;
  if (!site) return <p className="text-ivory/60" role="status">Loading&hellip;</p>;

  return (
    <WithPreview draft={draft}>
      <PageTitle title="Customize" subtitle="Relationship, look, wording, cake and music.">
        <PreviewButton draft={draft} />
      </PageTitle>
      <div role="tablist" aria-label="Customize" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setParams({ tab: id }, { replace: true })}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm transition ${tab === id ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/15 text-ivory/70 hover:border-gold/50'}`}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'relationship' && <RelationshipTab site={site} apply={apply} setDraft={setDraft} />}
        {tab === 'appearance' && <AppearanceTab site={site} apply={apply} setDraft={setDraft} />}
        {tab === 'wording' && <WordingTab site={site} apply={apply} setDraft={setDraft} />}
        {tab === 'cake' && <CakeMusic />}
      </div>
    </WithPreview>
  );
}
