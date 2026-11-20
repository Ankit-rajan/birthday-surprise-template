import { useCallback, useState } from 'react';

/** Wraps a dashboard API call with busy/error/ok state. A 401 means the session expired (the auth context then sends the person to login). */
export function useApiCall(onExpired) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const run = useCallback(
    async (fn, successMessage = 'Saved.') => {
      setBusy(true);
      setError('');
      setOk('');
      try {
        const result = await fn();
        setOk(successMessage);
        return result;
      } catch (err) {
        if (err.status === 401) onExpired?.();
        else setError(err.details?.[0]?.message || err.message);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [onExpired],
  );

  return { busy, error, ok, run };
}

export function Status({ error, ok }) {
  if (error) return <p role="alert" className="text-sm text-blush-deep">{error}</p>;
  if (ok) return <p role="status" className="text-sm text-gold-light">{ok}</p>;
  return null;
}
