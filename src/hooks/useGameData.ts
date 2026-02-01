import { useState, useEffect } from 'react';
import type { Ingredient, Recipe, CategoriesData, Effect, ProcessingRecipe, Character, GiftToCharacters, Fish, FishCategories, Critter, CritterCategories } from '../types';

interface GameData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: CategoriesData;
  effects: Effect[];
  processing: ProcessingRecipe[];
  characters: Character[];
  giftToCharacters: GiftToCharacters;
  fish: Fish[];
  fishCategories: FishCategories;
  critters: Critter[];
  critterCategories: CritterCategories;
  isLoading: boolean;
  error: string | null;
}

export function useGameData(): GameData {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<CategoriesData>({
    ingredientCategories: [],
    recipeCategories: [],
    utensils: [],
    variantGroups: {},
  });
  const [effects, setEffects] = useState<Effect[]>([]);
  const [processing, setProcessing] = useState<ProcessingRecipe[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [giftToCharacters, setGiftToCharacters] = useState<GiftToCharacters>({});
  const [fish, setFish] = useState<Fish[]>([]);
  const [fishCategories, setFishCategories] = useState<FishCategories>({
    sizes: [],
    seasons: [],
    weather: [],
    locations: [],
    rodLevels: [],
  });
  const [critters, setCritters] = useState<Critter[]>([]);
  const [critterCategories, setCritterCategories] = useState<CritterCategories>({
    types: [],
    rarities: [],
    seasons: [],
    weather: [],
    locations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ingredientsRes, recipesRes, categoriesRes, effectsRes, processingRes, charactersRes, fishRes, crittersRes] = await Promise.all([
          fetch('/data/ingredients.json'),
          fetch('/data/recipes.json'),
          fetch('/data/categories.json'),
          fetch('/data/effects.json'),
          fetch('/data/processing.json'),
          fetch('/data/characters.json'),
          fetch('/data/fish.json'),
          fetch('/data/critters.json'),
        ]);

        if (!ingredientsRes.ok || !recipesRes.ok || !categoriesRes.ok || !effectsRes.ok || !processingRes.ok || !charactersRes.ok || !fishRes.ok || !crittersRes.ok) {
          throw new Error('Failed to load game data');
        }

        const [ingredientsData, recipesData, categoriesData, effectsData, processingData, charactersData, fishData, crittersData] = await Promise.all([
          ingredientsRes.json(),
          recipesRes.json(),
          categoriesRes.json(),
          effectsRes.json(),
          processingRes.json(),
          charactersRes.json(),
          fishRes.json(),
          crittersRes.json(),
        ]);

        setIngredients(ingredientsData.ingredients || []);
        setRecipes(recipesData.recipes || []);
        setCategories(categoriesData);
        setEffects(effectsData.effects || []);
        setProcessing(processingData.processing || []);
        setCharacters(charactersData.characters || []);
        setGiftToCharacters(charactersData.giftToCharacters || {});
        setFish(fishData.fish || []);
        setFishCategories(fishData.fishCategories || { sizes: [], seasons: [], weather: [], locations: [], rodLevels: [] });
        setCritters(crittersData.critters || []);
        setCritterCategories(crittersData.critterCategories || { types: [], rarities: [], seasons: [], weather: [], locations: [] });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return { ingredients, recipes, categories, effects, processing, characters, giftToCharacters, fish, fishCategories, critters, critterCategories, isLoading, error };
}

// Helper hook to get ingredient by ID
export function useIngredientMap(ingredients: Ingredient[]): Map<string, Ingredient> {
  const [map, setMap] = useState<Map<string, Ingredient>>(new Map());

  useEffect(() => {
    const newMap = new Map<string, Ingredient>();
    for (const ing of ingredients) {
      newMap.set(ing.id, ing);
    }
    setMap(newMap);
  }, [ingredients]);

  return map;
}

// Helper hook to get effect by ID
export function useEffectMap(effects: Effect[]): Map<string, Effect> {
  const [map, setMap] = useState<Map<string, Effect>>(new Map());

  useEffect(() => {
    const newMap = new Map<string, Effect>();
    for (const eff of effects) {
      newMap.set(eff.id, eff);
    }
    setMap(newMap);
  }, [effects]);

  return map;
}

// Helper hook to create a map of what ingredients can be processed into
// Returns a map where key = input ingredient, value = array of possible outputs
export function useProcessingMap(processing: ProcessingRecipe[]): Map<string, ProcessingRecipe[]> {
  const [map, setMap] = useState<Map<string, ProcessingRecipe[]>>(new Map());

  useEffect(() => {
    const newMap = new Map<string, ProcessingRecipe[]>();

    for (const recipe of processing) {
      // For each input ingredient, add this recipe as a possible output
      for (const input of recipe.inputs) {
        const existing = newMap.get(input) || [];
        existing.push(recipe);
        newMap.set(input, existing);
      }
    }

    setMap(newMap);
  }, [processing]);

  return map;
}

// Helper hook to get character by ID
export function useCharacterMap(characters: Character[]): Map<string, Character> {
  const [map, setMap] = useState<Map<string, Character>>(new Map());

  useEffect(() => {
    const newMap = new Map<string, Character>();
    for (const char of characters) {
      newMap.set(char.id, char);
    }
    setMap(newMap);
  }, [characters]);

  return map;
}
