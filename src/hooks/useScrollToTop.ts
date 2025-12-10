import { useRef, useCallback } from 'react';

export interface ScrollToTopHandle {
  scrollToTop: () => void;
  scrollToFilters?: () => void;
  hideFilters?: () => void;
  toggleFilters?: () => void;
}

export function useScrollToTop() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  return { scrollRef, scrollToTop };
}
