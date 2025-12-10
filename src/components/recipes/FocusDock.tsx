import type { Ingredient } from '../../types';

interface FocusDockProps {
  ingredients: string[];
  focusedIds: string[];
  onToggle: (id: string) => void;
  ingredientMap: Map<string, Ingredient>;
}

export function FocusDock({ ingredients, focusedIds, onToggle, ingredientMap }: FocusDockProps) {
  if (ingredients.length === 0) return null;

  return (
    <div className="flex justify-center px-4 py-2">
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white/95 backdrop-blur-sm
                   rounded-full shadow-lg border border-gray-200/80 overflow-x-auto max-w-full
                   scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {ingredients.map((id) => {
          const ing = ingredientMap.get(id);
          const isFocused = focusedIds.includes(id);

          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
                         transition-all duration-150 select-none
                         ${isFocused
                           ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 bg-amber-50 scale-110'
                           : 'bg-gray-100/80 hover:bg-gray-200/80 active:scale-95'
                         }`}
              title={ing?.name || id}
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            >
              <img
                src={`/images/ingredients/${ing?.icon || `${id}.png`}`}
                alt={ing?.name || id}
                className="w-6 h-6 object-contain pointer-events-none"
                draggable={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
