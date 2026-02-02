import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RecipeSortBy = 'missing' | 'price_asc' | 'price_desc' | 'name';
type FishSortBy = 'name' | 'price_asc' | 'price_desc' | 'size';
type CritterSortBy = 'name' | 'price_asc' | 'price_desc';

type ActivePage = 'kitchen' | 'fishing' | 'critters';

interface SettingsState {
  // Active page / mode
  activePage: ActivePage;

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

  // Character gift filter
  characterFilters: string[];

  // Fish filter/sort settings
  fishSizeFilters: string[];
  fishSeasonFilters: string[];
  fishWeatherFilters: string[];
  fishLocationFilters: string[];
  fishSearchQuery: string;
  fishSortBy: FishSortBy;
  showCaughtOnly: boolean;
  showUncaughtOnly: boolean;

  // Critter filter/sort settings
  critterTypeFilters: string[];
  critterRarityFilters: string[];
  critterSeasonFilters: string[];
  critterWeatherFilters: string[];
  critterLocationFilters: string[];
  critterSearchQuery: string;
  critterSortBy: CritterSortBy;
  showCritterCaughtOnly: boolean;
  showCritterUncaughtOnly: boolean;

  // Settings modal
  showSettingsModal: boolean;

  // Actions
  setActivePage: (page: ActivePage) => void;
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
  toggleCharacterFilter: (characterId: string) => void;
  clearCharacterFilters: () => void;
  toggleFishSizeFilter: (size: string) => void;
  clearFishSizeFilters: () => void;
  toggleFishSeasonFilter: (season: string) => void;
  clearFishSeasonFilters: () => void;
  toggleFishWeatherFilter: (weather: string) => void;
  clearFishWeatherFilters: () => void;
  toggleFishLocationFilter: (location: string) => void;
  clearFishLocationFilters: () => void;
  setFishSearchQuery: (query: string) => void;
  setFishSortBy: (sort: FishSortBy) => void;
  setShowCaughtOnly: (show: boolean) => void;
  setShowUncaughtOnly: (show: boolean) => void;
  toggleCritterTypeFilter: (type: string) => void;
  toggleCritterRarityFilter: (rarity: string) => void;
  toggleCritterSeasonFilter: (season: string) => void;
  toggleCritterWeatherFilter: (weather: string) => void;
  toggleCritterLocationFilter: (location: string) => void;
  setCritterSearchQuery: (query: string) => void;
  setCritterSortBy: (sort: CritterSortBy) => void;
  setShowCritterCaughtOnly: (show: boolean) => void;
  setShowCritterUncaughtOnly: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activePage: 'kitchen' as ActivePage,
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
      characterFilters: [],
      fishSizeFilters: [],
      fishSeasonFilters: [],
      fishWeatherFilters: [],
      fishLocationFilters: [],
      fishSearchQuery: '',
      fishSortBy: 'name',
      showCaughtOnly: false,
      showUncaughtOnly: false,
      critterTypeFilters: [],
      critterRarityFilters: [],
      critterSeasonFilters: [],
      critterWeatherFilters: [],
      critterLocationFilters: [],
      critterSearchQuery: '',
      critterSortBy: 'name',
      showCritterCaughtOnly: false,
      showCritterUncaughtOnly: false,
      showSettingsModal: false,

      setActivePage: (page) => set({ activePage: page }),
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
      toggleCharacterFilter: (characterId) => set((state) => ({
        characterFilters: state.characterFilters.includes(characterId)
          ? state.characterFilters.filter(id => id !== characterId)
          : [...state.characterFilters, characterId]
      })),
      clearCharacterFilters: () => set({ characterFilters: [] }),
      toggleFishSizeFilter: (size) => set((state) => ({
        fishSizeFilters: state.fishSizeFilters.includes(size)
          ? state.fishSizeFilters.filter(s => s !== size)
          : [...state.fishSizeFilters, size]
      })),
      clearFishSizeFilters: () => set({ fishSizeFilters: [] }),
      toggleFishSeasonFilter: (season) => set((state) => ({
        fishSeasonFilters: state.fishSeasonFilters.includes(season)
          ? state.fishSeasonFilters.filter(s => s !== season)
          : [...state.fishSeasonFilters, season]
      })),
      clearFishSeasonFilters: () => set({ fishSeasonFilters: [] }),
      toggleFishWeatherFilter: (weather) => set((state) => ({
        fishWeatherFilters: state.fishWeatherFilters.includes(weather)
          ? state.fishWeatherFilters.filter(w => w !== weather)
          : [...state.fishWeatherFilters, weather]
      })),
      clearFishWeatherFilters: () => set({ fishWeatherFilters: [] }),
      toggleFishLocationFilter: (location) => set((state) => ({
        fishLocationFilters: state.fishLocationFilters.includes(location)
          ? state.fishLocationFilters.filter(l => l !== location)
          : [...state.fishLocationFilters, location]
      })),
      clearFishLocationFilters: () => set({ fishLocationFilters: [] }),
      setFishSearchQuery: (query) => set({ fishSearchQuery: query }),
      setFishSortBy: (sort) => set({ fishSortBy: sort }),
      setShowCaughtOnly: (show) => set({ showCaughtOnly: show, ...(show && { showUncaughtOnly: false }) }),
      setShowUncaughtOnly: (show) => set({ showUncaughtOnly: show, ...(show && { showCaughtOnly: false }) }),
      toggleCritterTypeFilter: (type) => set((state) => ({
        critterTypeFilters: state.critterTypeFilters.includes(type)
          ? state.critterTypeFilters.filter(t => t !== type)
          : [...state.critterTypeFilters, type]
      })),
      toggleCritterRarityFilter: (rarity) => set((state) => ({
        critterRarityFilters: state.critterRarityFilters.includes(rarity)
          ? state.critterRarityFilters.filter(r => r !== rarity)
          : [...state.critterRarityFilters, rarity]
      })),
      toggleCritterSeasonFilter: (season) => set((state) => ({
        critterSeasonFilters: state.critterSeasonFilters.includes(season)
          ? state.critterSeasonFilters.filter(s => s !== season)
          : [...state.critterSeasonFilters, season]
      })),
      toggleCritterWeatherFilter: (weather) => set((state) => ({
        critterWeatherFilters: state.critterWeatherFilters.includes(weather)
          ? state.critterWeatherFilters.filter(w => w !== weather)
          : [...state.critterWeatherFilters, weather]
      })),
      toggleCritterLocationFilter: (location) => set((state) => ({
        critterLocationFilters: state.critterLocationFilters.includes(location)
          ? state.critterLocationFilters.filter(l => l !== location)
          : [...state.critterLocationFilters, location]
      })),
      setCritterSearchQuery: (query) => set({ critterSearchQuery: query }),
      setCritterSortBy: (sort) => set({ critterSortBy: sort }),
      setShowCritterCaughtOnly: (show) => set({ showCritterCaughtOnly: show, ...(show && { showCritterUncaughtOnly: false }) }),
      setShowCritterUncaughtOnly: (show) => set({ showCritterUncaughtOnly: show, ...(show && { showCritterCaughtOnly: false }) }),
    }),
    {
      name: 'gb-kitchen-settings',
      partialize: (state) => ({
        activePage: state.activePage,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    }
  )
);
