import { useRef, useState, useEffect } from 'react';
import type { Ingredient } from '../../types';

// Faint category background colors
const CATEGORY_COLORS: Record<string, string> = {
  crops: 'bg-green-50',
  fruits: 'bg-pink-50',
  animal_products: 'bg-amber-50',
  fish: 'bg-blue-50',
  foraged: 'bg-lime-50',
  mushrooms: 'bg-stone-100',
  processed: 'bg-orange-50',
  prepared: 'bg-yellow-50',
  rare_crops: 'bg-purple-50',
  other: 'bg-gray-50',
};

const CATEGORY_COLORS_HOVER: Record<string, string> = {
  crops: 'hover:bg-green-100',
  fruits: 'hover:bg-pink-100',
  animal_products: 'hover:bg-amber-100',
  fish: 'hover:bg-blue-100',
  foraged: 'hover:bg-lime-100',
  mushrooms: 'hover:bg-stone-200',
  processed: 'hover:bg-orange-100',
  prepared: 'hover:bg-yellow-100',
  rare_crops: 'hover:bg-purple-100',
  other: 'hover:bg-gray-100',
};

interface IngredientItemProps {
  ingredient: Ingredient;
  isSelected: boolean;
  onToggle: () => void;
  viewMode: 'list' | 'grid';
}

export function IngredientItem({
  ingredient,
  isSelected,
  onToggle,
  viewMode,
}: IngredientItemProps) {
  const categoryBg = CATEGORY_COLORS[ingredient.category] || CATEGORY_COLORS.other;
  const categoryHover = CATEGORY_COLORS_HOVER[ingredient.category] || CATEGORY_COLORS_HOVER.other;

  // Truncation detection for marquee effect (list view)
  const listTextRef = useRef<HTMLSpanElement>(null);
  const [isListTruncated, setIsListTruncated] = useState(false);
  const [listMarqueeDistance, setListMarqueeDistance] = useState(0);

  // Truncation detection for grid view (second line overflow)
  const gridTextRef = useRef<HTMLSpanElement>(null);
  const [isGridTruncated, setIsGridTruncated] = useState(false);
  const [gridMarqueeDistance, setGridMarqueeDistance] = useState(0);

  useEffect(() => {
    const checkTruncation = () => {
      // List view truncation
      if (listTextRef.current) {
        const scrollW = listTextRef.current.scrollWidth;
        const clientW = listTextRef.current.clientWidth;
        const truncated = scrollW > clientW;
        setIsListTruncated(truncated);
        if (truncated) {
          setListMarqueeDistance(-(scrollW - clientW + 8));
        }
      }
      // Grid view truncation (check if text overflows 2 lines)
      if (gridTextRef.current) {
        const el = gridTextRef.current;
        const truncated = el.scrollHeight > el.clientHeight;
        setIsGridTruncated(truncated);
        if (truncated) {
          // For grid, we scroll the full overflow width
          setGridMarqueeDistance(-(el.scrollWidth - el.clientWidth + 8));
        }
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [ingredient.name, viewMode]);

  if (viewMode === 'grid') {
    return (
      <button
        onClick={onToggle}
        className={`group relative aspect-square flex flex-col items-center justify-start pt-1 pb-2 px-2 rounded-2xl border-2 transition-all select-none ${
          isSelected
            ? 'border-[var(--color-secondary)] bg-orange-100 shadow-sm'
            : `border-transparent ${categoryBg} ${categoryHover} hover:shadow-sm`
        }`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        title={ingredient.name}
      >
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
          <img
            src={`/images/ingredients/${ingredient.icon}`}
            alt={ingredient.name}
            className="w-12 h-12 object-contain"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/placeholder.svg';
            }}
          />
        </div>
        {/* Fixed two-line height text area - marquee only when truncated */}
        <div
          className={`w-full mt-auto ${isGridTruncated ? 'marquee-container' : ''}`}
          style={{ height: '26px' }} /* Fixed height for 2 lines at 11px with leading-tight */
        >
          <span
            ref={gridTextRef}
            className={`text-[11px] text-center leading-tight select-none w-full block ${
              isGridTruncated ? 'marquee-text is-truncated' : 'line-clamp-2'
            }`}
            style={{ '--marquee-distance': `${gridMarqueeDistance}px`, WebkitUserSelect: 'none' } as React.CSSProperties}
          >
            {ingredient.name}
          </span>
        </div>
        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-[var(--color-secondary)] rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`group flex items-center gap-3 w-full p-2 rounded-lg transition-all select-none ${
        isSelected
          ? 'bg-orange-100 border-l-4 border-[var(--color-secondary)]'
          : `${categoryBg} ${categoryHover}`
      }`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
        <img
          src={`/images/ingredients/${ingredient.icon}`}
          alt={ingredient.name}
          className="w-8 h-8 object-contain"
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/placeholder.png';
          }}
        />
      </div>
      <div className="marquee-container flex-1 min-w-0">
        <span
          ref={listTextRef}
          className={`marquee-text text-left text-sm font-medium select-none ${isListTruncated ? 'is-truncated' : ''}`}
          style={{ '--marquee-distance': `${listMarqueeDistance}px`, WebkitUserSelect: 'none' } as React.CSSProperties}
        >
          {ingredient.name}
        </span>
      </div>
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)]'
            : 'border-gray-300'
        }`}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
