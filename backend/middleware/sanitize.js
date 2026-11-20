/**
 * Defence in depth against NoSQL operator injection (`{"email": {"$ne": null}}`, `?slug[$ne]=x`).
 * Zod already rejects non-string values on every route; this refuses the request before any handler runs.
 * Also strips ASCII control characters (NUL etc.) from every string, keeping tab, newline and carriage return.
 */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function scrub(value, depth = 0) {
  if (depth > 8) return { bad: true };
  if (typeof value === 'string') return { value: value.replace(CONTROL, '') };
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const r = scrub(item, depth + 1);
      if (r.bad) return r;
      out.push(r.value);
    }
    return { value: out };
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor') return { bad: true };
      const r = scrub(v, depth + 1);
      if (r.bad) return r;
      out[k] = r.value;
    }
    return { value: out };
  }
  return { value };
}

export function sanitizeInput(req, res, next) {
  for (const part of ['body', 'query', 'params']) {
    if (req[part] === undefined) continue;
    const r = scrub(req[part]);
    if (r.bad) return res.status(400).json({ error: 'Invalid request.' });
    if (part === 'query') {
      // Express 5 makes req.query read-only; Express 4 allows assignment. Handle both.
      try {
        req.query = r.value;
      } catch {
        Object.defineProperty(req, 'query', { value: r.value, writable: true, configurable: true });
      }
    } else {
      req[part] = r.value;
    }
  }
  return next();
}
