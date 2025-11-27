import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { Ingredient } from '../types';

interface UseIngredientSearchOptions {
  ingredients: Ingredient[];
  query: string;
  categoryFilters: string[];
}

export function useIngredientSearch({
  ingredients,
  query,
  categoryFilters,
}: UseIngredientSearchOptions): Ingredient[] {
  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(ingredients, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'aliases', weight: 1 },
        { name: 'tags', weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [ingredients]);

  // Filter and search ingredients
  const filtered = useMemo(() => {
    let result = ingredients;

    // Apply category filters first (if any selected, filter to those categories)
    if (categoryFilters.length > 0) {
      result = result.filter((ing) => categoryFilters.includes(ing.category));
    }

    // Apply search query
    if (query.trim()) {
      if (categoryFilters.length > 0) {
        // If categories are filtered, search within that subset
        const categoryFuse = new Fuse(result, {
          keys: [
            { name: 'name', weight: 2 },
            { name: 'aliases', weight: 1 },
            { name: 'tags', weight: 0.5 },
          ],
          threshold: 0.3,
        });
        result = categoryFuse.search(query).map((r) => r.item);
      } else {
        result = fuse.search(query).map((r) => r.item);
      }
    }

    return result;
  }, [ingredients, fuse, query, categoryFilters]);

  return filtered;
}
