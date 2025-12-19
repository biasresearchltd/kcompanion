#!/usr/bin/env python3
"""
Sprite Sheet Extractor
Extracts individual sprites from packed sprite sheets by detecting
non-transparent regions.
"""

import os
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage

def find_sprites(image_path: str, min_size: int = 16, padding: int = 2):
    """
    Find all sprites in a sprite sheet by detecting connected non-transparent regions.

    Args:
        image_path: Path to the sprite sheet PNG
        min_size: Minimum width/height to consider a valid sprite (filters noise)
        padding: Extra pixels to add around each sprite bounding box

    Returns:
        List of tuples: (x, y, width, height) for each sprite
    """
    print(f"Loading {image_path}...")
    img = Image.open(image_path).convert('RGBA')
    data = np.array(img)

    # Create binary mask of non-transparent pixels (alpha > 0)
    alpha = data[:, :, 3]
    mask = alpha > 10  # Small threshold to ignore nearly-transparent pixels

    print(f"Image size: {img.width}x{img.height}")
    print(f"Finding connected regions...")

    # Label connected regions
    labeled, num_features = ndimage.label(mask)
    print(f"Found {num_features} connected regions")

    # Find bounding box for each region
    sprites = []
    for i in range(1, num_features + 1):
        # Find coordinates of this region
        coords = np.where(labeled == i)
        if len(coords[0]) == 0:
            continue

        y_min, y_max = coords[0].min(), coords[0].max()
        x_min, x_max = coords[1].min(), coords[1].max()

        width = x_max - x_min + 1
        height = y_max - y_min + 1

        # Filter out tiny regions (noise)
        if width >= min_size and height >= min_size:
            # Add padding
            x_min = max(0, x_min - padding)
            y_min = max(0, y_min - padding)
            x_max = min(img.width - 1, x_max + padding)
            y_max = min(img.height - 1, y_max + padding)

            sprites.append({
                'x': x_min,
                'y': y_min,
                'width': x_max - x_min + 1,
                'height': y_max - y_min + 1,
                'area': width * height
            })

    # Sort by position (top-to-bottom, left-to-right)
    sprites.sort(key=lambda s: (s['y'] // 100, s['x']))

    print(f"Found {len(sprites)} valid sprites (min size: {min_size}px)")
    return sprites, img


def extract_sprites(image_path: str, output_dir: str, prefix: str = "sprite",
                   min_size: int = 16, padding: int = 2):
    """
    Extract all sprites from a sprite sheet and save as individual PNGs.

    Args:
        image_path: Path to the sprite sheet PNG
        output_dir: Directory to save extracted sprites
        prefix: Filename prefix for extracted sprites
        min_size: Minimum sprite size to extract
        padding: Padding around each sprite
    """
    sprites, img = find_sprites(image_path, min_size, padding)

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Extract and save each sprite
    extracted = []
    for i, sprite in enumerate(sprites):
        # Crop the sprite
        box = (sprite['x'], sprite['y'],
               sprite['x'] + sprite['width'],
               sprite['y'] + sprite['height'])
        cropped = img.crop(box)

        # Save with numbered filename
        filename = f"{prefix}_{i:04d}_{sprite['width']}x{sprite['height']}.png"
        filepath = os.path.join(output_dir, filename)
        cropped.save(filepath, 'PNG')

        extracted.append({
            'filename': filename,
            'filepath': filepath,
            **sprite
        })

        if (i + 1) % 50 == 0:
            print(f"  Extracted {i + 1}/{len(sprites)} sprites...")

    print(f"Extracted {len(extracted)} sprites to {output_dir}")
    return extracted


def process_all_atlases(input_dir: str, output_base_dir: str):
    """
    Process all IconAtlas PNG files in a directory.
    """
    input_path = Path(input_dir)

    # Find all IconAtlas PNGs
    atlas_files = sorted(input_path.glob("*IconAtlas*.png"))

    if not atlas_files:
        print(f"No IconAtlas PNG files found in {input_dir}")
        return

    print(f"Found {len(atlas_files)} atlas files to process")

    all_sprites = []
    for atlas_file in atlas_files:
        print(f"\n{'='*60}")
        print(f"Processing: {atlas_file.name}")
        print('='*60)

        # Create output subdirectory based on atlas name
        atlas_name = atlas_file.stem.split('-')[-2]  # Get "IconAtlas" part
        atlas_num = atlas_file.stem.split('-')[0].replace('sactx', '')  # Get number
        output_dir = os.path.join(output_base_dir, f"atlas_{atlas_num}")

        prefix = f"icon_{atlas_num}"

        sprites = extract_sprites(
            str(atlas_file),
            output_dir,
            prefix=prefix,
            min_size=20,  # Icons are at least 20px
            padding=1
        )
        all_sprites.extend(sprites)

    print(f"\n{'='*60}")
    print(f"TOTAL: Extracted {len(all_sprites)} sprites from {len(atlas_files)} atlases")
    print('='*60)

    return all_sprites


if __name__ == '__main__':
    # Default paths
    default_input = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons"
    default_output = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/extracted"

    input_dir = sys.argv[1] if len(sys.argv) > 1 else default_input
    output_dir = sys.argv[2] if len(sys.argv) > 2 else default_output

    print("Sprite Sheet Extractor")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print()

    process_all_atlases(input_dir, output_dir)
