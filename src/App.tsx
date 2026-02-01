import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useGameData, useIngredientMap, useEffectMap, useCharacterMap } from './hooks/useGameData';
import { Header } from './components/layout/Header';
import { IngredientSelector } from './components/ingredients/IngredientSelector';
import { RecipeResults, type RecipeResultsHandle } from './components/recipes/RecipeResults';
import { SettingsModal } from './components/ui/SettingsModal';
import { useInventoryStore } from './store/inventoryStore';
import { useSettingsStore } from './store/settingsStore';
import { useBookmarkStore } from './store/bookmarkStore';
import { FishingResults } from './components/fishing/FishingResults';
import { CritterResults } from './components/critters/CritterResults';
import { findRecipes } from './lib/recipeEngine';
import type { ScrollToTopHandle } from './hooks/useScrollToTop';

const LONG_PRESS_DURATION = 3000;
const TAP_THRESHOLD = 200; // Only toggle if press was shorter than this (ms)
const CLEAR_TEXT_DELAY = 300; // Show "Clear" text after this duration (ms)

function App() {
  const { ingredients, recipes, categories, effects, processing, characters, giftToCharacters, fish, fishCategories, critters, critterCategories, isLoading, error } = useGameData();
  const ingredientMap = useIngredientMap(ingredients);
  const effectMap = useEffectMap(effects);
  const characterMap = useCharacterMap(characters);
  const [activePage, setActivePage] = useState<'kitchen' | 'fishing' | 'critters'>('kitchen');
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes'>('ingredients');
  const { selectedIngredients, ownedUtensils, clearInventory } = useInventoryStore();
  const { showBookmarksView, setShowBookmarksView, showSettingsModal, setShowSettingsModal } = useSettingsStore();
  const { bookmarkedRecipes } = useBookmarkStore();

  // State for "show only selected" filter (controlled from tab badge)
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Refs for mobile scroll-to-top functionality
  const ingredientSelectorRef = useRef<ScrollToTopHandle>(null);
  const recipeResultsRef = useRef<RecipeResultsHandle>(null);

  // Long press tracking for clearing ingredients
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number | null>(null);
  const [badgePressProgress, setBadgePressProgress] = useState(0);
  const [showBadgeClearText, setShowBadgeClearText] = useState(false);
  const badgeInteractionRef = useRef(false); // Track if badge was interacted with
  const touchActiveRef = useRef(false); // Track if touch is active (blocks synthetic click)
  const clearTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressClearTimeRef = useRef<number>(0); // Timestamp when long press clear happened

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

  // Animation for badge press progress
  const animateBadgeProgress = useCallback(() => {
    if (pressStartTimeRef.current === null) return;

    const elapsed = Date.now() - pressStartTimeRef.current;
    const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
    setBadgePressProgress(progress);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateBadgeProgress);
    }
  }, []);

  // Handler for iOS status bar tap - scroll active tab to top
  const handleStatusBarTap = useCallback(() => {
    if (activeTab === 'ingredients') {
      ingredientSelectorRef.current?.scrollToTop();
    } else {
      recipeResultsRef.current?.scrollToTop();
    }
  }, [activeTab]);

  // Calculate recipe counts for tab badges
  const { readyCount, processingCount } = useMemo(() => {
    if (!recipes.length) {
      return { readyCount: 0, processingCount: 0 };
    }
    const inventory = new Set(selectedIngredients);
    const utensils = new Set(ownedUtensils);
    const matches = findRecipes(inventory, recipes, utensils, categories.variantGroups, 999, processing);

    const ready = matches.filter(m => m.matchType === 'exact').length;
    const needsProcessing = matches.filter(m => m.matchType === 'needs_processing').length;

    return { readyCount: ready, processingCount: needsProcessing };
  }, [selectedIngredients, ownedUtensils, recipes, categories.variantGroups, processing]);

  // Handlers for ingredient count badge
  const handleIngredientBadgeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    badgeInteractionRef.current = true;
    touchActiveRef.current = true; // Block synthetic click
    longPressTriggeredRef.current = false;
    pressStartTimeRef.current = Date.now();
    setBadgePressProgress(0);
    setShowBadgeClearText(false);

    // Start progress animation
    animationFrameRef.current = requestAnimationFrame(animateBadgeProgress);

    // Show "Clear" text after delay
    clearTextTimerRef.current = setTimeout(() => {
      setShowBadgeClearText(true);
      clearTextTimerRef.current = null;
    }, CLEAR_TEXT_DELAY);

    longPressTimerRef.current = setTimeout(() => {
      // Reset all state and refs BEFORE calling clearInventory
      // This is critical because clearInventory will cause the badge to unmount
      longPressTimerRef.current = null;
      longPressTriggeredRef.current = true;
      setBadgePressProgress(0);
      setShowBadgeClearText(false);
      pressStartTimeRef.current = null;
      // Reset touchActiveRef so NEW touches work immediately
      touchActiveRef.current = false;
      // Record timestamp of when long press clear happened
      // This is used to block clicks on the tab for a brief period
      longPressClearTimeRef.current = Date.now();
      // Now clear the inventory (this will unmount the badge)
      clearInventory();
      setShowOnlySelected(false);
    }, LONG_PRESS_DURATION);
  }, [clearInventory, animateBadgeProgress]);

  const handleIngredientBadgeTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent click event from firing

    // If long press already triggered and handled everything, just reset and return
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      // Touch flags already reset by the long press timer
      return;
    }

    // Calculate press duration before resetting
    const pressDuration = pressStartTimeRef.current ? Date.now() - pressStartTimeRef.current : 0;
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
    setBadgePressProgress(0);
    setShowBadgeClearText(false);
    pressStartTimeRef.current = null;

    // Only toggle if it was a quick tap
    if (wasQuickTap) {
      setShowOnlySelected(prev => !prev);
    }

    // Reset touch flags immediately
    badgeInteractionRef.current = false;
    touchActiveRef.current = false;
  }, []);

  const handleIngredientBadgeTouchCancel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
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
    setBadgePressProgress(0);
    setShowBadgeClearText(false);
    pressStartTimeRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTriggeredRef.current = false;
    // Reset touch flags immediately
    badgeInteractionRef.current = false;
    touchActiveRef.current = false;
  }, []);

  const handleIngredientBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    // Skip if this is a synthetic click from touch - touch handlers already dealt with it
    if (touchActiveRef.current || badgeInteractionRef.current) {
      return;
    }
    // This is a real mouse click (desktop), toggle the filter
    setShowOnlySelected(prev => !prev);
  }, []);

  // Ref to track if ready badge touch is active
  const readyBadgeTouchRef = useRef(false);

  // Handler for ready badge - shared logic
  const triggerReadyBadgeAction = useCallback(() => {
    setActiveTab('recipes');
    // Small delay to let tab switch, then scroll
    setTimeout(() => {
      recipeResultsRef.current?.scrollToReady();
    }, 50);
  }, []);

  // Touch handlers for ready badge - responds immediately without 300ms delay
  const handleReadyBadgeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    readyBadgeTouchRef.current = true;
    badgeInteractionRef.current = true;
  }, []);

  const handleReadyBadgeTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent synthetic click
    if (readyBadgeTouchRef.current) {
      triggerReadyBadgeAction();
    }
    readyBadgeTouchRef.current = false;
    badgeInteractionRef.current = false;
  }, [triggerReadyBadgeAction]);

  const handleReadyBadgeTouchCancel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    readyBadgeTouchRef.current = false;
    badgeInteractionRef.current = false;
  }, []);

  // Handler for ready badge click (desktop only)
  const handleReadyBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip if touch just handled it
    if (readyBadgeTouchRef.current || badgeInteractionRef.current) {
      return;
    }
    triggerReadyBadgeAction();
  }, [triggerReadyBadgeAction]);

  // Ref to track if processing badge touch is active
  const processingBadgeTouchRef = useRef(false);

  // Handler for processing badge - shared logic
  const triggerProcessingBadgeAction = useCallback(() => {
    setActiveTab('recipes');
    // Small delay to let tab switch, then scroll
    setTimeout(() => {
      recipeResultsRef.current?.scrollToProcessing();
    }, 50);
  }, []);

  // Touch handlers for processing badge - responds immediately without 300ms delay
  const handleProcessingBadgeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    processingBadgeTouchRef.current = true;
    badgeInteractionRef.current = true;
  }, []);

  const handleProcessingBadgeTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent synthetic click
    if (processingBadgeTouchRef.current) {
      triggerProcessingBadgeAction();
    }
    processingBadgeTouchRef.current = false;
    badgeInteractionRef.current = false;
  }, [triggerProcessingBadgeAction]);

  const handleProcessingBadgeTouchCancel = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    processingBadgeTouchRef.current = false;
    badgeInteractionRef.current = false;
  }, []);

  // Handler for processing badge click (desktop only)
  const handleProcessingBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip if touch just handled it
    if (processingBadgeTouchRef.current || badgeInteractionRef.current) {
      return;
    }
    triggerProcessingBadgeAction();
  }, [triggerProcessingBadgeAction]);

  // Ref to track tab touch state
  const tabTouchRef = useRef<{ tab: 'ingredients' | 'recipes'; target: EventTarget | null } | null>(null);

  // Core tab action logic - extracted for reuse
  const executeTabAction = useCallback((tab: 'ingredients' | 'recipes', target: EventTarget | null) => {
    // Check if the target was a badge (or inside a badge)
    if (target instanceof HTMLElement) {
      if (target.hasAttribute('data-badge') || target.closest('[data-badge]')) {
        return;
      }
    }

    // Skip if badge was just interacted with
    if (badgeInteractionRef.current) {
      badgeInteractionRef.current = false;
      return;
    }

    // Skip if touch is active on badge
    if (touchActiveRef.current) {
      return;
    }

    // Skip if a long press clear just happened (within 500ms)
    if (Date.now() - longPressClearTimeRef.current < 500) {
      return;
    }

    if (activeTab === tab) {
      // Already on this tab - toggle filters visibility if clicked on icon/text area
      if (target instanceof HTMLElement) {
        const isFilterToggleArea = target.hasAttribute('data-filter-toggle') || target.closest('[data-filter-toggle]');
        if (!isFilterToggleArea) {
          return;
        }
      }
      // Toggle filters - if visible (scrollTop near 0), hide them; otherwise reveal them
      if (tab === 'ingredients') {
        ingredientSelectorRef.current?.toggleFilters?.();
      } else {
        recipeResultsRef.current?.toggleFilters?.();
      }
    } else {
      // Switching tabs
      setActiveTab(tab);
    }
  }, [activeTab]);

  // Touch handlers for tabs - respond immediately without 300ms delay
  const handleTabTouchStart = useCallback((tab: 'ingredients' | 'recipes', e: React.TouchEvent) => {
    tabTouchRef.current = { tab, target: e.target };
  }, []);

  const handleTabTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent synthetic click
    if (tabTouchRef.current) {
      executeTabAction(tabTouchRef.current.tab, tabTouchRef.current.target);
    }
    tabTouchRef.current = null;
  }, [executeTabAction]);

  const handleTabTouchCancel = useCallback(() => {
    tabTouchRef.current = null;
  }, []);

  // Handle tab clicks (desktop only - touch is handled separately)
  const handleTabClick = (tab: 'ingredients' | 'recipes', e?: React.MouseEvent | React.TouchEvent) => {
    // Skip if touch just handled it
    if (tabTouchRef.current) {
      return;
    }
    executeTabAction(tab, e?.target || null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)]">Loading recipes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-700 font-semibold mb-2">Error loading data</h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ minHeight: '200vh', height: '100%' }}>
      <Header onStatusBarTap={handleStatusBarTap} activePage={activePage} onPageChange={setActivePage} />

      {/* Content wrapper with khaki background */}
      <div className="flex-1 flex flex-col bg-[var(--color-background)]" style={{ minHeight: '150vh' }}>
      {/* Mobile Tab Navigation - folder tab style (phones only, kitchen page only) */}
      <div className={`tablet:hidden flex gap-2 bg-[var(--color-surface-elevated)] px-2 pt-2 select-none no-transitions relative z-10 tab-bar-border ${activePage !== 'kitchen' ? 'hidden' : ''}`} style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
        {showBookmarksView ? (
          /* Bookmarks view - single tab */
          <div className="flex-1 relative">
            <button
              onClick={() => setShowBookmarksView(false)}
              className="w-full py-2.5 px-4 text-sm font-medium relative rounded-t-lg bg-red-500 text-white tab-active tab-active-amber"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Bookmarked Recipes
              </span>
            </button>
            {bookmarkedRecipes.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-red-600 text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center z-20">
                {bookmarkedRecipes.length}
              </span>
            )}
          </div>
        ) : (
          /* Normal tabs */
          <>
            {/* Ingredients tab wrapper - relative positioning for badge */}
            <div className="flex-1 relative">
              <button
                onClick={(e) => handleTabClick('ingredients', e)}
                onTouchStart={(e) => handleTabTouchStart('ingredients', e)}
                onTouchEnd={handleTabTouchEnd}
                onTouchCancel={handleTabTouchCancel}
                className={`w-full py-2.5 px-4 text-sm font-medium relative rounded-t-lg ${
                  activeTab === 'ingredients'
                    ? 'bg-white text-[var(--color-primary)] tab-active'
                    : 'bg-[#F7F2EB] text-[var(--color-text-muted)]'
                }`}
              >
                <span data-filter-toggle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Ingredients
                </span>
              </button>
              {/* Badge positioned OUTSIDE the button to prevent event bubbling issues */}
              {selectedIngredients.length > 0 && (
                <span
                  data-badge="ingredients"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center select-none overflow-hidden z-20 ${
                    showBadgeClearText
                      ? 'bg-gray-300 text-[var(--color-text-muted)]'
                      : 'bg-[var(--color-secondary)] text-white'
                  }`}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                  onClick={handleIngredientBadgeClick}
                  onTouchStart={handleIngredientBadgeTouchStart}
                  onTouchEnd={handleIngredientBadgeTouchEnd}
                  onTouchCancel={handleIngredientBadgeTouchCancel}
                >
                  {/* Red progress overlay */}
                  {badgePressProgress > 0 && (
                    <span
                      className="absolute inset-0 bg-red-500 rounded-full"
                      style={{
                        width: `${badgePressProgress * 100}%`,
                        transition: 'none',
                      }}
                    />
                  )}
                  <span className="relative z-10">{showBadgeClearText ? 'Clear' : selectedIngredients.length}</span>
                </span>
              )}
            </div>
            {/* Recipes tab wrapper - same structure as Ingredients for equal width */}
            <div className="flex-1 relative">
              <button
                onClick={(e) => handleTabClick('recipes', e)}
                onTouchStart={(e) => handleTabTouchStart('recipes', e)}
                onTouchEnd={handleTabTouchEnd}
                onTouchCancel={handleTabTouchCancel}
                className={`w-full py-2.5 px-4 text-sm font-medium relative rounded-t-lg ${
                  activeTab === 'recipes'
                    ? 'bg-white text-[var(--color-primary)] tab-active'
                    : 'bg-[#F7F2EB] text-[var(--color-text-muted)]'
                }`}
              >
                <span data-filter-toggle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Recipes
                </span>
              </button>
              {/* Recipe badges positioned OUTSIDE the button */}
              {(readyCount > 0 || processingCount > 0) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                  {readyCount > 0 && (
                    <span
                      data-badge="ready"
                      className="bg-green-500 text-white text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center"
                      onClick={handleReadyBadgeClick}
                      onTouchStart={handleReadyBadgeTouchStart}
                      onTouchEnd={handleReadyBadgeTouchEnd}
                      onTouchCancel={handleReadyBadgeTouchCancel}
                    >
                      {readyCount}
                    </span>
                  )}
                  {processingCount > 0 && (
                    <span
                      data-badge="processing"
                      className="bg-blue-500 text-white text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center"
                      onClick={handleProcessingBadgeClick}
                      onTouchStart={handleProcessingBadgeTouchStart}
                      onTouchEnd={handleProcessingBadgeTouchEnd}
                      onTouchCancel={handleProcessingBadgeTouchCancel}
                    >
                      {processingCount}
                    </span>
                  )}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tablet: Side-by-side layout (portrait tablets like iPad Mini) */}
      <main className="hidden tablet:block lg:hidden flex-1 w-full overflow-hidden">
        {activePage === 'kitchen' ? (
          <div className="grid grid-cols-[40%_60%] h-[calc(100vh-80px)]">
            {/* Ingredient Selector (1/3 left) */}
            <div className="h-full overflow-hidden border-r border-[var(--color-border)]">
              <IngredientSelector
                ingredients={ingredients}
                categories={categories.ingredientCategories}
                isMobile={true}
              />
            </div>

            {/* Recipe Results (2/3 right) */}
            <div className="h-full overflow-hidden">
              <RecipeResults
                recipes={recipes}
                ingredients={ingredients}
                effects={effects}
                processing={processing}
                recipeCategories={categories.recipeCategories}
                ingredientCategories={categories.ingredientCategories}
                variantGroups={categories.variantGroups}
                ingredientMap={ingredientMap}
                effectMap={effectMap}
                characterMap={characterMap}
                giftToCharacters={giftToCharacters}
                isMobile={true}
              />
            </div>
          </div>
        ) : activePage === 'fishing' ? (
          <div className="h-[calc(100vh-80px)]">
            <FishingResults
              fish={fish}
              fishCategories={fishCategories}
              isMobile={true}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-80px)]">
            <CritterResults
              critters={critters}
              critterCategories={critterCategories}
              isMobile={true}
            />
          </div>
        )}
      </main>

      {/* Desktop: Side-by-side layout with fixed sidebar */}
      <main className="hidden lg:block flex-1 max-w-7xl mx-auto w-full p-4 overflow-hidden">
        {activePage === 'kitchen' ? (
          <div className="grid lg:grid-cols-[380px_1fr] gap-4 h-[calc(100vh-140px)]">
            {/* Ingredient Selector (Sidebar) */}
            <div className="h-full overflow-hidden">
              <IngredientSelector
                ingredients={ingredients}
                categories={categories.ingredientCategories}
              />
            </div>

            {/* Recipe Results (Main) */}
            <div className="h-full overflow-hidden">
              <RecipeResults
                recipes={recipes}
                ingredients={ingredients}
                effects={effects}
                processing={processing}
                recipeCategories={categories.recipeCategories}
                ingredientCategories={categories.ingredientCategories}
                variantGroups={categories.variantGroups}
                ingredientMap={ingredientMap}
                effectMap={effectMap}
                characterMap={characterMap}
                giftToCharacters={giftToCharacters}
              />
            </div>
          </div>
        ) : activePage === 'fishing' ? (
          <div className="h-[calc(100vh-140px)]">
            <FishingResults
              fish={fish}
              fishCategories={fishCategories}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-140px)]">
            <CritterResults
              critters={critters}
              critterCategories={critterCategories}
            />
          </div>
        )}
      </main>

      {/* Mobile phones: Tab-based full-width layout */}
      {/* Keep all components mounted but hidden to avoid remount lag on tab switch */}
      <main className="tablet:hidden relative" style={{ flex: '1 1 0', overflow: 'hidden' }}>
        {activePage === 'kitchen' ? (
          <>
            {/* Bookmarks view */}
            <div className={`absolute inset-0 ${showBookmarksView ? '' : 'invisible pointer-events-none'}`}>
              <RecipeResults
                ref={showBookmarksView ? recipeResultsRef : undefined}
                recipes={recipes}
                ingredients={ingredients}
                effects={effects}
                processing={processing}
                recipeCategories={categories.recipeCategories}
                ingredientCategories={categories.ingredientCategories}
                variantGroups={categories.variantGroups}
                ingredientMap={ingredientMap}
                effectMap={effectMap}
                characterMap={characterMap}
                giftToCharacters={giftToCharacters}
                isMobile={true}
                bookmarksOnly={true}
              />
            </div>
            {/* Ingredients tab */}
            <div className={`absolute inset-0 ${!showBookmarksView && activeTab === 'ingredients' ? '' : 'invisible pointer-events-none'}`}>
              <IngredientSelector
                ref={ingredientSelectorRef}
                ingredients={ingredients}
                categories={categories.ingredientCategories}
                isMobile={true}
                showOnlySelected={showOnlySelected}
                onShowOnlySelectedChange={setShowOnlySelected}
              />
            </div>
            {/* Recipes tab */}
            <div className={`absolute inset-0 ${!showBookmarksView && activeTab === 'recipes' ? '' : 'invisible pointer-events-none'}`}>
              <RecipeResults
                ref={!showBookmarksView && activeTab === 'recipes' ? recipeResultsRef : undefined}
                recipes={recipes}
                ingredients={ingredients}
                effects={effects}
                processing={processing}
                recipeCategories={categories.recipeCategories}
                ingredientCategories={categories.ingredientCategories}
                variantGroups={categories.variantGroups}
                ingredientMap={ingredientMap}
                effectMap={effectMap}
                characterMap={characterMap}
                giftToCharacters={giftToCharacters}
                isMobile={true}
              />
            </div>
          </>
        ) : activePage === 'fishing' ? (
          /* Fishing page - full width */
          <div className="absolute inset-0">
            <FishingResults
              fish={fish}
              fishCategories={fishCategories}
              isMobile={true}
            />
          </div>
        ) : (
          /* Critters page - full width */
          <div className="absolute inset-0">
            <CritterResults
              critters={critters}
              critterCategories={critterCategories}
              isMobile={true}
            />
          </div>
        )}
      </main>
      </div>{/* End content wrapper */}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        recipes={recipes}
        utensils={categories.utensils}
      />
    </div>
  );
}

export default App;
