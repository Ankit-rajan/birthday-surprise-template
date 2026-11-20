// The PUBLIC DEMO (/demo): a fictional couple, "Aanya Sharma" and "Aarav", with original generated artwork.
// It is bundled with the frontend and never touches the API or the database, so no visitor can read or edit
// real customer data through it, and nothing a visitor does in the demo is saved anywhere.
//
// The text lives in aanya.json, which is the same file the backend offers as an opt-in starter template
// (backend/services/starters/aanya.json). Keep the two copies identical.

import sample from './aanya.json';
import { ApiError } from '../services/errors.js';

const d = '/demo';
const pad = (n) => String(n).padStart(2, '0');

const SIZES = [[900, 1200], [1200, 900], [900, 900], [900, 1200], [1200, 800], [900, 1100], [1000, 1000], [900, 1200], [1200, 900], [900, 1200]];

export const DEMO_VAULT_PASSWORD = 'aanya-and-aarav';

export const demoContent = {
  site: {
    ...sample.site,
    reasons: sample.site.reasons,
    photos: { intro: `${d}/intro.jpg`, hero: `${d}/hero.jpg`, final: `${d}/final.jpg` },
    music: { title: sample.site.musicTitle, url: `${d}/demo-song.mp3` },
    settings: {
      cake: { theme: 'rose', candles: 5, showAge: true },
      effects: { petals: true, confetti: true, celebrationSounds: true },
    },
    vaultEnabled: true,
  },
  gallery: sample.gallery.map((g, i) => ({
    id: `g${i + 1}`,
    url: `${d}/gallery-${pad(i + 1)}.jpg`,
    thumbUrl: `${d}/gallery-${pad(i + 1)}.jpg`,
    width: SIZES[i][0],
    height: SIZES[i][1],
    caption: g.caption,
    date: g.date,
  })),
  timeline: sample.timeline.map((t, i) => ({
    id: `t${i + 1}`,
    date: t.date,
    title: t.title,
    description: t.description,
    photoUrl: `${d}/timeline-${i + 1}.jpg`,
  })),
  letters: (() => {
    const byKey = Object.fromEntries(sample.letters.map((l) => [l.key, { title: l.title, body: l.body }]));
    return {
      heart: byKey.heart,
      openWhen: ['open-when-miss', 'open-when-sad', 'open-when-hug'].map((key) => ({ key, ...byKey[key] })),
      futureWife: byKey['future-wife'],
    };
  })(),
};

const PRIVATE_CAPTIONS = [
  'The night of the lanterns',
  'Our favourite sunrise',
  'Balloons for no reason at all',
  'Under the stars, just us',
  'Flowers you pretended not to love',
  'The city, one quiet evening',
];
const privateMedia = [
  ...PRIVATE_CAPTIONS.map((caption, i) => ({
    id: `p${i + 1}`,
    kind: 'image',
    url: `${d}/private-${pad(i + 1)}.jpg`,
    thumbUrl: `${d}/private-${pad(i + 1)}.jpg`,
    width: 900,
    height: i % 2 === 0 ? 1200 : 900,
    caption,
    date: `2025-0${i + 2}-1${i}`,
  })),
  { id: 'p7', kind: 'video', url: `${d}/private-video.mp4`, thumbUrl: null, width: 1280, height: 720, caption: 'A tiny clip from the lantern night', date: '2025-08-02' },
];

const withIds = (rows, prefix) => rows.map((r, i) => ({ id: `${prefix}${i + 1}`, title: r.title, body: r.body, date: r.date || null }));

const demoJournal = [
  { id: 'j1', title: 'Day one', body: 'Dear diary, today Aarav built me a whole little world. I keep opening it just to see my name written so carefully.', createdAt: '2026-11-01T09:00:00Z', updatedAt: '2026-11-01T09:00:00Z', edited: false },
  { id: 'j2', title: 'A good Tuesday', body: 'Nothing special happened, and it was perfect. Chai, rain, and his terrible jokes.', createdAt: '2026-11-08T20:30:00Z', updatedAt: '2026-11-08T20:30:00Z', edited: false },
];

const readOnly = () => Promise.reject(new ApiError(403, 'This is a read-only demo. Create your own page to write in the journal.'));

/** The demo's private area. In memory, read-only, and password-protected like the real thing. */
export const demoVaultApi = {
  unlock: async (password, role) => {
    await new Promise((r) => setTimeout(r, 350));
    if (password !== DEMO_VAULT_PASSWORD) throw new ApiError(401, 'Incorrect password');
    return { unlocked: true, role, csrfToken: 'demo', idleSeconds: 180 };
  },
  lock: async () => ({ unlocked: false }),
  heartbeat: async () => ({ ok: true }),
  overview: async () => ({
    media: privateMedia,
    secrets: withIds(sample.vault.secrets, 's'),
    diary: withIds(sample.vault.diary, 'd'),
    letters: withIds(sample.vault.letters, 'l'),
  }),
  journal: {
    list: async () => ({ entries: demoJournal }),
    create: readOnly,
    update: readOnly,
    remove: readOnly,
  },
};
