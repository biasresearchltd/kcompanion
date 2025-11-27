import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BookmarkState {
  bookmarkedRecipes: string[];
  toggleBookmark: (recipeId: string) => void;
  isBookmarked: (recipeId: string) => boolean;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarkedRecipes: [],

      toggleBookmark: (recipeId: string) => {
        const current = get().bookmarkedRecipes;
        if (current.includes(recipeId)) {
          set({ bookmarkedRecipes: current.filter((id) => id !== recipeId) });
        } else {
          set({ bookmarkedRecipes: [...current, recipeId] });
        }
      },

      isBookmarked: (recipeId: string) => {
        return get().bookmarkedRecipes.includes(recipeId);
      },

      clearBookmarks: () => {
        set({ bookmarkedRecipes: [] });
      },
    }),
    {
      name: 'gb-kitchen-bookmarks',
    }
  )
);
