import mongoose from 'mongoose';
import { DEFAULT_SITE } from '../services/defaults.js';

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
