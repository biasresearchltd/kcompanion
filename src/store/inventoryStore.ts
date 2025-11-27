import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InventoryState {
  selectedIngredients: string[];
  ownedUtensils: string[];
  maxMissing: number;
  toggleIngredient: (id: string) => void;
  addIngredient: (id: string) => void;
  removeIngredient: (id: string) => void;
  clearInventory: () => void;
  toggleUtensil: (id: string) => void;
  setMaxMissing: (n: number) => void;
  hasIngredient: (id: string) => boolean;
  hasUtensil: (id: string) => boolean;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      selectedIngredients: [],
      ownedUtensils: ['none', 'pot', 'frying_pan', 'seasoning_set'], // All utensils enabled by default
      maxMissing: 2,

      toggleIngredient: (id: string) => {
        const current = get().selectedIngredients;
        if (current.includes(id)) {
          set({ selectedIngredients: current.filter(i => i !== id) });
        } else {
          set({ selectedIngredients: [...current, id] });
        }
      },

      addIngredient: (id: string) => {
        const current = get().selectedIngredients;
        if (!current.includes(id)) {
          set({ selectedIngredients: [...current, id] });
        }
      },

      removeIngredient: (id: string) => {
        set({
          selectedIngredients: get().selectedIngredients.filter(i => i !== id)
        });
      },

      clearInventory: () => {
        set({ selectedIngredients: [] });
      },

      toggleUtensil: (id: string) => {
        const current = get().ownedUtensils;
        if (id === 'none') return; // Can't toggle "none"

        if (current.includes(id)) {
          set({ ownedUtensils: current.filter(u => u !== id) });
        } else {
          set({ ownedUtensils: [...current, id] });
        }
      },

      setMaxMissing: (n: number) => {
        set({ maxMissing: Math.max(0, Math.min(5, n)) });
      },

      hasIngredient: (id: string) => {
        return get().selectedIngredients.includes(id);
      },

      hasUtensil: (id: string) => {
        return get().ownedUtensils.includes(id);
      },
    }),
    {
      name: 'gb-kitchen-inventory',
    }
  )
);
