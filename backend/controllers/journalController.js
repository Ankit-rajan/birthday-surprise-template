import { z } from 'zod';
import { JournalEntry } from '../models/JournalEntry.js';
import { encrypt, decrypt } from '../services/crypto.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

const entrySchema = z.object({
  title: z.string().trim().max(120).optional().default(''),
  body: z.string().trim().min(1, 'Please write something first.').max(20000),
});

const serialize = (doc) => ({
  id: String(doc._id),
  title: decrypt(doc.titleEnc),
  body: decrypt(doc.bodyEnc),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  edited: doc.updatedAt.getTime() - doc.createdAt.getTime() > 2000,
});

/** Both roles (her, him) may read. Newest first. */
export const listEntries = asyncHandler(async (req, res) => {
  const docs = await JournalEntry.find().sort({ createdAt: -1 });
  res.json({ entries: docs.map(serialize) });
});

// create / update / delete are mounted behind requireRole('her') in the router.
export const createEntry = asyncHandler(async (req, res) => {
  const { title, body } = entrySchema.parse(req.body);
  const doc = await JournalEntry.create({ titleEnc: encrypt(title), bodyEnc: encrypt(body) });
  res.status(201).json({ entry: serialize(doc) });
});

export const updateEntry = asyncHandler(async (req, res) => {
  const { title, body } = entrySchema.parse(req.body);
  const doc = await JournalEntry.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Entry not found');
  doc.titleEnc = encrypt(title);
  doc.bodyEnc = encrypt(body);
  await doc.save();
  res.json({ entry: serialize(doc) });
});

export const deleteEntry = asyncHandler(async (req, res) => {
  const doc = await JournalEntry.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Entry not found');
  await doc.deleteOne();
  res.json({ ok: true });
});
