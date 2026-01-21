import type { Recipe } from '../types';

/**
 * Generate CSV content from bookmarked and owned recipe IDs
 */
export function generateRecipeCSV(
  bookmarkedIds: string[],
  ownedIds: string[],
  recipeMap: Map<string, Recipe>
): string {
  const bookmarkedSet = new Set(bookmarkedIds);
  const ownedSet = new Set(ownedIds);

  // Get all unique recipe IDs that are either bookmarked or owned
  const allIds = new Set([...bookmarkedIds, ...ownedIds]);

  // Build CSV rows
  const rows: string[] = ['id,name,bookmarked,owned'];

  // Sort by recipe name for consistent output
  const sortedIds = Array.from(allIds).sort((a, b) => {
    const recipeA = recipeMap.get(a);
    const recipeB = recipeMap.get(b);
    if (!recipeA || !recipeB) return 0;
    return recipeA.name.localeCompare(recipeB.name);
  });

  for (const id of sortedIds) {
    const recipe = recipeMap.get(id);
    if (!recipe) continue;

    const isBookmarked = bookmarkedSet.has(id) ? 'yes' : 'no';
    const isOwned = ownedSet.has(id) ? 'yes' : 'no';

    // Escape name if it contains commas or quotes
    const escapedName = recipe.name.includes(',') || recipe.name.includes('"')
      ? `"${recipe.name.replace(/"/g, '""')}"`
      : recipe.name;

    rows.push(`${id},${escapedName},${isBookmarked},${isOwned}`);
  }

  return rows.join('\n');
}

export interface ParseResult {
  bookmarked: string[];
  owned: string[];
  errors: string[];
}

/**
 * Parse CSV content and return bookmarked/owned recipe IDs
 */
export function parseRecipeCSV(
  csvContent: string,
  recipeMap: Map<string, Recipe>
): ParseResult {
  const bookmarked: string[] = [];
  const owned: string[] = [];
  const errors: string[] = [];

  const lines = csvContent.trim().split(/\r?\n/);

  if (lines.length === 0) {
    errors.push('CSV file is empty');
    return { bookmarked, owned, errors };
  }

  // Check header row
  const header = lines[0].toLowerCase();
  if (!header.includes('id') || !header.includes('bookmarked') || !header.includes('owned')) {
    errors.push('Invalid CSV format: missing required columns (id, bookmarked, owned)');
    return { bookmarked, owned, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted values)
    const values = parseCSVLine(line);

    if (values.length < 4) {
      errors.push(`Line ${i + 1}: Invalid format (expected 4 columns)`);
      continue;
    }

    const [id, , isBookmarked, isOwned] = values;

    // Validate recipe ID exists
    if (!recipeMap.has(id)) {
      errors.push(`Line ${i + 1}: Unknown recipe ID "${id}"`);
      continue;
    }

    // Add to appropriate lists
    if (isBookmarked.toLowerCase() === 'yes') {
      bookmarked.push(id);
    }
    if (isOwned.toLowerCase() === 'yes') {
      owned.push(id);
    }
  }

  return { bookmarked, owned, errors };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last value
  values.push(current.trim());

  return values;
}

/**
 * Trigger browser download of a CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
