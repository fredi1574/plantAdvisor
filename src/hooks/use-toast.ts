import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ShowToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

/**
 * Manages transient feedback banner state with optional action button (e.g. Undo)
 * and automatic timer cleanup on unmount or when replaced.
 */
export function useToast(durationMs = 3500) {
  const [message, setMessage] = useState<string | null>(null);
  const [action, setAction] = useState<ToastAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
    setAction(null);
  }, []);

  const showToast = useCallback(
    (nextMessage: string, options?: ShowToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      const nextAction = options?.action ?? null;
      const effectiveDuration =
        options?.durationMs ?? (nextAction ? Math.max(durationMs, 5500) : durationMs);

      setMessage(nextMessage);
      setAction(nextAction);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        setAction(null);
        timerRef.current = null;
      }, effectiveDuration);
    },
    [durationMs]
  );

  return { message, action, showToast, dismissToast };
}
