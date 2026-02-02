import React, { useMemo, forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react';
import Fuse from 'fuse.js';
import type { Recipe, Ingredient, Effect, VariantGroups, RecipeCategory, ProcessingRecipe, Character, GiftToCharacters } from '../../types';
import { useInventoryStore } from '../../store/inventoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useOwnedRecipesStore } from '../../store/ownedRecipesStore';
import { useScrollToTop, type ScrollToTopHandle } from '../../hooks/useScrollToTop';
import { useAnimatedVisibility } from '../../hooks/useAnimatedVisibility';
import { findRecipes, expandInventoryWithProcessing } from '../../lib/recipeEngine';
import { RecipeCard } from './RecipeCard';
import { SwipeableRecipeCard } from './SwipeableRecipeCard';
import { FocusDock } from './FocusDock';
import { SearchInput } from '../ui/SearchInput';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { SortDropdown } from '../ui/SortDropdown';
import { FocusToggleButton } from '../ui/FocusToggleButton';

/** Card layout: single column on mobile, two-column masonry on desktop.
 *  Uses JS-based column splitting to avoid CSS `columns` (clips overflow)
 *  and CSS `grid` (uniform row heights cause gaps). */
function CardGrid({ isMobile, children }: { isMobile?: boolean; children: React.ReactNode }) {
  if (isMobile) {
    return <div className="space-y-3">{children}</div>;
  }
  const items = React.Children.toArray(children);
  const left: React.ReactNode[] = [];
  const right: React.ReactNode[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 flex flex-col gap-3 min-w-0">{left}</div>
      <div className="flex-1 flex flex-col gap-3 min-w-0">{right}</div>
    </div>
  );
}

interface RecipeResultsProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  effects: Effect[];
  processing: ProcessingRecipe[];
  recipeCategories: RecipeCategory[];
  ingredientCategories: { id: string; name: string; order: number }[];
  variantGroups: VariantGroups;
  ingredientMap: Map<string, Ingredient>;
  effectMap: Map<string, Effect>;
  characterMap: Map<string, Character>;
  giftToCharacters: GiftToCharacters;
  isMobile?: boolean;
  bookmarksOnly?: boolean;
  onStaleChange?: (isStale: boolean) => void;
  onCountsChange?: (readyCount: number, processingCount: number) => void;
}

export interface RecipeResultsHandle extends ScrollToTopHandle {
  scrollToReady: () => void;
  scrollToProcessing: () => void;
  commitIngredients: () => void;
}

export const RecipeResults = forwardRef<RecipeResultsHandle, RecipeResultsProps>(function RecipeResults({
  recipes,
  effects,
  processing,
  recipeCategories,
  ingredientCategories,
  variantGroups,
  ingredientMap,
  effectMap,
  characterMap,
  giftToCharacters,
  isMobile = false,
  bookmarksOnly = false,
  onStaleChange,
  onCountsChange,
}, ref) {
  const { scrollRef, scrollToTop } = useScrollToTop();
  const headerRef = useRef<HTMLDivElement>(null);
  const readySectionRef = useRef<HTMLDivElement>(null);
  const processingSectionRef = useRef<HTMLDivElement>(null);

  // Controlled open state for collapsible sections
  const [readySectionOpen, setReadySectionOpen] = useState(true);
  const [processingSectionOpen, setProcessingSectionOpen] = useState(true);

  // Mobile filter overlay state with animation
  const [filterOverlayOpen, setFilterOverlayOpen] = useState(false);
  const { shouldRender: showFilterOverlay, isAnimatingOut: isFilterClosing } = useAnimatedVisibility(filterOverlayOpen, 200);

  // Scroll to filters (top of scroll container) - desktop/tablet only
  const scrollToFilters = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollRef]);

  // Hide filters - desktop/tablet scrolls, mobile closes overlay
  const hideFilters = useCallback(() => {
    if (isMobile) {
      setFilterOverlayOpen(false);
    } else if (scrollRef.current && headerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      scrollRef.current.scrollTo({ top: headerHeight, behavior: 'smooth' });
    }
  }, [isMobile, scrollRef]);

  // Toggle filters visibility - mobile uses overlay, desktop uses scroll
  const toggleFilters = useCallback(() => {
    if (isMobile) {
      setFilterOverlayOpen(prev => !prev);
    } else if (scrollRef.current && headerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      const currentScroll = scrollRef.current.scrollTop;
      if (currentScroll < headerHeight / 2) {
        scrollRef.current.scrollTo({ top: headerHeight, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [isMobile, scrollRef]);

  const scrollToSection = (
    sectionRef: React.RefObject<HTMLDivElement | null>,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    // First, expand the section if it's collapsed
    setOpen(true);

    // Use requestAnimationFrame to wait for the DOM to update after expansion
    requestAnimationFrame(() => {
      if (sectionRef.current && scrollRef.current) {
        const container = scrollRef.current;
        const section = sectionRef.current;
        const offsetTop = section.offsetTop - container.offsetTop - 10; // 10px padding above header
        container.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
      }
    });
  };

  useImperativeHandle(ref, () => ({
    scrollToTop,
    scrollToFilters,
    hideFilters,
    toggleFilters,
    scrollToReady: () => scrollToSection(readySectionRef, setReadySectionOpen),
    scrollToProcessing: () => scrollToSection(processingSectionRef, setProcessingSectionOpen),
    commitIngredients: () => setCommittedIngredients(selectedIngredients),
  }));

  const { selectedIngredients, ownedUtensils, maxMissing } = useInventoryStore();
  const { bookmarkedRecipes } = useBookmarkStore();
  const { ownedRecipes } = useOwnedRecipesStore();
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);

  // "Committed" snapshot — recipe list only recomputes on explicit refresh
  const [committedIngredients, setCommittedIngredients] = useState<string[]>(selectedIngredients);

  // Detect if results are stale (live ingredients differ from committed)
  const isStale = useMemo(() => {
    if (committedIngredients.length !== selectedIngredients.length) return true;
    const committedSet = new Set(committedIngredients);
    return selectedIngredients.some(id => !committedSet.has(id));
  }, [selectedIngredients, committedIngredients]);
  const {
    effectFilters,
    toggleEffectFilter,
    recipeCategoryFilters,
    toggleRecipeCategoryFilter,
    characterFilters,
    toggleCharacterFilter,
    recipeSearchQuery,
    setRecipeSearchQuery,
    showAllRecipes,
    setShowAllRecipes,
    recipeSortBy,
    setRecipeSortBy,
    showFocusDock,
    setShowFocusDock,
    focusIngredientFilters,
    toggleFocusIngredientFilter,
    clearFocusIngredientFilters,
    showBookmarksDrawer,
    setShowBookmarksDrawer,
  } = useSettingsStore();

  // Notify parent when stale state changes (for mobile tab badge)
  useEffect(() => {
    onStaleChange?.(isStale);
  }, [isStale, onStaleChange]);


  // Auto-collapse bookmarks drawer when last bookmark is removed
  useEffect(() => {
    if (showBookmarksDrawer && bookmarkedRecipes.length === 0) {
      setShowBookmarksDrawer(false);
    }
  }, [bookmarkedRecipes.length, showBookmarksDrawer, setShowBookmarksDrawer]);

  // Auto-commit ingredients when showAllRecipes is toggled (deliberate mode switch)
  useEffect(() => {
    setCommittedIngredients(selectedIngredients);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllRecipes]);

  // Sort selected ingredients by category order (matching Ingredients panel), then by name
  const sortedSelectedIngredients = useMemo(() => {
    // Create a map of category ID to its order
    const categoryOrder = new Map(
      ingredientCategories.map((cat, index) => [cat.id, cat.order ?? index])
    );

    return [...selectedIngredients].sort((a, b) => {
      const ingA = ingredientMap.get(a);
      const ingB = ingredientMap.get(b);

      // Get category orders (default to high number if not found)
      const catOrderA = categoryOrder.get(ingA?.category || '') ?? 999;
      const catOrderB = categoryOrder.get(ingB?.category || '') ?? 999;

      // Sort by category order first
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB;
      }

      // Then sort by name within category
      const nameA = ingA?.name || a;
      const nameB = ingB?.name || b;
      return nameA.localeCompare(nameB);
    });
  }, [selectedIngredients, ingredientCategories, ingredientMap]);

  // Character options for the dropdown filter
  const characterOptions = useMemo(() => {
    return Array.from(characterMap.values())
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [characterMap]);

  // Fuse instance for recipe search
  const fuse = useMemo(() => {
    return new Fuse(recipes, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.3,
    });
  }, [recipes]);

  // Find matching recipes based on committed inventory OR show all recipes
  // Uses committedIngredients (not live selectedIngredients) so the list stays stable
  const matches = useMemo(() => {
    const inventory = new Set(committedIngredients);
    const utensils = new Set(ownedUtensils);

    // In bookmarks mode, always show all recipes (filtered by bookmarks later)
    if (showAllRecipes || bookmarksOnly) {
      // When showing all recipes, pass empty inventory to bypass ingredient-overlap filter
      // but still calculate match info for display purposes
      const allMatches = findRecipes(new Set(), recipes, utensils, variantGroups, 999, processing);

      // Re-evaluate each recipe against actual inventory (with processing) for display
      // Use the shared recursive expansion function for multi-step processing chains
      // Pass variantGroups so silkie_egg can produce mayonnaise (which needs "egg")
      const { expanded: expandedInventory, readyToProcess } = expandInventoryWithProcessing(inventory, processing, variantGroups);

      // Helper to check if an ingredient is satisfied by inventory (with variant support)
      const checkWithVariants = (id: string, inv: Set<string>): string | null => {
        if (inv.has(id)) return id;
        // Check variant groups
        for (const variants of Object.values(variantGroups)) {
          if (variants.includes(id)) {
            for (const variant of variants) {
              if (inv.has(variant)) return variant;
            }
          }
        }
        return null;
      };

      return allMatches.map(match => {
        // Evaluate against BASE inventory
        const matchedFromBase: string[] = [];
        const missingFromBase: string[] = [];

        for (const ing of match.recipe.ingredients) {
          if (ing.oneOf && ing.oneOf.length > 0) {
            // Check each option, including variant substitutions
            let found: string | null = null;
            for (const opt of ing.oneOf) {
              found = checkWithVariants(opt, inventory);
              if (found) break;
            }
            if (found) {
              matchedFromBase.push(found);
            } else {
              missingFromBase.push(ing.oneOf[0]);
            }
          } else if (ing.id !== 'choice') {
            const found = checkWithVariants(ing.id, inventory);
            if (found) {
              matchedFromBase.push(found);
            } else {
              missingFromBase.push(ing.id);
            }
          }
        }

        // Evaluate against EXPANDED inventory (includes processable items)
        const matchedFromExpanded: string[] = [];
        const missingFromExpanded: string[] = [];

        for (const ing of match.recipe.ingredients) {
          if (ing.oneOf && ing.oneOf.length > 0) {
            // Check each option, including variant substitutions
            let found: string | null = null;
            for (const opt of ing.oneOf) {
              found = checkWithVariants(opt, expandedInventory);
              if (found) break;
            }
            if (found) {
              matchedFromExpanded.push(found);
            } else {
              missingFromExpanded.push(ing.oneOf[0]);
            }
          } else if (ing.id !== 'choice') {
            const found = checkWithVariants(ing.id, expandedInventory);
            if (found) {
              matchedFromExpanded.push(found);
            } else {
              missingFromExpanded.push(ing.id);
            }
          }
        }

        // Identify which matched ingredients require processing
        const processedIngredients = matchedFromExpanded.filter(id => readyToProcess.has(id));

        // Determine match type:
        // - 'exact': no missing from BASE inventory (everything directly available)
        // - 'needs_processing': no missing from EXPANDED inventory, but some ingredients need processing
        // - 'partial': still missing ingredients even with expanded inventory
        let matchType: 'exact' | 'needs_processing' | 'partial';

        if (missingFromBase.length === 0) {
          // All ingredients directly in inventory - ready to cook!
          matchType = 'exact';
        } else if (missingFromExpanded.length === 0) {
          // All ingredients available via processing - needs processing first
          matchType = 'needs_processing';
        } else {
          // Still missing some ingredients
          matchType = 'partial';
        }

        return {
          ...match,
          matchedIngredients: matchedFromExpanded,
          missingIngredients: missingFromExpanded,
          processedIngredients,
          missingCount: missingFromExpanded.length,
          matchType,
          matchPercentage: Math.round(
            (matchedFromExpanded.length / match.recipe.ingredients.length) * 100
          ),
        } as typeof match;
      });
    }

    return findRecipes(inventory, recipes, utensils, variantGroups, maxMissing, processing);
  }, [committedIngredients, ownedUtensils, recipes, variantGroups, maxMissing, showAllRecipes, processing, bookmarksOnly]);

  // Apply filters (search, category, effect, bookmarks, owned)
  const filteredMatches = useMemo(() => {
    let results = matches;

    // Filter by bookmarks if in bookmarks-only mode
    if (bookmarksOnly) {
      const bookmarkSet = new Set(bookmarkedRecipes);
      results = results.filter((m) => bookmarkSet.has(m.recipe.id));
    }

    // Filter by owned recipes if showOwnedOnly is enabled
    if (showOwnedOnly) {
      const ownedSet = new Set(ownedRecipes);
      results = results.filter((m) => ownedSet.has(m.recipe.id));
    }

    // Apply recipe search
    if (recipeSearchQuery.trim()) {
      const searchResults = fuse.search(recipeSearchQuery);
      const matchingIds = new Set(searchResults.map((r) => r.item.id));
      results = results.filter((m) => matchingIds.has(m.recipe.id));
    }

    // Apply category filter (multi-select - recipe must match ANY selected category)
    if (recipeCategoryFilters.length > 0) {
      results = results.filter((m) => recipeCategoryFilters.includes(m.recipe.category));
    }

    // Apply effect filter (multi-select - recipe must match ANY selected effect)
    if (effectFilters.length > 0) {
      results = results.filter((m) => m.recipe.effect && effectFilters.includes(m.recipe.effect));
    }

    // Apply character gift filter (OR logic - recipe is a favorite/loved gift of ANY selected character)
    if (characterFilters.length > 0) {
      results = results.filter((m) => {
        const giftInfo = giftToCharacters[m.recipe.id];
        if (!giftInfo) return false;
        return characterFilters.some(charId =>
          giftInfo.favorite.includes(charId) || giftInfo.loved.includes(charId)
        );
      });
    }

    // Filter by focus ingredients (AND logic - recipe must contain ALL focused ingredients)
    // Only apply filters for ingredients that are still in the committed inventory
    const validFocusFilters = focusIngredientFilters.filter(id =>
      committedIngredients.includes(id)
    );
    if (validFocusFilters.length > 0) {
      results = results.filter((m) => {
        // Get all ingredient IDs the recipe can use (including oneOf alternatives and additions)
        const recipeIngredientIds = m.recipe.ingredients.flatMap(ing =>
          ing.oneOf && ing.oneOf.length > 0 ? ing.oneOf : [ing.id]
        );
        // Also include additions
        const additions = m.recipe.additions || [];
        const allRecipeIngredients = [...recipeIngredientIds, ...additions];
        // Recipe must contain ALL focused ingredients
        return validFocusFilters.every(focusId =>
          allRecipeIngredients.includes(focusId)
        );
      });
    }

    return results;
  }, [matches, recipeSearchQuery, recipeCategoryFilters, effectFilters, characterFilters, giftToCharacters, fuse, bookmarksOnly, bookmarkedRecipes, showOwnedOnly, ownedRecipes, focusIngredientFilters, committedIngredients]);

  // Sort filtered matches
  const sortedMatches = useMemo(() => {
    const sorted = [...filteredMatches];

    // Helper to get sort priority for match types
    const getMatchPriority = (m: typeof sorted[0]) => {
      if (m.matchType === 'exact') return 0;
      if (m.matchType === 'needs_processing') return 1;
      return 2 + m.missingCount;
    };

    switch (recipeSortBy) {
      case 'price_desc':
        sorted.sort((a, b) => b.recipe.baseValue - a.recipe.baseValue);
        break;
      case 'price_asc':
        sorted.sort((a, b) => a.recipe.baseValue - b.recipe.baseValue);
        break;
      case 'name':
        sorted.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
        break;
      case 'missing':
      default:
        sorted.sort((a, b) => {
          const priorityA = getMatchPriority(a);
          const priorityB = getMatchPriority(b);
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.recipe.name.localeCompare(b.recipe.name);
        });
        break;
    }

    return sorted;
  }, [filteredMatches, recipeSortBy]);

  // Group by match type and missing count, then sort within each group
  const groupedMatches = useMemo(() => {
    const groups: {
      exact: typeof sortedMatches;
      needsProcessing: typeof sortedMatches;
      missing: Record<number, typeof sortedMatches>;
    } = {
      exact: [],
      needsProcessing: [],
      missing: {},
    };

    // First, group by category
    for (const match of filteredMatches) {
      if (match.matchType === 'exact') {
        groups.exact.push(match);
      } else if (match.matchType === 'needs_processing') {
        groups.needsProcessing.push(match);
      } else {
        const count = match.missingCount;
        if (!groups.missing[count]) {
          groups.missing[count] = [];
        }
        groups.missing[count].push(match);
      }
    }

    // Then, sort within each group based on recipeSortBy
    const sortFn = (a: typeof sortedMatches[0], b: typeof sortedMatches[0]) => {
      switch (recipeSortBy) {
        case 'price_desc':
          return b.recipe.baseValue - a.recipe.baseValue;
        case 'price_asc':
          return a.recipe.baseValue - b.recipe.baseValue;
        case 'name':
          return a.recipe.name.localeCompare(b.recipe.name);
        case 'missing':
        default:
          // Default: sort by name within each group
          return a.recipe.name.localeCompare(b.recipe.name);
      }
    };

    groups.exact.sort(sortFn);
    groups.needsProcessing.sort(sortFn);
    for (const count of Object.keys(groups.missing)) {
      groups.missing[Number(count)].sort(sortFn);
    }

    return groups;
  }, [filteredMatches, recipeSortBy]);

  const exactCount = groupedMatches.exact.length;
  const processingCount = groupedMatches.needsProcessing.length;
  const hasFilters = recipeSearchQuery || recipeCategoryFilters.length > 0 || effectFilters.length > 0 || characterFilters.length > 0;

  // Notify parent of committed counts (for mobile tab badges)
  // Include committedIngredients to guarantee re-notification after a commit
  useEffect(() => {
    onCountsChange?.(exactCount, processingCount);
  }, [exactCount, processingCount, committedIngredients, onCountsChange]);

  // Helper to render recipe card - uses SwipeableRecipeCard on mobile
  const CardComponent = isMobile ? SwipeableRecipeCard : RecipeCard;

  // Mobile filter controls JSX - reorganized layout for mobile
  const mobileFilterControlsJSX = (
    <>
      {/* Row 1: Search + found count */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={recipeSearchQuery}
            onChange={setRecipeSearchQuery}
            placeholder="Search recipes..."
          />
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-[var(--color-text-muted)] flex-shrink-0">
          {filteredMatches.length} found
        </span>
      </div>

      {/* Row 2: Toggle buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {exactCount > 0 && (
          <button
            onClick={() => { scrollToSection(readySectionRef, setReadySectionOpen); setFilterOverlayOpen(false); }}
            className="text-sm px-3 py-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            {exactCount} ready
          </button>
        )}
        {processingCount > 0 && (
          <button
            onClick={() => { scrollToSection(processingSectionRef, setProcessingSectionOpen); setFilterOverlayOpen(false); }}
            className="text-sm px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            {processingCount} processing
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAllRecipes(!showAllRecipes)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none ${
            showAllRecipes
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          Show all
        </button>
        <button
          type="button"
          onClick={() => setShowOwnedOnly(!showOwnedOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showOwnedOnly
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
          Owned{ownedRecipes.length > 0 ? ` (${ownedRecipes.length})` : ''}
        </button>
        {selectedIngredients.length > 0 && (
          <FocusToggleButton
            isOpen={showFocusDock}
            activeCount={focusIngredientFilters.filter(id => selectedIngredients.includes(id)).length}
            onToggle={() => setShowFocusDock(!showFocusDock)}
            onClear={clearFocusIngredientFilters}
          />
        )}
      </div>

      {/* Row 3: Dropdown filters */}
      <div className="flex gap-1.5 mt-3">
        <MultiSelectDropdown
          options={recipeCategories}
          selected={recipeCategoryFilters}
          onToggle={toggleRecipeCategoryFilter}
          placeholder="Types"
          className="flex-shrink-0"
        />
        <MultiSelectDropdown
          options={effects}
          selected={effectFilters}
          onToggle={toggleEffectFilter}
          placeholder="Effects"
          className="flex-shrink-0"
        />
        <MultiSelectDropdown
          options={characterOptions}
          selected={characterFilters}
          onToggle={toggleCharacterFilter}
          placeholder="Gifts"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0" />
        <SortDropdown
          options={[
            { value: 'missing', label: '# Missing' },
            { value: 'price_desc', label: 'Price: High → Low' },
            { value: 'price_asc', label: 'Price: Low → High' },
            { value: 'name', label: 'Name A-Z' },
          ]}
          value={recipeSortBy}
          onChange={(val) => setRecipeSortBy(val as 'missing' | 'price_asc' | 'price_desc' | 'name')}
          placeholder="Sort"
          className="flex-shrink-0"
        />
      </div>
    </>
  );

  // Filter controls JSX - for desktop/tablet header
  const filterControlsJSX = (
    <>
      {/* Search with Show all on same line */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={recipeSearchQuery}
            onChange={setRecipeSearchQuery}
            placeholder="Search recipes..."
          />
        </div>
        {/* Show all toggle - outline pill */}
        <button
          type="button"
          onClick={() => setShowAllRecipes(!showAllRecipes)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none ${
            showAllRecipes
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          Show all
        </button>
        {/* Owned toggle - green when active */}
        <button
          type="button"
          onClick={() => setShowOwnedOnly(!showOwnedOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showOwnedOnly
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
          Owned{ownedRecipes.length > 0 ? ` (${ownedRecipes.length})` : ''}
        </button>
        {/* Focus toggle - only when ingredients selected */}
        {selectedIngredients.length > 0 && (
          <FocusToggleButton
            isOpen={showFocusDock}
            activeCount={focusIngredientFilters.filter(id => selectedIngredients.includes(id)).length}
            onToggle={() => setShowFocusDock(!showFocusDock)}
            onClear={clearFocusIngredientFilters}
          />
        )}
      </div>

      {/* Filters row */}
      <div className="flex gap-1.5 mt-3">
        {/* Category filter - multi-select dropdown */}
        <MultiSelectDropdown
          options={recipeCategories}
          selected={recipeCategoryFilters}
          onToggle={toggleRecipeCategoryFilter}
          placeholder="Types"
          className="flex-shrink-0"
        />

        {/* Effect filter - multi-select dropdown */}
        <MultiSelectDropdown
          options={effects}
          selected={effectFilters}
          onToggle={toggleEffectFilter}
          placeholder="Effects"
          className="flex-shrink-0"
        />

        {/* Character gift filter - multi-select dropdown */}
        <MultiSelectDropdown
          options={characterOptions}
          selected={characterFilters}
          onToggle={toggleCharacterFilter}
          placeholder="Gifts"
          className="flex-shrink-0"
        />

        {/* Spacer to push sort to the right */}
        <div className="flex-1 min-w-0" />

        {/* Sort dropdown */}
        <SortDropdown
          options={[
            { value: 'missing', label: '# Missing' },
            { value: 'price_desc', label: 'Price: High → Low' },
            { value: 'price_asc', label: 'Price: Low → High' },
            { value: 'name', label: 'Name A-Z' },
          ]}
          value={recipeSortBy}
          onChange={(val) => setRecipeSortBy(val as 'missing' | 'price_asc' | 'price_desc' | 'name')}
          placeholder="Sort"
          className="flex-shrink-0"
        />
      </div>
    </>
  );

  return (
    <div className={`flex flex-col bg-white relative ${isMobile ? 'min-h-full h-full' : 'h-full rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden'}`}>
      {/* Mobile Filter Panel - extends from tab bar */}
      {isMobile && showFilterOverlay && (
        <div className={`flex-shrink-0 bg-white border-b border-[var(--color-border)] shadow-sm p-4 z-40 relative ${isFilterClosing ? 'animate-filter-slide-up' : 'animate-filter-slide-down'}`}>
          {mobileFilterControlsJSX}
        </div>
      )}

      {/* Header - fixed at top on desktop/tablet, hidden on mobile (uses overlay) */}
      {!isMobile && (
        <div ref={headerRef} className="p-4 border-b border-[var(--color-border)] bg-white rounded-t-2xl flex-shrink-0">
          {/* Desktop/Tablet title row with stats */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Recipes</h2>
            <div className="flex items-center gap-2">
              {isStale && (
                <button
                  onClick={() => setCommittedIngredients(selectedIngredients)}
                  className="text-sm px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1.5 animate-refresh-appear"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Recipes
                </button>
              )}
              <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-[var(--color-text-muted)]">
                {filteredMatches.length} found
              </span>
              {exactCount > 0 && (
                <button
                  onClick={() => scrollToSection(readySectionRef, setReadySectionOpen)}
                  className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  {exactCount} ready
                </button>
              )}
              {processingCount > 0 && (
                <button
                  onClick={() => scrollToSection(processingSectionRef, setProcessingSectionOpen)}
                  className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  {processingCount} processing
                </button>
              )}
            </div>
          </div>
          {filterControlsJSX}
        </div>
      )}

      {/* Scroll container wrapper - relative for FocusDock positioning */}
      <div className={`relative min-h-0 ${!isMobile && showBookmarksDrawer && bookmarkedRecipes.length > 0 ? 'flex-[1_1_0%]' : 'flex-1'}`}>
        {/* Focus Dock - absolutely positioned over scroll content */}
        {showFocusDock && selectedIngredients.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
            <div className="pointer-events-auto">
              <FocusDock
                ingredients={sortedSelectedIngredients}
                focusedIds={focusIngredientFilters}
                onToggle={toggleFocusIngredientFilter}
                ingredientMap={ingredientMap}
              />
            </div>
          </div>
        )}
        {/* Scroll container for content */}
        <div ref={scrollRef} className="overflow-y-auto h-full">
        {/* Results content */}
        <div className={isMobile ? 'p-4' : 'p-4 pr-5'} style={isMobile ? { paddingBottom: '300px' } : undefined}>
        {bookmarksOnly && bookmarkedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg
              className="w-16 h-16 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No bookmarked recipes</p>
            <p className="text-sm text-center">
              Swipe right on a recipe card to bookmark it
            </p>
          </div>
        ) : showOwnedOnly && ownedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg
              className="w-16 h-16 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No owned recipes</p>
            <p className="text-sm text-center">
              Swipe left on a recipe card to mark it as owned
            </p>
          </div>
        ) : !showAllRecipes && committedIngredients.length === 0 && !hasFilters && !bookmarksOnly ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-lg font-medium mb-2">Select ingredients to start</p>
            <p className="text-sm text-center">
              Choose ingredients from your inventory, or check "Show all" to browse all recipes
            </p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No recipes found</p>
            <p className="text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : (
          // Grouped view with sorting within each group
          <div className="space-y-4">
            {/* Exact matches - Ready to Cook */}
            {groupedMatches.exact.length > 0 && (
              <div ref={readySectionRef}>
                <CollapsibleSection
                  title="Ready to Cook"
                  count={groupedMatches.exact.length}
                  colorClass="text-green-700"
                  icon={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                  isOpen={readySectionOpen}
                  onToggle={setReadySectionOpen}
                >
                  <CardGrid isMobile={isMobile}>
                    {groupedMatches.exact.map((match, index) => (
                      <CardComponent
                        key={match.recipe.id}
                        match={match}
                        ingredientMap={ingredientMap}
                        effectMap={effectMap}
                        characterMap={characterMap}
                        giftToCharacters={giftToCharacters}
                        selectedIngredients={selectedIngredients}
                        committedIngredients={committedIngredients}
                        focusedIngredients={focusIngredientFilters}
                        index={index}
                      />
                    ))}
                  </CardGrid>
                </CollapsibleSection>
              </div>
            )}

            {/* Needs Processing */}
            {groupedMatches.needsProcessing.length > 0 && (
              <div ref={processingSectionRef}>
                <CollapsibleSection
                  title="Needs Processing"
                  count={groupedMatches.needsProcessing.length}
                  colorClass="text-blue-700"
                  icon={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                  isOpen={processingSectionOpen}
                  onToggle={setProcessingSectionOpen}
                >
                  <CardGrid isMobile={isMobile}>
                    {groupedMatches.needsProcessing.map((match, index) => (
                      <CardComponent
                        key={match.recipe.id}
                        match={match}
                        ingredientMap={ingredientMap}
                        effectMap={effectMap}
                        characterMap={characterMap}
                        giftToCharacters={giftToCharacters}
                        selectedIngredients={selectedIngredients}
                        committedIngredients={committedIngredients}
                        focusedIngredients={focusIngredientFilters}
                        index={index}
                      />
                    ))}
                  </CardGrid>
                </CollapsibleSection>
              </div>
            )}

            {/* Partial matches by missing count */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
              (count) =>
                groupedMatches.missing[count] &&
                groupedMatches.missing[count].length > 0 && (
                  <CollapsibleSection
                    key={count}
                    title={`Need ${count} More`}
                    count={groupedMatches.missing[count].length}
                    colorClass="text-amber-700"
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                    defaultOpen={count <= 2}
                  >
                    <CardGrid isMobile={isMobile}>
                      {groupedMatches.missing[count].map((match, index) => (
                        <CardComponent
                          key={match.recipe.id}
                          match={match}
                          ingredientMap={ingredientMap}
                          effectMap={effectMap}
                          characterMap={characterMap}
                          giftToCharacters={giftToCharacters}
                          selectedIngredients={selectedIngredients}
                          committedIngredients={committedIngredients}
                          focusedIngredients={focusIngredientFilters}
                          index={index}
                        />
                      ))}
                    </CardGrid>
                  </CollapsibleSection>
                )
            )}
          </div>
        )}
        {/* Mobile scroll spacer */}
        {isMobile && <div style={{ height: '100vh', flexShrink: 0 }} />}
        </div>
        </div>
      </div>

      {/* Bookmarks Drawer - tablet/desktop only, shows when there are bookmarks */}
      {!isMobile && bookmarkedRecipes.length > 0 && (
        <div
          className={`bg-white border-t-2 border-red-200 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out ${showBookmarksDrawer ? 'flex-[3_1_0%]' : 'flex-shrink-0'}`}
        >
          {/* Header - always visible, clickable to expand/collapse */}
          <button
            onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
            className="flex items-center justify-between px-4 py-3 bg-red-50 flex-shrink-0 w-full text-left hover:bg-red-100 transition-colors"
          >
            <h3 className="font-semibold text-red-700 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmarked Recipes ({bookmarkedRecipes.length})
            </h3>
            <svg className={`w-5 h-5 text-red-500 transition-transform duration-300 ${showBookmarksDrawer ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Content - scrollable, only shown when expanded */}
          {showBookmarksDrawer && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 pt-10 border-t border-red-100">
              <CardGrid>
                {(() => {
                  const bookmarkSet = new Set(bookmarkedRecipes);
                  const bookmarkedMatches = matches.filter(m => bookmarkSet.has(m.recipe.id));
                  return bookmarkedMatches.map((match, index) => (
                    <RecipeCard
                      key={match.recipe.id}
                      match={match}
                      ingredientMap={ingredientMap}
                      effectMap={effectMap}
                      characterMap={characterMap}
                      giftToCharacters={giftToCharacters}
                      selectedIngredients={selectedIngredients}
                      committedIngredients={committedIngredients}
                      focusedIngredients={focusIngredientFilters}
                      index={index}
                    />
                  ));
                })()}
              </CardGrid>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
