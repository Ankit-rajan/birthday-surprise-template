import mongoose from 'mongoose';
import { DEFAULT_SITE } from '../services/defaults.js';
import { FEATURE_KEYS } from '../services/siteConfig/siteConfig.js';

const { ObjectId } = mongoose.Schema.Types;
const d = DEFAULT_SITE;

/**
 * One birthday website per customer. `owner` is the tenant key: every other content collection
 * carries the same `owner` field and every query filters on it.
 */
const siteContentSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Slugs this site used to have. Reserved for the same owner so a shared link can never be taken over.
    previousSlugs: { type: [String], default: [], index: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },

    siteName: { type: String, default: d.siteName },
    herName: { type: String, default: d.herName },
    birthDate: { type: String, default: d.birthDate },
    partnerName: { type: String, default: d.partnerName },
    introHeading: { type: String, default: d.introHeading },
    introSubtitle: { type: String, default: d.introSubtitle },
    heroMessage: { type: String, default: d.heroMessage },
    birthdayWishes: { type: [String], default: () => [...d.birthdayWishes] },
    wishPrompt: { type: String, default: d.wishPrompt },
    afterWishMessage: { type: String, default: d.afterWishMessage },
    finalQuote: { type: String, default: d.finalQuote },
    finalMessage: { type: String, default: d.finalMessage },
    reasons: { type: [String], default: () => [...d.reasons] },
    future: {
      places: { type: [String], default: () => [...d.future.places] },
      dreams: { type: [String], default: () => [...d.future.dreams] },
      promises: { type: [String], default: () => [...d.future.promises] },
      memories: { type: [String], default: () => [...d.future.memories] },
    },
    photos: {
      intro: { type: ObjectId, ref: 'MediaAsset', default: null },
      hero: { type: ObjectId, ref: 'MediaAsset', default: null },
      final: { type: ObjectId, ref: 'MediaAsset', default: null },
    },
    music: {
      title: { type: String, default: d.musicTitle },
      asset: { type: ObjectId, ref: 'MediaAsset', default: null },
    },
    // Universal builder. All optional: a site saved before these existed has none of them and renders as Love Mode / classic look.
    relationship: {
      mode: { type: String, enum: ['love', 'friendship'] },
      type: { type: String, maxlength: 40 },
    },
    // Only switches the owner has touched are stored; everything else follows the registry default (siteConfig.json).
    features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, { type: Boolean }])),
    appearance: {
      theme: { type: String, maxlength: 40, default: null },
      primaryColor: { type: String, default: null },
      secondaryColor: { type: String, default: null },
      backgroundColor: { type: String, default: null },
      textColor: { type: String, default: null },
      buttonColor: { type: String, default: null },
      font: { type: String, maxlength: 40, default: null },
    },
    // Only the labels the owner rewrote. Everything else comes from the relationship mode.
    copyOverrides: { type: Map, of: String, default: undefined },
    // Optional password for the whole page (feature "passwordProtection").
    sitePasswordHash: { type: String, default: null, select: false },
    sitePasswordSet: { type: Boolean, default: false },
    siteFailedAttempts: { type: Number, default: 0, select: false },
    siteLockedUntil: { type: Date, default: null, select: false },
    // Look and feel: cake, falling petals, confetti and the built-in celebration sounds.
    settings: {
      cake: {
        theme: { type: String, enum: ['rose', 'chocolate', 'vanilla', 'berry', 'midnight'], default: 'rose' },
        candles: { type: Number, min: 1, max: 9, default: 5 },
        showAge: { type: Boolean, default: true },
      },
      effects: {
        petals: { type: Boolean, default: true },
        confetti: { type: Boolean, default: true },
        celebrationSounds: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true },
);

export const SiteContent = mongoose.model('SiteContent', siteContentSchema);
