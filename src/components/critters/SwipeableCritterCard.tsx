import { useRef, useState, useCallback } from 'react';
import type { Critter, CritterCategories } from '../../types';
import { CritterCard } from './CritterCard';
import { useCaughtCritterStore } from '../../store/caughtCritterStore';

interface SwipeableCritterCardProps {
  critter: Critter;
  critterCategories: CritterCategories;
  index?: number;
}

const SWIPE_THRESHOLD = 60;

export function SwipeableCritterCard(props: SwipeableCritterCardProps) {
  const { critter } = props;

  const { caughtCritters, toggleCaught } = useCaughtCritterStore();
  const isCaught = caughtCritters.includes(critter.id);

  const cardRef = useRef<HTMLDivElement>(null);
  const caughtIconRef = useRef<HTMLDivElement>(null);
  const caughtFillRef = useRef<SVGSVGElement>(null);
  const currentTranslateRef = useRef(0);

  const [isAnimating, setIsAnimating] = useState(false);
  const [showCaughtFillAnimation, setShowCaughtFillAnimation] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  const updatePosition = useCallback((translateX: number) => {
    currentTranslateRef.current = translateX;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${translateX}px)`;
    }

    const absTranslate = Math.abs(translateX);
    const rawProgress = Math.min(absTranslate / SWIPE_THRESHOLD, 1);
    const animProgress = Math.max(0, (rawProgress - 0.5) / 0.5);

    if (translateX < 0) {
      if (caughtIconRef.current) {
        const opacity = Math.min(absTranslate / SWIPE_THRESHOLD, 1);
        const scale = 0.5 + (opacity * 0.5);
        caughtIconRef.current.style.opacity = String(opacity);
        caughtIconRef.current.style.transform = `scale(${scale})`;
      }

      if (caughtFillRef.current) {
        if (isCaught) {
          const topInset = animProgress * 100;
          caughtFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        } else {
          const topInset = 100 - (animProgress * 100);
          caughtFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        }
      }
    } else {
      if (caughtIconRef.current) {
        caughtIconRef.current.style.opacity = '0';
      }
    }
  }, [isCaught]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    hasTriggeredRef.current = false;

    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (!isSwipingRef.current && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStartXRef.current = null;
        return;
      }
      isSwipingRef.current = true;
    }

    if (!isSwipingRef.current) return;

    if (deltaX > 0) {
      updatePosition(0);
      return;
    }

    const absDelta = Math.abs(deltaX);
    const cappedAbsDelta = absDelta > SWIPE_THRESHOLD
      ? SWIPE_THRESHOLD + (absDelta - SWIPE_THRESHOLD) * 0.3
      : absDelta;

    updatePosition(-cappedAbsDelta);
  }, [isAnimating, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartXRef.current === null || isAnimating) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const translateX = currentTranslateRef.current;
    const absTranslate = Math.abs(translateX);

    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 200ms ease-out';
    }

    if (absTranslate >= SWIPE_THRESHOLD && translateX < 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setShowCaughtFillAnimation(true);
      toggleCaught(critter.id);

      setIsAnimating(true);
      setTimeout(() => {
        updatePosition(0);
        setTimeout(() => {
          setIsAnimating(false);
          setShowCaughtFillAnimation(false);
        }, 200);
      }, 150);
    } else {
      setIsAnimating(true);
      updatePosition(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, 200);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingRef.current = false;
  }, [isAnimating, toggleCaught, critter.id, updatePosition]);

  const handleTouchCancel = useCallback(() => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingRef.current = false;

    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 200ms ease-out';
    }
    setIsAnimating(true);
    updatePosition(0);
    setTimeout(() => {
      setIsAnimating(false);
    }, 200);
  }, [updatePosition]);

  return (
    <div className="relative overflow-hidden">
      {/* Caught icon container */}
      <div
        ref={caughtIconRef}
        className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center"
        style={{ opacity: 0, transform: 'scale(0.5)', transition: 'none' }}
      >
        <div className={showCaughtFillAnimation ? 'scale-125' : ''} style={{ transition: 'none' }}>
          <div className="relative w-8 h-8">
            <svg
              ref={caughtFillRef}
              className="absolute inset-0 w-8 h-8 text-green-500 fill-green-500"
              style={{
                transition: 'none',
                clipPath: isCaught ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)'
              }}
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className="absolute inset-0 w-8 h-8 text-gray-400"
              style={{ transition: 'none' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Swipeable card container */}
      <div
        ref={cardRef}
        className="relative"
        style={{ transform: 'translateX(0)', willChange: 'transform', transition: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <CritterCard {...props} />
      </div>
    </div>
  );
}
