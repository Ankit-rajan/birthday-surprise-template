/**
 * GUIDED STARTER CONTENT for every NEW customer workspace.
 * ---------------------------------------------------------
 * A new customer does NOT receive anyone else's content. They get this neutral, guided text, where every
 * hint starts with PLACEHOLDER_PREFIX so the dashboard can tell what is still unedited (and warn before
 * publishing). The fictional "Aanya & Aarav" sample lives in services/starters/aanya.json and is only
 * copied into a workspace when the customer explicitly picks it as a starter template.
 */
export const PLACEHOLDER_PREFIX = 'Edit in My Dashboard';

export const BIRTH_DATE = '2000-01-01';

export const DEFAULT_SITE = {
  siteName: 'A Little World Made For You',
  herName: 'Their Name',
  birthDate: BIRTH_DATE,
  partnerName: 'Your Name',
  introHeading: `${PLACEHOLDER_PREFIX} \u203a My Birthday Website \u203a Opening heading`,
  introSubtitle: 'Example heading: "For the one who makes my world beautiful." Example subtitle: "I made something special just for you."',
  heroMessage: `${PLACEHOLDER_PREFIX} \u203a My Birthday Website \u203a Birthday message. Example: Today the world got a little brighter, because you were born into it. I made this small corner of the internet just for you.`,
  birthdayWishes: [
    `${PLACEHOLDER_PREFIX} \u203a Birthday wishes (one per line). Example: May this year be gentle with you.`,
    'Wish 2 goes on the next line. Example: May every dream you quietly carry find its way to you.',
    'Wish 3 goes on the next line. Add as many as you like, they rotate on the home screen.',
  ],
  wishPrompt: `${PLACEHOLDER_PREFIX} \u203a Make-a-wish prompt. Example: Close your eyes and think of something you want.`,
  afterWishMessage: `${PLACEHOLDER_PREFIX} \u203a Message after blowing out candles. Example: Whatever you wished for, I hope it comes true.`,
  finalQuote: `${PLACEHOLDER_PREFIX} \u203a Final quote. Example: If I could choose again, I would still choose you.`,
  finalMessage: `${PLACEHOLDER_PREFIX} \u203a Final message. Example: Happy Birthday!`,
  reasons: [
    `${PLACEHOLDER_PREFIX} \u203a Reason 1. Example: Your laugh.`,
    `${PLACEHOLDER_PREFIX} \u203a Reason 2. Example: How kind you are to everyone.`,
    `${PLACEHOLDER_PREFIX} \u203a Reason 3. Example: Your smile on a tired day.`,
    `${PLACEHOLDER_PREFIX} \u203a Reason 4. Example: The way you listen.`,
    `${PLACEHOLDER_PREFIX} \u203a Reason 5. Example: Your honesty.`,
    `${PLACEHOLDER_PREFIX} \u203a Reason 6. One short sentence each.`,
    ...Array.from({ length: 14 }, (_, i) => `${PLACEHOLDER_PREFIX} \u203a Reason ${i + 7}.`),
  ],
  future: {
    places: [
      `${PLACEHOLDER_PREFIX} \u203a Places (one per line). Example: A quiet town by the sea.`,
      'Place 2. Example: A city we are both curious about.',
    ],
    dreams: [
      `${PLACEHOLDER_PREFIX} \u203a Dreams (one per line). Example: A home that feels like ours.`,
      'Dream 2. Example: Building something meaningful together.',
    ],
    promises: [
      `${PLACEHOLDER_PREFIX} \u203a Promises (one per line). Example: I will always listen first.`,
      'Promise 2. Example: I will choose patience over pride.',
    ],
    memories: [
      `${PLACEHOLDER_PREFIX} \u203a Future memories (one per line). Example: Slow mornings and coffee.`,
      'Memory 2. Example: Late-night talks that turn into sunrise.',
    ],
  },
  musicTitle: 'Our Song',
};

/**
 * The 5 letters. `key` and `kind` decide where each letter appears on the site, so do not rename them.
 * Only `title` and `body` are meant to be edited by the customer.
 */
export const DEFAULT_LETTERS = [
  {
    key: 'heart',
    kind: 'heart',
    title: 'A Letter From My Heart',
    body: `${PLACEHOLDER_PREFIX} \u203a Letters \u203a "A Letter From My Heart".\n\nThis is the main letter, shown as a paper letter on the page. Example:\n\nDear (name),\n\nStart with how you feel. Say thank you for something specific. Say what you wish for them this year.\n\nHappy birthday.`,
  },
  {
    key: 'open-when-miss',
    kind: 'open-when',
    title: 'Open when you miss me',
    body: `${PLACEHOLDER_PREFIX} \u203a Letters \u203a "Open when you miss me".\n\nA small sealed letter, opened with a tap. Example: Hey you. If you're reading this, you're missing me, and I'm missing you too.`,
  },
  {
    key: 'open-when-sad',
    kind: 'open-when',
    title: 'Open when you feel sad',
    body: `${PLACEHOLDER_PREFIX} \u203a Letters \u203a "Open when you feel sad".\n\nA small sealed letter. Example: If you've opened this, today is heavy. You don't have to be okay for me to care about you.`,
  },
  {
    key: 'open-when-hug',
    kind: 'open-when',
    title: 'Open when you need a hug',
    body: `${PLACEHOLDER_PREFIX} \u203a Letters \u203a "Open when you need a hug".\n\nA small sealed letter. Example: Come here. Consider this one a hug on credit.`,
  },
  {
    key: 'future-wife',
    kind: 'future-wife',
    title: 'A Letter To Our Future',
    body: `${PLACEHOLDER_PREFIX} \u203a Letters \u203a "A Letter To Our Future" (you can change its title too).\n\nA letter about the future, shown at the end of the "Our future" section.`,
  },
];

export const DEFAULT_TIMELINE = [
  {
    date: null,
    title: `${PLACEHOLDER_PREFIX} \u203a Timeline: title of your first chapter`,
    description: 'Example: The day we met, where we were and what I remember most.',
  },
  {
    date: null,
    title: 'Timeline chapter 2',
    description: 'Add a date, a title, a short story and (optionally) a photo for each chapter.',
  },
  {
    date: null,
    title: 'Timeline chapter 3',
    description: 'Chapters are sorted by date automatically. Entries without a date go last.',
  },
];
