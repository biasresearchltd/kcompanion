#!/usr/bin/env python3
"""
Sprite Matcher
Uses perceptual hashing to match extracted sprites against existing named images.
"""

import os
import sys
import json
import shutil
from pathlib import Path
from PIL import Image
import imagehash
from collections import defaultdict

def compute_hashes(image_path: str, hash_size: int = 16):
    """
    Compute multiple perceptual hashes for an image.
    Returns dict of hash types to hash values.
    """
    try:
        img = Image.open(image_path).convert('RGBA')

        # Create a version with white background for better matching
        background = Image.new('RGBA', img.size, (255, 255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha as mask
        img_rgb = background.convert('RGB')

        return {
            'phash': imagehash.phash(img_rgb, hash_size=hash_size),
            'dhash': imagehash.dhash(img_rgb, hash_size=hash_size),
            'ahash': imagehash.average_hash(img_rgb, hash_size=hash_size),
            'size': img.size,
            'path': image_path
        }
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None


def load_existing_images(directories: list[str]):
    """
    Load and hash all existing named images from given directories.
    """
    existing = {}

    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            print(f"Warning: Directory not found: {directory}")
            continue

        for img_path in dir_path.glob('*.png'):
            name = img_path.stem  # filename without extension
            hashes = compute_hashes(str(img_path))
            if hashes:
                existing[name] = hashes

    print(f"Loaded {len(existing)} existing images")
    return existing


def load_extracted_sprites(directory: str, min_size: int = 40, max_size: int = 120):
    """
    Load extracted sprites, filtering by size to focus on item icons.
    """
    sprites = []
    dir_path = Path(directory)

    for img_path in dir_path.glob('*.png'):
        hashes = compute_hashes(str(img_path))
        if hashes:
            width, height = hashes['size']
            # Filter to reasonable icon sizes
            if min_size <= width <= max_size and min_size <= height <= max_size:
                sprites.append({
                    'filename': img_path.name,
                    **hashes
                })

    print(f"Loaded {len(sprites)} extracted sprites (filtered by size {min_size}-{max_size}px)")
    return sprites


def find_matches(sprites: list, existing: dict, threshold: int = 15):
    """
    Find matches between extracted sprites and existing images.

    Args:
        sprites: List of extracted sprite data
        existing: Dict of existing images by name
        threshold: Maximum hash difference to consider a match (lower = stricter)

    Returns:
        List of matches with confidence scores
    """
    matches = []
    unmatched = []

    for sprite in sprites:
        best_match = None
        best_score = float('inf')

        for name, existing_data in existing.items():
            # Compare using multiple hash types
            phash_diff = sprite['phash'] - existing_data['phash']
            dhash_diff = sprite['dhash'] - existing_data['dhash']
            ahash_diff = sprite['ahash'] - existing_data['ahash']

            # Combined score (weighted average)
            score = (phash_diff * 0.5 + dhash_diff * 0.3 + ahash_diff * 0.2)

            if score < best_score:
                best_score = score
                best_match = name

        if best_score <= threshold:
            matches.append({
                'sprite': sprite['filename'],
                'sprite_path': sprite['path'],
                'match': best_match,
                'match_path': existing[best_match]['path'],
                'score': best_score,
                'confidence': 'high' if best_score <= 5 else 'medium' if best_score <= 10 else 'low'
            })
        else:
            unmatched.append({
                'sprite': sprite['filename'],
                'sprite_path': sprite['path'],
                'best_guess': best_match,
                'score': best_score
            })

    return matches, unmatched


def copy_matched_sprites(matches: list, output_dir: str, confidence_filter: str = None):
    """
    Copy matched sprites to output directory with their matched names.
    """
    os.makedirs(output_dir, exist_ok=True)

    copied = 0
    for match in matches:
        if confidence_filter and match['confidence'] != confidence_filter:
            continue

        src = match['sprite_path']
        # Use the matched name as the new filename
        dst = os.path.join(output_dir, f"{match['match']}.png")

        # Handle duplicates by adding score suffix
        if os.path.exists(dst):
            dst = os.path.join(output_dir, f"{match['match']}_alt_{match['score']:.1f}.png")

        shutil.copy2(src, dst)
        copied += 1

    print(f"Copied {copied} matched sprites to {output_dir}")


def generate_report(matches: list, unmatched: list, output_file: str):
    """
    Generate a JSON report of all matches and unmatched sprites.
    """
    report = {
        'summary': {
            'total_matched': len(matches),
            'high_confidence': len([m for m in matches if m['confidence'] == 'high']),
            'medium_confidence': len([m for m in matches if m['confidence'] == 'medium']),
            'low_confidence': len([m for m in matches if m['confidence'] == 'low']),
            'unmatched': len(unmatched)
        },
        'matches': sorted(matches, key=lambda x: x['score']),
        'unmatched': sorted(unmatched, key=lambda x: x['score'])[:50]  # Top 50 closest unmatched
    }

    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"Report saved to {output_file}")
    return report


def generate_html_review(matches: list, unmatched: list, output_file: str):
    """
    Generate an HTML page for visual review of matches.
    """
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Sprite Match Review</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        h1, h2 { color: #fff; }
        .match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .match-card { background: #2a2a2a; border-radius: 8px; padding: 15px; }
        .match-card.high { border-left: 4px solid #4CAF50; }
        .match-card.medium { border-left: 4px solid #FF9800; }
        .match-card.low { border-left: 4px solid #f44336; }
        .match-card.unmatched { border-left: 4px solid #9e9e9e; }
        .images { display: flex; gap: 20px; align-items: center; justify-content: center; margin: 10px 0; }
        .images img { max-width: 100px; max-height: 100px; background: #fff; border-radius: 4px; }
        .arrow { font-size: 24px; color: #666; }
        .name { font-weight: bold; color: #4CAF50; }
        .score { color: #888; font-size: 12px; }
        .confidence { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .confidence.high { background: #4CAF50; }
        .confidence.medium { background: #FF9800; }
        .confidence.low { background: #f44336; }
        .section { margin-bottom: 40px; }
        .stats { background: #333; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .stats span { margin-right: 20px; }
    </style>
</head>
<body>
    <h1>Sprite Match Review</h1>
    <div class="stats">
        <span>Total Matched: <strong>""" + str(len(matches)) + """</strong></span>
        <span style="color:#4CAF50">High: <strong>""" + str(len([m for m in matches if m['confidence'] == 'high'])) + """</strong></span>
        <span style="color:#FF9800">Medium: <strong>""" + str(len([m for m in matches if m['confidence'] == 'medium'])) + """</strong></span>
        <span style="color:#f44336">Low: <strong>""" + str(len([m for m in matches if m['confidence'] == 'low'])) + """</strong></span>
        <span style="color:#9e9e9e">Unmatched: <strong>""" + str(len(unmatched)) + """</strong></span>
    </div>

    <div class="section">
        <h2>Matched Sprites</h2>
        <div class="match-grid">
"""

    for match in sorted(matches, key=lambda x: x['score']):
        html += f"""
            <div class="match-card {match['confidence']}">
                <div class="images">
                    <img src="file://{match['sprite_path']}" title="Extracted">
                    <span class="arrow">→</span>
                    <img src="file://{match['match_path']}" title="Existing">
                </div>
                <div class="name">{match['match']}</div>
                <div class="score">
                    Score: {match['score']:.1f}
                    <span class="confidence {match['confidence']}">{match['confidence']}</span>
                </div>
            </div>
"""

    html += """
        </div>
    </div>

    <div class="section">
        <h2>Unmatched Sprites (Top 100)</h2>
        <div class="match-grid">
"""

    for item in sorted(unmatched, key=lambda x: x['score'])[:100]:
        html += f"""
            <div class="match-card unmatched">
                <div class="images">
                    <img src="file://{item['sprite_path']}" title="Extracted">
                </div>
                <div class="name">{item['sprite']}</div>
                <div class="score">Best guess: {item['best_guess']} (score: {item['score']:.1f})</div>
            </div>
"""

    html += """
        </div>
    </div>
</body>
</html>
"""

    with open(output_file, 'w') as f:
        f.write(html)

    print(f"HTML review saved to {output_file}")


def main():
    # Paths
    extracted_dir = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/extracted/atlas_"
    existing_dirs = [
        "/Users/bias/Documents/reactdev/sosgb/public/images/recipes",
        "/Users/bias/Documents/reactdev/sosgb/public/images/ingredients"
    ]
    output_dir = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/matched"

    print("="*60)
    print("Sprite Matcher")
    print("="*60)

    # Check for imagehash
    try:
        import imagehash
    except ImportError:
        print("Installing imagehash...")
        os.system("pip install imagehash")
        import imagehash

    # Load existing images
    print("\nLoading existing named images...")
    existing = load_existing_images(existing_dirs)

    if not existing:
        print("No existing images found!")
        return

    # Load extracted sprites
    print("\nLoading extracted sprites...")
    sprites = load_extracted_sprites(extracted_dir, min_size=40, max_size=150)

    if not sprites:
        print("No sprites found!")
        return

    # Find matches
    print("\nFinding matches...")
    matches, unmatched = find_matches(sprites, existing, threshold=20)

    # Print summary
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    print(f"Total sprites analyzed: {len(sprites)}")
    print(f"Matched: {len(matches)}")
    print(f"  - High confidence: {len([m for m in matches if m['confidence'] == 'high'])}")
    print(f"  - Medium confidence: {len([m for m in matches if m['confidence'] == 'medium'])}")
    print(f"  - Low confidence: {len([m for m in matches if m['confidence'] == 'low'])}")
    print(f"Unmatched: {len(unmatched)}")

    # Generate outputs
    print("\nGenerating outputs...")

    # Copy high-confidence matches
    copy_matched_sprites(matches, os.path.join(output_dir, "high_confidence"), "high")
    copy_matched_sprites(matches, os.path.join(output_dir, "all_matches"))

    # Generate report
    report = generate_report(
        matches, unmatched,
        os.path.join(output_dir, "match_report.json")
    )

    # Generate HTML review
    generate_html_review(
        matches, unmatched,
        os.path.join(output_dir, "review.html")
    )

    print("\nDone! Open review.html in a browser to visually verify matches.")


if __name__ == '__main__':
    main()
