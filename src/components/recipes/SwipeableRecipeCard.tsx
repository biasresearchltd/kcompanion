import { useRef, useState, useCallback } from 'react';
import type { MatchResult, Ingredient, Effect, Character, GiftToCharacters } from '../../types';
import { RecipeCard } from './RecipeCard';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useOwnedRecipesStore } from '../../store/ownedRecipesStore';

interface SwipeableRecipeCardProps {
  match: MatchResult;
  ingredientMap: Map<string, Ingredient>;
  effectMap: Map<string, Effect>;
  characterMap: Map<string, Character>;
  giftToCharacters: GiftToCharacters;
  selectedIngredients: string[];
  committedIngredients?: string[];
  focusedIngredients?: string[];
  index?: number;
}

const SWIPE_THRESHOLD = 60;

export function SwipeableRecipeCard(props: SwipeableRecipeCardProps) {
  const { match } = props;
  const recipeId = match.recipe.id;

  // Bookmark store
  const { bookmarkedRecipes, toggleBookmark } = useBookmarkStore();
  const isBookmarked = bookmarkedRecipes.includes(recipeId);

  // Owned store
  const { ownedRecipes, toggleOwned } = useOwnedRecipesStore();
  const isOwned = ownedRecipes.includes(recipeId);

  // Use refs for real-time DOM manipulation (no re-renders during swipe)
  const cardRef = useRef<HTMLDivElement>(null);
  const bookmarkIconRef = useRef<HTMLDivElement>(null);
  const bookmarkFillRef = useRef<SVGSVGElement>(null);
  const ownedIconRef = useRef<HTMLDivElement>(null);
  const ownedFillRef = useRef<SVGSVGElement>(null);
  const currentTranslateRef = useRef(0);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [showBookmarkFillAnimation, setShowBookmarkFillAnimation] = useState(false);
  const [showOwnedFillAnimation, setShowOwnedFillAnimation] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  // Direct DOM update for smooth 60fps animation
  const updatePosition = useCallback((translateX: number) => {
    currentTranslateRef.current = translateX;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${translateX}px)`;
    }

    const absTranslate = Math.abs(translateX);
    const rawProgress = Math.min(absTranslate / SWIPE_THRESHOLD, 1);
    const animProgress = Math.max(0, (rawProgress - 0.5) / 0.5);

    if (translateX > 0) {
      // Swiping RIGHT - Bookmark
      swipeDirectionRef.current = 'right';

      // Update bookmark icon
      if (bookmarkIconRef.current) {
        const opacity = Math.min(translateX / SWIPE_THRESHOLD, 1);
        const scale = 0.5 + (opacity * 0.5);
        bookmarkIconRef.current.style.opacity = String(opacity);
        bookmarkIconRef.current.style.transform = `scale(${scale})`;
      }
      // Hide owned icon
      if (ownedIconRef.current) {
        ownedIconRef.current.style.opacity = '0';
      }

      // Update bookmark fill clip-path
      if (bookmarkFillRef.current) {
        if (isBookmarked) {
          const topInset = animProgress * 100;
          bookmarkFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        } else {
          const topInset = 100 - (animProgress * 100);
          bookmarkFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        }
      }
    } else if (translateX < 0) {
      // Swiping LEFT - Owned
      swipeDirectionRef.current = 'left';

      // Update owned icon
      if (ownedIconRef.current) {
        const opacity = Math.min(absTranslate / SWIPE_THRESHOLD, 1);
        const scale = 0.5 + (opacity * 0.5);
        ownedIconRef.current.style.opacity = String(opacity);
        ownedIconRef.current.style.transform = `scale(${scale})`;
      }
      // Hide bookmark icon
      if (bookmarkIconRef.current) {
        bookmarkIconRef.current.style.opacity = '0';
      }

      // Update owned fill clip-path
      if (ownedFillRef.current) {
        if (isOwned) {
          const topInset = animProgress * 100;
          ownedFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        } else {
          const topInset = 100 - (animProgress * 100);
          ownedFillRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`;
        }
      }
    } else {
      // Reset both icons
      swipeDirectionRef.current = null;
      if (bookmarkIconRef.current) {
        bookmarkIconRef.current.style.opacity = '0';
      }
      if (ownedIconRef.current) {
        ownedIconRef.current.style.opacity = '0';
      }
    }
  }, [isBookmarked, isOwned]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    hasTriggeredRef.current = false;
    swipeDirectionRef.current = null;

    // Remove transition during drag for immediate response
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

    // Determine if this is a horizontal swipe (only on first significant movement)
    if (!isSwipingRef.current && Math.abs(deltaX) > 10) {
      // If vertical movement is greater, don't capture as swipe
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStartXRef.current = null;
        return;
      }
      isSwipingRef.current = true;
    }

    if (!isSwipingRef.current) return;

    // Apply resistance after threshold for both directions
    const absDelta = Math.abs(deltaX);
    const cappedAbsDelta = absDelta > SWIPE_THRESHOLD
      ? SWIPE_THRESHOLD + (absDelta - SWIPE_THRESHOLD) * 0.3
      : absDelta;

    const cappedDelta = deltaX > 0 ? cappedAbsDelta : -cappedAbsDelta;
    updatePosition(cappedDelta);
  }, [isAnimating, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartXRef.current === null || isAnimating) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const translateX = currentTranslateRef.current;
    const absTranslate = Math.abs(translateX);

    // Re-enable transition for snap-back animation
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 200ms ease-out';
    }

    // If swiped past threshold, trigger action
    if (absTranslate >= SWIPE_THRESHOLD && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      if (translateX > 0) {
        // Swiped RIGHT - toggle bookmark
        setShowBookmarkFillAnimation(true);
        toggleBookmark(recipeId);
      } else {
        // Swiped LEFT - toggle owned
        setShowOwnedFillAnimation(true);
        toggleOwned(recipeId);
      }

      // Animate back to center after a short delay
      setIsAnimating(true);
      setTimeout(() => {
        updatePosition(0);
        setTimeout(() => {
          setIsAnimating(false);
          setShowBookmarkFillAnimation(false);
          setShowOwnedFillAnimation(false);
        }, 200);
      }, 150);
    } else {
      // Animate back to center
      setIsAnimating(true);
      updatePosition(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, 200);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingRef.current = false;
  }, [isAnimating, toggleBookmark, toggleOwned, recipeId, updatePosition]);

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
      {/* Bookmark icon container - positioned on the LEFT (swipe right reveals) */}
      <div
        ref={bookmarkIconRef}
        className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center"
        style={{ opacity: 0, transform: 'scale(0.5)', transition: 'none' }}
      >
        <div className={showBookmarkFillAnimation ? 'scale-125' : ''} style={{ transition: 'none' }}>
          {/* Layered bookmark icons for fill effect */}
          <div className="relative w-8 h-8">
            {/* Bottom layer: red fill with clip-path animation */}
            <svg
              ref={bookmarkFillRef}
              className="absolute inset-0 w-8 h-8 text-red-500 fill-red-500"
              style={{
                transition: 'none',
                clipPath: isBookmarked ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)'
              }}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {/* Outline icon (gray) - always present as base layer */}
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Owned icon container - positioned on the RIGHT (swipe left reveals) */}
      <div
        ref={ownedIconRef}
        className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center"
        style={{ opacity: 0, transform: 'scale(0.5)', transition: 'none' }}
      >
        <div className={showOwnedFillAnimation ? 'scale-125' : ''} style={{ transition: 'none' }}>
          {/* Layered checkmark icons for fill effect */}
          <div className="relative w-8 h-8">
            {/* Bottom layer: green fill with clip-path animation */}
            <svg
              ref={ownedFillRef}
              className="absolute inset-0 w-8 h-8 text-green-500 fill-green-500"
              style={{
                transition: 'none',
                clipPath: isOwned ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)'
              }}
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
            {/* Outline icon (gray) - always present as base layer */}
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
        <RecipeCard {...props} />
      </div>
    </div>
  );
}
