import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CaughtFishState {
  caughtFish: string[];
  toggleCaught: (fishId: string) => void;
  isCaught: (fishId: string) => boolean;
  clearCaught: () => void;
  setCaughtFish: (ids: string[]) => void;
  mergeCaughtFish: (ids: string[]) => void;
}

export const useCaughtFishStore = create<CaughtFishState>()(
  persist(
    (set, get) => ({
      caughtFish: [],

      toggleCaught: (fishId: string) => {
        const current = get().caughtFish;
        if (current.includes(fishId)) {
          set({ caughtFish: current.filter((id) => id !== fishId) });
        } else {
          set({ caughtFish: [...current, fishId] });
        }
      },

      isCaught: (fishId: string) => {
        return get().caughtFish.includes(fishId);
      },

      clearCaught: () => {
        set({ caughtFish: [] });
      },

      setCaughtFish: (ids: string[]) => {
        set({ caughtFish: ids });
      },

      mergeCaughtFish: (ids: string[]) => {
        const current = get().caughtFish;
        const merged = [...new Set([...current, ...ids])];
        set({ caughtFish: merged });
      },
    }),
    {
      name: 'gb-kitchen-caught-fish',
    }
  )
);
