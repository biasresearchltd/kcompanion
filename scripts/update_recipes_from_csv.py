#!/usr/bin/env python3
"""
Update recipes.json with ingredient data from CSV.
This script reads the CSV and updates matching recipes in recipes.json
with the correct ingredient data from the CSV.
"""

import csv
import json
import re
from pathlib import Path

def normalize_name(name: str) -> str:
    """Convert a display name to an ID (snake_case)."""
    # Handle special cases
    name = name.strip()
    if not name:
        return ""

    # Handle + suffix for plus quality items
    if name.endswith(' +'):
        name = name[:-2] + '_plus'
    elif name.endswith('+'):
        name = name[:-1] + '_plus'

    # Convert to lowercase and replace spaces/special chars with underscores
    normalized = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    return normalized

def parse_ingredient_cell(cell: str) -> list:
    """
    Parse an ingredient cell which may contain:
    - Single ingredient: "Tomato"
    - Multiple choices: "Cheese|Herb Cheese|Cheese +"
    - Empty cell: ""

    Returns a list of normalized ingredient IDs.
    """
    if not cell or not cell.strip():
        return []

    # Split by | for choices
    parts = [p.strip() for p in cell.split('|')]
    return [normalize_name(p) for p in parts if p.strip()]

def build_ingredient_object(ingredients: list) -> dict:
    """
    Build an ingredient object for the recipe.
    If single ingredient, returns {"id": "xxx", "required": true}
    If multiple choices, returns {"id": "choice", "required": true, "oneOf": [...]}
    """
    if len(ingredients) == 0:
        return None
    elif len(ingredients) == 1:
        return {"id": ingredients[0], "required": True}
    else:
        return {"id": "choice", "required": True, "oneOf": ingredients}

def parse_csv_recipe(row: dict) -> dict:
    """Parse a CSV row into recipe ingredient data."""
    recipe_name = row.get('Recipe', '').strip()
    recipe_type = row.get('Type', '').strip()

    if not recipe_name:
        return None

    # Parse required ingredients (Ingredient1-4)
    required_ingredients = []
    for i in range(1, 5):
        col = f'Ingredient{i}'
        if col in row:
            parsed = parse_ingredient_cell(row[col])
            if parsed:
                ing_obj = build_ingredient_object(parsed)
                if ing_obj:
                    required_ingredients.append(ing_obj)

    # Parse additions (IngredientA)
    additions = []
    if 'IngredientA' in row:
        additions = parse_ingredient_cell(row['IngredientA'])

    # Map CSV type to our category format
    category_map = {
        'Salads': 'salad',
        'Soups': 'soup',
        'Sides': 'side',
        'Mains': 'main_dish',
        'Main Dishes': 'main_dish',
        'Desserts': 'dessert',
        'Other': 'other',
        'Other Recipes': 'other'
    }

    # Parse additional fields
    base_value = row.get('Sales Price', '0').replace(',', '')
    try:
        base_value = int(base_value)
    except ValueError:
        base_value = 0

    effect = None
    effect_level = None
    effect_raw = row.get('Effect', '').strip()
    if effect_raw and effect_raw != 'None':
        # Parse effect like "Stamina Saver Lv. 3"
        effect_match = re.match(r'(.+?)\s*Lv\.?\s*(\d+)', effect_raw)
        if effect_match:
            effect_name = effect_match.group(1).strip()
            effect_level = int(effect_match.group(2))
            # Convert effect name to ID
            effect_map = {
                'Stamina Saver': 'stamina_saver',
                'Watering Rare Crop %': 'watering_rare_crop',
                'Rod Durability Up': 'rod_durability_up',
                'Run Speed Up': 'run_speed_up',
                'Max Stamina Up': 'max_stamina_up',
                'Chat Friendship Boost': 'chat_friendship_boost',
                'Petting Happiness Up': 'petting_happiness_up',
                'Petting Rare Item %': 'petting_rare_item',
                'Petting Rare Item': 'petting_rare_item',
                'Pet Training Up': 'pet_training_up',
                'Happy Energy Gain': 'happy_energy_gain',
            }
            effect = effect_map.get(effect_name, normalize_name(effect_name))

    result = {
        'name': recipe_name,
        'id': normalize_name(recipe_name),
        'category': category_map.get(recipe_type, 'other'),
        'ingredients': required_ingredients,
        'additions': additions,
        'baseValue': base_value,
    }

    if effect:
        result['effect'] = effect
    if effect_level:
        result['effectLevel'] = effect_level

    return result

def load_csv(csv_path: str) -> list:
    """Load and parse the CSV file."""
    recipes = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed = parse_csv_recipe(row)
            if parsed:
                recipes.append(parsed)
    return recipes

def update_recipes_json(json_path: str, csv_recipes: list) -> tuple:
    """
    Update recipes.json with data from CSV.
    Updates ingredients, additions, baseValue, effect, effectLevel.
    Also adds new recipes that don't exist yet.
    Preserves other fields like unlockMethod, icon, etc.

    Returns (updated_count, added_count, not_found_recipes)
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Create lookup by normalized name
    csv_lookup = {r['id']: r for r in csv_recipes}
    # Also create lookup by exact name for fallback matching
    csv_name_lookup = {r['name'].lower(): r for r in csv_recipes}

    # Track which CSV recipes we've matched
    matched_csv_ids = set()

    updated_count = 0
    not_found = []

    for recipe in data['recipes']:
        recipe_id = recipe['id']
        recipe_name = recipe.get('name', '').lower()

        csv_recipe = None

        # Try to find match by ID first
        if recipe_id in csv_lookup:
            csv_recipe = csv_lookup[recipe_id]
            matched_csv_ids.add(recipe_id)
        # Fallback: try by name
        elif recipe_name in csv_name_lookup:
            csv_recipe = csv_name_lookup[recipe_name]
            matched_csv_ids.add(csv_recipe['id'])

        if csv_recipe:
            # Update ingredients
            recipe['ingredients'] = csv_recipe['ingredients']

            # Update additions (or remove if empty)
            if csv_recipe['additions']:
                recipe['additions'] = csv_recipe['additions']
            elif 'additions' in recipe:
                del recipe['additions']

            # Update baseValue
            if csv_recipe['baseValue']:
                recipe['baseValue'] = csv_recipe['baseValue']

            # Update effect/effectLevel
            if csv_recipe.get('effect'):
                recipe['effect'] = csv_recipe['effect']
            if csv_recipe.get('effectLevel'):
                recipe['effectLevel'] = csv_recipe['effectLevel']

            updated_count += 1
            print(f"Updated: {recipe['name']}")
        else:
            not_found.append(recipe['name'])

    # Add new recipes from CSV that don't exist in JSON
    added_count = 0
    for csv_recipe in csv_recipes:
        if csv_recipe['id'] not in matched_csv_ids:
            # Create new recipe entry
            new_recipe = {
                'id': csv_recipe['id'],
                'name': csv_recipe['name'],
                'category': csv_recipe['category'],
                'utensil': 'none',  # Default, will need manual update
                'ingredients': csv_recipe['ingredients'],
                'baseValue': csv_recipe['baseValue'],
                'unlockMethod': 'Unknown',
                'icon': f"{csv_recipe['id']}.png"
            }

            if csv_recipe['additions']:
                new_recipe['additions'] = csv_recipe['additions']

            if csv_recipe.get('effect'):
                new_recipe['effect'] = csv_recipe['effect']
            if csv_recipe.get('effectLevel'):
                new_recipe['effectLevel'] = csv_recipe['effectLevel']

            data['recipes'].append(new_recipe)
            added_count += 1
            print(f"Added new: {csv_recipe['name']}")

    # Sort recipes by category then name
    category_order = ['salad', 'soup', 'side', 'main_dish', 'dessert', 'other']
    data['recipes'].sort(key=lambda r: (
        category_order.index(r['category']) if r['category'] in category_order else 99,
        r['name']
    ))

    # Save updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    return updated_count, added_count, not_found

def main():
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent

    csv_path = project_dir / "SOS_ Grand Bazaar Recipes - Sheet1.csv"
    recipes_json_path = project_dir / "public" / "data" / "recipes.json"
    data_json_path = project_dir / "public" / "data" / "data.json"

    print(f"Loading CSV from: {csv_path}")
    csv_recipes = load_csv(csv_path)
    print(f"Loaded {len(csv_recipes)} recipes from CSV")

    # Print some examples for verification
    print("\nSample parsed CSV recipes:")
    for r in csv_recipes[:3]:
        print(f"  {r['name']}: {len(r['ingredients'])} ingredients, {len(r['additions'])} additions")
        if r.get('effect'):
            print(f"    Effect: {r['effect']} Lv. {r.get('effectLevel', '?')}")

    # Update data.json (this is the main data file now)
    if data_json_path.exists():
        print(f"\nUpdating data.json at: {data_json_path}")
        updated, added, not_found = update_recipes_json(str(data_json_path), csv_recipes)
        print(f"\nUpdated {updated} recipes, added {added} new recipes in data.json")

        if not_found:
            print(f"\nRecipes in JSON not found in CSV ({len(not_found)}):")
            for name in sorted(not_found):
                print(f"  - {name}")

    # Also update recipes.json if it exists
    if recipes_json_path.exists():
        print(f"\nUpdating recipes.json at: {recipes_json_path}")
        updated2, added2, _ = update_recipes_json(str(recipes_json_path), csv_recipes)
        print(f"Updated {updated2} recipes, added {added2} new recipes")

if __name__ == '__main__':
    main()
