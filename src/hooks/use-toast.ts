import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages transient feedback banner state with automatic timer cleanup on
 * unmount or when a new toast replaces an active one.
 */
export function useToast(durationMs = 3500) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (nextMessage: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setMessage(nextMessage);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  return { message, showToast };
}
