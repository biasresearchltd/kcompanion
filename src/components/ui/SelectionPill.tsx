import { useRef, useState, useCallback, useEffect } from 'react';

interface SelectionPillProps {
  count: number;
  isActive: boolean;
  onToggle: () => void;
  onClear: () => void;
  longPressDuration?: number;
}

const DEFAULT_LONG_PRESS_DURATION = 1666;
const TAP_THRESHOLD = 200; // Only toggle if press was shorter than this (ms)
const CLEAR_TEXT_DELAY = 300; // Show "Clear" text after this duration (ms)

export function SelectionPill({
  count,
  isActive,
  onToggle,
  onClear,
  longPressDuration = DEFAULT_LONG_PRESS_DURATION,
}: SelectionPillProps) {
  const [pressProgress, setPressProgress] = useState(0);
  const [showClearText, setShowClearText] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchActiveRef = useRef(false); // Track if touch interaction is active
  const lastToggleTimeRef = useRef(0); // Debounce toggle calls

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (clearTextTimerRef.current) {
        clearTimeout(clearTextTimerRef.current);
      }
    };
  }, []);

  // Safe toggle that prevents rapid/duplicate calls
  const safeToggle = useCallback(() => {
    const now = Date.now();
    // Prevent toggle if called within 500ms of last toggle
    if (now - lastToggleTimeRef.current < 500) {
      return;
    }
    lastToggleTimeRef.current = now;
    onToggle();
  }, [onToggle]);

  const animateProgress = useCallback(() => {
    if (pressStartTimeRef.current === null) return;

    const elapsed = Date.now() - pressStartTimeRef.current;
    const progress = Math.min(elapsed / longPressDuration, 1);
    setPressProgress(progress);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    }
  }, [longPressDuration]);

  const startPress = useCallback(() => {
    if (count === 0) return;

    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = Date.now();
    setPressProgress(0);
    setShowClearText(false);

    // Start progress animation
    animationFrameRef.current = requestAnimationFrame(animateProgress);

    // Show "Clear" text after delay
    clearTextTimerRef.current = setTimeout(() => {
      setShowClearText(true);
      clearTextTimerRef.current = null;
    }, CLEAR_TEXT_DELAY);

    // Set up long press timer
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Reset all state immediately when long press completes
      setPressProgress(0);
      setShowClearText(false);
      pressStartTimeRef.current = null;
      longPressTimerRef.current = null;
      // Reset touch flag immediately so subsequent touches work
      touchActiveRef.current = false;
      // Call onClear after resetting state
      onClear();
    }, longPressDuration);
  }, [count, longPressDuration, onClear, animateProgress]);

  const endPress = useCallback(() => {
    // CRITICAL: If no press was ever started, do absolutely nothing
    if (pressStartTimeRef.current === null) {
      return;
    }

    // Calculate press duration - we know pressStartTimeRef.current is not null here
    const pressDuration = Date.now() - pressStartTimeRef.current;
    const wasQuickTap = pressDuration < TAP_THRESHOLD;

    // Cancel animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Cancel clear text timer
    if (clearTextTimerRef.current) {
      clearTimeout(clearTextTimerRef.current);
      clearTextTimerRef.current = null;
    }

    // Cancel long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Reset progress
    setPressProgress(0);
    setShowClearText(false);
    pressStartTimeRef.current = null;

    // Only toggle if it was a quick tap and long press didn't trigger
    if (!longPressTriggeredRef.current && count > 0 && wasQuickTap) {
      safeToggle();
    }

    longPressTriggeredRef.current = false;
  }, [count, safeToggle]);

  // Mouse handlers for desktop - SKIP if touch is active (mobile)
  const handleMouseDown = useCallback(() => {
    // Skip mouse events on touch devices - touch handlers handle everything
    if (touchActiveRef.current) {
      return;
    }
    startPress();
  }, [startPress]);

  const handleMouseUp = useCallback(() => {
    // Skip mouse events on touch devices - touch handlers handle everything
    if (touchActiveRef.current) {
      return;
    }
    endPress();
  }, [endPress]);

  const handleMouseLeave = useCallback(() => {
    // Cancel if mouse leaves while pressing
    if (pressStartTimeRef.current !== null) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (clearTextTimerRef.current) {
        clearTimeout(clearTextTimerRef.current);
        clearTextTimerRef.current = null;
      }
      setPressProgress(0);
      setShowClearText(false);
      pressStartTimeRef.current = null;
      longPressTriggeredRef.current = false;
    }
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent mouse event synthesis on mobile
    touchActiveRef.current = true;
    startPress();
  }, [startPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // If long press already triggered (clear action), just reset and return
    // The long press timer already handled everything
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      touchActiveRef.current = false;
      return;
    }

    // CRITICAL: If no press was ever started, do absolutely nothing
    // This prevents false "quick tap" detection when pressStartTimeRef is null
    if (pressStartTimeRef.current === null) {
      touchActiveRef.current = false;
      return;
    }

    // Calculate press duration - we know pressStartTimeRef.current is not null here
    const pressDuration = Date.now() - pressStartTimeRef.current;
    const wasQuickTap = pressDuration < TAP_THRESHOLD;

    // Cancel animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Cancel clear text timer
    if (clearTextTimerRef.current) {
      clearTimeout(clearTextTimerRef.current);
      clearTextTimerRef.current = null;
    }

    // Cancel long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Reset progress and refs BEFORE any toggle logic
    setPressProgress(0);
    setShowClearText(false);
    pressStartTimeRef.current = null;

    // Only toggle if ALL conditions are met:
    // 1. Long press didn't complete (clear action)
    // 2. There are items selected
    // 3. It was a genuine quick tap (< 200ms)
    if (count > 0 && wasQuickTap) {
      safeToggle();
    }

    // Reset touch flag immediately
    touchActiveRef.current = false;
  }, [count, safeToggle]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (clearTextTimerRef.current) {
      clearTimeout(clearTextTimerRef.current);
      clearTextTimerRef.current = null;
    }
    setPressProgress(0);
    setShowClearText(false);
    pressStartTimeRef.current = null;
    longPressTriggeredRef.current = false;
    touchActiveRef.current = false;
  }, []);

  // Block ALL clicks - we handle interaction through touch/mouse down/up only
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Never do anything on click - all logic is in touchEnd/mouseUp
  }, []);

  const baseClasses = 'text-sm px-3 py-1 rounded-full whitespace-nowrap select-none relative overflow-hidden';

  if (count === 0) {
    return (
      <span className={`${baseClasses} bg-gray-100 text-[var(--color-text-muted)]`}>
        {count} selected
      </span>
    );
  }

  // When showing "Clear" text, always use grey/inactive background
  const bgClass = showClearText
    ? 'bg-gray-100 text-[var(--color-text-muted)]'
    : isActive
      ? 'bg-[var(--color-secondary)] text-white'
      : 'bg-gray-100 text-[var(--color-text-muted)] hover:bg-gray-200';

  const noSelectStyle = {
    WebkitTouchCallout: 'none' as const,
    WebkitUserSelect: 'none' as const,
    userSelect: 'none' as const,
    touchAction: 'manipulation' as const,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${baseClasses} cursor-pointer ${bgClass}`}
      style={noSelectStyle}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={handleClick}
    >
      {/* Red progress overlay */}
      {pressProgress > 0 && (
        <span
          className="absolute inset-0 bg-red-500 rounded-full"
          style={{
            width: `${pressProgress * 100}%`,
            transition: 'none',
            ...noSelectStyle,
          }}
        />
      )}
      {/* Invisible text to maintain width */}
      <span className="invisible" style={noSelectStyle}>{count} selected</span>
      {/* Visible text centered absolutely */}
      <span className="absolute inset-0 flex items-center justify-center z-10" style={noSelectStyle}>
        {showClearText ? 'Clear' : `${count} selected`}
      </span>
    </div>
  );
}
