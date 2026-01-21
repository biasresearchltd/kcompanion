import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RecipeSortBy = 'missing' | 'price_asc' | 'price_desc' | 'name';

interface SettingsState {
  // Ingredient panel settings
  viewMode: 'list' | 'grid';
  sortBy: 'name' | 'category' | 'commonRank';
  ingredientCategoryFilters: string[];
  searchQuery: string;

  // Recipe panel settings
  effectFilters: string[];
  recipeCategoryFilters: string[];
  recipeSearchQuery: string;
  showAllRecipes: boolean;
  recipeSortBy: RecipeSortBy;

  // Focus dock settings
  showFocusDock: boolean;
  focusIngredientFilters: string[];

  // Bookmarks view
  showBookmarksView: boolean;
  showBookmarksDrawer: boolean;  // Desktop/tablet drawer

  // Settings modal
  showSettingsModal: boolean;

  // Actions
  setViewMode: (mode: 'list' | 'grid') => void;
  setSortBy: (sort: 'name' | 'category' | 'commonRank') => void;
  toggleIngredientCategoryFilter: (category: string) => void;
  setSearchQuery: (query: string) => void;
  toggleEffectFilter: (effect: string) => void;
  clearEffectFilters: () => void;
  toggleRecipeCategoryFilter: (category: string) => void;
  clearRecipeCategoryFilters: () => void;
  setRecipeSearchQuery: (query: string) => void;
  setShowAllRecipes: (show: boolean) => void;
  setRecipeSortBy: (sort: RecipeSortBy) => void;
  setShowBookmarksView: (show: boolean) => void;
  setShowBookmarksDrawer: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowFocusDock: (show: boolean) => void;
  toggleFocusIngredientFilter: (ingredientId: string) => void;
  clearFocusIngredientFilters: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sortBy: 'category',
      ingredientCategoryFilters: [],
      searchQuery: '',
      effectFilters: [],
      recipeCategoryFilters: [],
      recipeSearchQuery: '',
      showAllRecipes: false,
      recipeSortBy: 'missing',
      showFocusDock: false,
      focusIngredientFilters: [],
      showBookmarksView: false,
      showBookmarksDrawer: false,
      showSettingsModal: false,

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortBy: (sort) => set({ sortBy: sort }),
      toggleIngredientCategoryFilter: (category) => set((state) => ({
        ingredientCategoryFilters: state.ingredientCategoryFilters.includes(category)
          ? state.ingredientCategoryFilters.filter(c => c !== category)
          : [...state.ingredientCategoryFilters, category]
      })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleEffectFilter: (effect) => set((state) => ({
        effectFilters: state.effectFilters.includes(effect)
          ? state.effectFilters.filter(e => e !== effect)
          : [...state.effectFilters, effect]
      })),
      clearEffectFilters: () => set({ effectFilters: [] }),
      toggleRecipeCategoryFilter: (category) => set((state) => ({
        recipeCategoryFilters: state.recipeCategoryFilters.includes(category)
          ? state.recipeCategoryFilters.filter(c => c !== category)
          : [...state.recipeCategoryFilters, category]
      })),
      clearRecipeCategoryFilters: () => set({ recipeCategoryFilters: [] }),
      setRecipeSearchQuery: (query) => set({ recipeSearchQuery: query }),
      setShowAllRecipes: (show) => set({ showAllRecipes: show }),
      setRecipeSortBy: (sort) => set({ recipeSortBy: sort }),
      setShowBookmarksView: (show) => set({ showBookmarksView: show }),
      setShowBookmarksDrawer: (show) => set({ showBookmarksDrawer: show }),
      setShowSettingsModal: (show) => set({ showSettingsModal: show }),
      setShowFocusDock: (show) => set({ showFocusDock: show }),
      toggleFocusIngredientFilter: (ingredientId) => set((state) => ({
        focusIngredientFilters: state.focusIngredientFilters.includes(ingredientId)
          ? state.focusIngredientFilters.filter(id => id !== ingredientId)
          : [...state.focusIngredientFilters, ingredientId]
      })),
      clearFocusIngredientFilters: () => set({ focusIngredientFilters: [], showFocusDock: false }),
    }),
    {
      name: 'gb-kitchen-settings',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    }
  )
);
