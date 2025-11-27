import { useState } from 'react';
import type { MatchResult, Ingredient, Effect, Character, GiftToCharacters } from '../../types';
import { Badge } from '../ui/Badge';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useOwnedRecipesStore } from '../../store/ownedRecipesStore';

interface RecipeCardProps {
  match: MatchResult;
  ingredientMap: Map<string, Ingredient>;
  effectMap: Map<string, Effect>;
  characterMap: Map<string, Character>;
  giftToCharacters: GiftToCharacters;
  selectedIngredients: string[];
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

export function RecipeCard({ match, ingredientMap, effectMap, characterMap, giftToCharacters, selectedIngredients, index = 0 }: RecipeCardProps) {
  const { recipe, matchType, missingIngredients, matchedIngredients, processedIngredients } = match;
  const effect = recipe.effect ? effectMap.get(recipe.effect) : null;
  const { bookmarkedRecipes } = useBookmarkStore();
  const isBookmarked = bookmarkedRecipes.includes(recipe.id);
  const { ownedRecipes } = useOwnedRecipesStore();
  const isOwned = ownedRecipes.includes(recipe.id);
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

  // Build complete recipe variations - each variation shows all ingredients needed
  // When there are oneOf groups with multiple available options, we generate multiple complete variations
  interface IngredientDisplay {
    id: string;
    isMatched: boolean;
    needsProcessing: boolean;
    count: number;  // How many of this ingredient needed
  }

  interface RecipeVariation {
    ingredients: IngredientDisplay[];
  }

  const buildRecipeVariations = (): RecipeVariation[] => {
    // First, collect all fixed ingredients and identify oneOf groups with choices
    const fixedIngredients: IngredientDisplay[] = [];
    const oneOfGroups: Array<{
      availableOptions: string[];
      count: number;
      fallbackId: string;  // First option if none available
    }> = [];

    for (const ing of recipe.ingredients) {
      if (ing.oneOf && ing.oneOf.length > 0) {
        const availableAlternatives = ing.oneOf.filter(id => selectedSet.has(id) || processedSet.has(id));
        const count = ing.count || 1;

        oneOfGroups.push({
          availableOptions: availableAlternatives,
          count,
          fallbackId: ing.oneOf[0],
        });
      } else if (ing.id && ing.id !== 'choice') {
        const isMatched = matchedIngredients.includes(ing.id) || selectedSet.has(ing.id);
        const count = ing.count || 1;
        fixedIngredients.push({
          id: ing.id,
          isMatched,
          needsProcessing: processedSet.has(ing.id),
          count,
        });
      }
    }

    // If no oneOf groups with multiple available options, just return one variation
    const hasMultipleChoices = oneOfGroups.some(g => g.availableOptions.length > 1);

    if (!hasMultipleChoices) {
      // Simple case: one variation with all ingredients
      const variation: RecipeVariation = { ingredients: [...fixedIngredients] };

      for (const group of oneOfGroups) {
        if (group.availableOptions.length > 0) {
          // For count > 1, we might need combo or single
          const count = group.count;
          if (count > 1 && group.availableOptions.length >= count) {
            // Combination: use 1 of each of the first 'count' options
            for (let i = 0; i < count; i++) {
              const id = group.availableOptions[i];
              variation.ingredients.push({
                id,
                isMatched: true,
                needsProcessing: processedSet.has(id),
                count: 1,
              });
            }
          } else {
            // Use first available option with full count
            const id = group.availableOptions[0];
            variation.ingredients.push({
              id,
              isMatched: true,
              needsProcessing: processedSet.has(id),
              count,
            });
          }
        } else {
          // Missing - show fallback
          variation.ingredients.push({
            id: group.fallbackId,
            isMatched: false,
            needsProcessing: false,
            count: group.count,
          });
        }
      }

      return [variation];
    }

    // Complex case: generate variations for each oneOf choice
    // For simplicity, we'll generate one variation per available option in each oneOf group
    const variations: RecipeVariation[] = [];

    // Find the oneOf group with multiple options
    const multiChoiceGroup = oneOfGroups.find(g => g.availableOptions.length > 1);
    if (!multiChoiceGroup) return [{ ingredients: fixedIngredients }];

    // For count > 1 with multiple options, first show the combination option
    if (multiChoiceGroup.count > 1 && multiChoiceGroup.availableOptions.length >= multiChoiceGroup.count) {
      const comboVariation: RecipeVariation = { ingredients: [...fixedIngredients] };

      // Add combo ingredients (1 of each)
      for (let i = 0; i < multiChoiceGroup.count; i++) {
        const id = multiChoiceGroup.availableOptions[i];
        comboVariation.ingredients.push({
          id,
          isMatched: true,
          needsProcessing: processedSet.has(id),
          count: 1,
        });
      }

      // Add other oneOf groups (non-multi-choice)
      for (const group of oneOfGroups) {
        if (group === multiChoiceGroup) continue;
        if (group.availableOptions.length > 0) {
          const id = group.availableOptions[0];
          comboVariation.ingredients.push({
            id,
            isMatched: true,
            needsProcessing: processedSet.has(id),
            count: group.count,
          });
        } else {
          comboVariation.ingredients.push({
            id: group.fallbackId,
            isMatched: false,
            needsProcessing: false,
            count: group.count,
          });
        }
      }

      variations.push(comboVariation);
    }

    // Then show individual single-ingredient options
    for (const optionId of multiChoiceGroup.availableOptions) {
      const variation: RecipeVariation = { ingredients: [...fixedIngredients] };

      // Add this option with full count
      variation.ingredients.push({
        id: optionId,
        isMatched: true,
        needsProcessing: processedSet.has(optionId),
        count: multiChoiceGroup.count,
      });

      // Add other oneOf groups
      for (const group of oneOfGroups) {
        if (group === multiChoiceGroup) continue;
        if (group.availableOptions.length > 0) {
          const id = group.availableOptions[0];
          variation.ingredients.push({
            id,
            isMatched: true,
            needsProcessing: processedSet.has(id),
            count: group.count,
          });
        } else {
          variation.ingredients.push({
            id: group.fallbackId,
            isMatched: false,
            needsProcessing: false,
            count: group.count,
          });
        }
      }

      variations.push(variation);
    }

    return variations;
  };

  const recipeVariations = buildRecipeVariations();

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
      className={`rounded-xl border p-3 transition-shadow hover:shadow-md ${getCardStyle()}`}
    >
      {/* Header - relative container for absolute positioned right column */}
      <div className="relative flex items-start gap-3 mb-3">
        {/* Recipe icon wrapper - relative for bookmark positioning, no overflow hidden */}
        <div className="w-16 h-16 flex-shrink-0 relative">
          <div className={`w-full h-full rounded-xl flex items-center justify-center overflow-hidden ${getRecipeIconStyle()}`}>
            <img
              src={`/images/recipes/${recipe.icon}`}
              alt={recipe.name}
              className="w-14 h-14 object-contain scale-[1.4]"
              style={{ transformOrigin: 'center center' }}
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
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {effect.name} Lv.{recipe.effectLevel}
            </span>
          )}
          {/* Price */}
          <span className="text-xs text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
            {recipe.baseValue}G
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t mb-3 ${getDividerStyle()}`}></div>

      {/* Ingredients as complete recipe variations separated by "or" */}
      <div className="flex flex-wrap items-start gap-1">
        {recipeVariations.map((variation, varIndex) => (
          <div key={varIndex} className="flex items-start">
            {/* "or" separator between complete recipe variations */}
            {varIndex > 0 && (
              <div className="h-10 flex items-center justify-center px-1.5">
                <span className="text-[11px] font-bold text-gray-400">or</span>
              </div>
            )}
            {/* Render all ingredients in this variation */}
            {variation.ingredients.map((ing, ingIndex) => {
              const ingredient = getIngredient(ing.id);
              const name = ingredient?.name || ing.id.replace(/_/g, ' ');
              return (
                <div key={ing.id} className="flex items-start">
                  {/* "+" separator between ingredients within a variation */}
                  {ingIndex > 0 && (
                    <div className="h-10 flex items-center justify-center px-0.5">
                      <span className="text-[11px] font-bold text-purple-500">+</span>
                    </div>
                  )}
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                        }}
                      />
                      {/* Count badge - only show if count > 1 */}
                      {ing.count > 1 && (
                        <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center ${ing.isMatched ? 'bg-purple-500' : 'bg-purple-400'}`}>
                          <span className="text-[9px] font-bold text-white">×{ing.count}</span>
                        </div>
                      )}
                      {/* Status indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        ing.isMatched
                          ? ing.needsProcessing
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                          : 'bg-gray-400'
                      }`}>
                        {ing.isMatched ? (
                          ing.needsProcessing ? (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )
                        ) : (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] text-center leading-tight mt-1 line-clamp-2 ${
                      ing.isMatched
                        ? ing.needsProcessing
                          ? 'text-blue-700'
                          : 'text-green-700'
                        : 'text-gray-500'
                    }`}>
                      {name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

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
  );
}
