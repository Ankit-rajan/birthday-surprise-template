// Brand and contact details live here (and in VITE_* variables) so renaming the product is a one-file change.
// "Surprise Studio" is a working name. Change `name` to whatever you decide to call the product.
export const BRAND = {
  name: 'Surprise Studio',
  tagline: 'Birthday surprise websites',
  // Optional. Set VITE_CONTACT_EMAIL / VITE_INSTAGRAM_URL / ... in Vercel. Links that are not configured are not shown.
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  social: [
    ['Instagram', import.meta.env.VITE_INSTAGRAM_URL || ''],
    ['YouTube', import.meta.env.VITE_YOUTUBE_URL || ''],
    ['X', import.meta.env.VITE_X_URL || ''],
    ['GitHub', import.meta.env.VITE_GITHUB_URL || ''],
  ].filter(([, url]) => /^https:\/\//.test(url)),
};
