import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;
const getTransport = () => {
  if (!env.smtpUrl?.trim()) return null;
  transport ||= nodemailer.createTransport(env.smtpUrl.trim());
  return transport;
};

/**
 * Sends a password-reset email. Without SMTP_URL nothing is sent. In development the link is printed to the
 * server console so the flow can be tested end to end; in production it is NEVER logged (a log line would
 * become an account-takeover vector). Returns true when an email was handed to the SMTP server.
 */
export async function sendPasswordReset(to, name, link) {
  const t = getTransport();
  if (!t) {
    if (!env.isProd) console.log(`[dev] Password reset link for ${to}: ${link}`);
    else console.warn('SMTP_URL is not configured: password reset emails cannot be delivered.');
    return false;
  }
  await t.sendMail({
    from: env.mailFrom,
    to,
    subject: 'Reset your password',
    text: `Hi ${name},\n\nUse this link to choose a new password. It works once and expires in 1 hour:\n${link}\n\nIf you did not ask for this, you can safely ignore this email.`,
  });
  return true;
}
