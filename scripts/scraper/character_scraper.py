#!/usr/bin/env python3
"""
Game8 Character Gift Scraper for Story of Seasons: Grand Bazaar

Scrapes character gift preference data from game8.co
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
BASE_URL = "https://game8.co/games/Story-of-Seasons-Grand-Bazaar"
GIFT_PAGE = "/archives/546876"
OUTPUT_DIR = Path(__file__).parent.parent / "output"
IMAGES_DIR = Path(__file__).parent.parent.parent / "public" / "images" / "characters"

# Rate limiting
REQUEST_DELAY = 1.5  # seconds between requests


@dataclass
class Character:
    id: str
    name: str
    romanceable: bool
    icon: Optional[str] = None
    favoriteGifts: List[str] = field(default_factory=list)
    lovedGifts: List[str] = field(default_factory=list)


class CharacterScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "raw").mkdir(exist_ok=True)
        (OUTPUT_DIR / "parsed").mkdir(exist_ok=True)
        (OUTPUT_DIR / "final").mkdir(exist_ok=True)
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    def fetch_page(self, path: str) -> str:
        """Fetch a page with rate limiting."""
        url = f"{BASE_URL}{path}" if path.startswith("/") else path
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
        name = name.replace("-", "_")
        # Convert to lowercase and replace non-alphanumeric with underscore
        id_str = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
        # Remove duplicate underscores
        id_str = re.sub(r'_+', '_', id_str)
        return id_str

    def parse_gift_item(self, text: str) -> List[str]:
        """
        Parse gift item text into normalized IDs.

        Examples:
        - "Warm Milk" -> ["warm_milk"]
        - "Omelet, Onigiri, Sashimi" -> ["omelet", "onigiri", "sashimi"]
        - "Apple Jam, Apple Juice" -> ["apple_jam", "apple_juice"]
        - "Gemstones (Moonstone, Peridot, Topaz, Sandrose)" -> ["moonstone", "peridot", "topaz", "sandrose"]
        - "Gold/Silver/Bronze Medal" -> ["gold_medal", "silver_medal", "bronze_medal"]
        """
        items = []
        text = text.strip()

        if not text or text.lower() in ['tbd', '-', 'none', '']:
            return items

        # Clean up common text artifacts
        # Remove "Favorite:" prefix if present
        text = re.sub(r'^Favorite:?\s*', '', text, flags=re.IGNORECASE)

        # Fix merged words (e.g., "Omelet RiceIce Cream" -> "Omelet Rice, Ice Cream")
        # Look for lowercase followed by uppercase (word boundary missing)
        text = re.sub(r'([a-z])([A-Z])', r'\1, \2', text)

        # Remove "and other X" phrases
        text = re.sub(r',?\s*and other \w+', '', text, flags=re.IGNORECASE)

        # Fix common typos
        text = text.replace('Diamon', 'Diamond')
        text = text.replace('Boullabaisse', 'Bouillabaisse')
        text = text.replace('Sanwich', 'Sandwich')

        # Handle parenthetical lists like "Gemstones (Moonstone, Peridot, Topaz)"
        paren_match = re.search(r'^([^(]+)\s*\(([^)]+)\)$', text)
        if paren_match:
            # Extract items from inside parentheses
            inner_text = paren_match.group(2)
            for item in re.split(r'[,/]', inner_text):
                item = item.strip()
                if item:
                    items.append(self.to_id(item))
            return items

        # Handle slash patterns like "Gold/Silver/Bronze Medal"
        slash_with_suffix = re.match(r'^(.+?)\s+(\w+)$', text)
        if '/' in text and slash_with_suffix:
            prefix_part = slash_with_suffix.group(1)
            suffix = slash_with_suffix.group(2)

            # Check if the prefix part contains slashes
            if '/' in prefix_part:
                prefixes = prefix_part.split('/')
                for prefix in prefixes:
                    prefix = prefix.strip()
                    if prefix:
                        items.append(self.to_id(f"{prefix} {suffix}"))
                return items

        # Handle simple slash alternatives like "Elephant/Hercules/Rhinoceros Beetle"
        if '/' in text:
            parts = text.split('/')
            # Check if last part has a common suffix
            last_part = parts[-1].strip()
            # Try to detect pattern like "A/B/C Suffix"
            last_words = last_part.split()
            if len(last_words) > 1 and len(parts) > 1:
                # Check if this looks like "Type1/Type2/Type3 CommonName"
                potential_suffix = ' '.join(last_words[1:])
                potential_last_prefix = last_words[0]

                # Construct items with suffix
                for i, part in enumerate(parts[:-1]):
                    part = part.strip()
                    if part:
                        items.append(self.to_id(f"{part} {potential_suffix}"))
                items.append(self.to_id(f"{potential_last_prefix} {potential_suffix}"))
                return items
            else:
                # Simple alternatives without common suffix
                for part in parts:
                    part = part.strip()
                    if part:
                        items.append(self.to_id(part))
                return items

        # Handle comma-separated lists
        if ',' in text:
            for item in text.split(','):
                item = item.strip()
                if item:
                    items.append(self.to_id(item))
            return items

        # Single item
        items.append(self.to_id(text))
        return items

    def download_character_icon(self, url: str, character_id: str) -> Optional[str]:
        """Download character icon and return local filename."""
        if not url:
            return None

        try:
            # Get full URL
            if url.startswith('//'):
                url = 'https:' + url
            elif not url.startswith('http'):
                url = urljoin(BASE_URL, url)

            print(f"  Downloading icon for {character_id}: {url}")
            time.sleep(0.5)

            response = self.session.get(url)
            response.raise_for_status()

            # Determine file extension
            content_type = response.headers.get('content-type', '')
            if 'gif' in content_type or url.endswith('.gif'):
                ext = '.gif'
            elif 'png' in content_type or url.endswith('.png'):
                ext = '.png'
            elif 'webp' in content_type or url.endswith('.webp'):
                ext = '.webp'
            else:
                ext = '.jpg'

            filename = f"{character_id}{ext}"
            filepath = IMAGES_DIR / filename

            with open(filepath, 'wb') as f:
                f.write(response.content)

            print(f"  Saved: {filepath}")
            return filename

        except Exception as e:
            print(f"  Error downloading icon for {character_id}: {e}")
            return None

    def parse_gift_page(self) -> List[Character]:
        """Parse the main gift preferences page."""
        html = self.fetch_page(GIFT_PAGE)
        self.save_raw_html(html, "character_gifts.html")

        soup = BeautifulSoup(html, 'lxml')
        characters = []

        # Find all tables on the page
        tables = soup.find_all('table')
        print(f"Found {len(tables)} tables on page")

        current_section = "unknown"

        for table in tables:
            # Try to find section header
            prev_header = table.find_previous(['h2', 'h3'])
            if prev_header:
                header_text = prev_header.get_text(strip=True).lower()
                if 'romance' in header_text or 'bachelor' in header_text or 'bachelorette' in header_text:
                    current_section = "romanceable"
                elif 'non-romance' in header_text or 'other' in header_text or 'villager' in header_text:
                    current_section = "non_romanceable"

            romanceable = current_section == "romanceable"

            # Parse table rows
            rows = table.find_all('tr')

            # Skip if this doesn't look like a character gift table
            if len(rows) < 2:
                continue

            # Check header row for expected columns
            header_row = rows[0]
            headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]

            # Look for character-related headers
            has_character_col = any('character' in h or 'name' in h or 'villager' in h for h in headers)
            has_gift_col = any('gift' in h or 'favorite' in h or 'love' in h or 'best' in h for h in headers)

            if not (has_character_col or has_gift_col) and len(headers) < 2:
                continue

            print(f"Processing table with {len(rows)} rows (section: {current_section})")

            for row in rows[1:]:  # Skip header
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue

                character = self._parse_character_row(cells, romanceable)
                if character:
                    characters.append(character)

        print(f"Parsed {len(characters)} characters")
        return characters

    def _parse_character_row(self, cells, romanceable: bool) -> Optional[Character]:
        """Parse a single character row from the gift table."""
        try:
            # First cell typically has character name and icon
            name_cell = cells[0]
            name = name_cell.get_text(strip=True)

            if not name or len(name) < 2:
                return None

            # Skip header-like rows
            if name.lower() in ['character', 'name', 'villager', 'npc']:
                return None

            # Skip non-character entries (guide pages, navigation items)
            skip_patterns = [
                'all characters', 'romance options', 'all romanceable',
                'how to', 'guide', 'best', 'stamina', 'power berries',
                'same gender', 'heart events', 'list of', 'tips'
            ]
            name_lower = name.lower()
            if any(pattern in name_lower for pattern in skip_patterns):
                print(f"  Skipping non-character: {name}")
                return None

            character_id = self.to_id(name)

            # Try to get icon URL
            icon_url = None
            img = name_cell.find('img')
            if img:
                icon_url = img.get('data-src') or img.get('src')
                # game8 often uses lazy loading with data-src
                if not icon_url:
                    icon_url = img.get('data-lazy-src')

            # Parse favorite gifts (usually second column - "Best Gift(s)")
            favorite_gifts = []
            if len(cells) > 1:
                best_gifts_text = cells[1].get_text(strip=True)
                favorite_gifts = self.parse_gift_item(best_gifts_text)

            # Parse loved gifts (usually third column - "Other Great Gifts")
            loved_gifts = []
            if len(cells) > 2:
                other_gifts_text = cells[2].get_text(strip=True)
                loved_gifts = self.parse_gift_item(other_gifts_text)

            # Download icon if available
            icon_filename = None
            if icon_url:
                icon_filename = self.download_character_icon(icon_url, character_id)

            # Deduplicate gifts while preserving order
            favorite_gifts = list(dict.fromkeys(favorite_gifts))
            loved_gifts = list(dict.fromkeys(loved_gifts))

            print(f"  Parsed: {name} - {len(favorite_gifts)} favorites, {len(loved_gifts)} loved")

            return Character(
                id=character_id,
                name=name,
                romanceable=romanceable,
                icon=icon_filename,
                favoriteGifts=favorite_gifts,
                lovedGifts=loved_gifts
            )

        except Exception as e:
            print(f"Error parsing character row: {e}")
            return None

    def scrape_individual_character_pages(self, characters: List[Character]) -> List[Character]:
        """
        Scrape individual character pages for more detailed gift info.
        This supplements the main gift table with additional data.
        """
        # game8 has individual character pages with more detailed info
        # e.g., /archives/546XXX for each character

        # For now, we'll rely on the main table data
        # Can be extended later if needed
        return characters

    def cross_reference_recipes(self, characters: List[Character], recipes_path: str) -> List[Character]:
        """
        Cross-reference gift items with existing recipe IDs.
        This helps normalize gift names to match our recipe data.
        """
        try:
            with open(recipes_path, 'r') as f:
                recipes_data = json.load(f)

            # Build a lookup of recipe names to IDs
            recipe_name_to_id = {}
            for recipe in recipes_data.get('recipes', []):
                recipe_id = recipe.get('id', '')
                recipe_name = recipe.get('name', '').lower()
                recipe_name_to_id[recipe_name] = recipe_id
                # Also add ID form
                recipe_name_to_id[recipe_id] = recipe_id

            # Cross-reference each character's gifts
            for character in characters:
                # Update favorite gifts
                normalized_favorites = []
                for gift in character.favoriteGifts:
                    if gift in recipe_name_to_id:
                        normalized_favorites.append(recipe_name_to_id[gift])
                    else:
                        # Keep original if no match
                        normalized_favorites.append(gift)
                character.favoriteGifts = normalized_favorites

                # Update loved gifts
                normalized_loved = []
                for gift in character.lovedGifts:
                    if gift in recipe_name_to_id:
                        normalized_loved.append(recipe_name_to_id[gift])
                    else:
                        normalized_loved.append(gift)
                character.lovedGifts = normalized_loved

            print(f"Cross-referenced gifts with {len(recipe_name_to_id)} recipes")

        except FileNotFoundError:
            print(f"Recipes file not found at {recipes_path}, skipping cross-reference")
        except Exception as e:
            print(f"Error cross-referencing recipes: {e}")

        return characters

    def scrape_all(self) -> Dict:
        """Scrape all character data and return combined result."""
        print("Starting character gift scrape...")

        # Scrape main gift page
        characters = self.parse_gift_page()

        # Cross-reference with recipes if available
        recipes_path = OUTPUT_DIR / "final" / "recipes.json"
        if recipes_path.exists():
            characters = self.cross_reference_recipes(characters, str(recipes_path))
        else:
            # Try parsed directory
            recipes_path = OUTPUT_DIR / "parsed" / "recipes.json"
            if recipes_path.exists():
                characters = self.cross_reference_recipes(characters, str(recipes_path))

        # Build reverse lookup: gift -> characters who love it
        gift_to_characters = {}
        for char in characters:
            for gift in char.favoriteGifts:
                if gift not in gift_to_characters:
                    gift_to_characters[gift] = {'favorite': [], 'loved': []}
                gift_to_characters[gift]['favorite'].append(char.id)

            for gift in char.lovedGifts:
                if gift not in gift_to_characters:
                    gift_to_characters[gift] = {'favorite': [], 'loved': []}
                gift_to_characters[gift]['loved'].append(char.id)

        return {
            'characters': [asdict(c) for c in characters],
            'giftToCharacters': gift_to_characters,
            'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'source': 'game8.co'
        }

    def save_json(self, data: Dict, filename: str, directory: str = "parsed"):
        """Save data as JSON."""
        path = OUTPUT_DIR / directory / filename
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved: {path}")


def main():
    scraper = CharacterScraper()

    # Run scrape
    data = scraper.scrape_all()

    # Save data
    scraper.save_json(data, "characters.json", "parsed")
    scraper.save_json({'characters': data['characters']}, "characters_only.json", "parsed")
    scraper.save_json({'giftToCharacters': data['giftToCharacters']}, "gift_lookup.json", "parsed")

    # Also save to final directory for use by the app
    scraper.save_json(data, "characters.json", "final")

    print(f"\nScraping complete!")
    print(f"  Characters: {len(data['characters'])}")
    print(f"  Romanceable: {len([c for c in data['characters'] if c['romanceable']])}")
    print(f"  Non-romanceable: {len([c for c in data['characters'] if not c['romanceable']])}")
    print(f"  Gift mappings: {len(data['giftToCharacters'])}")


if __name__ == '__main__':
    main()
