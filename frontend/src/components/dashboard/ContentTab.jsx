import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useApiCall, Status } from './useApiCall.jsx';

const TEXT_FIELDS = [
  ['siteName', 'Website name (browser tab title + top-left of the menu)', false],
  ['herName', 'Birthday person\'s name (opening screen, big name on home, cake, footer)', false],
  ['birthDate', 'Birth date, format YYYY-MM-DD (drives age + countdown). Example: 2000-01-31', false],
  ['partnerName', 'Your name (signs the letters)', false],
  ['introHeading', 'Opening heading', false],
  ['introSubtitle', 'Opening subtitle', false],
  ['heroMessage', 'Birthday message', true],
  ['wishPrompt', 'Make-a-wish prompt', false],
  ['afterWishMessage', 'Message after blowing out candles', true],
  ['finalQuote', 'Final quote', false],
  ['finalMessage', 'Final message', false],
  ['musicTitle', 'Song title', false],
];

const LISTS = [
  ['places', 'Places we want to visit'],
  ['dreams', 'Dreams'],
  ['promises', 'Small promises'],
  ['memories', 'Future memories'],
];

const toLines = (arr) => (arr || []).join('\n');
const fromLines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);

export default function ContentTab({ onExpired }) {
  const [form, setForm] = useState(null);
  const [friend, setFriend] = useState(false);
  const { busy, error, ok, run } = useApiCall(onExpired);

  useEffect(() => {
    run(() => api.app.getContent(), '').then((c) => {
      if (!c) return;
      setFriend(c.relationship?.mode === 'friendship');
      setForm({
        ...Object.fromEntries(TEXT_FIELDS.map(([k]) => [k, k === 'musicTitle' ? c.music.title : c[k]])),
        birthdayWishes: toLines(c.birthdayWishes),
        reasons: c.reasons,
        future: Object.fromEntries(LISTS.map(([k]) => [k, toLines(c.future[k])])),
      });
    });
  }, [run]);

  if (!form) return <Status error={error} ok="" />;

  const save = (e) => {
    e.preventDefault();
    run(
      () =>
        api.app.saveContent({
          ...Object.fromEntries(TEXT_FIELDS.map(([k]) => [k, form[k]])),
          birthdayWishes: fromLines(form.birthdayWishes),
          reasons: form.reasons,
          future: Object.fromEntries(LISTS.map(([k]) => [k, fromLines(form.future[k])])),
        }),
      'Website text saved.',
    );
  };

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        {TEXT_FIELDS.map(([key, label, multi]) => (
          <label key={key} className={`block text-xs uppercase tracking-widest text-ivory/60 ${multi ? 'md:col-span-2' : ''}`}>
            {label}
            {multi ? (
              <textarea rows={4} className="field mt-1 normal-case tracking-normal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            ) : (
              <input className="field mt-1 normal-case tracking-normal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            )}
          </label>
        ))}
        <label className="block text-xs uppercase tracking-widest text-ivory/60 md:col-span-2">
          Birthday wishes (one per line, they rotate in the hero)
          <textarea rows={4} className="field mt-1 normal-case tracking-normal" value={form.birthdayWishes} onChange={(e) => setForm({ ...form, birthdayWishes: e.target.value })} />
        </label>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl text-ivory">{friend ? '20 reasons you\u2019re a great friend' : '20 reasons I love you'}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {form.reasons.map((r, i) => (
            <label key={i} className="block text-xs text-ivory/50">
              Reason {i + 1}
              <input
                className="field mt-1"
                value={r}
                maxLength={600}
                onChange={(e) => setForm({ ...form, reasons: form.reasons.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="font-serif text-2xl text-ivory md:col-span-2">{friend ? 'Our plans (one item per line)' : 'Our future (one item per line)'}</h2>
        {LISTS.map(([k, label]) => (
          <label key={k} className="block text-xs uppercase tracking-widest text-ivory/60">
            {label}
            <textarea rows={5} className="field mt-1 normal-case tracking-normal" value={form.future[k]} onChange={(e) => setForm({ ...form, future: { ...form.future, [k]: e.target.value } })} />
          </label>
        ))}
      </section>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-full border border-gold/30 bg-midnight/90 px-5 py-3 backdrop-blur">
        <button className="btn-gold !py-2.5" disabled={busy}>{busy ? 'Saving…' : 'Save all'}</button>
        <Status error={error} ok={ok} />
      </div>
    </form>
  );
}
