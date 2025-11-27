#!/usr/bin/env python3
"""
StratsWiki Scraper for Story of Seasons: Grand Bazaar

Scrapes recipe and ingredient data from stratswiki.com/sos-gb/
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from urllib.parse import urljoin
import os

# Base configuration
BASE_URL = "https://stratswiki.com/sos-gb"
OUTPUT_DIR = Path(__file__).parent.parent / "output"
IMAGES_DIR = Path(__file__).parent.parent.parent / "public" / "images"

# Rate limiting
REQUEST_DELAY = 1.0  # seconds between requests


@dataclass
class Ingredient:
    id: str
    name: str
    category: str
    subcategory: Optional[str] = None
    season: List[str] = field(default_factory=list)
    source: str = ""
    base_price: Optional[int] = None
    icon: Optional[str] = None
    variants: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


@dataclass
class RecipeIngredient:
    id: str
    required: bool = True
    one_of: Optional[List[str]] = None
    count: int = 1
    plus_quality: bool = False


@dataclass
class Recipe:
    id: str
    name: str
    category: str
    utensil: str
    ingredients: List[dict]
    base_value: int
    effect: Optional[str] = None
    effect_level: Optional[int] = None
    unlock_method: str = ""
    icon: Optional[str] = None


class StratsWikiScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrandBazaarKitchenCompanion/1.0 (Educational Project)'
        })
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "raw").mkdir(exist_ok=True)
        (OUTPUT_DIR / "parsed").mkdir(exist_ok=True)
        (OUTPUT_DIR / "final").mkdir(exist_ok=True)

    def fetch_page(self, path: str) -> str:
        """Fetch a page with rate limiting."""
        url = f"{BASE_URL}/{path}" if not path.startswith("http") else path
        print(f"Fetching: {url}")
        time.sleep(REQUEST_DELAY)
        response = self.session.get(url)
        response.raise_for_status()
        return response.text

    def save_raw_html(self, html: str, filename: str):
        """Save raw HTML for debugging."""
        path = OUTPUT_DIR / "raw" / filename
        path.write_text(html, encoding='utf-8')
        print(f"Saved raw HTML: {path}")

    def to_id(self, name: str) -> str:
        """Convert display name to snake_case ID."""
        # Handle special characters
        name = name.replace("+", "_plus")
        name = name.replace("&", "_and_")
        name = name.replace("'", "")
        # Convert to lowercase and replace non-alphanumeric with underscore
        id_str = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
        # Remove duplicate underscores
        id_str = re.sub(r'_+', '_', id_str)
        return id_str

    def parse_effect(self, effect_text: str) -> Tuple[Optional[str], Optional[int]]:
        """Parse effect text like 'Stamina Saver Lv. 3' into (effect_id, level)."""
        if not effect_text or effect_text.lower() in ['none', '-', '']:
            return None, None

        # Match patterns like "Stamina Saver Lv. 3" or "Double Forage"
        match = re.match(r'^(.+?)\s*(?:Lv\.?\s*(\d+))?$', effect_text.strip())
        if match:
            effect_name = match.group(1).strip()
            level = int(match.group(2)) if match.group(2) else 1
            effect_id = self.to_id(effect_name)
            return effect_id, level
        return None, None

    def parse_price(self, price_text: str) -> int:
        """Parse price text like '911 G' or '2,429 G' into integer."""
        if not price_text:
            return 0
        # Remove commas, 'G', and whitespace
        cleaned = re.sub(r'[,G\s]', '', price_text)
        try:
            return int(cleaned)
        except ValueError:
            return 0

    def parse_ingredient_text(self, text: str) -> List[dict]:
        """
        Parse ingredient text from recipe tables.

        Examples:
        - "Tomato, Cheese (any), Olive Oil, Salt"
        - "Mint/Chamomile/Lavender (2 required)"
        - "Cooked Rice, Curry Powder, one of (Potato/Carrot/Onion)"
        - "Egg/Silkie Egg"
        - "Mushroom (any)"
        - "Fish (Yellow Perch/Snakehead/...)"
        - "Cheese+"
        """
        ingredients = []

        # Split by comma, but be careful with parentheses
        parts = self._split_ingredients(text)

        for part in parts:
            part = part.strip()
            if not part:
                continue

            ingredient = self._parse_single_ingredient(part)
            if ingredient:
                ingredients.append(ingredient)

        return ingredients

    def _split_ingredients(self, text: str) -> List[str]:
        """Split ingredient text by comma, respecting parentheses."""
        parts = []
        current = ""
        paren_depth = 0

        for char in text:
            if char == '(':
                paren_depth += 1
                current += char
            elif char == ')':
                paren_depth -= 1
                current += char
            elif char == ',' and paren_depth == 0:
                parts.append(current.strip())
                current = ""
            else:
                current += char

        if current.strip():
            parts.append(current.strip())

        return parts

    def _parse_single_ingredient(self, text: str) -> Optional[dict]:
        """Parse a single ingredient specification."""
        text = text.strip()
        if not text:
            return None

        # Check for plus quality requirement (e.g., "Cheese+", "Egg+/Silkie Egg+")
        plus_quality = '+' in text
        text = text.replace('+', '')

        # Check for count requirement (e.g., "(2 required)", "(3 total)")
        count = 1
        count_match = re.search(r'\((\d+)\s*(?:required|total)\)', text, re.IGNORECASE)
        if count_match:
            count = int(count_match.group(1))
            text = re.sub(r'\(\d+\s*(?:required|total)\)', '', text).strip()

        # Check for "one of" pattern
        one_of_match = re.search(r'one\s+of\s*\(([^)]+)\)', text, re.IGNORECASE)
        if one_of_match:
            options_text = one_of_match.group(1)
            options = [self.to_id(opt.strip()) for opt in options_text.split('/')]
            return {
                "id": "choice",
                "required": True,
                "oneOf": options,
                "count": count,
                "plusQuality": plus_quality
            }

        # Check for "(any)" pattern - e.g., "Cheese (any)", "Mushroom (any)"
        any_match = re.search(r'^(.+?)\s*\(any\)$', text, re.IGNORECASE)
        if any_match:
            base_name = any_match.group(1).strip()
            return {
                "id": self.to_id(base_name),
                "required": True,
                "anyVariant": True,
                "count": count,
                "plusQuality": plus_quality
            }

        # Check for fish category pattern - e.g., "Fish (Yellow Perch/Snakehead/...)"
        fish_match = re.search(r'^Fish\s*\(([^)]+)\)', text, re.IGNORECASE)
        if fish_match:
            fish_options = fish_match.group(1)
            options = [self.to_id(opt.strip()) for opt in fish_options.split('/')]
            return {
                "id": "fish_choice",
                "required": True,
                "oneOf": options,
                "count": count,
                "plusQuality": plus_quality
            }

        # Check for slash alternatives (e.g., "Egg/Silkie Egg", "Milk/Buffalo Milk")
        if '/' in text:
            options = [self.to_id(opt.strip()) for opt in text.split('/')]
            return {
                "id": "choice",
                "required": True,
                "oneOf": options,
                "count": count,
                "plusQuality": plus_quality
            }

        # Check for parenthetical options (e.g., "Bread (White Bread/Baguettes/...)")
        paren_match = re.search(r'^(.+?)\s*\(([^)]+)\)$', text)
        if paren_match:
            base_name = paren_match.group(1).strip()
            paren_content = paren_match.group(2).strip()

            # If it contains slashes, it's a list of alternatives
            if '/' in paren_content:
                options = [self.to_id(base_name)] + [self.to_id(opt.strip()) for opt in paren_content.split('/')]
                # Remove duplicates while preserving order
                seen = set()
                unique_options = []
                for opt in options:
                    if opt not in seen:
                        seen.add(opt)
                        unique_options.append(opt)
                return {
                    "id": "choice",
                    "required": True,
                    "oneOf": unique_options,
                    "count": count,
                    "plusQuality": plus_quality
                }

        # Simple ingredient
        return {
            "id": self.to_id(text),
            "required": True,
            "count": count,
            "plusQuality": plus_quality
        }

    def parse_recipes_page(self) -> List[Recipe]:
        """Parse the main recipes page."""
        html = self.fetch_page("items/recipes/")
        self.save_raw_html(html, "recipes.html")

        soup = BeautifulSoup(html, 'lxml')
        recipes = []

        # The page has category sections with tables
        # Look for h2/h3 headers followed by tables
        current_category = "other"

        # Find all tables on the page
        tables = soup.find_all('table')

        for table in tables:
            # Try to find the category from a preceding header
            prev_header = table.find_previous(['h2', 'h3'])
            if prev_header:
                header_text = prev_header.get_text(strip=True).lower()
                if 'salad' in header_text:
                    current_category = 'salad'
                elif 'soup' in header_text:
                    current_category = 'soup'
                elif 'side' in header_text:
                    current_category = 'side'
                elif 'main' in header_text:
                    current_category = 'main_dish'
                elif 'dessert' in header_text:
                    current_category = 'dessert'
                elif 'other' in header_text:
                    current_category = 'other'

            # Parse table rows
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 4:
                    continue

                # Skip header rows
                if row.find('th'):
                    continue

                recipe = self._parse_recipe_row(cells, current_category)
                if recipe:
                    recipes.append(recipe)

        print(f"Parsed {len(recipes)} recipes")
        return recipes

    def _parse_recipe_row(self, cells, category: str) -> Optional[Recipe]:
        """Parse a single recipe table row."""
        try:
            # Expected columns: Recipe (with icon), Ingredients, Base Sell Price, Effect, Where to Learn
            # Or: Recipe, Ingredients, Price, Effect, Unlock

            # Get recipe name (first cell, may have icon)
            name_cell = cells[0]
            name = name_cell.get_text(strip=True)
            if not name:
                return None

            # Try to get icon URL
            icon_url = None
            img = name_cell.find('img')
            if img:
                icon_url = img.get('src') or img.get('data-src')

            # Get ingredients (second cell)
            ingredients_text = cells[1].get_text(strip=True)
            ingredients = self.parse_ingredient_text(ingredients_text)

            # Get price (third cell)
            price_text = cells[2].get_text(strip=True)
            price = self.parse_price(price_text)

            # Get effect (fourth cell)
            effect_text = cells[3].get_text(strip=True) if len(cells) > 3 else ""
            effect_id, effect_level = self.parse_effect(effect_text)

            # Get unlock method (fifth cell)
            unlock_method = cells[4].get_text(strip=True) if len(cells) > 4 else ""

            return Recipe(
                id=self.to_id(name),
                name=name,
                category=category,
                utensil=self._infer_utensil(name, ingredients),
                ingredients=ingredients,
                base_value=price,
                effect=effect_id,
                effect_level=effect_level,
                unlock_method=unlock_method,
                icon=icon_url
            )
        except Exception as e:
            print(f"Error parsing recipe row: {e}")
            return None

    def _infer_utensil(self, name: str, ingredients: List[dict]) -> str:
        """
        Infer the utensil based on recipe name/ingredients.
        This is a heuristic since the wiki doesn't always list utensils explicitly.
        """
        name_lower = name.lower()

        # No utensil recipes (raw/simple)
        no_utensil_keywords = ['salad', 'juice', 'sashimi', 'tea', 'jam', 'honey']
        if any(kw in name_lower for kw in no_utensil_keywords):
            return 'none'

        # Pot recipes (soups, stews, boiled, rice dishes)
        pot_keywords = ['soup', 'stew', 'boiled', 'rice', 'curry', 'udon', 'soba',
                       'hot pot', 'porridge', 'risotto', 'fondue', 'pasta']
        if any(kw in name_lower for kw in pot_keywords):
            return 'pot'

        # Frying pan recipes
        pan_keywords = ['fried', 'sautéed', 'stir-fry', 'pancake', 'omelet',
                       'grilled', 'tempura', 'croquette', 'gyoza', 'okonomiyaki']
        if any(kw in name_lower for kw in pan_keywords):
            return 'frying_pan'

        # Seasoning set for baked goods
        baked_keywords = ['bread', 'cake', 'pie', 'cookie', 'bun', 'muffin',
                         'scone', 'donut', 'churro', 'pudding', 'tart']
        if any(kw in name_lower for kw in baked_keywords):
            return 'seasoning_set'

        # Default to none
        return 'none'

    def scrape_all(self) -> Dict:
        """Scrape all data and return combined result."""
        print("Starting full scrape...")

        # Scrape recipes
        recipes = self.parse_recipes_page()

        # Extract unique ingredients from recipes
        ingredients = self._extract_ingredients_from_recipes(recipes)

        # Create effects list from recipes
        effects = self._extract_effects_from_recipes(recipes)

        return {
            'recipes': [asdict(r) for r in recipes],
            'ingredients': [asdict(i) for i in ingredients],
            'effects': effects,
            'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'source': 'stratswiki.com/sos-gb'
        }

    def _extract_ingredients_from_recipes(self, recipes: List[Recipe]) -> List[Ingredient]:
        """Extract unique ingredient IDs from all recipes."""
        ingredient_ids = set()

        for recipe in recipes:
            for ing in recipe.ingredients:
                if ing.get('oneOf'):
                    ingredient_ids.update(ing['oneOf'])
                elif ing.get('id') and ing['id'] not in ['choice', 'fish_choice']:
                    ingredient_ids.add(ing['id'])

        # Create Ingredient objects with basic info
        # Full details will be populated from ingredient pages
        ingredients = []
        for ing_id in sorted(ingredient_ids):
            category, subcategory = self._categorize_ingredient(ing_id)
            ingredients.append(Ingredient(
                id=ing_id,
                name=ing_id.replace('_', ' ').title(),
                category=category,
                subcategory=subcategory
            ))

        return ingredients

    def _categorize_ingredient(self, ing_id: str) -> Tuple[str, Optional[str]]:
        """Categorize an ingredient based on its ID."""
        # Crops
        spring_crops = ['turnip', 'potato', 'cabbage', 'asparagus', 'strawberry',
                       'onion', 'radish', 'garlic', 'daikon_radish', 'broccoli']
        summer_crops = ['tomato', 'corn', 'pineapple', 'pumpkin', 'watermelon',
                       'melon', 'cucumber', 'eggplant', 'red_bell_pepper',
                       'green_bell_pepper']
        fall_crops = ['carrot', 'spinach', 'cauliflower', 'chili_pepper',
                     'sweet_potato', 'bok_choy', 'napa_cabbage']
        winter_crops = ['burdock', 'green_onion']

        if any(ing_id.startswith(c) or ing_id == c for c in spring_crops):
            return 'crops', 'spring'
        if any(ing_id.startswith(c) or ing_id == c for c in summer_crops):
            return 'crops', 'summer'
        if any(ing_id.startswith(c) or ing_id == c for c in fall_crops):
            return 'crops', 'fall'
        if any(ing_id.startswith(c) or ing_id == c for c in winter_crops):
            return 'crops', 'winter'

        # Animal products
        if any(x in ing_id for x in ['egg', 'milk', 'cheese', 'butter',
                                      'yogurt', 'mayonnaise', 'wool']):
            return 'animal_products', None

        # Fish
        fish_names = ['minnow', 'carp', 'trout', 'salmon', 'bass', 'perch',
                     'catfish', 'eel', 'fish']
        if any(f in ing_id for f in fish_names):
            return 'fish', None

        # Foraged
        if any(x in ing_id for x in ['mint', 'chamomile', 'lavender', 'walnut',
                                      'chestnut', 'mushroom', 'seaweed']):
            return 'foraged', None

        # Processed
        if any(x in ing_id for x in ['flour', 'oil', 'miso', 'soy_sauce',
                                      'vinegar', 'sugar', 'salt', 'chocolate',
                                      'curry_powder', 'bread', 'pasta', 'tofu']):
            return 'processed', None

        # Fruits
        fruits = ['apple', 'orange', 'cherry', 'peach', 'banana', 'mango',
                 'lemon', 'grape', 'blueberry', 'avocado', 'olive']
        if any(f in ing_id for f in fruits):
            return 'fruits', None

        return 'other', None

    def _extract_effects_from_recipes(self, recipes: List[Recipe]) -> List[dict]:
        """Extract unique effects from all recipes."""
        effects_map = {}

        for recipe in recipes:
            if recipe.effect:
                if recipe.effect not in effects_map:
                    effects_map[recipe.effect] = {
                        'id': recipe.effect,
                        'name': recipe.effect.replace('_', ' ').title(),
                        'maxLevel': recipe.effect_level or 1,
                        'category': self._categorize_effect(recipe.effect)
                    }
                else:
                    # Update max level if higher
                    if recipe.effect_level and recipe.effect_level > effects_map[recipe.effect]['maxLevel']:
                        effects_map[recipe.effect]['maxLevel'] = recipe.effect_level

        return list(effects_map.values())

    def _categorize_effect(self, effect_id: str) -> str:
        """Categorize an effect."""
        if 'stamina' in effect_id:
            return 'stamina'
        if 'speed' in effect_id or 'run' in effect_id:
            return 'movement'
        if 'watering' in effect_id or 'forage' in effect_id:
            return 'farming'
        if 'rod' in effect_id:
            return 'fishing'
        if 'chat' in effect_id or 'friendship' in effect_id:
            return 'social'
        if 'petting' in effect_id or 'pet' in effect_id:
            return 'animals'
        if 'happy' in effect_id or 'energy' in effect_id:
            return 'bazaar'
        if 'jump' in effect_id:
            return 'movement'
        return 'other'

    def save_json(self, data: Dict, filename: str, directory: str = "parsed"):
        """Save data as JSON."""
        path = OUTPUT_DIR / directory / filename
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved: {path}")


def main():
    scraper = StratsWikiScraper()

    # Run full scrape
    data = scraper.scrape_all()

    # Save combined data
    scraper.save_json(data, "scraped_data.json", "parsed")

    # Also save separate files
    scraper.save_json({'recipes': data['recipes']}, "recipes.json", "parsed")
    scraper.save_json({'ingredients': data['ingredients']}, "ingredients.json", "parsed")
    scraper.save_json({'effects': data['effects']}, "effects.json", "parsed")

    print(f"\nScraping complete!")
    print(f"  Recipes: {len(data['recipes'])}")
    print(f"  Ingredients: {len(data['ingredients'])}")
    print(f"  Effects: {len(data['effects'])}")


if __name__ == '__main__':
    main()
