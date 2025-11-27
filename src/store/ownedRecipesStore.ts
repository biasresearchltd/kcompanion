import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OwnedRecipesState {
  ownedRecipes: string[];
  toggleOwned: (recipeId: string) => void;
  isOwned: (recipeId: string) => boolean;
  clearOwned: () => void;
}

export const useOwnedRecipesStore = create<OwnedRecipesState>()(
  persist(
    (set, get) => ({
      ownedRecipes: [],

      toggleOwned: (recipeId: string) => {
        const current = get().ownedRecipes;
        if (current.includes(recipeId)) {
          set({ ownedRecipes: current.filter((id) => id !== recipeId) });
        } else {
          set({ ownedRecipes: [...current, recipeId] });
        }
      },

      isOwned: (recipeId: string) => {
        return get().ownedRecipes.includes(recipeId);
      },

      clearOwned: () => {
        set({ ownedRecipes: [] });
      },
    }),
    {
      name: 'gb-kitchen-owned-recipes',
    }
  )
);
