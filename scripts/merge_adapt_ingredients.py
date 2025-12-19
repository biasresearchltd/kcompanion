#!/usr/bin/env python3
"""
Merge adapt/optional ingredients from CSV into recipes.json

CSV Format:
Type,Recipe,Ingredient1,Ingredient2,Ingredient3,Ingredient4,IngredientA

Where IngredientA contains pipe-separated optional ingredients.
"""

import csv
import json
from pathlib import Path


def name_to_id(name: str) -> str:
    """Convert ingredient display name to ID format.

    Examples:
        "Butter +" -> "butter_plus"
        "Herb Cheese" -> "herb_cheese"
        "Green Bell Pepper" -> "green_bell_pepper"
    """
    name = name.strip()

    # Handle + suffix: "Butter +" -> "butter_plus"
    if name.endswith(' +'):
        name = name[:-2] + '_plus'

    # Replace spaces and hyphens with underscores, lowercase
    return name.lower().replace(' ', '_').replace('-', '_')


def parse_adapt_ingredients(adapt_str: str) -> list[str]:
    """Parse pipe-separated adapt ingredients into list of IDs."""
    if not adapt_str or not adapt_str.strip():
        return []

    # Split by pipe and convert each to ID
    ingredients = []
    for item in adapt_str.split('|'):
        item = item.strip()
        if item:
            ingredients.append(name_to_id(item))

    return ingredients


def load_csv(csv_path: Path) -> dict[str, list[str]]:
    """Load CSV and extract recipe name -> adapt ingredients mapping."""
    adapt_map = {}

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            recipe_name = row.get('Recipe', '').strip()
            adapt_str = row.get('IngredientA', '').strip()

            if recipe_name and adapt_str:
                adapt_ingredients = parse_adapt_ingredients(adapt_str)
                if adapt_ingredients:
                    adapt_map[recipe_name] = adapt_ingredients

    return adapt_map


def merge_into_recipes(recipes_path: Path, adapt_map: dict[str, list[str]]) -> tuple[int, int]:
    """Merge adapt ingredients into recipes.json.

    Returns:
        Tuple of (matched_count, unmatched_count)
    """
    with open(recipes_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    matched = 0
    unmatched_csv = []

    # Create lookup by recipe name
    recipe_by_name = {r['name']: r for r in data['recipes']}

    for csv_name, additions in adapt_map.items():
        if csv_name in recipe_by_name:
            recipe_by_name[csv_name]['additions'] = additions
            matched += 1
        else:
            unmatched_csv.append(csv_name)

    # Write updated recipes
    with open(recipes_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    if unmatched_csv:
        print(f"\nUnmatched CSV recipes ({len(unmatched_csv)}):")
        for name in sorted(unmatched_csv):
            print(f"  - {name}")

    return matched, len(unmatched_csv)


def main():
    # Paths
    project_root = Path(__file__).parent.parent
    csv_path = project_root / "SOS_ Grand Bazaar Recipes - Sheet1.csv"
    recipes_path = project_root / "public" / "data" / "recipes.json"

    print(f"CSV file: {csv_path}")
    print(f"Recipes file: {recipes_path}")

    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}")
        return

    if not recipes_path.exists():
        print(f"Error: Recipes file not found: {recipes_path}")
        return

    # Load CSV adapt ingredients
    print("\nLoading CSV...")
    adapt_map = load_csv(csv_path)
    print(f"Found {len(adapt_map)} recipes with adapt ingredients in CSV")

    # Show sample
    print("\nSample conversions:")
    for i, (name, additions) in enumerate(list(adapt_map.items())[:3]):
        print(f"  {name}: {additions}")

    # Merge into recipes.json
    print("\nMerging into recipes.json...")
    matched, unmatched = merge_into_recipes(recipes_path, adapt_map)

    print(f"\nResults:")
    print(f"  Matched: {matched} recipes")
    print(f"  Unmatched: {unmatched} recipes")
    print("\nDone!")


if __name__ == '__main__':
    main()
