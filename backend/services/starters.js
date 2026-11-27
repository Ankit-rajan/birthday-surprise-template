import { DEFAULT_SITE, DEFAULT_LETTERS, DEFAULT_TIMELINE, PLACEHOLDER_PREFIX as P } from './defaults.js';

/**
 * Guided starter text per relationship mode. LOVE is exactly what every existing customer already has (defaults.js).
 * FRIENDSHIP is the friendly, funny equivalent. Every hint starts with PLACEHOLDER_PREFIX, so the dashboard still knows
 * what has not been edited yet. Customers can replace all of it: nothing here is ever forced on a page.
 */
const A = '›'; // ›

const FRIENDSHIP_SITE = {
  introHeading: `${P} ${A} My Birthday Website ${A} Opening heading`,
  introSubtitle: 'Example heading: "To My Best Friend." Example subtitle: "I made something silly and sweet, just for you."',
  heroMessage: `${P} ${A} My Birthday Website ${A} Birthday message. Example: Happy birthday to the person who knows all my stories and still hangs out with me. I made this little corner of the internet just for you.`,
  birthdayWishes: [
    `${P} ${A} Birthday wishes (one per line). Example: May this year be full of good food and better plans.`,
    'Wish 2 goes on the next line. Example: May your phone battery and your luck both last all day.',
    'Wish 3 goes on the next line. Add as many as you like, they rotate on the home screen.',
  ],
  wishPrompt: `${P} ${A} Make-a-wish prompt. Example: Close your eyes and wish for something big. No, not another pizza.`,
  afterWishMessage: `${P} ${A} Message after blowing out candles. Example: Whatever you wished for, I am in. Let us make it happen.`,
  finalQuote: `${P} ${A} Final quote. Example: Friends like you are the plot twist I am most grateful for.`,
  finalMessage: `${P} ${A} Final message. Example: Happy Birthday, bestie!`,
  reasons: [
    `${P} ${A} Reason 1. Example: You laugh at my worst jokes.`,
    `${P} ${A} Reason 2. Example: You show up, every single time.`,
    `${P} ${A} Reason 3. Example: You keep my secrets safe.`,
    `${P} ${A} Reason 4. Example: Your terrible singing in the car.`,
    `${P} ${A} Reason 5. Example: You tell me the truth, kindly.`,
    `${P} ${A} Reason 6. One short sentence each.`,
    ...Array.from({ length: 14 }, (_, i) => `${P} ${A} Reason ${i + 7}.`),
  ],
  future: {
    places: [
      `${P} ${A} Trips (one per line). Example: That beach town we keep talking about.`,
      'Trip 2. Example: A road trip with a terrible playlist.',
    ],
    dreams: [
      `${P} ${A} Things we will do someday (one per line). Example: Start the business we joke about.`,
      'Idea 2. Example: Attend a concert in the front row.',
    ],
    promises: [
      `${P} ${A} Friend promises (one per line). Example: I will always pick up when you call.`,
      'Promise 2. Example: I will be honest, even when it is awkward.',
    ],
    memories: [
      `${P} ${A} Future memories (one per line). Example: Many more late-night snack runs.`,
      'Memory 2. Example: Being the loudest people at each other’s weddings.',
    ],
  },
};

const FRIENDSHIP_LETTERS = {
  heart: {
    title: 'To My Best Friend',
    body: `${P} ${A} Letters ${A} "To My Best Friend".\n\nThis is the main letter, shown as a paper letter on the page. Example:\n\nDear (name),\n\nStart with a memory only the two of you get. Say thank you for something specific. Say what you wish for them this year.\n\nHappy birthday.`,
  },
  'open-when-miss': {
    title: 'Open when you miss me',
    body: `${P} ${A} Letters ${A} "Open when you miss me".\n\nA small sealed letter, opened with a tap. Example: Hey you. If you are reading this, we are overdue for a long call. Pick up the phone.`,
  },
  'open-when-sad': {
    title: 'Open when you are having a rough day',
    body: `${P} ${A} Letters ${A} "Open when you are having a rough day".\n\nA small sealed letter. Example: Bad day? Same team. You do not have to explain anything, I am on my way with snacks.`,
  },
  'open-when-hug': {
    title: 'Open when you need a pep talk',
    body: `${P} ${A} Letters ${A} "Open when you need a pep talk".\n\nA small sealed letter. Example: Listen. You are smarter, braver and funnier than you feel right now. Go and be unstoppable.`,
  },
  'future-wife': {
    title: 'A Letter To Future Us',
    body: `${P} ${A} Letters ${A} "A Letter To Future Us" (you can change its title too).\n\nA letter about the future, shown at the end of the "Forever" section.`,
  },
};

const FRIENDSHIP_TIMELINE = [
  {
    title: `${P} ${A} Timeline: title of your first chapter`,
    description: 'Example: The day we met, who spoke first and what we were wearing (we both remember differently).',
  },
  {
    title: 'Timeline chapter 2',
    description: 'Add a date, a title, a short story and (optionally) a photo for each chapter.',
  },
  {
    title: 'Timeline chapter 3',
    description: 'Chapters are sorted by date automatically. Entries without a date go last.',
  },
];

const LOVE_SITE = {
  introHeading: DEFAULT_SITE.introHeading,
  introSubtitle: DEFAULT_SITE.introSubtitle,
  heroMessage: DEFAULT_SITE.heroMessage,
  birthdayWishes: DEFAULT_SITE.birthdayWishes,
  wishPrompt: DEFAULT_SITE.wishPrompt,
  afterWishMessage: DEFAULT_SITE.afterWishMessage,
  finalQuote: DEFAULT_SITE.finalQuote,
  finalMessage: DEFAULT_SITE.finalMessage,
  reasons: DEFAULT_SITE.reasons,
  future: DEFAULT_SITE.future,
};

const STARTERS = {
  love: {
    site: LOVE_SITE,
    letters: Object.fromEntries(DEFAULT_LETTERS.map((l) => [l.key, { title: l.title, body: l.body }])),
    timeline: DEFAULT_TIMELINE.map(({ title, description }) => ({ title, description })),
  },
  friendship: { site: FRIENDSHIP_SITE, letters: FRIENDSHIP_LETTERS, timeline: FRIENDSHIP_TIMELINE },
};

export const starterFor = (mode) => STARTERS[mode] ?? STARTERS.love;
export const STARTER_MODES = Object.keys(STARTERS);

/** Site text fields that have a starter. (Names, dates and the song title are never touched.) */
export const STARTER_SITE_FIELDS = Object.keys(LOVE_SITE);
