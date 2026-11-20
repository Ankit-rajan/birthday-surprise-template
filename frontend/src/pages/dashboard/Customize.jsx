import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { PageTitle, Card } from './DashboardLayout.jsx';
import { MusicCard } from '../../components/dashboard/SiteMediaTab.jsx';
import { Status, useApiCall } from '../../components/dashboard/useApiCall.jsx';

const THEMES = [
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
export default function Customize() {
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
            {THEMES.map(([id, label, color]) => (
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
