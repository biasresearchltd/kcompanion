#!/usr/bin/env python3
"""
Image Downloader for Grand Bazaar Kitchen Companion

Downloads ingredient and recipe images from StratsWiki.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse
import os

BASE_URL = "https://stratswiki.com/sos-gb"
OUTPUT_DIR = Path(__file__).parent.parent / "output"
IMAGES_DIR = Path(__file__).parent.parent.parent / "public" / "images"

REQUEST_DELAY = 0.5  # seconds between requests


class ImageDownloader:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'GrandBazaarKitchenCompanion/1.0 (Educational Project)'
        })

        # Create image directories
        (IMAGES_DIR / "recipes").mkdir(parents=True, exist_ok=True)
        (IMAGES_DIR / "ingredients").mkdir(parents=True, exist_ok=True)

        self.downloaded = set()
        self.failed = []

    def fetch_page(self, url: str) -> str:
        """Fetch a page with rate limiting."""
        print(f"Fetching: {url}")
        time.sleep(REQUEST_DELAY)
        response = self.session.get(url)
        response.raise_for_status()
        return response.text

    def download_image(self, url: str, save_path: Path) -> bool:
        """Download an image to the specified path."""
        if save_path.exists():
            print(f"  Already exists: {save_path.name}")
            return True

        try:
            time.sleep(REQUEST_DELAY)
            response = self.session.get(url, stream=True)
            response.raise_for_status()

            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            print(f"  Downloaded: {save_path.name}")
            return True
        except Exception as e:
            print(f"  Failed to download {url}: {e}")
            self.failed.append(url)
            return False

    def to_filename(self, name: str, ext: str = ".png") -> str:
        """Convert a name to a valid filename."""
        # Convert to lowercase and replace special chars
        filename = name.lower()
        filename = filename.replace("+", "_plus")
        filename = filename.replace("&", "_and_")
        filename = filename.replace("'", "")
        filename = re.sub(r'[^a-z0-9]+', '_', filename).strip('_')
        filename = re.sub(r'_+', '_', filename)
        return filename + ext

    def scrape_recipe_images(self):
        """Scrape recipe images from the recipes page."""
        print("\n=== Downloading Recipe Images ===")

        html = self.fetch_page(f"{BASE_URL}/items/recipes/")
        soup = BeautifulSoup(html, 'lxml')

        # Find all tables
        tables = soup.find_all('table')

        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if not cells:
                    continue

                # First cell usually has the recipe name and icon
                first_cell = cells[0]

                # Get recipe name
                name = first_cell.get_text(strip=True)
                if not name:
                    continue

                # Find image
                img = first_cell.find('img')
                if img:
                    img_url = img.get('src') or img.get('data-src')
                    if img_url:
                        # Make URL absolute
                        if not img_url.startswith('http'):
                            img_url = urljoin(BASE_URL, img_url)

                        # Determine file extension
                        ext = Path(urlparse(img_url).path).suffix or '.png'

                        # Create filename
                        filename = self.to_filename(name, ext)
                        save_path = IMAGES_DIR / "recipes" / filename

                        self.download_image(img_url, save_path)
                        self.downloaded.add(name)

    def scrape_ingredient_images_from_page(self, page_url: str, category: str):
        """Scrape ingredient images from a category page."""
        print(f"\n--- Scraping {category} images ---")

        try:
            html = self.fetch_page(page_url)
        except Exception as e:
            print(f"Failed to fetch {page_url}: {e}")
            return

        soup = BeautifulSoup(html, 'lxml')

        # Find all tables
        tables = soup.find_all('table')

        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if not cells:
                    continue

                # First cell usually has the item name and icon
                first_cell = cells[0]

                # Get item name
                name = first_cell.get_text(strip=True)
                if not name:
                    continue

                # Find image
                img = first_cell.find('img')
                if img:
                    img_url = img.get('src') or img.get('data-src')
                    if img_url:
                        # Make URL absolute
                        if not img_url.startswith('http'):
                            img_url = urljoin(BASE_URL, img_url)

                        # Determine file extension
                        ext = Path(urlparse(img_url).path).suffix or '.png'

                        # Create filename
                        filename = self.to_filename(name, ext)
                        save_path = IMAGES_DIR / "ingredients" / filename

                        self.download_image(img_url, save_path)
                        self.downloaded.add(name)

    def scrape_all_ingredient_images(self):
        """Scrape images from all ingredient category pages."""
        print("\n=== Downloading Ingredient Images ===")

        category_pages = [
            ("items/crops/", "crops"),
            ("items/animal-products/", "animal_products"),
            ("items/fishing-items/", "fish"),
            ("items/forageables/", "foraged"),
            ("items/trees-fruits/", "fruits"),
            ("items/mushrooms/", "mushrooms"),
            ("items/processed-goods/", "processed"),
        ]

        for page_path, category in category_pages:
            url = f"{BASE_URL}/{page_path}"
            self.scrape_ingredient_images_from_page(url, category)

    def download_all(self):
        """Download all images."""
        self.scrape_recipe_images()
        self.scrape_all_ingredient_images()

        print("\n=== Download Summary ===")
        print(f"Successfully downloaded: {len(self.downloaded)} images")
        print(f"Failed downloads: {len(self.failed)}")

        if self.failed:
            print("\nFailed URLs:")
            for url in self.failed[:10]:  # Show first 10
                print(f"  - {url}")
            if len(self.failed) > 10:
                print(f"  ... and {len(self.failed) - 10} more")


def main():
    downloader = ImageDownloader()
    downloader.download_all()


if __name__ == '__main__':
    main()
