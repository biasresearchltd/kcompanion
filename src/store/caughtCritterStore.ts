import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CaughtCritterState {
  caughtCritters: string[];
  toggleCaught: (critterId: string) => void;
  isCaught: (critterId: string) => boolean;
  clearCaught: () => void;
  setCaughtCritters: (ids: string[]) => void;
  mergeCaughtCritters: (ids: string[]) => void;
}

export const useCaughtCritterStore = create<CaughtCritterState>()(
  persist(
    (set, get) => ({
      caughtCritters: [],

      toggleCaught: (critterId: string) => {
        const current = get().caughtCritters;
        if (current.includes(critterId)) {
          set({ caughtCritters: current.filter((id) => id !== critterId) });
        } else {
          set({ caughtCritters: [...current, critterId] });
        }
      },

      isCaught: (critterId: string) => {
        return get().caughtCritters.includes(critterId);
      },

      clearCaught: () => {
        set({ caughtCritters: [] });
      },

      setCaughtCritters: (ids: string[]) => {
        set({ caughtCritters: ids });
      },

      mergeCaughtCritters: (ids: string[]) => {
        const current = get().caughtCritters;
        const merged = [...new Set([...current, ...ids])];
        set({ caughtCritters: merged });
      },
    }),
    {
      name: 'gb-kitchen-caught-critters',
    }
  )
);
