import { loadSession, cookieName, destroySession } from '../services/sessions.js';
import { AdminUser } from '../models/AdminUser.js';

function makeAuth(type) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[cookieName[type]];
      const session = await loadSession(type, token);
      if (!session) {
        return res.status(401).json({ error: type === 'vault' ? 'locked' : 'unauthenticated' });
      }
      if (type === 'admin') {
        // A deleted admin account must lose access immediately.
        const exists = await AdminUser.exists({ _id: session.userId });
        if (!exists) {
          await destroySession('admin', token);
          return res.status(401).json({ error: 'unauthenticated' });
        }
      }
      req.auth = session;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const vaultAuth = makeAuth('vault');
export const adminAuth = makeAuth('admin');

/** Role-based authorisation. `her` / `him` for the vault, `admin` for the dashboard. */
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: 'Not allowed for this role' });
