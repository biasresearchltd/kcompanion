import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to handle animated show/hide with proper mount/unmount timing.
 * Returns visibility state and animation state for CSS classes.
 */
export function useAnimatedVisibility(
  isOpen: boolean,
  animationDuration: number = 200
): {
  shouldRender: boolean;
  isAnimatingOut: boolean;
  close: () => void;
} {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening: render immediately
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      // Closing: start animation, then unmount after duration
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender, animationDuration]);

  const close = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShouldRender(false);
      setIsAnimatingOut(false);
    }, animationDuration);
  }, [animationDuration]);

  return { shouldRender, isAnimatingOut, close };
}
