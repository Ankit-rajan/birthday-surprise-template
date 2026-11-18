import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useContent() {
  const [state, setState] = useState({ status: 'loading', data: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .content()
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
