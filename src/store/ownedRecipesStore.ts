import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OwnedRecipesState {
  ownedRecipes: string[];
  toggleOwned: (recipeId: string) => void;
  isOwned: (recipeId: string) => boolean;
  clearOwned: () => void;
  setOwnedRecipes: (ids: string[]) => void;
  mergeOwnedRecipes: (ids: string[]) => void;
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

      setOwnedRecipes: (ids: string[]) => {
        set({ ownedRecipes: ids });
      },

      mergeOwnedRecipes: (ids: string[]) => {
        const current = get().ownedRecipes;
        const merged = [...new Set([...current, ...ids])];
        set({ ownedRecipes: merged });
      },
    }),
    {
      name: 'gb-kitchen-owned-recipes',
    }
  )
);
