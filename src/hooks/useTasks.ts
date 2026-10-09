import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeToTaskChanges } from '@/src/services/taskService';

interface QueryState<T> {
  data: T | null;
  error: boolean;
  reload: () => void;
}

/**
 * Runs a screen's query when the screen gains focus, when the app returns to the
 * foreground (the day may have changed), whenever a task changes, and when `load`
 * itself changes (pass a stable or memoized function).
 */
export function useTaskQuery<T>(load: () => Promise<T>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const loadRef = useRef(load);
  const focused = useRef(false);
  const firstLoad = useRef(true);

  useLayoutEffect(() => {
    loadRef.current = load;
  }, [load]);

  const latest = useRef(0);

  const reload = useCallback(() => {
    // Ignore results from an older request that finishes after a newer one.
    const request = ++latest.current;
    loadRef
      .current()
      .then((d) => {
        if (request !== latest.current) return;
        setData(d);
        setError(false);
      })
      .catch(() => {
        if (request === latest.current) setError(true);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      reload();
      return () => {
        focused.current = false;
      };
    }, [reload]),
  );

  // The focus effect covers the first load; after that, a new `load` means new inputs.
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    reload();
  }, [load, reload]);

  useEffect(() => {
    const unsubscribe = subscribeToTaskChanges(reload);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && focused.current) reload();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [reload]);

  return { data, error, reload };
}

/** The current time, refreshed every minute so greetings and "Overdue" labels stay correct. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}
