/**
 * Vault password policy. The vault password must never be guessable from the birthday
 * or the birthday person's name, and should be long enough to resist offline guessing.
 *
 * `context` is optional: { birthDate: 'YYYY-MM-DD', herName: 'Name' } (taken from the site settings).
 */
function dobPatterns(birthDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || '');
  if (!m) return [];
  const [, yyyy, mm, dd] = m;
  const yy = yyyy.slice(2);
  const sep = '[\\s./_-]?';
  return [
    new RegExp(`${dd}${sep}${mm}${sep}(${yyyy.slice(0, 2)})?${yy}`), // DDMMYYYY, DD-MM-YY ...
    new RegExp(`(${yyyy.slice(0, 2)})?${yy}${sep}${mm}${sep}${dd}`), // YYYYMMDD ...
    new RegExp(`${mm}${sep}${dd}${sep}(${yyyy.slice(0, 2)})?${yy}`), // MMDDYYYY ...
  ];
}

export function validateVaultPassword(password, context = {}) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'The vault password must be at least 10 characters. A short phrase you both remember works well.';
  }
  if (password.length > 128) return 'The vault password is too long (max 128 characters).';
  const compact = password.toLowerCase();
  if (dobPatterns(context.birthDate).some((re) => re.test(compact))) {
    return 'The vault password must not contain the birth date.';
  }
  const name = String(context.herName || '').toLowerCase().replace(/[^a-z]/g, '');
  if (name && compact.replace(/[^a-z]/g, '') === name) {
    return 'The vault password must not be just the name.';
  }
  return null;
}

export function validateAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    return 'The admin password must be at least 12 characters.';
  }
  return null;
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', '1234567890', '12345678910', 'qwertyuiop', 'qwerty12345',
  'iloveyou123', 'letmein123', 'welcome123', 'admin12345', 'birthday123', 'happybirthday', 'abc1234567', '0123456789',
  'passw0rd123', 'changeme123', 'iloveyou1234', 'qwerty123456',
]);

/**
 * Customer account password policy: 10-72 bytes (bcrypt silently ignores everything past 72 bytes, so we refuse
 * longer input instead of truncating it), not a well-known password and not built from the email or name.
 * Returns an error message or null.
 */
export function validateUserPassword(password, { email = '', name = '' } = {}) {
  if (typeof password !== 'string' || password.length < 10) return 'Your password must be at least 10 characters.';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Your password is too long (maximum 72 bytes).';
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(lower)) return 'That password is too easy to guess. Try a longer phrase.';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return 'Your password must not contain your email name.';
  const compactName = String(name).toLowerCase().replace(/[^a-z]/g, '');
  if (compactName.length >= 4 && lower.replace(/[^a-z]/g, '') === compactName) return 'Your password must not be just your name.';
  if (!/[a-z]/i.test(password) || !/[0-9\W_]/.test(password)) {
    return 'Please mix letters with at least one number or symbol.';
  }
  return null;
}
