// Sample content for DEMO MODE only (npm run demo). It runs with no backend and no database.
// Every text below is a PLACEHOLDER that tells you which Admin Panel field controls it, plus an example.
// In demo mode you can change any of it from http://localhost:5173/admin (edits stay in your browser).
// In the real app (with the backend), the starter text comes from backend/services/defaults.js instead.

const d = '/demo';

export const DEMO_CREDENTIALS = {
  vaultPassword: 'demo-vault-2026',
  adminEmail: 'demo@example.com',
  adminPassword: 'demo-admin-1234',
};

export const demoSite = {
  siteName: 'A Little World Made For You',
  herName: 'Her Name',
  birthDate: '2000-01-01',
  partnerName: 'Your Name',
  introHeading: 'Edit in Admin Panel: Opening heading',
  introSubtitle: 'Website text > Opening heading/subtitle. Example heading: "For the one who makes my world beautiful." Example subtitle: "I made something special just for you."',
  heroMessage:
    'Edit in Admin Panel > Website text > Birthday message. Example: Today the world got a little brighter, because you were born into it. I made this small corner of the internet just for you.',
  birthdayWishes: [
    'Edit in Admin Panel > Website text > Birthday wishes (one wish per line). Example: May this year be gentle with you.',
    'Wish 2 goes on the next line. Example: May every dream you quietly carry find its way to you.',
    'Wish 3 goes on the next line. Add as many as you like, they rotate on the home screen.',
  ],
  wishPrompt: 'Edit in Admin Panel > Website text > Make-a-wish prompt. Example: Close your eyes and think of something you want.',
  afterWishMessage: 'Edit in Admin Panel > Website text > Message after blowing out candles. Example: Whatever you wished for, I hope it comes true.',
  finalQuote: 'Edit in Admin Panel > Website text > Final quote. Example: If I could choose again, I would still choose you.',
  finalMessage: 'Edit in Admin Panel > Website text > Final message. Example: Happy Birthday!',
  reasons: [
    'Edit in Admin Panel > Reason 1. Example: Your laugh.',
    'Edit in Admin Panel > Reason 2. Example: How kind you are to everyone.',
    'Edit in Admin Panel > Reason 3. Example: Your smile on a tired day.',
    'Edit in Admin Panel > Reason 4. Example: The way you listen.',
    'Edit in Admin Panel > Reason 5. Example: Your honesty.',
    'Edit in Admin Panel > Reason 6. One short sentence each.',
    ...Array.from({ length: 14 }, (_, i) => `Edit in Admin Panel > Reason ${i + 7}.`),
  ],
  future: {
    places: [
      'Edit in Admin Panel > Our future > Places (one per line). Example: A quiet town by the sea.',
      'Place 2. Example: A city we are both curious about.',
    ],
    dreams: [
      'Edit in Admin Panel > Our future > Dreams (one per line). Example: A home that feels like ours.',
      'Dream 2. Example: Building something meaningful together.',
    ],
    promises: [
      'Edit in Admin Panel > Our future > Promises (one per line). Example: I will always listen first.',
      'Promise 2. Example: I will choose patience over pride.',
    ],
    memories: [
      'Edit in Admin Panel > Our future > Future memories (one per line). Example: Slow mornings and coffee.',
      'Memory 2. Example: Late-night talks that turn into sunrise.',
    ],
  },
  photos: { intro: `${d}/intro.jpg`, hero: `${d}/hero.jpg`, final: `${d}/final.jpg` },
  music: { title: 'Song title (Admin Panel > Photos & music)', url: `${d}/demo-song.mp3` },
};

const captions = [
  'Caption 1 (Admin Panel > Gallery)',
  'Example: Our first trip',
  'Example: Golden hour',
  'Example: A day to remember',
  'Example: Sunday mood',
  'Example: The long way home',
  'Example: Coffee date',
  'Example: Somewhere beautiful',
  'Caption 9',
  'Caption 10',
  'Caption 11',
  'Caption 12',
];
const sizes = [
  [900, 1200], [1200, 900], [900, 900], [900, 1200], [1200, 800], [900, 1100],
  [1000, 1000], [900, 1200], [1200, 900], [900, 1200], [1100, 900], [900, 1000],
];

export const demoGallery = captions.map((caption, i) => ({
  id: `g${i + 1}`,
  url: `${d}/gallery-${String(i + 1).padStart(2, '0')}.jpg`,
  thumbUrl: `${d}/gallery-${String(i + 1).padStart(2, '0')}.jpg`,
  width: sizes[i][0],
  height: sizes[i][1],
  caption,
  date: i < 6 ? `2025-0${i + 1}-1${i}` : null,
}));

export const demoTimeline = [
  { id: 't1', date: null, title: 'Edit in Admin Panel > Timeline: title of chapter 1', description: 'Description goes here. Example: The day we met, where we were and what I remember most.', photoUrl: `${d}/timeline-1.jpg` },
  { id: 't2', date: null, title: 'Timeline chapter 2', description: 'Add a date, a title, a short story and (optionally) a photo for each chapter.', photoUrl: `${d}/timeline-2.jpg` },
  { id: 't3', date: null, title: 'Timeline chapter 3', description: 'Chapters are sorted by date automatically. Entries without a date go last.', photoUrl: `${d}/timeline-3.jpg` },
];

export const demoLetters = [
  {
    id: 'l1',
    key: 'heart',
    title: 'A Letter From My Heart',
    body: `Edit in Admin Panel > Letters > "A Letter From My Heart".\n\nThis is the main letter, shown as a paper letter on the home page. Example of how you could write it:\n\nDear (name),\n\nStart with how you feel. Say thank you for something specific. Say what you wish for them this year.\n\nHappy birthday.`,
  },
  {
    id: 'l2',
    key: 'open-when-miss',
    title: 'Open when you miss me',
    body: `Edit in Admin Panel > Letters > "Open when you miss me".\n\nA small sealed letter, opened with a tap. Example: Hey you. If you're reading this, you're missing me, and I'm missing you too.`,
  },
  {
    id: 'l3',
    key: 'open-when-sad',
    title: 'Open when you feel sad',
    body: `Edit in Admin Panel > Letters > "Open when you feel sad".\n\nA small sealed letter. Example: If you've opened this, today is heavy. You're not alone.`,
  },
  {
    id: 'l4',
    key: 'open-when-hug',
    title: 'Open when you need a hug',
    body: `Edit in Admin Panel > Letters > "Open when you need a hug".\n\nA small sealed letter. Example: Come here. Consider this one a hug on credit.`,
  },
  {
    id: 'l5',
    key: 'future-wife',
    title: 'To My Future Wife',
    body: `Edit in Admin Panel > Letters > "To My Future Wife" (you can also change its title there).\n\nA letter about the future, shown at the end of the "Our future" section.`,
  },
];

export const demoPrivateMedia = [
  { id: 'p1', kind: 'image', url: `${d}/private-01.jpg`, thumbUrl: `${d}/private-01.jpg`, width: 900, height: 1200, caption: 'Edit in Admin Panel > Private media', date: '2025-06-14' },
  { id: 'p2', kind: 'video', url: `${d}/private-video.mp4`, thumbUrl: null, width: 1280, height: 720, caption: 'Private videos work too', date: '2025-07-02' },
  { id: 'p3', kind: 'image', url: `${d}/private-02.jpg`, thumbUrl: `${d}/private-02.jpg`, width: 900, height: 900, caption: 'Example: Our secret spot', date: '2025-08-21' },
  { id: 'p4', kind: 'image', url: `${d}/private-03.jpg`, thumbUrl: `${d}/private-03.jpg`, width: 900, height: 1200, caption: 'Private photo 4', date: null },
  { id: 'p5', kind: 'image', url: `${d}/private-04.jpg`, thumbUrl: `${d}/private-04.jpg`, width: 900, height: 900, caption: 'Private photo 5', date: null },
  { id: 'p6', kind: 'image', url: `${d}/private-05.jpg`, thumbUrl: `${d}/private-05.jpg`, width: 900, height: 1200, caption: 'Private photo 6', date: null },
];

export const demoMessages = [
  { id: 'm1', kind: 'secret', title: 'Edit in Admin Panel > Private messages (secret)', body: 'A short note that is revealed on tap. Example: I smile every time I think of you.', date: null },
  { id: 'm2', kind: 'secret', title: 'Secret 2', body: 'Another short secret. Example: You are my favourite notification.', date: null },
  { id: 'm4', kind: 'diary', title: 'Edit in Admin Panel > Private messages (diary)', body: 'A dated memory. Example: Write what happened that day and why you want to remember it.', date: '2025-09-10' },
  { id: 'm5', kind: 'diary', title: 'Diary 2', body: 'Diary entries are shown in date order.', date: '2025-10-05' },
  { id: 'm6', kind: 'letter', title: 'Edit in Admin Panel > Private messages (letter)', body: 'A longer letter. Example: A letter to open on a future birthday.', date: '2027-01-01' },
  { id: 'm7', kind: 'letter', title: 'Letter 2', body: 'Another letter. Example: For a hard day. Breathe. You are doing better than you think.', date: null },
];

export const demoJournal = [
  {
    id: 'j1',
    title: 'Her Heart journal (example entry)',
    body: 'This private journal is written by the birthday person herself, after unlocking the vault as "I am ...". Entries are encrypted in the real app.',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  },
];
