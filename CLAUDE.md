# Grand Bazaar Kitchen Companion

A responsive Progressive Web App (PWA) for Story of Seasons: Grand Bazaar recipe discovery based on available ingredients.

---

## Project Overview

### Purpose
Help players discover what dishes they can cook based on ingredients currently in their inventory ("Ingredients in Inventory" / III workflow). Surface recipes that are fully achievable or within N ingredients of being achievable.

### Core Features
1. **Ingredient Inventory Selector** - Fast, intuitive multi-select with search and browse modes
2. **Recipe Discovery Engine** - Find exact matches + "off by N" near-matches
3. **PWA Support** - Installable mobile web app with offline capability
4. **Responsive Design** - Optimized for both desktop and mobile viewports

### Target Platforms
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile web (iOS Safari, Android Chrome)
- PWA installation on both platforms

---

## Technical Stack

### Frontend
```
Framework:    React 18+ with TypeScript
Styling:      Tailwind CSS (utility-first, responsive)
State:        Zustand (lightweight, persisted state)
Search:       Fuse.js (fuzzy search, no backend needed)
Build:        Vite (fast HMR, optimized builds)
PWA:          vite-plugin-pwa (service worker, manifest)
```

### Data Layer
```
Format:       Static JSON (no backend required)
Storage:      LocalStorage for user preferences/inventory
Caching:      Service Worker for offline support
```

### Why This Stack?
- **No backend required** - All computation client-side, static hosting (Vercel/Netlify/GitHub Pages)
- **Instant search** - Fuse.js handles fuzzy matching without network latency
- **Offline-first** - Service worker caches all assets and data
- **Mobile-optimized** - Tailwind's responsive utilities + touch-friendly components

---

## Data Architecture

### Database Schema

#### `ingredients.json`
```json
{
  "ingredients": [
    {
      "id": "turnip",
      "name": "Turnip",
      "category": "crops",
      "subcategory": "spring",
      "season": ["spring"],
      "icon": "turnip.png",
      "commonRank": 85,
      "aliases": ["turnips"],
      "source": "farming",
      "variants": ["star_turnip", "gold_turnip"],
      "tags": ["vegetable", "root"]
    }
  ]
}
```

#### `recipes.json`
```json
{
  "recipes": [
    {
      "id": "curry_rice",
      "name": "Curry Rice",
      "category": "main_dish",
      "utensil": "pot",
      "ingredients": [
        { "id": "cooked_rice", "required": true },
        { "id": "curry_powder", "required": true },
        {
          "oneOf": ["potato", "carrot", "onion"],
          "required": true
        },
        {
          "oneOf": ["yogurt", "good_yogurt", "great_yogurt"],
          "required": true
        }
      ],
      "additions": ["carrot", "onion", "potato"],
      "baseValue": 911,
      "effect": null,
      "effectLevel": null,
      "unlockMethod": "Clara's Diner, Flex it out! mail from Felix",
      "festivalUse": null,
      "icon": "curry_rice.png"
    },
    {
      "id": "herb_salad",
      "name": "Herb Salad",
      "category": "salad",
      "utensil": "none",
      "ingredients": [
        { "id": "mint", "required": true },
        { "id": "chamomile", "required": true },
        { "id": "lavender", "required": true }
      ],
      "additions": [],
      "baseValue": 677,
      "effect": "watering_rare_crop",
      "effectLevel": 2,
      "unlockMethod": "Café Madeleine",
      "festivalUse": null,
      "icon": "herb_salad.png"
    }
  ]
}
```

#### `effects.json` (NEW - Recipe Buff System)
```json
{
  "effects": [
    {
      "id": "stamina_saver",
      "name": "Stamina Saver",
      "description": "Reduces stamina consumption for actions",
      "maxLevel": 4,
      "category": "stamina"
    },
    {
      "id": "max_stamina_up",
      "name": "Max Stamina Up",
      "description": "Temporarily increases maximum stamina",
      "maxLevel": 4,
      "category": "stamina"
    },
    {
      "id": "run_speed_up",
      "name": "Run Speed Up",
      "description": "Increases movement speed",
      "maxLevel": 4,
      "category": "movement"
    },
    {
      "id": "watering_rare_crop",
      "name": "Watering Rare Crop %",
      "description": "Increases chance of rare crop mutation when watering",
      "maxLevel": 4,
      "category": "farming"
    },
    {
      "id": "rod_durability_up",
      "name": "Rod Durability Up",
      "description": "Reduces fishing rod durability loss",
      "maxLevel": 4,
      "category": "fishing"
    },
    {
      "id": "chat_friendship_boost",
      "name": "Chat Friendship Boost",
      "description": "Increases friendship gained from conversations",
      "maxLevel": 4,
      "category": "social"
    },
    {
      "id": "petting_happiness_up",
      "name": "Petting Happiness Up",
      "description": "Increases animal happiness from petting",
      "maxLevel": 4,
      "category": "animals"
    },
    {
      "id": "petting_rare_item",
      "name": "Petting Rare Item %",
      "description": "Increases chance of rare items when petting animals",
      "maxLevel": 4,
      "category": "animals"
    },
    {
      "id": "pet_training_up",
      "name": "Pet Training Up",
      "description": "Increases effectiveness of pet training",
      "maxLevel": 4,
      "category": "animals"
    },
    {
      "id": "happy_energy_gain",
      "name": "Happy Energy Gain",
      "description": "Increases Happy Energy earned at the bazaar",
      "maxLevel": 4,
      "category": "bazaar"
    },
    {
      "id": "jump_distance_up",
      "name": "Jump Distance Up",
      "description": "Increases jump distance",
      "maxLevel": 1,
      "category": "movement"
    },
    {
      "id": "double_forage",
      "name": "Double Forage",
      "description": "Chance to gather double foraged items",
      "maxLevel": 1,
      "category": "foraging"
    }
  ]
}
```

#### `categories.json`
```json
{
  "ingredientCategories": [
    { "id": "crops", "name": "Crops", "icon": "crops.png", "order": 1 },
    { "id": "animal_products", "name": "Animal Products", "icon": "animal.png", "order": 2 },
    { "id": "fish", "name": "Fish", "icon": "fish.png", "order": 3 },
    { "id": "foraged", "name": "Foraged Items", "icon": "foraged.png", "order": 4 },
    { "id": "processed", "name": "Processed Goods", "icon": "processed.png", "order": 5 },
    { "id": "purchased", "name": "Store Items", "icon": "store.png", "order": 6 }
  ],
  "recipeCategories": [
    { "id": "salad", "name": "Salads", "icon": "salad.png", "count": 12 },
    { "id": "soup", "name": "Soups", "icon": "soup.png", "count": 10 },
    { "id": "side", "name": "Sides", "icon": "side.png", "count": 56 },
    { "id": "main_dish", "name": "Main Dishes", "icon": "main.png", "count": 80 },
    { "id": "dessert", "name": "Desserts", "icon": "dessert.png", "count": 41 },
    { "id": "other", "name": "Other", "icon": "other.png", "count": 67 }
  ],
  "utensils": [
    { "id": "none", "name": "No Utensil", "unlockCost": 0 },
    { "id": "pot", "name": "Pot", "unlockCost": 10000 },
    { "id": "frying_pan", "name": "Frying Pan", "unlockCost": 10000 },
    { "id": "seasoning_set", "name": "Seasoning Set", "unlockCost": 10000 }
  ]
}
```

### Ingredient Categories (Full List)

#### Crops (by season)
**Spring:** Turnip, Potato, Cabbage, Cucumber, Asparagus, Strawberry
**Summer:** Tomato, Corn, Onion, Pineapple, Pumpkin, Radish, Peach
**Fall:** Eggplant, Carrot, Yam, Green Pepper, Spinach, Yellow Pepper, Cauliflower, Grape, Muscat, Apple, Blueberry
**Winter:** (limited - mostly tree harvests)
**Multi-season:** Tea Leaves (Spring/Summer/Fall variants), Wheat, Grass/Fodder

#### Animal Products
- **Eggs:** Egg, Black Egg, Golden Egg
- **Milk:** Milk, Jersey Milk, Golden Milk
- **Processed:** Cheese (3 tiers), Butter (3 tiers), Mayonnaise (3 tiers), Yogurt (3 tiers)
- **Herb variants:** Herb Cheese, Herb Butter, Herb Mayonnaise (3 tiers each)
- **Wool:** Wool, Good Wool, Great Wool, Ball of Wool (3 tiers) - not for cooking

#### Fish (50+ species)
Categorized by fishing location and rod requirement (Short/Medium/Long pole)

#### Foraged/Wild Items
- **Flowers:** Moondrop, Toy Flower, Pink Cat, Magic Blue, Magic Red
- **Herbs:** Mint, Chamomile, Lavender
- **Mushrooms:** Shitake, Shimeji, Poison Mushroom, Truffle
- **Other:** Walnut, Honeycomb, Chestnut, Seaweed

#### Processed Goods (Windmill Products)
- **Flours:** Flour, Rice Flour, Buckwheat Flour, Soy Flour, Shiratama Flour
- **Oils:** Oil, Olive Oil, Herb Oil, Nut Oil, Grape Seed Oil, Pumpkin Seed Oil
- **Wines:** Red, White, Rose, Champagne, 15+ fruit wines, seasonal wines
- **Teas:** 20+ tea varieties (canned)
- **Jams:** Apple, Strawberry, Grape, Blueberry
- **Other:** Miso, Curry Powder, Chocolate, Honey, Bottled items

#### Store-Purchased Ingredients
- Rice, Soybeans, Soba Noodles, Rice Candy, Oil, Bread, Curry Powder, Chocolate, Sugar, Salt, Vinegar, Soy Sauce

---

## Web Scraping Strategy

### Primary Data Sources
1. **stratswiki.com/sos-gb/** - **PRIMARY SOURCE** for Switch remake, has recipe effects/buffs
2. **fogu.com/hm9/** - Comprehensive DS original data, good ingredient details
3. **wiki.ranchstory.farm** - Good recipe tables with images
4. **game8.co** - Supplementary data, good for cross-reference

> **Note:** The Switch remake (2025) has **266 recipes** vs the DS original's 239. 
> StratsWiki has the updated data including the buff/effect system.

### Scraper Architecture

```
scripts/
├── scraper/
│   ├── __init__.py
│   ├── fogu_scraper.py       # Primary source
│   ├── ranchstory_scraper.py # Image assets
│   ├── parser.py             # HTML table parsing
│   ├── normalizer.py         # Data normalization
│   ├── merger.py             # Combine sources
│   └── validator.py          # Schema validation
├── output/
│   ├── raw/                  # Raw scraped HTML
│   ├── parsed/               # Intermediate JSON
│   └── final/                # Production-ready JSON
└── requirements.txt
```

### Scraper Implementation Plan

#### Phase 1: Fogu.com Scraper
```python
# scripts/scraper/fogu_scraper.py

"""
Scrape recipe and ingredient data from fogu.com/hm9/

Target pages:
- /things-to-do/cooking.php (239 recipes with ingredients)
- /item-profit-list.php (all items with prices)
- /your-farm/crops.php (crop details)
- /activities/fishing.php (fish list)
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class Ingredient:
    id: str
    name: str
    category: str
    subcategory: Optional[str]
    season: List[str]
    source: str
    base_price: Optional[int]
    variants: List[str]
    
@dataclass 
class RecipeIngredient:
    id: str
    required: bool
    one_of: Optional[List[str]] = None
    
@dataclass
class Recipe:
    id: str
    name: str
    category: str
    utensil: str
    ingredients: List[RecipeIngredient]
    additions: List[str]
    base_value: int
    max_value: int
    unlock_method: str

class FoguScraper:
    BASE_URL = "https://fogu.com/hm9"
    
    def __init__(self, output_dir: str = "output/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrandBazaarRecipeDB/1.0 (Educational Project)'
        })
    
    def fetch_page(self, path: str) -> str:
        """Fetch a page with rate limiting."""
        url = f"{self.BASE_URL}/{path}"
        time.sleep(1)  # Be respectful
        response = self.session.get(url)
        response.raise_for_status()
        return response.text
    
    def parse_cooking_page(self) -> List[Recipe]:
        """Parse the main cooking recipes page."""
        html = self.fetch_page("things-to-do/cooking.php")
        soup = BeautifulSoup(html, 'html.parser')
        
        recipes = []
        current_category = None
        
        # Find all recipe tables
        tables = soup.find_all('table')
        
        for table in tables:
            # Parse category from preceding header
            prev = table.find_previous(['h2', 'h3'])
            if prev:
                current_category = self._normalize_category(prev.get_text())
            
            # Parse each row
            rows = table.find_all('tr')[1:]  # Skip header
            for row in rows:
                recipe = self._parse_recipe_row(row, current_category)
                if recipe:
                    recipes.append(recipe)
        
        return recipes
    
    def _parse_recipe_row(self, row, category: str) -> Optional[Recipe]:
        """Parse a single recipe table row."""
        cells = row.find_all('td')
        if len(cells) < 5:
            return None
            
        name = cells[0].get_text(strip=True)
        utensil = cells[1].get_text(strip=True)
        ingredients_text = cells[2].get_text(strip=True)
        additions_text = cells[3].get_text(strip=True)
        price_text = cells[4].get_text(strip=True)
        
        return Recipe(
            id=self._to_id(name),
            name=name,
            category=category,
            utensil=self._normalize_utensil(utensil),
            ingredients=self._parse_ingredients(ingredients_text),
            additions=self._parse_additions(additions_text),
            base_value=self._parse_price(price_text, 'base'),
            max_value=self._parse_price(price_text, 'max'),
            unlock_method=""
        )
    
    def _parse_ingredients(self, text: str) -> List[RecipeIngredient]:
        """
        Parse ingredient text like:
        'Cooked Rice + Curry Powder + (Potato or Carrot or Onion)'
        """
        ingredients = []
        parts = text.split('+')
        
        for part in parts:
            part = part.strip()
            
            # Check for "or" alternatives
            if ' or ' in part.lower():
                # Extract from parentheses if present
                match = re.search(r'\(([^)]+)\)', part)
                if match:
                    options = [o.strip() for o in match.group(1).split(' or ')]
                else:
                    options = [o.strip() for o in part.split(' or ')]
                
                ingredients.append(RecipeIngredient(
                    id="choice",
                    required=True,
                    one_of=[self._to_id(o) for o in options]
                ))
            else:
                ingredients.append(RecipeIngredient(
                    id=self._to_id(part),
                    required=True
                ))
        
        return ingredients
    
    def _to_id(self, name: str) -> str:
        """Convert display name to ID."""
        return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    
    def _normalize_category(self, text: str) -> str:
        """Normalize recipe category."""
        text = text.lower()
        if 'salad' in text:
            return 'salad'
        elif 'soup' in text:
            return 'soup'
        elif 'appetizer' in text or 'horderve' in text:
            return 'appetizer'
        elif 'main' in text:
            return 'main_dish'
        elif 'dessert' in text:
            return 'dessert'
        else:
            return 'other'
    
    def _normalize_utensil(self, text: str) -> str:
        """Normalize utensil name."""
        text = text.lower()
        if 'pot' in text:
            return 'pot'
        elif 'frying' in text or 'pan' in text:
            return 'frying_pan'
        elif 'season' in text:
            return 'seasoning_set'
        else:
            return 'none'
    
    def _parse_additions(self, text: str) -> List[str]:
        """Parse optional addition ingredients."""
        if not text or text.lower() == '(no additions)':
            return []
        return [self._to_id(a.strip()) for a in text.split(',')]
    
    def _parse_price(self, text: str, which: str) -> int:
        """Extract price values from text like '520 G / 930 G / 1450 G'."""
        matches = re.findall(r'([\d,]+)\s*G', text)
        if not matches:
            return 0
        if which == 'base':
            return int(matches[0].replace(',', ''))
        elif which == 'max':
            return int(matches[-1].replace(',', ''))
        return 0
    
    def scrape_all(self) -> Dict:
        """Scrape all data and return combined result."""
        print("Scraping cooking recipes...")
        recipes = self.parse_cooking_page()
        
        print("Scraping item list...")
        # Additional parsing for item-profit-list.php
        # ... (similar pattern)
        
        return {
            'recipes': [asdict(r) for r in recipes],
            'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def save(self, data: Dict, filename: str):
        """Save data to JSON."""
        output_path = self.output_dir / filename
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved to {output_path}")


if __name__ == '__main__':
    scraper = FoguScraper()
    data = scraper.scrape_all()
    scraper.save(data, 'fogu_recipes.json')
```

#### Phase 2: Data Normalizer
```python
# scripts/scraper/normalizer.py

"""
Normalize and enrich scraped data.
- Deduplicate
- Resolve ingredient variants
- Add computed fields
- Validate against schema
"""

import json
from pathlib import Path
from typing import Dict, List, Set

class DataNormalizer:
    
    def __init__(self, raw_data_path: str):
        with open(raw_data_path) as f:
            self.raw_data = json.load(f)
        
        self.ingredients: Dict[str, dict] = {}
        self.recipes: List[dict] = []
        
    def extract_all_ingredients(self) -> Set[str]:
        """Extract unique ingredient IDs from all recipes."""
        ingredients = set()
        
        for recipe in self.raw_data.get('recipes', []):
            for ing in recipe.get('ingredients', []):
                if ing.get('one_of'):
                    ingredients.update(ing['one_of'])
                elif ing.get('id'):
                    ingredients.add(ing['id'])
            
            ingredients.update(recipe.get('additions', []))
        
        return ingredients
    
    def categorize_ingredient(self, ing_id: str) -> dict:
        """Determine category and metadata for an ingredient."""
        # Mapping rules based on naming patterns
        crops_spring = ['turnip', 'potato', 'cabbage', 'cucumber', 'asparagus', 'strawberry']
        crops_summer = ['tomato', 'corn', 'onion', 'pineapple', 'pumpkin', 'radish', 'peach']
        crops_fall = ['eggplant', 'carrot', 'yam', 'green_pepper', 'spinach', 'yellow_pepper', 
                      'cauliflower', 'grape', 'muscat', 'apple', 'blueberry']
        
        animal_eggs = ['egg', 'black_egg', 'golden_egg']
        animal_milk = ['milk', 'jersey_milk', 'golden_milk']
        animal_dairy = ['cheese', 'butter', 'mayonnaise', 'yogurt']
        
        fish_keywords = ['carp', 'trout', 'salmon', 'bass', 'eel', 'fish', 'sunfish', 'perch']
        
        foraged = ['mint', 'chamomile', 'lavender', 'shitake', 'shimeji', 'truffle', 
                   'walnut', 'honeycomb', 'chestnut', 'seaweed']
        
        processed_flour = ['flour', 'rice_flour', 'buckwheat_flour', 'soy_flour', 'shiratama_flour']
        processed_oil = ['oil', 'olive_oil', 'herb_oil', 'nut_oil', 'grape_seed_oil', 'pumpkin_seed_oil']
        
        # Determine category
        if any(ing_id.startswith(c) or ing_id == c for c in crops_spring):
            return {'category': 'crops', 'subcategory': 'spring', 'season': ['spring']}
        elif any(ing_id.startswith(c) or ing_id == c for c in crops_summer):
            return {'category': 'crops', 'subcategory': 'summer', 'season': ['summer']}
        elif any(ing_id.startswith(c) or ing_id == c for c in crops_fall):
            return {'category': 'crops', 'subcategory': 'fall', 'season': ['fall']}
        elif ing_id in animal_eggs or any(ing_id.endswith('_egg') for _ in [1]):
            return {'category': 'animal_products', 'subcategory': 'eggs', 'season': ['all']}
        elif ing_id in animal_milk or 'milk' in ing_id:
            return {'category': 'animal_products', 'subcategory': 'milk', 'season': ['all']}
        elif any(d in ing_id for d in animal_dairy):
            return {'category': 'animal_products', 'subcategory': 'dairy', 'season': ['all']}
        elif any(f in ing_id for f in fish_keywords):
            return {'category': 'fish', 'subcategory': 'freshwater', 'season': ['varies']}
        elif ing_id in foraged:
            return {'category': 'foraged', 'subcategory': None, 'season': ['varies']}
        elif ing_id in processed_flour:
            return {'category': 'processed', 'subcategory': 'flour', 'season': ['all']}
        elif ing_id in processed_oil:
            return {'category': 'processed', 'subcategory': 'oil', 'season': ['all']}
        else:
            return {'category': 'other', 'subcategory': None, 'season': ['all']}
    
    def calculate_common_rank(self, ing_id: str) -> int:
        """
        Calculate how commonly an ingredient is used (0-100).
        Higher = more common = should appear earlier in selectors.
        """
        usage_count = 0
        
        for recipe in self.raw_data.get('recipes', []):
            for ing in recipe.get('ingredients', []):
                if ing.get('id') == ing_id:
                    usage_count += 1
                elif ing_id in ing.get('one_of', []):
                    usage_count += 1
            
            if ing_id in recipe.get('additions', []):
                usage_count += 0.5  # Additions count less
        
        # Normalize to 0-100 scale
        max_usage = 50  # Assume max reasonable usage
        return min(100, int((usage_count / max_usage) * 100))
    
    def normalize(self) -> dict:
        """Run full normalization pipeline."""
        # Extract and categorize ingredients
        ingredient_ids = self.extract_all_ingredients()
        
        ingredients = []
        for ing_id in sorted(ingredient_ids):
            cat_info = self.categorize_ingredient(ing_id)
            common_rank = self.calculate_common_rank(ing_id)
            
            ingredients.append({
                'id': ing_id,
                'name': ing_id.replace('_', ' ').title(),
                'category': cat_info['category'],
                'subcategory': cat_info['subcategory'],
                'season': cat_info['season'],
                'commonRank': common_rank,
                'icon': f"{ing_id}.png",
                'aliases': [],
                'variants': []
            })
        
        # Process recipes (add computed fields)
        recipes = []
        for raw_recipe in self.raw_data.get('recipes', []):
            recipe = raw_recipe.copy()
            recipe['ingredientCount'] = len(recipe.get('ingredients', []))
            recipe['totalIngredients'] = self._count_total_ingredients(recipe)
            recipes.append(recipe)
        
        return {
            'ingredients': sorted(ingredients, key=lambda x: -x['commonRank']),
            'recipes': recipes
        }
    
    def _count_total_ingredients(self, recipe: dict) -> int:
        """Count total required ingredients (counting oneOf as 1)."""
        return len(recipe.get('ingredients', []))


if __name__ == '__main__':
    normalizer = DataNormalizer('output/raw/fogu_recipes.json')
    data = normalizer.normalize()
    
    with open('output/final/data.json', 'w') as f:
        json.dump(data, f, indent=2)
```

### Image Asset Collection
```python
# scripts/scraper/image_collector.py

"""
Collect ingredient/recipe images from wiki sources.
Images should be stored in public/images/{category}/
"""

import requests
from pathlib import Path
import time

class ImageCollector:
    
    def __init__(self, output_dir: str = "public/images"):
        self.output_dir = Path(output_dir)
        
    def download_from_ranchstory_wiki(self, image_urls: list):
        """Download images from ranchstory wiki."""
        for url in image_urls:
            # Rate limit
            time.sleep(0.5)
            
            filename = url.split('/')[-1]
            response = requests.get(url)
            
            if response.status_code == 200:
                output_path = self.output_dir / filename
                output_path.write_bytes(response.content)
                print(f"Downloaded: {filename}")
```

---

## Recipe Discovery Algorithm

### "Off by N" Matching Algorithm

```typescript
// src/lib/recipeEngine.ts

interface RecipeIngredient {
  id: string;
  required: boolean;
  oneOf?: string[];
}

interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  utensil: string;
}

interface MatchResult {
  recipe: Recipe;
  matchType: 'exact' | 'partial';
  missingCount: number;
  missingIngredients: string[];
  matchedIngredients: string[];
  matchPercentage: number;
}

export function findRecipes(
  inventory: Set<string>,
  recipes: Recipe[],
  maxMissing: number = 3,
  ownedUtensils: Set<string> = new Set(['none'])
): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (const recipe of recipes) {
    // Check utensil requirement
    if (!ownedUtensils.has(recipe.utensil)) {
      continue;
    }
    
    const { missing, matched } = evaluateRecipe(recipe, inventory);
    
    if (missing.length <= maxMissing) {
      results.push({
        recipe,
        matchType: missing.length === 0 ? 'exact' : 'partial',
        missingCount: missing.length,
        missingIngredients: missing,
        matchedIngredients: matched,
        matchPercentage: Math.round(
          (matched.length / recipe.ingredients.length) * 100
        )
      });
    }
  }
  
  // Sort: exact matches first, then by missing count, then by name
  return results.sort((a, b) => {
    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }
    return a.recipe.name.localeCompare(b.recipe.name);
  });
}

function evaluateRecipe(
  recipe: Recipe,
  inventory: Set<string>
): { missing: string[]; matched: string[] } {
  const missing: string[] = [];
  const matched: string[] = [];
  
  for (const ingredient of recipe.ingredients) {
    if (ingredient.oneOf) {
      // Check if ANY of the options is in inventory
      const hasOne = ingredient.oneOf.some(opt => inventory.has(opt));
      
      if (hasOne) {
        const matchedOpt = ingredient.oneOf.find(opt => inventory.has(opt))!;
        matched.push(matchedOpt);
      } else {
        // Report the first option as missing (user can pick any)
        missing.push(ingredient.oneOf[0]);
      }
    } else {
      if (inventory.has(ingredient.id)) {
        matched.push(ingredient.id);
      } else {
        missing.push(ingredient.id);
      }
    }
  }
  
  return { missing, matched };
}

// Helper: Get suggestions for what to acquire next
export function getSuggestions(
  inventory: Set<string>,
  recipes: Recipe[],
  topN: number = 10
): { ingredientId: string; enablesRecipes: number }[] {
  const ingredientValue: Map<string, number> = new Map();
  
  for (const recipe of recipes) {
    const { missing } = evaluateRecipe(recipe, inventory);
    
    // If only 1-2 missing, those ingredients are valuable
    if (missing.length > 0 && missing.length <= 2) {
      for (const ing of missing) {
        ingredientValue.set(ing, (ingredientValue.get(ing) || 0) + 1);
      }
    }
  }
  
  return Array.from(ingredientValue.entries())
    .map(([id, count]) => ({ ingredientId: id, enablesRecipes: count }))
    .sort((a, b) => b.enablesRecipes - a.enablesRecipes)
    .slice(0, topN);
}
```

---

## UI/UX Specifications

### Ingredient Selector Component

#### Two View Modes

**List Mode (Default)**
```
┌─────────────────────────────────────────────────┐
│ 🔍 Search ingredients...                    [≡] │
├─────────────────────────────────────────────────┤
│ ▼ Most Common                                   │
│ ┌────┐                                          │
│ │ 🥚 │  Egg                              [✓]   │
│ └────┘                                          │
│ ┌────┐                                          │
│ │ 🥛 │  Milk                             [ ]   │
│ └────┘                                          │
│ ┌────┐                                          │
│ │ 🌾 │  Flour                            [✓]   │
│ └────┘                                          │
├─────────────────────────────────────────────────┤
│ ▶ Crops (42)                                    │
│ ▶ Animal Products (28)                          │
│ ▶ Fish (50)                                     │
│ ▶ Processed Goods (65)                          │
│ ▶ Foraged Items (18)                            │
└─────────────────────────────────────────────────┘
```

**Grid Mode**
```
┌─────────────────────────────────────────────────┐
│ 🔍 Search ingredients...                    [☰] │
├─────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ │ 🥚 │ │ 🥛 │ │ 🌾 │ │ 🧈 │ │ 🧀 │ │ 🍅 │      │
│ │ ✓  │ │    │ │ ✓  │ │    │ │ ✓  │ │    │      │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ │ 🥔 │ │ 🥕 │ │ 🧅 │ │ 🌽 │ │ 🎃 │ │ 🍆 │      │
│ │    │ │ ✓  │ │    │ │    │ │    │ │    │      │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
└─────────────────────────────────────────────────┘
```

#### Search Behavior
- **Debounced input** (150ms) - no network calls, just filter
- **Fuzzy matching** via Fuse.js with configurable threshold
- **Instant results** - no loading states needed
- **Match highlighting** in results
- **Recent selections** bubble to top

#### Selection UX
- **Click to toggle** - immediate visual feedback
- **Bulk actions** - "Clear All", "Select All in Category"
- **Persistence** - selections saved to localStorage
- **Count badge** - show "12 selected" in header

### Recipe Results Component

```
┌─────────────────────────────────────────────────┐
│ 🍳 Recipes You Can Make                         │
│ Found 23 recipes (12 exact, 11 partial)         │
├─────────────────────────────────────────────────┤
│ Filter by Effect: [All ▼] [Stamina] [Speed] ... │
├─────────────────────────────────────────────────┤
│ ▼ Ready to Cook (12)                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🍛 Curry Rice                               │ │
│ │ Pot • Main Dish • 911G                      │ │
│ │ ✓ Cooked Rice  ✓ Curry Powder  ✓ Potato    │ │
│ │ ✓ Yogurt                                    │ │
│ │                               [Cook Info →] │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🥗 Herb Salad                    🏃 Speed 2 │ │
│ │ None • Salad • 677G                         │ │
│ │ ✓ Mint  ✓ Chamomile  ✓ Lavender            │ │
│ │ Effect: Watering Rare Crop % Lv. 2          │ │
│ │                               [Cook Info →] │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ▼ Need 1 More Ingredient (8)                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🍜 Tempura Udon                             │ │
│ │ Pot • Main Dish • 2188G                     │ │
│ │ ✓ Udon Noodles  ✗ Tempura                  │ │
│ │                               [Cook Info →] │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ▶ Need 2 More Ingredients (3)                   │
└─────────────────────────────────────────────────┘
```

### Responsive Breakpoints

```css
/* Mobile First */
.container {
  @apply px-4;
}

/* Tablet (md: 768px+) */
@screen md {
  .ingredient-grid {
    @apply grid-cols-6;
  }
  .recipe-card {
    @apply flex-row;
  }
}

/* Desktop (lg: 1024px+) */
@screen lg {
  .layout {
    @apply flex gap-6;
  }
  .sidebar {
    @apply w-80 sticky top-4;
  }
  .main {
    @apply flex-1;
  }
}
```

### Mobile-Specific UX

1. **Bottom sheet ingredient selector** - Slides up from bottom
2. **Sticky header** - Shows selected count, filter toggle
3. **Pull-to-refresh** - Clears selections (with confirmation)
4. **Haptic feedback** - On selection (where supported)
5. **Swipe gestures** - Swipe left on recipe to save/favorite

---

## PWA Configuration

### Web App Manifest
```json
// public/manifest.json
{
  "name": "Grand Bazaar Kitchen Companion",
  "short_name": "GB Kitchen",
  "description": "Find recipes based on your inventory",
  "theme_color": "#8B4513",
  "background_color": "#FFF8DC",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-home.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/desktop-home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

### Service Worker Strategy
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'images/**/*'],
      manifest: false, // Use public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ]
}
```

---

## Project Structure

```
grand-bazaar-kitchen/
├── public/
│   ├── manifest.json
│   ├── favicon.ico
│   ├── icons/
│   │   ├── icon-72.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── images/
│   │   ├── ingredients/
│   │   │   ├── crops/
│   │   │   ├── animal/
│   │   │   ├── fish/
│   │   │   ├── foraged/
│   │   │   └── processed/
│   │   └── recipes/
│   └── data/
│       ├── ingredients.json
│       ├── recipes.json
│       └── categories.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── ingredients/
│   │   │   ├── IngredientSelector.tsx
│   │   │   ├── IngredientList.tsx
│   │   │   ├── IngredientGrid.tsx
│   │   │   ├── IngredientSearch.tsx
│   │   │   ├── IngredientItem.tsx
│   │   │   └── CategoryAccordion.tsx
│   │   ├── recipes/
│   │   │   ├── RecipeResults.tsx
│   │   │   ├── RecipeCard.tsx
│   │   │   ├── RecipeDetail.tsx
│   │   │   └── RecipeFilters.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Checkbox.tsx
│   │       ├── Modal.tsx
│   │       └── Skeleton.tsx
│   ├── hooks/
│   │   ├── useInventory.ts
│   │   ├── useRecipeSearch.ts
│   │   ├── useIngredientSearch.ts
│   │   └── useLocalStorage.ts
│   ├── lib/
│   │   ├── recipeEngine.ts
│   │   ├── search.ts
│   │   └── utils.ts
│   ├── store/
│   │   ├── inventoryStore.ts
│   │   └── settingsStore.ts
│   └── types/
│       └── index.ts
├── scripts/
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── fogu_scraper.py
│   │   ├── normalizer.py
│   │   └── validator.py
│   └── requirements.txt
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Implementation Phases

### Phase 1: Data Foundation (Week 1)
- [ ] Build and test web scraper for fogu.com
- [ ] Parse all 239 recipes with ingredients
- [ ] Extract and categorize all ingredients (~200)
- [ ] Create normalized JSON schema
- [ ] Validate data completeness

### Phase 2: Core UI (Week 2)
- [ ] Set up React + Vite + Tailwind project
- [ ] Implement ingredient selector (list mode)
- [ ] Implement ingredient search with Fuse.js
- [ ] Build recipe engine with "off by N" matching
- [ ] Create recipe results display

### Phase 3: Enhanced UX (Week 3)
- [ ] Add grid view for ingredients
- [ ] Implement category accordion/filtering
- [ ] Add recipe detail modal
- [ ] LocalStorage persistence for inventory
- [ ] Responsive layout refinement

### Phase 4: PWA & Polish (Week 4)
- [ ] Configure PWA manifest and service worker
- [ ] Add offline support
- [ ] Implement install prompt
- [ ] Performance optimization
- [ ] Accessibility audit (a11y)
- [ ] Cross-browser testing

### Phase 5: Future Enhancements (Backlog)
- [ ] **Effect-based recipe search** - "Show me recipes with Run Speed Up"
- [ ] "Shopping list" - ingredients to acquire
- [ ] Festival recipe finder
- [ ] Profit calculator by star quality
- [ ] Seasonal availability indicators
- [ ] Utensil ownership tracking
- [ ] Favorites/bookmarks system
- [ ] Share inventory link
- [ ] Effect stacking planner - optimize buff loadouts

---

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run scraper
cd scripts && pip install -r requirements.txt
python -m scraper.fogu_scraper

# Lint and format
npm run lint
npm run format
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "fuse.js": "^7.0.0",
    "@radix-ui/react-accordion": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0"
  }
}
```

---

## Notes for Development

### Data Quality Priorities
1. **Recipe accuracy** - Ingredients must exactly match game data
2. **Variant handling** - "any Cheese" should match Cheese, Good Cheese, Great Cheese
3. **oneOf logic** - "(Potato or Carrot or Onion)" means ONE of these, not all

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse PWA Score**: 100
- **Search response**: < 50ms (client-side)

### Accessibility Requirements
- Keyboard navigation for all interactive elements
- Screen reader announcements for selection changes
- Color contrast ratio ≥ 4.5:1
- Focus indicators visible
- Reduced motion support

---

## Resources & References

- [fogu.com Grand Bazaar Guide](https://fogu.com/hm9/)
- [Ranch Story Wiki](https://wiki.ranchstory.farm/index.php/Recipes_(Story_of_Seasons:_Grand_Bazaar))
- [Game8 Recipe Guide](https://game8.co/games/Story-of-Seasons-Grand-Bazaar/archives/545473)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Fuse.js Documentation](https://www.fusejs.io/)
