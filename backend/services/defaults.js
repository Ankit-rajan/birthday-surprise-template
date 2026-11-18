/**
 * STARTER CONTENT (template placeholders)
 * ---------------------------------------
 * Everything here is only a PLACEHOLDER. It is written into the database the first time you run `npm run seed`
 * and is then edited from the Admin Panel (open /admin on your site). You normally never need to touch this file.
 *
 * Every placeholder starts with "Edit in Admin Panel -> ..." so you can see on the live page exactly which
 * field controls it, followed by an example of what to write there.
 *
 * Want different starter text for everyone who uses your fork? Change it here BEFORE the first seed.
 */

// Used for the age + countdown. Change it in Admin Panel -> Website text -> Birth date,
// or here before the first seed (format YYYY-MM-DD).
export const BIRTH_DATE = '2000-01-01';

export const DEFAULT_SITE = {
  siteName: 'A Little World Made For You',
  herName: 'Her Name',
  birthDate: BIRTH_DATE,
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
  // 20 reasons. Each card shows its own hint until you replace it in Admin Panel > Website text > Reasons.
  reasons: [
    'Edit in Admin Panel > Reason 1. Example: Your laugh.',
    'Edit in Admin Panel > Reason 2. Example: How kind you are to everyone.',
    'Edit in Admin Panel > Reason 3. Example: Your smile on a tired day.',
    'Edit in Admin Panel > Reason 4. Example: The way you listen.',
    'Edit in Admin Panel > Reason 5. Example: Your honesty.',
    'Edit in Admin Panel > Reason 6. One short sentence each.',
    'Edit in Admin Panel > Reason 7.',
    'Edit in Admin Panel > Reason 8.',
    'Edit in Admin Panel > Reason 9.',
    'Edit in Admin Panel > Reason 10.',
    'Edit in Admin Panel > Reason 11.',
    'Edit in Admin Panel > Reason 12.',
    'Edit in Admin Panel > Reason 13.',
    'Edit in Admin Panel > Reason 14.',
    'Edit in Admin Panel > Reason 15.',
    'Edit in Admin Panel > Reason 16.',
    'Edit in Admin Panel > Reason 17.',
    'Edit in Admin Panel > Reason 18.',
    'Edit in Admin Panel > Reason 19.',
    'Edit in Admin Panel > Reason 20.',
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
  musicTitle: 'Song title (Admin Panel > Photos & music)',
};

/**
 * The 5 letters. `key` and `kind` decide where each letter appears on the site, so do not rename them.
 * Only `title` and `body` are meant to be edited (Admin Panel > Letters).
 */
export const DEFAULT_LETTERS = [
  {
    key: 'heart',
    kind: 'heart',
    title: 'A Letter From My Heart',
    body: `Edit in Admin Panel > Letters > "A Letter From My Heart".

This is the main letter, shown as a paper letter on the home page. Example of how you could write it:

Dear (name),

Start with how you feel. Say thank you for something specific. Say what you wish for them this year.

Happy birthday.`,
  },
  {
    key: 'open-when-miss',
    kind: 'open-when',
    title: 'Open when you miss me',
    body: `Edit in Admin Panel > Letters > "Open when you miss me".

A small sealed letter, opened with a tap. Example: Hey you. If you're reading this, you're missing me, and I'm missing you too. Put on our song and know I'm counting down to the next time we meet.`,
  },
  {
    key: 'open-when-sad',
    kind: 'open-when',
    title: 'Open when you feel sad',
    body: `Edit in Admin Panel > Letters > "Open when you feel sad".

A small sealed letter. Example: If you've opened this, today is heavy. You don't have to be okay for me to care about you. This feeling will pass. You're not alone.`,
  },
  {
    key: 'open-when-hug',
    kind: 'open-when',
    title: 'Open when you need a hug',
    body: `Edit in Admin Panel > Letters > "Open when you need a hug".

A small sealed letter. Example: Come here. Imagine the long, quiet kind of hug where nobody is in a rush to let go. Consider this one a hug on credit.`,
  },
  {
    key: 'future-wife',
    kind: 'future-wife',
    title: 'To My Future Wife',
    body: `Edit in Admin Panel > Letters > "To My Future Wife" (you can also change its title there).

A letter about the future, shown at the end of the "Our future" section. Example: I'm writing this long before it becomes real. I only want you to know where my heart is pointed.`,
  },
];

/**
 * Timeline placeholders. Add real dates, photos and stories in Admin Panel > Timeline.
 */
export const DEFAULT_TIMELINE = [
  {
    date: null,
    title: 'Edit in Admin Panel > Timeline: title of your first chapter',
    description: 'Description goes here. Example: The day we met, where we were and what I remember most.',
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
