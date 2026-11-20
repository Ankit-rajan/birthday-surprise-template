import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { getBucket } from '../config/db.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { HttpError } from '../utils/httpError.js';

const MB = 1024 * 1024;
const MAX_BYTES = { image: 25 * MB, audio: 20 * MB, video: 200 * MB };
const QUOTA_BYTES = env.maxUserStorageMb * MB;

/** Total bytes (full size + thumbnails) one customer currently stores. */
export async function storageUsed(ownerId) {
  const [row] = await MediaAsset.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(String(ownerId)) } },
    { $group: { _id: null, bytes: { $sum: { $add: ['$size', '$thumbSize'] } } } },
  ]);
  return row?.bytes || 0;
}

/** Identify a file from its first bytes. We never trust the client-supplied MIME type or extension. */
function sniff(head) {
  const b = head;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return { kind: 'image', mime: 'image/png' };
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    return { kind: 'image', mime: 'image/webp' };
  }
  if (b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return { kind: 'heic' };
    }
    if (brand === 'M4A ' || brand === 'M4B ') return { kind: 'audio', mime: 'audio/mp4' };
    if (brand === 'qt  ') return { kind: 'video', mime: 'video/quicktime' };
    return { kind: 'video', mime: 'video/mp4' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: 'video', mime: 'video/webm' };
  if (b.toString('latin1', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) {
    return { kind: 'audio', mime: 'audio/mpeg' };
  }
  if (b.toString('latin1', 0, 4) === 'OggS') return { kind: 'audio', mime: 'audio/ogg' };
  return null;
}

async function readHead(path, length = 16) {
  const handle = await fsp.open(path, 'r');
  try {
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, 0);
    return buf;
  } finally {
    await handle.close();
  }
}

async function uploadBuffer(bucket, buffer, filename, contentType) {
  const up = bucket.openUploadStream(filename, { contentType });
  await pipeline(Readable.from([buffer]), up);
  return up.id;
}

/**
 * Validates, optimises and stores an uploaded temp file in GridFS, then returns the MediaAsset.
 * Images are re-encoded (auto-rotated, EXIF/GPS stripped, resized) and get a thumbnail.
 */
export async function ingestUpload(ownerId, file, visibility, allowedKinds) {
  if (!file) throw new HttpError(400, 'No file uploaded');
  if (!ownerId) throw new Error('ingestUpload requires an owner');
  try {
    const found = sniff(await readHead(file.path));
    if (found?.kind === 'heic') {
      throw new HttpError(415, 'HEIC photos are not supported. Export the photo as JPEG and upload again.');
    }
    if (!found || !allowedKinds.includes(found.kind)) {
      throw new HttpError(415, `Unsupported file. Allowed: ${allowedKinds.join(', ')}.`);
    }
    const stat = await fsp.stat(file.path);
    if (stat.size > MAX_BYTES[found.kind]) {
      throw new HttpError(413, `That ${found.kind} is too large (max ${MAX_BYTES[found.kind] / MB} MB).`);
    }
    if ((await storageUsed(ownerId)) + stat.size > QUOTA_BYTES) {
      throw new HttpError(413, `You have reached your ${env.maxUserStorageMb} MB storage limit. Delete a few files and try again.`);
    }

    const bucket = getBucket(visibility);
    const originalName = (file.originalname || '').slice(0, 200);

    if (found.kind === 'image') {
      let base;
      let main;
      let thumb;
      try {
        base = sharp(file.path, { failOn: 'error', limitInputPixels: 120_000_000 }).rotate();
        main = await base
          .clone()
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#fff8ec' })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer({ resolveWithObject: true });
        thumb = await base
          .clone()
          .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#fff8ec' })
          .jpeg({ quality: 72, mozjpeg: true })
          .toBuffer();
      } catch {
        throw new HttpError(400, 'That image could not be read. Try exporting it as a JPEG.');
      }
      const gridId = await uploadBuffer(bucket, main.data, `${Date.now()}.jpg`, 'image/jpeg');
      const thumbGridId = await uploadBuffer(bucket, thumb, `${Date.now()}-thumb.jpg`, 'image/jpeg');
      return MediaAsset.create({
        owner: ownerId,
        visibility,
        kind: 'image',
        mime: 'image/jpeg',
        gridId,
        size: main.data.length,
        thumbGridId,
        thumbSize: thumb.length,
        width: main.info.width,
        height: main.info.height,
        originalName,
      });
    }

    const up = bucket.openUploadStream(`${Date.now()}-${found.kind}`, { contentType: found.mime });
    await pipeline(fs.createReadStream(file.path), up);
    return MediaAsset.create({
      owner: ownerId,
      visibility,
      kind: found.kind,
      mime: found.mime,
      gridId: up.id,
      size: stat.size,
      originalName,
    });
  } finally {
    await fsp.unlink(file.path).catch(() => {});
  }
}

/** Deletes one asset, but ONLY if it belongs to `ownerId`. Accepts a MediaAsset document or an ObjectId. */
export async function deleteAsset(ownerId, assetOrId) {
  // ObjectIds also expose `_id`, so test for a real field to tell the two apart.
  const asset = assetOrId?.gridId ? assetOrId : await MediaAsset.findOne({ _id: assetOrId, owner: ownerId });
  if (!asset || String(asset.owner) !== String(ownerId)) return;
  const bucket = getBucket(asset.visibility);
  await bucket.delete(asset.gridId).catch(() => {});
  if (asset.thumbGridId) await bucket.delete(asset.thumbGridId).catch(() => {});
  await MediaAsset.deleteOne({ _id: asset._id });
}

/** Streams a stored asset with HTTP Range support (needed for video seeking and iOS Safari). */
export function streamAsset(req, res, asset, { thumb = false, forcePrivate = false } = {}) {
  const useThumb = thumb && asset.thumbGridId;
  const gridId = useThumb ? asset.thumbGridId : asset.gridId;
  const size = useThumb ? asset.thumbSize : asset.size;
  const mime = useThumb ? 'image/jpeg' : asset.mime;
  // Owner previews and private bytes are never cached by shared caches. Published public media may be, briefly.
  const isPrivate = asset.visibility === 'private' || forcePrivate;

  res.set({
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=300',
  });
  if (!isPrivate) res.set('Cross-Origin-Resource-Policy', 'cross-origin');

  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (m[1] === '' && m[2] === '')) {
      res.set('Content-Range', `bytes */${size}`);
      return res.status(416).end();
    }
    if (m[1] === '') {
      start = Math.max(0, size - Number(m[2]));
    } else {
      start = Number(m[1]);
      if (m[2] !== '') end = Math.min(Number(m[2]), size - 1);
    }
    if (start > end || start >= size) {
      res.set('Content-Range', `bytes */${size}`);
      return res.status(416).end();
    }
    status = 206;
    res.set('Content-Range', `bytes ${start}-${end}/${size}`);
  }

  res.status(status);
  res.set('Content-Length', String(end - start + 1));
  if (req.method === 'HEAD') return res.end();

  const stream = getBucket(asset.visibility).openDownloadStream(gridId, { start, end: end + 1 });
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
    else res.destroy();
  });
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}
