import { useRef, useState, useCallback, useEffect } from 'react';

interface FocusToggleButtonProps {
  isOpen: boolean;
  activeCount: number;
  onToggle: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const LONG_PRESS_DURATION = 1000;
const TAP_THRESHOLD = 200;
const CLEAR_TEXT_DELAY = 300;

export function FocusToggleButton({
  isOpen,
  activeCount,
  onToggle,
  onClear,
  disabled = false,
}: FocusToggleButtonProps) {
  const [pressProgress, setPressProgress] = useState(0);
  const [showClearText, setShowClearText] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (clearTextTimerRef.current) clearTimeout(clearTextTimerRef.current);
    };
  }, []);

  const animateProgress = useCallback(() => {
    if (pressStartTimeRef.current === null) return;
    const elapsed = Date.now() - pressStartTimeRef.current;
    const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
    setPressProgress(progress);
    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    }
  }, []);

  const startPress = useCallback(() => {
    if (disabled || activeCount === 0) return;

    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = Date.now();
    setPressProgress(0);
    setShowClearText(false);

    animationFrameRef.current = requestAnimationFrame(animateProgress);

    clearTextTimerRef.current = setTimeout(() => {
      setShowClearText(true);
    }, CLEAR_TEXT_DELAY);

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setPressProgress(0);
      setShowClearText(false);
      pressStartTimeRef.current = null;
      touchActiveRef.current = false;
      onClear();
    }, LONG_PRESS_DURATION);
  }, [disabled, activeCount, onClear, animateProgress]);

  const cancelPress = useCallback(() => {
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
  }, []);

  const endPress = useCallback((wasTouch: boolean) => {
    if (pressStartTimeRef.current === null) {
      if (wasTouch) touchActiveRef.current = false;
      return;
    }

    const pressDuration = Date.now() - pressStartTimeRef.current;
    const wasQuickTap = pressDuration < TAP_THRESHOLD;

    cancelPress();

    if (!longPressTriggeredRef.current && wasQuickTap) {
      onToggle();
    }

    longPressTriggeredRef.current = false;
    if (wasTouch) touchActiveRef.current = false;
  }, [cancelPress, onToggle]);

  const handleMouseDown = useCallback(() => {
    if (touchActiveRef.current) return;
    startPress();
  }, [startPress]);

  const handleMouseUp = useCallback(() => {
    if (touchActiveRef.current) return;
    endPress(false);
  }, [endPress]);

  const handleMouseLeave = useCallback(() => {
    if (pressStartTimeRef.current !== null) {
      cancelPress();
      longPressTriggeredRef.current = false;
    }
  }, [cancelPress]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    touchActiveRef.current = true;
    startPress();
  }, [startPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      touchActiveRef.current = false;
      return;
    }
    endPress(true);
  }, [endPress]);

  const handleTouchCancel = useCallback(() => {
    cancelPress();
    longPressTriggeredRef.current = false;
    touchActiveRef.current = false;
  }, [cancelPress]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const isHighlighted = isOpen || activeCount > 0;
  const canLongPress = activeCount > 0;

  const noSelectStyle = {
    WebkitTouchCallout: 'none' as const,
    WebkitUserSelect: 'none' as const,
    userSelect: 'none' as const,
    touchAction: 'manipulation' as const,
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`relative px-3 py-1.5 text-sm rounded-full border transition-colors select-none overflow-hidden
                 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                 ${showClearText
                   ? 'bg-gray-100 border-gray-200 text-[var(--color-text-muted)]'
                   : isHighlighted
                     ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                     : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
                 }`}
      style={noSelectStyle}
      onMouseDown={canLongPress ? handleMouseDown : undefined}
      onMouseUp={canLongPress ? handleMouseUp : undefined}
      onMouseLeave={canLongPress ? handleMouseLeave : undefined}
      onTouchStart={canLongPress ? handleTouchStart : undefined}
      onTouchEnd={canLongPress ? handleTouchEnd : undefined}
      onTouchCancel={canLongPress ? handleTouchCancel : undefined}
      onClick={canLongPress ? handleClick : onToggle}
    >
      {/* Red progress overlay for long press */}
      {pressProgress > 0 && (
        <span
          className="absolute inset-0 bg-red-500 rounded-full"
          style={{ width: `${pressProgress * 100}%`, transition: 'none' }}
        />
      )}
      {/* Text - use relative positioning to maintain consistent width */}
      <span className="relative z-10 flex items-center gap-1">
        {/* Icon - X when clearing, Eye otherwise */}
        {showClearText ? (
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )}
        {/* Text with invisible spacer to maintain width */}
        <span className="relative">
          {/* Invisible text to reserve space for the longest label */}
          <span className="invisible">{`Focus${activeCount > 0 ? ` (${activeCount})` : ''}`}</span>
          {/* Visible text positioned on top */}
          <span className="absolute inset-0 flex items-center justify-center">
            {showClearText ? 'Clear' : `Focus${activeCount > 0 ? ` (${activeCount})` : ''}`}
          </span>
        </span>
      </span>
    </div>
  );
}
