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
