import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BookmarkState {
  bookmarkedRecipes: string[];
  toggleBookmark: (recipeId: string) => void;
  isBookmarked: (recipeId: string) => boolean;
  clearBookmarks: () => void;
  setBookmarks: (ids: string[]) => void;
  mergeBookmarks: (ids: string[]) => void;
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

      setBookmarks: (ids: string[]) => {
        set({ bookmarkedRecipes: ids });
      },

      mergeBookmarks: (ids: string[]) => {
        const current = get().bookmarkedRecipes;
        const merged = [...new Set([...current, ...ids])];
        set({ bookmarkedRecipes: merged });
      },
    }),
    {
      name: 'gb-kitchen-bookmarks',
    }
  )
);
