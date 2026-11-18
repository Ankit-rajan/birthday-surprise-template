import crypto from 'node:crypto';
import { env } from '../config/env.js';

const VERSION = 'v1';

/** AES-256-GCM. Output format: v1.<iv>.<tag>.<ciphertext> (all base64url). */
export function encrypt(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', env.journalKey, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}

export function decrypt(payload) {
  if (!payload) return '';
  try {
    const [version, iv, tag, ct] = payload.split('.');
    if (version !== VERSION) throw new Error('unknown version');
    const decipher = crypto.createDecipheriv('aes-256-gcm', env.journalKey, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return '[This entry could not be decrypted. Was the encryption key changed?]';
  }
}
