import { useState, useRef, useEffect, useCallback } from 'react';
import type { MatchResult, Ingredient, Effect, Character, GiftToCharacters } from '../../types';
import { Badge } from '../ui/Badge';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useOwnedRecipesStore } from '../../store/ownedRecipesStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useLongPress } from '../../hooks/useLongPress';

// === DEV ITERATION FLAGS ===
// Toggle these to test different slot display modes
const SHOW_EMPTY_SLOTS = true;      // true = always 4 slots, false = only used slots
const SHOW_SLOT_NUMBERS = false;    // true = show 1,2,3,4 indicators on slot frames
const USE_SLOT_FRAMES = true;       // true = game-like frames, false = current style
const VERTICAL_ALTERNATIVES = true; // true = alternatives as pills below slots, false = inline
// ===========================

// SlotFrame component - container for ingredient slots
interface SlotFrameProps {
  isEmpty: boolean;
  slotNumber?: number;
  showNumber: boolean;
  borderClass?: string;
  children: React.ReactNode;
}

function SlotFrame({ isEmpty, slotNumber, showNumber, borderClass = '', children }: SlotFrameProps) {
  return (
    <div className={`
      relative rounded-2xl w-[72px] h-[88px] mobile-lg:w-[76px] mobile-lg:h-[92px] tablet:w-[80px] tablet:h-[96px] p-1 pb-1.5 mobile-lg:p-1.5 mobile-lg:pb-2 tablet:p-2 tablet:pb-2.5
      ${isEmpty
        ? 'bg-gray-200/50'
        : `bg-white/80 border ${borderClass}`
      }
      flex flex-col items-center justify-start
    `}>
      {showNumber && slotNumber !== undefined && (
        <span className="absolute -top-2 -left-1 text-[10px] font-bold text-gray-400 bg-white px-0.5 rounded">
          {slotNumber}
        </span>
      )}
      {children}
    </div>
  );
}

// Adapt ingredient pill with marquee effect for long names
interface AdaptPillProps {
  name: string;
  icon: string;
  isMatched: boolean;
  isFocused?: boolean;
  pressHandlers?: Record<string, (e: never) => void>;
}

function AdaptPill({ name, icon, isMatched, isFocused = false, pressHandlers }: AdaptPillProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [marqueeDistance, setMarqueeDistance] = useState(0);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const scrollW = textRef.current.scrollWidth;
        const clientW = textRef.current.clientWidth;
        const truncated = scrollW > clientW;
        setIsTruncated(truncated);
        if (truncated) {
          setMarqueeDistance(-(scrollW - clientW + 4));
        }
      }
    };
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [name]);

  // Determine styling based on state
  const getStyle = () => {
    if (isFocused) {
      return 'bg-amber-100 text-amber-700 ring-2 ring-amber-400';
    }
    if (isMatched) {
      return 'bg-green-100 text-green-700 ring-1 ring-green-300';
    }
    return 'bg-gray-100 text-gray-500 ring-1 ring-gray-300';
  };

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] ${getStyle()} ${pressHandlers ? 'cursor-pointer select-none' : ''}`}
      style={pressHandlers ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
      onContextMenu={pressHandlers ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      {...pressHandlers}
    >
      <img
        src={icon}
        alt={name}
        className={`w-4 h-4 object-contain flex-shrink-0 pointer-events-none ${!isMatched && !isFocused ? 'opacity-50' : ''}`}
        draggable={false}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/images/placeholder.svg';
        }}
      />
      <div className="marquee-container max-w-[80px]">
        <span
          ref={textRef}
          className={`marquee-text ${isTruncated ? 'is-truncated' : ''}`}
          style={{ '--marquee-distance': `${marqueeDistance}px` } as React.CSSProperties}
        >
          {name}
        </span>
      </div>
    </div>
  );
}

interface RecipeCardProps {
  match: MatchResult;
  ingredientMap: Map<string, Ingredient>;
  effectMap: Map<string, Effect>;
  characterMap: Map<string, Character>;
  giftToCharacters: GiftToCharacters;
  selectedIngredients: string[];
  focusedIngredients?: string[];
  index?: number;
}

interface CharacterGiftInfo {
  character: Character;
  giftType: 'favorite' | 'loved';
}

const UTENSIL_LABELS: Record<string, string> = {
  none: 'No Utensil',
  pot: 'Pot',
  frying_pan: 'Frying Pan',
  seasoning_set: 'Seasoning Set',
};

const CATEGORY_LABELS: Record<string, string> = {
  salad: 'Salad',
  soup: 'Soup',
  side: 'Side',
  main_dish: 'Main',
  dessert: 'Dessert',
  other: 'Other',
};

// Format ingredient ID to display name, converting _plus suffix to + symbol
function formatIngredientName(id: string): string {
  if (id.endsWith('_plus')) {
    const baseName = id.slice(0, -5).replace(/_/g, ' ');
    return baseName.replace(/\b\w/g, c => c.toUpperCase()) + ' +';
  }
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function RecipeCard({ match, ingredientMap, effectMap, characterMap, giftToCharacters, selectedIngredients, focusedIngredients = [], index = 0 }: RecipeCardProps) {
  const { recipe, matchType, missingIngredients, matchedIngredients, processedIngredients } = match;
  const effect = recipe.effect ? effectMap.get(recipe.effect) : null;
  const { bookmarkedRecipes, toggleBookmark } = useBookmarkStore();
  const isBookmarked = bookmarkedRecipes.includes(recipe.id);
  const { ownedRecipes, toggleOwned } = useOwnedRecipesStore();
  const isOwned = ownedRecipes.includes(recipe.id);
  const { toggleIngredient } = useInventoryStore();
  const getLongPressHandlers = useLongPress();

  // Track which ingredient just flashed for visual feedback
  const [flashIngredient, setFlashIngredient] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIngredientLongPress = useCallback((ingredientId: string) => {
    toggleIngredient(ingredientId);
    // Visual feedback
    setFlashIngredient(ingredientId);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashIngredient(null), 400);
  }, [toggleIngredient]);

  // Hover state for showing action buttons on desktop
  const [isHovered, setIsHovered] = useState(false);
  // 2-column grid, so calculate row for alternating colors
  const row = Math.floor(index / 2);
  const isEvenRow = row % 2 === 0;

  // Create a set for quick lookup of processed ingredients
  const processedSet = new Set(processedIngredients || []);

  const getIngredient = (id: string): Ingredient | undefined => {
    return ingredientMap.get(id);
  };

  // Create a Set for quick lookup of selected ingredients
  const selectedSet = new Set(selectedIngredients);

  // Create a Set for quick lookup of focused ingredients
  const focusedSet = new Set(focusedIngredients);

  // Slot-based rendering: each slot is an ingredient position with optional alternatives
  interface IngredientOption {
    id: string;
    isMatched: boolean;
    needsProcessing: boolean;
  }

  interface IngredientSlot {
    primary: IngredientOption;
    alternatives: IngredientOption[];
    overflowAlternatives?: IngredientOption[];
    focusedOverflowAlternatives?: IngredientOption[]; // Focused ingredients that are in overflow
    count: number;
    isEmpty?: boolean; // True for empty placeholder slots
  }

  // Maximum alternatives to show inline - 10 is max in game
  const MAX_INLINE_ALTERNATIVES = 10;

  const buildRecipeSlots = (): IngredientSlot[] => {
    const slots: IngredientSlot[] = [];

    for (const ing of recipe.ingredients) {
      if (ing.oneOf && ing.oneOf.length > 0) {
        // oneOf group - show primary with inline alternatives
        const count = ing.count || 1;

        // Find which options are available (matched or can be processed)
        const availableOptions = ing.oneOf.filter(id => selectedSet.has(id) || processedSet.has(id));

        // Determine primary: first available option, or first option as fallback (missing)
        const primaryId = availableOptions.length > 0 ? availableOptions[0] : ing.oneOf[0];
        const primary: IngredientOption = {
          id: primaryId,
          isMatched: selectedSet.has(primaryId) || processedSet.has(primaryId),
          needsProcessing: processedSet.has(primaryId),
        };

        // All other options become alternatives (show all options from oneOf)
        const allAlternatives: IngredientOption[] = ing.oneOf
          .filter(id => id !== primaryId)
          .map(id => ({
            id,
            isMatched: selectedSet.has(id) || processedSet.has(id),
            needsProcessing: processedSet.has(id),
          }));

        // Only show inline alternatives if there are few enough
        const inlineAlternatives = allAlternatives.length <= MAX_INLINE_ALTERNATIVES ? allAlternatives : [];
        const overflowAlternatives = allAlternatives.length > MAX_INLINE_ALTERNATIVES ? allAlternatives : [];

        // Find focused ingredients in overflow that aren't already the primary
        const focusedOverflowAlternatives = overflowAlternatives.filter(alt =>
          focusedSet.has(alt.id) && alt.id !== primaryId
        );

        slots.push({
          primary,
          alternatives: inlineAlternatives,
          overflowAlternatives,
          focusedOverflowAlternatives,
          count
        });
      } else if (ing.id && ing.id !== 'choice') {
        // Fixed ingredient - no alternatives
        const count = ing.count || 1;
        const isMatched = matchedIngredients.includes(ing.id) || selectedSet.has(ing.id);

        slots.push({
          primary: {
            id: ing.id,
            isMatched,
            needsProcessing: processedSet.has(ing.id),
          },
          alternatives: [],
          overflowAlternatives: [],
          count,
          isEmpty: false,
        });
      }
    }

    // Pad to 4 slots if SHOW_EMPTY_SLOTS is enabled (game constraint: always 4 main ingredient slots)
    if (SHOW_EMPTY_SLOTS) {
      while (slots.length < 4) {
        slots.push({
          primary: { id: '', isMatched: false, needsProcessing: false },
          alternatives: [],
          overflowAlternatives: [],
          count: 0,
          isEmpty: true,
        });
      }
    }

    return slots;
  };

  const recipeSlots = buildRecipeSlots();

  // Get characters who love this recipe as a gift
  const getCharactersForRecipe = (): CharacterGiftInfo[] => {
    const recipeId = recipe.id;
    const giftInfo = giftToCharacters[recipeId];
    if (!giftInfo) return [];

    const characters: CharacterGiftInfo[] = [];

    // Add favorites first (gold border)
    for (const charId of giftInfo.favorite || []) {
      const character = characterMap.get(charId);
      if (character) {
        characters.push({ character, giftType: 'favorite' });
      }
    }

    // Add loved (green border)
    for (const charId of giftInfo.loved || []) {
      const character = characterMap.get(charId);
      if (character) {
        characters.push({ character, giftType: 'loved' });
      }
    }

    return characters;
  };

  const characterGifts = getCharactersForRecipe();

  // State for mobile tap tooltip
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleCharacterTap = (characterId: string) => {
    // Toggle tooltip - if same character tapped, close it; otherwise show new one
    setActiveTooltip(prev => prev === characterId ? null : characterId);
  };

  // Get background and border style based on match type and missing count
  const getCardStyle = () => {
    if (matchType === 'exact') return 'border-green-200 bg-green-50';
    if (matchType === 'needs_processing') return 'border-blue-200 bg-blue-50';
    // Partial matches - color by missing count
    const missingCount = missingIngredients.length;
    if (missingCount === 1) return 'border-yellow-200 bg-yellow-50';
    if (missingCount === 2) return 'border-orange-200 bg-orange-50';
    if (missingCount >= 3) return 'border-red-200 bg-red-50';
    return isEvenRow ? 'bg-white border-[var(--color-border)]' : 'bg-stone-100 border-[var(--color-border)]';
  };

  // Get divider color to match border
  const getDividerStyle = () => {
    if (matchType === 'exact') return 'border-green-200';
    if (matchType === 'needs_processing') return 'border-blue-200';
    const missingCount = missingIngredients.length;
    if (missingCount === 1) return 'border-yellow-200';
    if (missingCount === 2) return 'border-orange-200';
    if (missingCount >= 3) return 'border-red-200';
    return 'border-[var(--color-border)]';
  };

  // Get slot border style to match card/divider borders
  const getSlotBorderStyle = () => {
    if (matchType === 'exact') return 'border-green-200';
    if (matchType === 'needs_processing') return 'border-blue-200';
    const missingCount = missingIngredients.length;
    if (missingCount === 1) return 'border-yellow-200';
    if (missingCount === 2) return 'border-orange-200';
    if (missingCount >= 3) return 'border-red-200';
    return 'border-[var(--color-border)]';
  };

  // Get recipe icon container style based on match type and missing count
  const getRecipeIconStyle = () => {
    if (matchType === 'exact') return 'bg-green-100';
    if (matchType === 'needs_processing') return 'bg-blue-100';
    const missingCount = missingIngredients.length;
    if (missingCount === 1) return 'bg-yellow-100';
    if (missingCount === 2) return 'bg-orange-100';
    if (missingCount >= 3) return 'bg-red-100';
    return 'bg-amber-50';
  };

  return (
    <div
      className={`relative ${isHovered ? 'z-20' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Desktop action buttons - tab buttons that slide out from behind the card */}
      <div className={`hidden tablet:flex flex-row gap-0.5 absolute -top-9 right-4 transition-all duration-200 ease-out ${
        isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); toggleBookmark(recipe.id); }}
          className={`px-2 pt-2 pb-3 rounded-t-lg border border-b-0 transition-colors ${
            isBookmarked
              ? 'bg-red-500 text-white border-red-400 hover:bg-red-600'
              : 'bg-white text-gray-400 border-gray-300 hover:text-red-500 hover:bg-red-50 hover:border-red-400'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark recipe'}
        >
          <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleOwned(recipe.id); }}
          className={`px-2 pt-2 pb-3 rounded-t-lg border border-b-0 transition-colors ${
            isOwned
              ? 'bg-green-500 text-white border-green-400 hover:bg-green-600'
              : 'bg-white text-gray-400 border-gray-300 hover:text-green-500 hover:bg-green-50 hover:border-green-400'
          }`}
          title={isOwned ? 'Mark as not owned' : 'Mark as owned'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isOwned ? 3 : 2}
                  d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Card content - sits on top of tabs */}
      <div className={`relative z-10 rounded-xl border p-3 transition-shadow hover:shadow-md ${getCardStyle()}`}>
      {/* Header - relative container for absolute positioned right column */}
      <div className="relative flex items-start gap-3 mb-3">
        {/* Recipe icon wrapper - relative for bookmark positioning, no overflow hidden */}
        <div className="w-16 h-16 flex-shrink-0 relative">
          <div className={`w-full h-full rounded-xl flex items-center justify-center overflow-hidden ${getRecipeIconStyle()}`}>
            <img
              src={`/images/recipes/${recipe.icon}`}
              alt={recipe.name}
              className="w-14 h-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/placeholder.svg';
              }}
            />
          </div>
          {/* Bookmark indicator - right side */}
          {isBookmarked && (
            <div className="absolute -top-1 right-1.5 z-10">
              <svg
                className="w-5 h-5 text-red-500 fill-red-500"
                style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}
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
            </div>
          )}
        </div>
        {/* Left side: Recipe name and details on separate lines */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-1.5">
            {isOwned && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 0 rgba(0,0,0,1)' }}>
                <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </span>
            )}
            <span className="truncate">{recipe.name}</span>
          </h3>
          <div className="text-xs font-medium text-[var(--color-text-muted)]">
            {UTENSIL_LABELS[recipe.utensil] || recipe.utensil}
          </div>
          <div className="text-xs font-medium text-[var(--color-text-muted)]">
            {CATEGORY_LABELS[recipe.category] || recipe.category}
          </div>
        </div>
        {/* Right side: Badge, Effect, and Price stacked - absolute positioned so it doesn't affect title width */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
          {/* Badge */}
          {matchType === 'exact' && (
            <Badge variant="success" size="sm">
              Ready
            </Badge>
          )}
          {matchType === 'needs_processing' && (
            <Badge variant="info" size="sm">
              Process
            </Badge>
          )}
          {matchType === 'partial' && (
            <Badge variant="warning" size="sm">
              -{missingIngredients.length}
            </Badge>
          )}
          {/* Effect below badge */}
          {effect && (
            <span className="text-xs text-purple-600 font-medium bg-purple-100 px-1.5 py-0.5 rounded whitespace-nowrap">
              {effect.name} Lv.{recipe.effectLevel}
            </span>
          )}
          {/* Price */}
          <span
            className="text-sm bg-amber-100 px-2 py-0.5 rounded-full leading-none"
            style={{ fontFamily: "'Eurostile Round Pro', system-ui, sans-serif", color: '#fc6800' }}
          >
            {recipe.baseValue} G
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t mb-3 ${getDividerStyle()}`}></div>

      {/* Ingredients as slots - VERTICAL_ALTERNATIVES uses grid layout with pills below */}
      {VERTICAL_ALTERNATIVES ? (
        // Flex layout with fixed-width slots and evenly distributed plus symbols
        <div className="flex items-start justify-between">
          {recipeSlots.map((slot, slotIndex) => {
            const ingredient = slot.isEmpty ? null : getIngredient(slot.primary.id);
            const name = ingredient?.name || formatIngredientName(slot.primary.id);

            // Calculate remaining count for "+N more" pill
            const remainingCount = (slot.overflowAlternatives?.length || 0) - (slot.focusedOverflowAlternatives?.length || 0);

            // Determine if we should show a plus before this slot
            // Show plus if: this is not the first slot, this slot is not empty, and the previous slot was not empty
            const prevSlot = slotIndex > 0 ? recipeSlots[slotIndex - 1] : null;
            const showPlus = slotIndex > 0 && !slot.isEmpty && prevSlot && !prevSlot.isEmpty;

            return (
              <div key={slotIndex} className="flex items-start">
                {/* Plus symbol between slots - evenly spaced via justify-between on parent */}
                {slotIndex > 0 && (
                  <div className="flex items-center justify-center h-[88px] mobile-lg:h-[92px] tablet:h-[96px] px-0.5 mobile-lg:px-1">
                    {showPlus ? (
                      <span className="text-xs mobile-lg:text-sm font-bold text-purple-500">+</span>
                    ) : (
                      <span className="text-xs mobile-lg:text-sm font-bold text-transparent">+</span>
                    )}
                  </div>
                )}
                <div className="flex flex-col items-center w-[72px] mobile-lg:w-[76px] tablet:w-[80px]">
                {/* Main slot frame */}
                {USE_SLOT_FRAMES ? (
                  <div
                    className={`relative ${!slot.isEmpty ? 'cursor-pointer select-none' : ''}`}
                    style={!slot.isEmpty ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
                    onContextMenu={!slot.isEmpty ? (e) => e.preventDefault() : undefined}
                    {...(!slot.isEmpty ? getLongPressHandlers(slot.primary.id, () => handleIngredientLongPress(slot.primary.id)) : {})}
                  >
                  {/* Flash overlay */}
                  {flashIngredient === slot.primary.id && (
                    <div className="absolute inset-0 rounded-2xl bg-amber-300/60 z-10 animate-pulse pointer-events-none" />
                  )}
                  <SlotFrame
                    isEmpty={slot.isEmpty || false}
                    slotNumber={slotIndex + 1}
                    showNumber={SHOW_SLOT_NUMBERS}
                    borderClass={getSlotBorderStyle()}
                  >
                    {slot.isEmpty ? (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <span className="text-gray-300 text-lg font-medium">—</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center h-full">
                        <div className="relative w-10 h-10 mobile-lg:w-12 mobile-lg:h-12 tablet:w-14 tablet:h-14 flex items-center justify-center flex-shrink-0">
                          <img
                            src={`/images/ingredients/${ingredient?.icon || `${slot.primary.id}.png`}`}
                            alt={name}
                            className={`w-9 h-9 mobile-lg:w-11 mobile-lg:h-11 tablet:w-12 tablet:h-12 object-contain pointer-events-none ${!slot.primary.isMatched ? 'opacity-50' : ''}`}
                            draggable={false}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                            }}
                          />
                          {/* Status indicator */}
                          <div className={`absolute -top-1 -right-1.5 mobile-lg:-right-2 tablet:-right-1 w-3.5 h-3.5 mobile-lg:w-4 mobile-lg:h-4 tablet:w-5 tablet:h-5 rounded-full flex items-center justify-center ${
                            slot.primary.isMatched
                              ? slot.primary.needsProcessing ? 'bg-blue-500' : 'bg-green-500'
                              : 'bg-gray-400'
                          }`}>
                            {slot.primary.isMatched ? (
                              slot.primary.needsProcessing ? (
                                <svg className="w-2 h-2 mobile-lg:w-2.5 mobile-lg:h-2.5 tablet:w-3 tablet:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-2 h-2 mobile-lg:w-2.5 mobile-lg:h-2.5 tablet:w-3 tablet:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )
                            ) : (
                              <svg className="w-2 h-2 mobile-lg:w-2.5 mobile-lg:h-2.5 tablet:w-3 tablet:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          {/* Count badge */}
                          {slot.count > 1 && (
                            <span
                              className="absolute right-0.5 text-[var(--color-primary)] leading-none text-xs mobile-lg:text-sm tablet:text-lg"
                              style={{
                                fontFamily: "'Eurostile Round Pro', system-ui, sans-serif",
                                WebkitTextStroke: '2.5px #f5f5f0',
                                paintOrder: 'stroke fill',
                                bottom: '-2px',
                              }}
                            >
                              {slot.count}
                            </span>
                          )}
                        </div>
                        {/* Text area at bottom - similar to IngredientItem grid mode */}
                        <div className="w-full mt-auto flex items-center justify-center" style={{ height: '22px' }}>
                          <span className={`text-[9px] mobile-lg:text-[10px] text-center leading-tight line-clamp-2 w-full ${
                            slot.primary.isMatched
                              ? slot.primary.needsProcessing ? 'text-blue-700' : 'text-green-700'
                              : 'text-gray-500'
                          }`}>
                            {name}
                          </span>
                        </div>
                      </div>
                    )}
                  </SlotFrame>
                  </div>
                ) : (
                  // Non-framed version - uses consistent white background
                  slot.isEmpty ? (
                    <div className="w-[72px] h-[88px] mobile-lg:w-[76px] mobile-lg:h-[92px] tablet:w-[80px] tablet:h-[96px] flex items-center justify-center rounded-2xl bg-gray-200/50">
                      <span className="text-gray-300 text-lg font-medium">—</span>
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center rounded-2xl p-1 pb-1.5 mobile-lg:p-1.5 mobile-lg:pb-2 tablet:p-2 tablet:pb-2.5 bg-white/80 w-[72px] h-[88px] mobile-lg:w-[76px] mobile-lg:h-[92px] tablet:w-[80px] tablet:h-[96px] border ${getSlotBorderStyle()}`}>
                      <div className="relative w-10 h-10 mobile-lg:w-12 mobile-lg:h-12 tablet:w-14 tablet:h-14 flex items-center justify-center flex-shrink-0">
                        <img
                          src={`/images/ingredients/${ingredient?.icon || `${slot.primary.id}.png`}`}
                          alt={name}
                          className={`w-9 h-9 mobile-lg:w-11 mobile-lg:h-11 tablet:w-12 tablet:h-12 object-contain ${!slot.primary.isMatched ? 'opacity-50' : ''}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                          }}
                        />
                      </div>
                      {/* Text area at bottom - similar to IngredientItem grid mode */}
                      <div className="w-full mt-auto flex items-center justify-center" style={{ height: '22px' }}>
                        <span className={`text-[9px] mobile-lg:text-[10px] text-center leading-tight line-clamp-2 w-full ${
                          slot.primary.isMatched
                            ? slot.primary.needsProcessing ? 'text-blue-700' : 'text-green-700'
                            : 'text-gray-500'
                        }`}>
                          {name}
                        </span>
                      </div>
                    </div>
                  )
                )}

                {/* Alternative ingredients as pills below the slot */}
                {!slot.isEmpty && (slot.alternatives.length > 0 || (slot.focusedOverflowAlternatives && slot.focusedOverflowAlternatives.length > 0) || remainingCount > 0) && (
                  <div className="flex flex-col gap-1 mt-1 w-full">
                    {/* "or" label */}
                    <span className="text-[10px] font-medium text-purple-500 text-center">or</span>
                    {/* Show inline alternatives */}
                    {slot.alternatives.map((alt) => {
                      const altIngredient = getIngredient(alt.id);
                      const altName = altIngredient?.name || formatIngredientName(alt.id);
                      const isFocused = focusedSet.has(alt.id);
                      return (
                        <AdaptPill
                          key={alt.id}
                          name={altName}
                          icon={`/images/ingredients/${altIngredient?.icon || `${alt.id}.png`}`}
                          isMatched={alt.isMatched}
                          isFocused={isFocused}
                          pressHandlers={getLongPressHandlers(alt.id, () => handleIngredientLongPress(alt.id))}
                        />
                      );
                    })}
                    {/* Show focused overflow alternatives */}
                    {slot.focusedOverflowAlternatives && slot.focusedOverflowAlternatives.map((alt) => {
                      const altIngredient = getIngredient(alt.id);
                      const altName = altIngredient?.name || formatIngredientName(alt.id);
                      return (
                        <AdaptPill
                          key={alt.id}
                          name={altName}
                          icon={`/images/ingredients/${altIngredient?.icon || `${alt.id}.png`}`}
                          isMatched={true}
                          isFocused={true}
                          pressHandlers={getLongPressHandlers(alt.id, () => handleIngredientLongPress(alt.id))}
                        />
                      );
                    })}
                    {/* Show "+N more" pill if there are remaining overflow */}
                    {remainingCount > 0 && (
                      <div className="flex items-center justify-center px-1.5 py-0.5 rounded-lg text-[10px] bg-gray-100 text-gray-500 ring-1 ring-gray-300">
                        <span>+{remainingCount} more</span>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Original inline layout
        <div className="flex flex-wrap items-start gap-1">
          {recipeSlots.map((slot, slotIndex) => {
            const renderIngredientIcon = (ing: IngredientOption, showCount: boolean = false) => {
              const ingredient = getIngredient(ing.id);
              const name = ingredient?.name || formatIngredientName(ing.id);
              return (
                <div className="flex flex-col items-center w-11">
                  <div
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                      ing.isMatched
                        ? ing.needsProcessing
                          ? 'bg-blue-100 ring-2 ring-blue-300'
                          : 'bg-green-100 ring-2 ring-green-300'
                        : 'bg-gray-100 ring-2 ring-gray-300'
                    }`}
                  >
                    <img
                      src={`/images/ingredients/${ingredient?.icon || `${ing.id}.png`}`}
                      alt={name}
                      className={`w-8 h-8 object-contain ${!ing.isMatched ? 'opacity-50' : ''}`}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                    />
                    <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                      ing.isMatched ? (ing.needsProcessing ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-400'
                    }`}>
                      {ing.isMatched ? (
                        ing.needsProcessing ? (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {showCount && slot.count > 1 && (
                      <span className="absolute right-0.5 text-[var(--color-primary)] leading-none" style={{ fontFamily: "'Eurostile Round Pro', system-ui, sans-serif", fontSize: '16px', WebkitTextStroke: '2.5px #f5f5f0', paintOrder: 'stroke fill', bottom: '-1px' }}>
                        {slot.count}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] text-center leading-tight mt-1 line-clamp-2 ${ing.isMatched ? (ing.needsProcessing ? 'text-blue-700' : 'text-green-700') : 'text-gray-500'}`}>
                    {name}
                  </span>
                </div>
              );
            };

            return (
              <div key={slotIndex} className="flex items-start">
                {slotIndex > 0 && !slot.isEmpty && (
                  <div className="h-10 flex items-center justify-center px-0.5">
                    <span className="text-[11px] font-bold text-purple-500">+</span>
                  </div>
                )}
                {USE_SLOT_FRAMES ? (
                  <SlotFrame isEmpty={slot.isEmpty || false} slotNumber={slotIndex + 1} showNumber={SHOW_SLOT_NUMBERS} borderClass={getSlotBorderStyle()}>
                    {slot.isEmpty ? (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <span className="text-gray-300 text-lg font-medium">—</span>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        {renderIngredientIcon(slot.primary, true)}
                        {slot.alternatives.map((alt) => (
                          <div key={alt.id} className="flex items-start">
                            <div className="h-10 flex items-center justify-center px-1">
                              <span className="text-[10px] font-medium text-gray-400">or</span>
                            </div>
                            {renderIngredientIcon(alt, false)}
                          </div>
                        ))}
                      </div>
                    )}
                  </SlotFrame>
                ) : (
                  slot.isEmpty ? (
                    <div className="flex flex-col items-center justify-center w-11 h-14">
                      <span className="text-gray-300 text-lg font-medium">—</span>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      {renderIngredientIcon(slot.primary, true)}
                      {slot.alternatives.map((alt) => (
                        <div key={alt.id} className="flex items-start">
                          <div className="h-10 flex items-center justify-center px-1">
                            <span className="text-[10px] font-medium text-gray-400">or</span>
                          </div>
                          {renderIngredientIcon(alt, false)}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adapt Section - optional ingredients from recipe.additions */}
      {recipe.additions && recipe.additions.length > 0 && (
        <>
          <div className={`border-t mt-3 mb-2 ${getDividerStyle()}`}></div>
          <div>
            <span className="text-[10px] text-purple-600 font-medium">Adapt:</span>
            <div className="flex flex-wrap items-center gap-1 mt-1">
            {recipe.additions.map((additionId) => {
              const ingredient = getIngredient(additionId);
              const name = ingredient?.name || formatIngredientName(additionId);
              const isMatched = selectedSet.has(additionId);
              const isFocused = focusedSet.has(additionId);
              return (
                <AdaptPill
                  key={additionId}
                  name={name}
                  icon={`/images/ingredients/${ingredient?.icon || `${additionId}.png`}`}
                  isMatched={isMatched}
                  isFocused={isFocused}
                  pressHandlers={getLongPressHandlers(additionId, () => handleIngredientLongPress(additionId))}
                />
              );
            })}
            </div>
          </div>
        </>
      )}

      {/* Bottom row: Unlock info and Character icons */}
      {(recipe.unlockMethod || characterGifts.length > 0) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Unlock info (expandable) - left side */}
          {recipe.unlockMethod ? (
            <details className="text-xs text-[var(--color-text-muted)] flex-1 min-w-0">
              <summary className="cursor-pointer hover:text-[var(--color-text)]">
                How to unlock
              </summary>
              <p className="mt-1 pl-2 border-l-2 border-gray-200">{recipe.unlockMethod}</p>
            </details>
          ) : (
            <div className="flex-1" />
          )}

          {/* Character icons - right side */}
          {characterGifts.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0 relative">
              {characterGifts.map(({ character, giftType }) => {
                const tooltipText = giftType === 'favorite'
                  ? `${character.name}'s Favorite Gift`
                  : `Great Gift for ${character.name}`;
                const isTooltipActive = activeTooltip === character.id;

                return (
                  <div key={character.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handleCharacterTap(character.id)}
                      className={`w-7 h-7 rounded-full overflow-hidden ring-2 cursor-pointer select-none ${
                        giftType === 'favorite' ? 'ring-amber-400' : 'ring-emerald-400'
                      }`}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                      title={tooltipText}
                      aria-label={tooltipText}
                    >
                      <img
                        src={`/images/characters/${character.icon}`}
                        alt={character.name}
                        className="w-full h-full object-cover pointer-events-none"
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                        draggable={false}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                        }}
                      />
                    </button>
                    {/* Mobile tap tooltip */}
                    {isTooltipActive && (
                      <div
                        className={`absolute bottom-full -right-0.5 mb-1.5 px-2 py-1 text-xs font-medium rounded shadow-sm whitespace-nowrap z-10 ${
                          giftType === 'favorite'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {tooltipText}
                        {/* Tooltip arrow */}
                        <div
                          className={`absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                            giftType === 'favorite' ? 'border-t-amber-300' : 'border-t-emerald-300'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
