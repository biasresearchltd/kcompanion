// Ingredient types
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  season?: string[];
  icon: string;
  commonRank?: number;
  aliases?: string[];
  source?: string;
  variants?: string[];
  tags?: string[];
}

export interface IngredientCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

// Recipe types
export interface RecipeIngredient {
  id: string;
  required: boolean;
  oneOf?: string[];
  count?: number;
  plusQuality?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  utensil: string;
  ingredients: RecipeIngredient[];
  additions?: string[];
  baseValue: number;
  effect: string | null;
  effectLevel: number | null;
  unlockMethod: string;
  icon: string;
}

export interface RecipeCategory {
  id: string;
  name: string;
  icon: string;
}

// Effect types
export interface Effect {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  category: string;
}

// Utensil types
export interface Utensil {
  id: string;
  name: string;
  unlockCost: number;
}

// Variant groups for ingredient substitution
export type VariantGroups = Record<string, string[]>;

// Processing recipe (windmill conversions)
export interface ProcessingRecipe {
  id: string;
  name: string;
  inputs: string[];
  category: string;
}

// Categories data structure
export interface CategoriesData {
  ingredientCategories: IngredientCategory[];
  recipeCategories: RecipeCategory[];
  utensils: Utensil[];
  variantGroups: VariantGroups;
}

// Recipe matching result
export interface MatchResult {
  recipe: Recipe;
  matchType: 'exact' | 'partial' | 'needs_processing';
  missingCount: number;
  missingIngredients: string[];
  matchedIngredients: string[];
  processedIngredients: string[]; // Ingredients that need to be processed first
  matchPercentage: number;
}

// Character types
export interface Character {
  id: string;
  name: string;
  romanceable: boolean;
  icon: string | null;
  favoriteGifts: string[];
  lovedGifts: string[];
}

export interface GiftCharacterInfo {
  favorite: string[];
  loved: string[];
}

export type GiftToCharacters = Record<string, GiftCharacterInfo>;

export interface CharactersData {
  characters: Character[];
  giftToCharacters: GiftToCharacters;
}

// Fish types
export interface Fish {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large' | 'guardian';
  seasons: string[];
  weather: string[];
  locations: string[];
  rodLevel: string;
  price: number;
  icon: string;
  notes?: string;
}

export interface FishCategories {
  sizes: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  weather: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  rodLevels: { id: string; name: string }[];
}

// Critter types
export interface Critter {
  id: string;
  name: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare';
  seasons: string[];
  weather: string[];
  locations: string[];
  price: number;
  icon: string;
  notes?: string;
}

export interface CritterCategories {
  types: { id: string; name: string }[];
  rarities: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  weather: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}

// Store types
export interface InventoryState {
  selectedIngredients: Set<string>;
  ownedUtensils: Set<string>;
  maxMissing: number;
  toggleIngredient: (id: string) => void;
  addIngredient: (id: string) => void;
  removeIngredient: (id: string) => void;
  clearInventory: () => void;
  toggleUtensil: (id: string) => void;
  setMaxMissing: (n: number) => void;
}

export interface SettingsState {
  viewMode: 'list' | 'grid';
  sortBy: 'name' | 'category' | 'commonRank';
  filterCategory: string | null;
  searchQuery: string;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSortBy: (sort: 'name' | 'category' | 'commonRank') => void;
  setFilterCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
}
