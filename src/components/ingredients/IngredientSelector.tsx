import { useMemo, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Ingredient, IngredientCategory } from '../../types';
import { useInventoryStore } from '../../store/inventoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useIngredientSearch } from '../../hooks/useIngredientSearch';
import { useScrollToTop, type ScrollToTopHandle } from '../../hooks/useScrollToTop';
import { useAnimatedVisibility } from '../../hooks/useAnimatedVisibility';
import { SearchInput } from '../ui/SearchInput';
import { IngredientItem } from './IngredientItem';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { SelectionPill } from '../ui/SelectionPill';

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  isMobile?: boolean;
  showOnlySelected?: boolean;
  onShowOnlySelectedChange?: (show: boolean) => void;
}

export const IngredientSelector = forwardRef<ScrollToTopHandle, IngredientSelectorProps>(function IngredientSelector({
  ingredients,
  categories,
  isMobile = false,
  showOnlySelected: externalShowOnlySelected,
  onShowOnlySelectedChange,
}, ref) {
  const { scrollRef, scrollToTop } = useScrollToTop();
  const headerRef = useRef<HTMLDivElement>(null);

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

  useImperativeHandle(ref, () => ({
    scrollToTop,
    scrollToFilters,
    hideFilters,
    toggleFilters,
  }));

  const { selectedIngredients, toggleIngredient, clearInventory } = useInventoryStore();
  const { viewMode, setViewMode, ingredientCategoryFilters, toggleIngredientCategoryFilter, searchQuery, setSearchQuery } =
    useSettingsStore();
  const [internalShowOnlySelected, setInternalShowOnlySelected] = useState(false);

  // Use external state if provided, otherwise use internal
  const showOnlySelected = externalShowOnlySelected ?? internalShowOnlySelected;
  const setShowOnlySelected = onShowOnlySelectedChange ?? setInternalShowOnlySelected;

  // Search and filter ingredients
  const searchedIngredients = useIngredientSearch({
    ingredients,
    query: searchQuery,
    categoryFilters: ingredientCategoryFilters,
  });

  // Apply "show only selected" filter and deduplicate
  const filteredIngredients = useMemo(() => {
    let result = searchedIngredients;

    if (showOnlySelected) {
      result = result.filter((ing) => selectedIngredients.includes(ing.id));
    }

    // Deduplicate by ID (in case search returns duplicates)
    const seen = new Set<string>();
    return result.filter((ing) => {
      if (seen.has(ing.id)) {
        return false;
      }
      seen.add(ing.id);
      return true;
    });
  }, [searchedIngredients, showOnlySelected, selectedIngredients]);

  // Group ingredients by category for display
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {};

    for (const ing of filteredIngredients) {
      const cat = ing.category || 'other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(ing);
    }

    // Sort each group by name
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [filteredIngredients]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ing of ingredients) {
      const cat = ing.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [ingredients]);

  const selectedCount = selectedIngredients.length;

  // Filter controls JSX - shared between inline header and overlay
  const filterControlsJSX = (
    <>
      {/* Search with selection controls on same line for mobile */}
      <div className="flex items-center gap-2 select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search ingredients..."
          />
        </div>
        {/* Mobile selection controls - pill style */}
        <div className="flex tablet:hidden items-center gap-2 select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
          <SelectionPill
            count={selectedCount}
            isActive={showOnlySelected}
            onToggle={() => setShowOnlySelected(!showOnlySelected)}
            onClear={() => { clearInventory(); setShowOnlySelected(false); }}
          />
        </div>
      </div>

      {/* View toggle and category filter */}
      <div className="flex items-center gap-2 mt-3 select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
        {/* View mode toggle - Single button on tablet, two buttons on desktop */}
        {/* Tablet: Single toggle button */}
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="lg:hidden px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-primary)] text-white select-none"
          aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        >
          {viewMode === 'grid' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Desktop: Two-button toggle */}
        <div className="hidden lg:flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm ${
              viewMode === 'list'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-[var(--color-text-muted)] hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm ${
              viewMode === 'grid'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-[var(--color-text-muted)] hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>

        {/* Category filter dropdown */}
        <MultiSelectDropdown
          options={categories.map((cat) => ({
            id: cat.id,
            name: `${cat.name} (${categoryCounts[cat.id] || 0})`,
          }))}
          selected={ingredientCategoryFilters}
          onToggle={toggleIngredientCategoryFilter}
          placeholder="All Categories"
        />
      </div>
    </>
  );

  return (
    <div className={`flex flex-col bg-white ${isMobile ? 'min-h-full h-full' : 'h-full rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden'}`}>
      {/* Mobile Filter Panel - extends from tab bar */}
      {isMobile && showFilterOverlay && (
        <div className={`flex-shrink-0 bg-white border-b border-[var(--color-border)] shadow-sm p-4 z-40 relative ${isFilterClosing ? 'animate-filter-slide-up' : 'animate-filter-slide-down'}`}>
          {filterControlsJSX}
        </div>
      )}

      {/* Header - fixed at top on desktop/tablet, hidden on mobile (uses overlay) */}
      {!isMobile && (
        <div ref={headerRef} className="p-4 border-b border-[var(--color-border)] bg-white select-none rounded-t-2xl flex-shrink-0" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
          {/* Desktop/Tablet title row with selection controls */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Ingredients</h2>
            <SelectionPill
              count={selectedCount}
              isActive={showOnlySelected}
              onToggle={() => setShowOnlySelected(!showOnlySelected)}
              onClear={() => { clearInventory(); setShowOnlySelected(false); }}
            />
          </div>
          {filterControlsJSX}
        </div>
      )}

      {/* Scroll container for content only */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Ingredient list content */}
        <div className={isMobile ? 'p-2' : 'p-2 pr-3'} style={isMobile ? { paddingBottom: '300px' } : undefined}>
          {Object.keys(groupedIngredients).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-muted)]">
              <svg
                className="w-12 h-12 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm">No ingredients found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-4 tablet:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredIngredients.map((ing) => (
                  <IngredientItem
                    key={ing.id}
                    ingredient={ing}
                    isSelected={selectedIngredients.includes(ing.id)}
                    onToggle={() => toggleIngredient(ing.id)}
                    viewMode="grid"
                  />
                ))}
              </div>
              {/* Mobile scroll spacer */}
              {isMobile && <div style={{ height: '75vh', flexShrink: 0 }} />}
            </>
          ) : (
            <>
              <div className="space-y-4">
                {categories
                  .filter((cat) => groupedIngredients[cat.id]?.length > 0)
                  .map((category) => (
                    <div key={category.id}>
                      <h3 className="text-sm font-semibold text-[var(--color-text-muted)] px-2 mb-2 flex items-center gap-2">
                        {category.name}
                        <span className="text-xs font-normal">
                          ({groupedIngredients[category.id]?.length || 0})
                        </span>
                      </h3>
                      <div className="space-y-1">
                        {groupedIngredients[category.id]?.map((ing) => (
                          <IngredientItem
                            key={ing.id}
                            ingredient={ing}
                            isSelected={selectedIngredients.includes(ing.id)}
                            onToggle={() => toggleIngredient(ing.id)}
                            viewMode="list"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
              {/* Mobile scroll spacer */}
              {isMobile && <div style={{ height: '75vh', flexShrink: 0 }} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
