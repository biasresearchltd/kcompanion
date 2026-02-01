#!/usr/bin/env node
/**
 * Update recipes.json from Google Sheets CSV export.
 * Preserves utensil, unlockMethod, icon from existing data.
 * Updates ingredients, price, effect, additions, and adds new fields.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../public/data');

// Load existing data
const existingRecipes = JSON.parse(readFileSync(resolve(DATA_DIR, 'recipes.json'), 'utf8')).recipes;
const ingredients = JSON.parse(readFileSync(resolve(DATA_DIR, 'ingredients.json'), 'utf8')).ingredients;
const effects = JSON.parse(readFileSync(resolve(DATA_DIR, 'effects.json'), 'utf8')).effects;
const characters = JSON.parse(readFileSync(resolve(DATA_DIR, 'characters.json'), 'utf8')).characters;

// Build lookup maps
const ingredientNameToId = new Map();
ingredients.forEach(ing => {
  ingredientNameToId.set(ing.name.toLowerCase().trim(), ing.id);
});

// Also map "+" suffix variants: "Milk +" -> "milk_plus", "Egg +" -> "egg_plus"
ingredients.forEach(ing => {
  if (ing.id.endsWith('_plus')) {
    // Create alternate name mapping: "milk+" and "milk +"
    const baseName = ing.name.replace(/\+$/, '').trim();
    ingredientNameToId.set((baseName + '+').toLowerCase(), ing.id);
    ingredientNameToId.set((baseName + ' +').toLowerCase(), ing.id);
  }
});

const effectNameToId = new Map();
effects.forEach(eff => {
  effectNameToId.set(eff.name.toLowerCase().trim(), eff.id);
});

const characterNameToId = new Map();
characters.forEach(ch => {
  characterNameToId.set(ch.name.toLowerCase().trim(), ch.id);
});

// Normalize accented characters for matching
function normalizeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Build existing recipe map by name (for matching)
const existingByName = new Map();
const existingById = new Map();
existingRecipes.forEach(r => {
  existingByName.set(r.name.toLowerCase().trim(), r);
  existingByName.set(normalizeAccents(r.name.toLowerCase().trim()), r);
  existingById.set(r.id, r);
});

// Category mapping from CSV to our format
const categoryMap = {
  'salads': 'salad',
  'soups': 'soup',
  'sides': 'side',
  'mains': 'main_dish',
  'desserts': 'dessert',
  'other': 'other',
};

// Convert a display name to an ingredient ID
function nameToIngredientId(name) {
  name = name.trim();
  if (!name) return null;

  // Fix known typos from spreadsheet
  const typoFixes = {
    'shiitake mushrrom': 'shiitake mushroom',
    'silkit egg': 'silkie egg',
    'banana tea tin': 'banana tea tin',
    'mango juiice': 'mango juice',
    'grilled fish': 'grilled fish',
  };

  const lower = name.toLowerCase().trim();
  if (typoFixes[lower]) {
    name = typoFixes[lower];
  }

  const normalized = name.toLowerCase().trim();

  // Direct lookup
  if (ingredientNameToId.has(normalized)) {
    return ingredientNameToId.get(normalized);
  }

  // Try with "+" normalization: "Milk +" -> look for "milk+"
  if (normalized.endsWith('+')) {
    const withoutSpace = normalized.replace(/\s*\+$/, '+');
    if (ingredientNameToId.has(withoutSpace)) {
      return ingredientNameToId.get(withoutSpace);
    }
    const withSpace = normalized.replace(/\s*\+$/, ' +');
    if (ingredientNameToId.has(withSpace)) {
      return ingredientNameToId.get(withSpace);
    }
  }

  // Fallback: convert to snake_case ID
  let id = normalized
    .replace(/\+/g, '_plus')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  // Handle "+" at end: "Milk +" -> "milk_plus"
  if (name.trim().endsWith('+') && !id.endsWith('_plus')) {
    id = id.replace(/_$/, '') + '_plus';
  }

  return id;
}

// Convert recipe name to ID
function nameToRecipeId(name) {
  return name.toLowerCase().trim()
    .replace(/[''&]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Parse effect string like "Chat Friendship Boost Lv. 4" -> { id, level }
function parseEffect(effectStr) {
  if (!effectStr || effectStr.toLowerCase() === 'none') {
    return { id: null, level: null };
  }

  const match = effectStr.match(/^(.+?)\s+Lv\.\s*(\d+)$/);
  if (match) {
    const effectName = match[1].trim().toLowerCase();
    const level = parseInt(match[2]);

    // Find effect by name
    for (const [name, id] of effectNameToId) {
      if (name === effectName || effectName.includes(name) || name.includes(effectName)) {
        return { id, level };
      }
    }

    // Try matching by converting to ID format
    const effectId = effectName.replace(/[^a-z0-9]+/g, '_').replace(/_%$/, '');
    const found = effects.find(e => e.id === effectId);
    if (found) return { id: found.id, level };

    // Fuzzy match
    const possibleId = effectName.replace(/ %/g, '').replace(/[^a-z0-9]+/g, '_');
    const found2 = effects.find(e => e.id === possibleId);
    if (found2) return { id: found2.id, level };

    console.warn(`  WARNING: Unknown effect: "${effectStr}" -> tried "${possibleId}"`);
    return { id: possibleId, level };
  }

  // No level (e.g., "Double Forage", "Jump Distance Up")
  const effectName = effectStr.trim().toLowerCase();
  for (const [name, id] of effectNameToId) {
    if (name === effectName) {
      return { id, level: 1 };
    }
  }

  const effectId = effectName.replace(/[^a-z0-9]+/g, '_');
  return { id: effectId, level: 1 };
}

// Parse a pipe-separated ingredient cell into ingredient entries
// "Cheese|Herb Cheese|Cheese +" -> oneOf group
// "Potato" -> single ingredient
function parseIngredientCell(cell) {
  if (!cell || !cell.trim()) return null;

  // Fix separator typos: } and \ used instead of |
  cell = cell.replace(/\}/g, '|').replace(/\\/g, '|');

  const parts = cell.split('|').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return null;

  if (parts.length === 1) {
    const id = nameToIngredientId(parts[0]);
    return { id, required: true };
  }

  // Multiple options -> oneOf
  const ids = parts.map(p => nameToIngredientId(p));
  return { id: 'choice', required: true, oneOf: ids };
}

// Parse a pipe-separated additions cell
function parseAdditions(cell) {
  if (!cell || !cell.trim()) return [];

  // Fix separator typos
  cell = cell.replace(/\}/g, '|').replace(/\\/g, '|');

  return cell.split('|').map(p => p.trim()).filter(Boolean).map(nameToIngredientId);
}

// Parse character names from gift columns
function parseCharacterNames(cell) {
  if (!cell || !cell.trim()) return [];
  return cell.split('|').map(n => n.trim()).filter(Boolean);
}

// Parse CSV (handle quoted fields)
function parseCSV(csvText) {
  const rows = [];
  const lines = csvText.split('\n');
  let currentRow = [];
  let inQuotes = false;
  let currentField = '';

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else {
          currentField += ch;
        }
      }
    }

    if (inQuotes) {
      currentField += '\n';
    } else {
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(f => f.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
    }
  }

  if (currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Main processing
const csvText = readFileSync(resolve(__dirname, 'recipes-spreadsheet.csv'), 'utf8');
const rows = parseCSV(csvText);

// Header row
const headers = rows[0];
console.log('CSV Headers:', headers);
console.log(`Processing ${rows.length - 1} recipe rows...`);

const updatedRecipes = new Map(); // id -> recipe
const giftUpdates = []; // Track gift data changes
const unmatchedIngredients = new Set();

// Process each CSV row
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 11) continue;

  const [type, recipeName, salesPrice, effectStr, staminaRecovery, holidayGift, bazaarTrend, favoriteGift, lovedGift, likedGift, ing1, ing2, ing3, ing4, ingA] = row;

  if (!recipeName || !recipeName.trim()) continue;

  const recipeId = nameToRecipeId(recipeName);
  const existing = existingByName.get(recipeName.toLowerCase().trim()) || existingByName.get(normalizeAccents(recipeName.toLowerCase().trim())) || existingById.get(recipeId);

  // Parse category
  const category = categoryMap[type.trim().toLowerCase()] || 'other';

  // Parse effect
  const { id: effectId, level: effectLevel } = parseEffect(effectStr?.trim());

  // Parse ingredients (1-4)
  const ingredientEntries = [];
  for (const cell of [ing1, ing2, ing3, ing4]) {
    const parsed = parseIngredientCell(cell);
    if (parsed) ingredientEntries.push(parsed);
  }

  // Parse additions
  const additions = parseAdditions(ingA);

  // Build recipe object
  const recipe = {
    id: existing?.id || recipeId,
    name: recipeName.trim(),
    category,
    utensil: existing?.utensil || 'none',
    ingredients: ingredientEntries,
    ...(additions.length > 0 ? { additions } : {}),
    baseValue: parseInt(salesPrice) || 0,
    effect: effectId || null,
    effectLevel: effectLevel || null,
    unlockMethod: existing?.unlockMethod || '',
    icon: existing?.icon || `${recipeId}.png`,
    ...(staminaRecovery?.trim() ? { staminaRecovery: staminaRecovery.trim() } : {}),
    ...(holidayGift?.trim() ? { holidayGift: holidayGift.trim() } : {}),
    ...(bazaarTrend?.trim() ? { bazaarTrend: bazaarTrend.trim() } : {}),
  };

  // Clean null effect fields
  if (!recipe.effect) {
    delete recipe.effect;
    delete recipe.effectLevel;
  }

  updatedRecipes.set(recipe.id, recipe);

  // Track gift data
  const favChars = parseCharacterNames(favoriteGift);
  const lovedChars = parseCharacterNames(lovedGift);
  const likedChars = parseCharacterNames(likedGift);

  if (favChars.length || lovedChars.length || likedChars.length) {
    giftUpdates.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      favorite: favChars,
      loved: lovedChars,
      liked: likedChars,
    });
  }
}

// Merge: keep existing recipes not in CSV, update ones that are
const finalRecipes = [];
const csvRecipeIds = new Set(updatedRecipes.keys());
let updatedCount = 0;
let newCount = 0;
let preservedCount = 0;

// First add all CSV recipes (these are the updated ones)
for (const [id, recipe] of updatedRecipes) {
  if (existingById.has(id) || existingByName.has(recipe.name.toLowerCase().trim())) {
    updatedCount++;
  } else {
    newCount++;
    console.log(`  NEW: ${recipe.name} (${id})`);
  }
  finalRecipes.push(recipe);
}

// Then add existing recipes NOT in the CSV (preserve them)
for (const existing of existingRecipes) {
  if (!csvRecipeIds.has(existing.id)) {
    // Check by name too
    const inCSV = Array.from(updatedRecipes.values()).some(
      r => normalizeAccents(r.name.toLowerCase().trim()) === normalizeAccents(existing.name.toLowerCase().trim())
    );
    if (!inCSV) {
      finalRecipes.push(existing);
      preservedCount++;
    }
  }
}

// Sort by category then name
const categoryOrder = ['salad', 'soup', 'side', 'main_dish', 'dessert', 'other'];
finalRecipes.sort((a, b) => {
  const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  if (catDiff !== 0) return catDiff;
  return a.name.localeCompare(b.name);
});

// Write updated recipes.json
writeFileSync(
  resolve(DATA_DIR, 'recipes.json'),
  JSON.stringify({ recipes: finalRecipes }, null, 2) + '\n'
);

console.log('\n=== Summary ===');
console.log(`Updated: ${updatedCount} recipes`);
console.log(`New: ${newCount} recipes`);
console.log(`Preserved (not in CSV): ${preservedCount} recipes`);
console.log(`Total: ${finalRecipes.length} recipes`);

// Update character gift data from CSV
if (giftUpdates.length > 0) {
  console.log(`\n=== Gift Updates (${giftUpdates.length} recipes with gift data) ===`);

  // Build a map of character name -> character object for updating
  const charByName = new Map();
  characters.forEach(ch => charByName.set(ch.name.toLowerCase(), ch));

  for (const gift of giftUpdates) {
    const parts = [];
    if (gift.favorite.length) parts.push(`Fav: ${gift.favorite.join(', ')}`);
    if (gift.loved.length) parts.push(`Loved: ${gift.loved.join(', ')}`);
    if (gift.liked.length) parts.push(`Liked: ${gift.liked.join(', ')}`);
    console.log(`  ${gift.recipeName}: ${parts.join(' | ')}`);

    // Update character records
    for (const charName of gift.favorite) {
      const ch = charByName.get(charName.toLowerCase());
      if (ch) {
        if (!ch.favoriteGifts) ch.favoriteGifts = [];
        if (!ch.favoriteGifts.includes(gift.recipeId)) {
          ch.favoriteGifts.push(gift.recipeId);
        }
      } else {
        console.warn(`  WARNING: Unknown character "${charName}" for favorite gift`);
      }
    }

    for (const charName of gift.loved) {
      const ch = charByName.get(charName.toLowerCase());
      if (ch) {
        if (!ch.lovedGifts) ch.lovedGifts = [];
        if (!ch.lovedGifts.includes(gift.recipeId)) {
          ch.lovedGifts.push(gift.recipeId);
        }
      } else {
        console.warn(`  WARNING: Unknown character "${charName}" for loved gift`);
      }
    }

    for (const charName of gift.liked) {
      const ch = charByName.get(charName.toLowerCase());
      if (ch) {
        if (!ch.likedGifts) ch.likedGifts = [];
        if (!ch.likedGifts.includes(gift.recipeId)) {
          ch.likedGifts.push(gift.recipeId);
        }
      } else {
        console.warn(`  WARNING: Unknown character "${charName}" for liked gift`);
      }
    }
  }

  // Write updated characters.json
  writeFileSync(
    resolve(DATA_DIR, 'characters.json'),
    JSON.stringify({ characters }, null, 2) + '\n'
  );
  console.log('Updated characters.json with gift data');
}

// Validate ingredient IDs exist
const allIngIds = new Set(ingredients.map(i => i.id));
let missingIngCount = 0;
for (const recipe of finalRecipes) {
  for (const ing of recipe.ingredients) {
    if (ing.oneOf) {
      for (const id of ing.oneOf) {
        if (!allIngIds.has(id)) {
          unmatchedIngredients.add(id);
          missingIngCount++;
        }
      }
    } else if (ing.id && ing.id !== 'choice') {
      if (!allIngIds.has(ing.id)) {
        unmatchedIngredients.add(ing.id);
        missingIngCount++;
      }
    }
  }
  if (recipe.additions) {
    for (const id of recipe.additions) {
      if (!allIngIds.has(id)) {
        unmatchedIngredients.add(id);
      }
    }
  }
}

if (unmatchedIngredients.size > 0) {
  console.log(`\n=== Missing Ingredient IDs (${unmatchedIngredients.size}) ===`);
  for (const id of [...unmatchedIngredients].sort()) {
    console.log(`  ${id}`);
  }
}

console.log('\nDone!');
