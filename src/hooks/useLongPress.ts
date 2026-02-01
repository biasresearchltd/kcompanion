import { useRef, useCallback } from 'react';

const LONG_PRESS_DELAY = 500; // ms

/**
 * Hook that provides a factory for creating long-press handlers.
 * Use the returned `getHandlers(key, callback)` to get event handlers for each element.
 * The `key` parameter distinguishes different targets sharing the same hook instance.
 *
 * Works on both desktop (mousedown/mouseup) and mobile (touchstart/touchend).
 */
export function useLongPress() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const triggeredRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(key);
    }
  }, []);

  const getHandlers = useCallback(
    (key: string, callback: () => void) => ({
      onTouchStart: (_e: React.TouchEvent) => {
        triggeredRef.current.delete(key);
        clearTimer(key);
        timersRef.current.set(
          key,
          setTimeout(() => {
            triggeredRef.current.add(key);
            timersRef.current.delete(key);
            callback();
          }, LONG_PRESS_DELAY)
        );
      },
      onTouchEnd: (e: React.TouchEvent) => {
        clearTimer(key);
        if (triggeredRef.current.has(key)) {
          // Long press already fired - prevent click
          e.preventDefault();
          triggeredRef.current.delete(key);
        }
      },
      onTouchMove: (_e: React.TouchEvent) => {
        // Cancel long press if finger moves
        clearTimer(key);
      },
      onMouseDown: (e: React.MouseEvent) => {
        // Only left click
        if (e.button !== 0) return;
        triggeredRef.current.delete(key);
        clearTimer(key);
        timersRef.current.set(
          key,
          setTimeout(() => {
            triggeredRef.current.add(key);
            timersRef.current.delete(key);
            callback();
          }, LONG_PRESS_DELAY)
        );
      },
      onMouseUp: (_e: React.MouseEvent) => {
        clearTimer(key);
        triggeredRef.current.delete(key);
      },
      onMouseLeave: (_e: React.MouseEvent) => {
        clearTimer(key);
        triggeredRef.current.delete(key);
      },
    }),
    [clearTimer]
  );

  return getHandlers;
}
