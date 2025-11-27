import type { Recipe, RecipeIngredient, MatchResult, VariantGroups, ProcessingRecipe } from '../types';

/**
 * Check if an input requirement is satisfied by the inventory, considering variant groups.
 * For example, if recipe needs "egg" and we have "silkie_egg", this returns true.
 */
function hasInputWithVariants(
  input: string,
  inventory: Set<string>,
  variantGroups: VariantGroups
): boolean {
  // Direct match
  if (inventory.has(input)) {
    return true;
  }

  // Check if input belongs to a variant group, and if any variant is in inventory
  for (const variants of Object.values(variantGroups)) {
    if (variants.includes(input)) {
      for (const variant of variants) {
        if (inventory.has(variant)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Recursively expand inventory with items that can be processed from available ingredients.
 * This handles multi-step processing chains like: wheat → wheat_flour → bread
 * Also respects variant groups: silkie_egg can be used to make mayonnaise (which needs "egg")
 *
 * Returns:
 * - expanded: inventory + all items we can make through any number of processing steps
 * - readyToProcess: all items that require processing (not directly in base inventory)
 */
export function expandInventoryWithProcessing(
  inventory: Set<string>,
  processing: ProcessingRecipe[],
  variantGroups: VariantGroups = {}
): {
  expanded: Set<string>;
  readyToProcess: Set<string>;
} {
  const expanded = new Set(inventory);
  const readyToProcess = new Set<string>();

  // Keep expanding until no new items can be added
  let changed = true;
  while (changed) {
    changed = false;

    for (const recipe of processing) {
      // Skip if we already have this item in expanded set
      if (expanded.has(recipe.id)) {
        continue;
      }

      // Check if we have ALL inputs required for this processing recipe
      // Use expanded inventory so we can chain: wheat → wheat_flour → bread
      // Also check variant groups: silkie_egg satisfies "egg" input
      const hasAllInputs = recipe.inputs.every((input) =>
        hasInputWithVariants(input, expanded, variantGroups)
      );

      if (hasAllInputs) {
        // We can make this processed item
        expanded.add(recipe.id);

        // Only mark as "needs processing" if it's not in the original inventory
        if (!inventory.has(recipe.id)) {
          readyToProcess.add(recipe.id);
        }

        changed = true; // Something changed, do another pass
      }
    }
  }

  return { expanded, readyToProcess };
}

/**
 * Check if an ingredient requirement is satisfied by the inventory
 */
function checkIngredient(
  ingredient: RecipeIngredient,
  inventory: Set<string>,
  variantGroups: VariantGroups
): { satisfied: boolean; matchedId: string | null } {
  // Handle "oneOf" alternatives
  if (ingredient.oneOf && ingredient.oneOf.length > 0) {
    for (const option of ingredient.oneOf) {
      if (inventory.has(option)) {
        return { satisfied: true, matchedId: option };
      }
      // Check if any variant group member matches
      for (const [, variants] of Object.entries(variantGroups)) {
        if (variants.includes(option)) {
          for (const variant of variants) {
            if (inventory.has(variant)) {
              return { satisfied: true, matchedId: variant };
            }
          }
        }
      }
    }
    return { satisfied: false, matchedId: null };
  }

  // Handle simple ingredient
  const id = ingredient.id;
  if (id === 'choice') {
    return { satisfied: false, matchedId: null };
  }

  if (inventory.has(id)) {
    return { satisfied: true, matchedId: id };
  }

  // Check variant groups for this ingredient
  for (const [, variants] of Object.entries(variantGroups)) {
    if (variants.includes(id)) {
      for (const variant of variants) {
        if (inventory.has(variant)) {
          return { satisfied: true, matchedId: variant };
        }
      }
    }
  }

  return { satisfied: false, matchedId: null };
}

/**
 * Evaluate a recipe against the player's inventory
 */
function evaluateRecipe(
  recipe: Recipe,
  inventory: Set<string>,
  variantGroups: VariantGroups
): { missing: string[]; matched: string[] } {
  const missing: string[] = [];
  const matched: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const result = checkIngredient(ingredient, inventory, variantGroups);

    if (result.satisfied && result.matchedId) {
      matched.push(result.matchedId);
    } else {
      // Report what's missing
      if (ingredient.oneOf && ingredient.oneOf.length > 0) {
        missing.push(ingredient.oneOf[0]); // Report first option as representative
      } else if (ingredient.id !== 'choice') {
        missing.push(ingredient.id);
      }
    }
  }

  return { missing, matched };
}

/**
 * Find all recipes the player can make or is close to making.
 *
 * Key logic: Only show recipes that USE at least one of the selected ingredients.
 * This prevents showing unrelated recipes just because they have few ingredients.
 *
 * With processing support:
 * - 'exact': All ingredients in inventory (no processing needed), ready to cook
 * - 'needs_processing': All ingredients available, but some require processing first
 *   (e.g., we have egg + oil, recipe needs mayonnaise - we CAN make it)
 * - 'partial': Missing ingredients we cannot obtain through processing
 */
export function findRecipes(
  inventory: Set<string>,
  recipes: Recipe[],
  ownedUtensils: Set<string>,
  variantGroups: VariantGroups,
  maxMissing: number = 3,
  processing: ProcessingRecipe[] = []
): MatchResult[] {
  const results: MatchResult[] = [];
  const hasSelectedIngredients = inventory.size > 0;

  // Get processing info - expanded inventory includes items we CAN make
  // Pass variantGroups so silkie_egg can produce mayonnaise (which needs "egg")
  const { expanded: expandedInventory, readyToProcess } = processing.length > 0
    ? expandInventoryWithProcessing(inventory, processing, variantGroups)
    : { expanded: inventory, readyToProcess: new Set<string>() };

  for (const recipe of recipes) {
    // Check utensil requirement
    if (!ownedUtensils.has(recipe.utensil)) {
      continue;
    }

    // Evaluate against BASE inventory (not expanded) to get true missing items
    const { missing: missingFromBase, matched: matchedFromBase } = evaluateRecipe(recipe, inventory, variantGroups);

    // Also evaluate against EXPANDED inventory (includes processable items)
    const { missing: missingFromExpanded, matched: matchedFromExpanded } = evaluateRecipe(recipe, expandedInventory, variantGroups);

    // If the user has selected ingredients, only show recipes
    // that actually USE at least one of those ingredients (from base OR expanded inventory)
    // This allows silkie_egg → mayonnaise to surface mayonnaise recipes
    if (hasSelectedIngredients && matchedFromBase.length === 0 && matchedFromExpanded.length === 0) {
      continue; // Skip recipes with no ingredient overlap
    }

    // Use expanded evaluation for determining if recipe is achievable
    if (missingFromExpanded.length <= maxMissing) {
      // Identify which matched ingredients require processing (are in readyToProcess)
      const processedIngredients = matchedFromExpanded.filter(id => readyToProcess.has(id));

      // Determine match type:
      // - 'exact': no missing from BASE inventory (everything directly available)
      // - 'needs_processing': no missing from EXPANDED inventory, but some ingredients need processing
      // - 'partial': still missing ingredients even with expanded inventory
      let matchType: 'exact' | 'needs_processing' | 'partial';

      if (missingFromBase.length === 0) {
        // All ingredients directly in inventory - ready to cook!
        matchType = 'exact';
      } else if (missingFromExpanded.length === 0) {
        // All ingredients available via processing - needs processing first
        matchType = 'needs_processing';
      } else {
        // Still missing some ingredients
        matchType = 'partial';
      }

      results.push({
        recipe,
        matchType,
        missingCount: missingFromExpanded.length,
        missingIngredients: missingFromExpanded,
        matchedIngredients: matchedFromExpanded,
        processedIngredients,
        matchPercentage: Math.round(
          (matchedFromExpanded.length / recipe.ingredients.length) * 100
        ),
      });
    }
  }

  // Sort: exact matches first, then needs_processing, then by missing count, then by name
  return results.sort((a, b) => {
    // Priority: exact (0) > needs_processing (1) > partial (2+)
    const getPriority = (m: MatchResult) => {
      if (m.matchType === 'exact') return 0;
      if (m.matchType === 'needs_processing') return 1;
      return 2 + m.missingCount;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.recipe.name.localeCompare(b.recipe.name);
  });
}

/**
 * Get suggestions for ingredients that would unlock the most recipes
 */
export function getSuggestions(
  inventory: Set<string>,
  recipes: Recipe[],
  ownedUtensils: Set<string>,
  variantGroups: VariantGroups,
  topN: number = 10
): { ingredientId: string; enablesRecipes: number; recipeNames: string[] }[] {
  const ingredientValue: Map<string, { count: number; recipes: string[] }> = new Map();

  for (const recipe of recipes) {
    // Skip recipes we can't make due to utensil
    if (!ownedUtensils.has(recipe.utensil)) {
      continue;
    }

    const { missing } = evaluateRecipe(recipe, inventory, variantGroups);

    // If only 1-2 missing, those ingredients are valuable
    if (missing.length > 0 && missing.length <= 2) {
      for (const ing of missing) {
        const current = ingredientValue.get(ing) || { count: 0, recipes: [] };
        current.count += 1;
        current.recipes.push(recipe.name);
        ingredientValue.set(ing, current);
      }
    }
  }

  return Array.from(ingredientValue.entries())
    .map(([id, data]) => ({
      ingredientId: id,
      enablesRecipes: data.count,
      recipeNames: data.recipes,
    }))
    .sort((a, b) => b.enablesRecipes - a.enablesRecipes)
    .slice(0, topN);
}

/**
 * Filter recipes by effect
 */
export function filterByEffect(
  results: MatchResult[],
  effectId: string | null
): MatchResult[] {
  if (!effectId) return results;
  return results.filter((r) => r.recipe.effect === effectId);
}

/**
 * Filter recipes by category
 */
export function filterByCategory(
  results: MatchResult[],
  category: string | null
): MatchResult[] {
  if (!category) return results;
  return results.filter((r) => r.recipe.category === category);
}
