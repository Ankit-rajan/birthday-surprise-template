import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// Express identifies error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Please check the information you entered.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err?.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : err.message });
  }
  if (err?.name === 'CastError' || err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid data.' });
  }
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ error: status >= 500 && env.isProd ? 'Something went wrong.' : err.message });
}
