import { useCallback, useRef } from 'react';
import { logEvents } from '../api';

interface EventItem {
  event_type: string;
  page?: string;
  data?: Record<string, unknown>;
  client_timestamp?: string;
}

export function useEventLogger() {
  const buffer = useRef<EventItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;
    const events = [...buffer.current];
    buffer.current = [];
    try {
      await logEvents(events);
    } catch {
      // re-add to buffer on failure
      buffer.current = [...events, ...buffer.current];
    }
  }, []);

  const log = useCallback(
    (type: string, page?: string, data?: Record<string, unknown>) => {
      buffer.current.push({
        event_type: type,
        page,
        data,
        client_timestamp: new Date().toISOString(),
      });

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 3000);

      if (buffer.current.length >= 10) {
        flush();
      }
    },
    [flush]
  );

  return { log, flush };
}
