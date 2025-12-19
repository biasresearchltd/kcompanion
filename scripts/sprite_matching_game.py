#!/usr/bin/env python3
"""
Sprite Matching Game
Shows extracted sprites alongside potential matches from existing named images.
Uses multiple matching strategies to find the best candidates.
"""

import os
import json
from pathlib import Path
from PIL import Image
import imagehash
import numpy as np
from collections import defaultdict

def compute_image_features(img_path: str):
    """
    Compute multiple features for matching.
    """
    try:
        img = Image.open(img_path).convert('RGBA')

        # Create RGB version with white background
        background = Image.new('RGBA', img.size, (255, 255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img_rgb = background.convert('RGB')

        # Resize to standard size for comparison
        img_thumb = img_rgb.resize((64, 64), Image.Resampling.LANCZOS)

        # Multiple hash types at different sizes
        features = {
            'phash_8': imagehash.phash(img_rgb, hash_size=8),
            'phash_16': imagehash.phash(img_rgb, hash_size=16),
            'dhash_8': imagehash.dhash(img_rgb, hash_size=8),
            'ahash_8': imagehash.average_hash(img_rgb, hash_size=8),
            'whash_8': imagehash.whash(img_rgb, hash_size=8),
            'colorhash': imagehash.colorhash(img_rgb),
            'size': img.size,
            'aspect': img.size[0] / img.size[1] if img.size[1] > 0 else 1,
            'path': img_path,
        }

        # Color histogram features
        img_small = img_rgb.resize((32, 32), Image.Resampling.LANCZOS)
        pixels = np.array(img_small)
        features['avg_color'] = pixels.mean(axis=(0, 1))
        features['color_std'] = pixels.std(axis=(0, 1))

        return features
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return None


def compute_match_score(sprite_features, existing_features):
    """
    Compute a comprehensive match score between two images.
    Lower score = better match.
    """
    scores = []

    # Perceptual hash comparisons (most important)
    phash_diff = sprite_features['phash_16'] - existing_features['phash_16']
    scores.append(('phash', phash_diff, 0.35))

    dhash_diff = sprite_features['dhash_8'] - existing_features['dhash_8']
    scores.append(('dhash', dhash_diff, 0.20))

    ahash_diff = sprite_features['ahash_8'] - existing_features['ahash_8']
    scores.append(('ahash', ahash_diff, 0.15))

    whash_diff = sprite_features['whash_8'] - existing_features['whash_8']
    scores.append(('whash', whash_diff, 0.10))

    # Color hash (good for similar color schemes)
    colorhash_diff = sprite_features['colorhash'] - existing_features['colorhash']
    scores.append(('colorhash', colorhash_diff, 0.10))

    # Color similarity
    color_diff = np.linalg.norm(sprite_features['avg_color'] - existing_features['avg_color'])
    scores.append(('color', color_diff / 10, 0.10))  # Normalize

    # Weighted score
    total_score = sum(score * weight for _, score, weight in scores)

    return total_score, {name: score for name, score, _ in scores}


def find_best_matches(sprite_features, all_existing, top_n=6):
    """
    Find the top N best matches for a sprite.
    """
    matches = []

    for name, existing_features in all_existing.items():
        score, details = compute_match_score(sprite_features, existing_features)
        matches.append({
            'name': name,
            'score': score,
            'details': details,
            'path': existing_features['path']
        })

    # Sort by score (lower is better)
    matches.sort(key=lambda x: x['score'])

    return matches[:top_n]


def load_images(directory: str, size_filter=None):
    """
    Load and compute features for all images in a directory.
    """
    images = {}
    dir_path = Path(directory)

    for img_path in dir_path.glob('*.png'):
        features = compute_image_features(str(img_path))
        if features:
            # Apply size filter if specified
            if size_filter:
                min_size, max_size = size_filter
                w, h = features['size']
                if not (min_size <= max(w, h) <= max_size):
                    continue

            images[img_path.stem] = features

    return images


def generate_matching_game_html(sprites_with_matches: list, output_file: str):
    """
    Generate an interactive HTML matching game.
    """
    # Prepare data for JavaScript
    game_data = []
    for item in sprites_with_matches:
        game_data.append({
            'sprite': {
                'filename': item['filename'],
                'path': item['path'],
                'size': item['size']
            },
            'matches': [
                {
                    'name': m['name'],
                    'path': m['path'],
                    'score': round(m['score'], 2)
                }
                for m in item['matches']
            ]
        })

    html = """<!DOCTYPE html>
<html>
<head>
    <title>Sprite Matching Game</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            min-height: 100vh;
            padding: 20px;
        }

        .header {
            text-align: center;
            padding: 20px;
            margin-bottom: 20px;
        }
        .header h1 { font-size: 2em; margin-bottom: 10px; }

        .progress-bar {
            background: #333;
            border-radius: 20px;
            height: 24px;
            margin: 20px auto;
            max-width: 600px;
            overflow: hidden;
            position: relative;
        }
        .progress-fill {
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            height: 100%;
            transition: width 0.3s;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            font-size: 12px;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #4CAF50;
        }
        .stat-label {
            font-size: 0.9em;
            color: #888;
        }

        .controls {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .controls button {
            padding: 12px 24px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .controls button:hover { transform: translateY(-2px); }
        .controls button.primary { background: #4CAF50; color: white; }
        .controls button.secondary { background: #555; color: white; }
        .controls button.warning { background: #ff9800; color: white; }

        .game-container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .match-card {
            background: #2a2a3e;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .sprite-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .sprite-section h3 {
            color: #888;
            margin-bottom: 15px;
            font-size: 14px;
        }
        .sprite-preview {
            background: #fff;
            border-radius: 12px;
            padding: 15px;
            display: inline-block;
        }
        .sprite-preview img {
            max-width: 120px;
            max-height: 120px;
        }
        .sprite-info {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
        }

        .matches-section h3 {
            text-align: center;
            color: #888;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .matches-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
        }

        .match-option {
            background: #1a1a2e;
            border: 3px solid transparent;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .match-option:hover {
            border-color: #4CAF50;
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(76, 175, 80, 0.3);
        }
        .match-option.selected {
            border-color: #4CAF50;
            background: #1a2a1e;
        }
        .match-option img {
            max-width: 80px;
            max-height: 80px;
            background: #fff;
            border-radius: 8px;
            padding: 5px;
        }
        .match-option .name {
            margin-top: 10px;
            font-size: 11px;
            word-break: break-all;
            color: #ccc;
        }
        .match-option .score {
            font-size: 10px;
            color: #666;
            margin-top: 5px;
        }
        .match-option .score-bar {
            height: 4px;
            background: #333;
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
        }
        .match-option .score-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
        }

        .no-match-btn {
            grid-column: 1 / -1;
            background: #3a3a4e;
            border: 2px dashed #555;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            color: #888;
            transition: all 0.2s;
        }
        .no-match-btn:hover {
            border-color: #ff9800;
            color: #ff9800;
        }

        .action-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 25px;
        }
        .action-buttons button {
            padding: 12px 30px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .action-buttons button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .action-buttons .confirm { background: #4CAF50; color: white; }
        .action-buttons .skip { background: #555; color: white; }

        .completed {
            text-align: center;
            padding: 60px;
        }
        .completed h2 {
            font-size: 2.5em;
            color: #4CAF50;
            margin-bottom: 20px;
        }

        #export-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        #export-modal.active { display: flex; }
        .modal-content {
            background: #2a2a3e;
            padding: 30px;
            border-radius: 16px;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            overflow: auto;
        }
        .modal-content h3 { margin-bottom: 20px; }
        .modal-content textarea {
            width: 100%;
            height: 300px;
            font-family: monospace;
            font-size: 12px;
            background: #1a1a2e;
            color: #fff;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .modal-content button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 Sprite Matching Game</h1>
        <p>Match extracted game sprites to their names</p>
    </div>

    <div class="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
        <div class="progress-text" id="progress-text">0 / 0</div>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-value" id="matched-count">0</div>
            <div class="stat-label">Matched</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="skipped-count">0</div>
            <div class="stat-label">Skipped</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="remaining-count">0</div>
            <div class="stat-label">Remaining</div>
        </div>
    </div>

    <div class="controls">
        <button class="secondary" onclick="jumpToUnmatched()">Jump to Unmatched</button>
        <button class="primary" onclick="exportMatches()">Export Matches</button>
        <button class="warning" onclick="exportRenameScript()">Export Rename Script</button>
    </div>

    <div class="game-container" id="game-container"></div>

    <div id="export-modal">
        <div class="modal-content">
            <h3 id="modal-title">Export</h3>
            <textarea id="export-text" readonly></textarea>
            <button style="background: #4CAF50; color: white;" onclick="copyExport()">Copy to Clipboard</button>
            <button style="background: #555; color: white;" onclick="closeModal()">Close</button>
        </div>
    </div>

    <script>
        const gameData = """ + json.dumps(game_data) + """;

        // Load saved state
        let matches = JSON.parse(localStorage.getItem('spriteMatches') || '{}');
        let skipped = new Set(JSON.parse(localStorage.getItem('spriteSkipped') || '[]'));
        let currentIndex = parseInt(localStorage.getItem('spriteCurrentIndex') || '0');

        let selectedMatch = null;

        function saveState() {
            localStorage.setItem('spriteMatches', JSON.stringify(matches));
            localStorage.setItem('spriteSkipped', JSON.stringify([...skipped]));
            localStorage.setItem('spriteCurrentIndex', currentIndex.toString());
        }

        function updateStats() {
            const matched = Object.keys(matches).length;
            const skippedCount = skipped.size;
            const remaining = gameData.length - matched - skippedCount;

            document.getElementById('matched-count').textContent = matched;
            document.getElementById('skipped-count').textContent = skippedCount;
            document.getElementById('remaining-count').textContent = remaining;

            const progress = ((matched + skippedCount) / gameData.length) * 100;
            document.getElementById('progress-fill').style.width = progress + '%';
            document.getElementById('progress-text').textContent =
                `${matched + skippedCount} / ${gameData.length}`;
        }

        function renderCurrentCard() {
            const container = document.getElementById('game-container');

            // Find next unprocessed sprite
            while (currentIndex < gameData.length) {
                const item = gameData[currentIndex];
                if (!matches[item.sprite.filename] && !skipped.has(item.sprite.filename)) {
                    break;
                }
                currentIndex++;
            }

            if (currentIndex >= gameData.length) {
                container.innerHTML = `
                    <div class="completed">
                        <h2>🎉 All Done!</h2>
                        <p>You've processed all ${gameData.length} sprites.</p>
                        <p style="margin-top: 20px; color: #888;">
                            Matched: ${Object.keys(matches).length} |
                            Skipped: ${skipped.size}
                        </p>
                        <button class="primary" style="margin-top: 30px; padding: 15px 30px; font-size: 16px; border: none; border-radius: 8px; cursor: pointer; background: #4CAF50; color: white;" onclick="exportMatches()">
                            Export Matches
                        </button>
                    </div>
                `;
                updateStats();
                return;
            }

            const item = gameData[currentIndex];
            selectedMatch = null;

            // Calculate confidence bars (inverse of score, normalized)
            const maxScore = Math.max(...item.matches.map(m => m.score));

            let matchesHTML = item.matches.map((m, idx) => {
                const confidence = Math.max(0, 100 - (m.score * 2));
                return `
                    <div class="match-option" onclick="selectMatch(${idx}, '${m.name}')" id="match-${idx}">
                        <img src="file://${m.path}" loading="lazy">
                        <div class="name">${m.name}</div>
                        <div class="score">Score: ${m.score}</div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${confidence}%"></div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="match-card">
                    <div class="sprite-section">
                        <h3>EXTRACTED SPRITE (${currentIndex + 1} of ${gameData.length})</h3>
                        <div class="sprite-preview">
                            <img src="file://${item.sprite.path}">
                        </div>
                        <div class="sprite-info">
                            ${item.sprite.filename}<br>
                            ${item.sprite.size[0]}x${item.sprite.size[1]}px
                        </div>
                    </div>

                    <div class="matches-section">
                        <h3>SELECT THE BEST MATCH</h3>
                        <div class="matches-grid">
                            ${matchesHTML}
                            <div class="no-match-btn" onclick="selectNoMatch()">
                                ❌ No Match / Skip
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="skip" onclick="skipSprite()">Skip for Later</button>
                        <button class="confirm" id="confirm-btn" onclick="confirmMatch()" disabled>
                            Confirm Match
                        </button>
                    </div>
                </div>
            `;

            updateStats();
        }

        function selectMatch(idx, name) {
            // Deselect all
            document.querySelectorAll('.match-option').forEach(el => {
                el.classList.remove('selected');
            });

            // Select this one
            document.getElementById(`match-${idx}`).classList.add('selected');
            selectedMatch = name;

            document.getElementById('confirm-btn').disabled = false;
        }

        function selectNoMatch() {
            selectedMatch = '__SKIP__';
            document.querySelectorAll('.match-option').forEach(el => {
                el.classList.remove('selected');
            });
            document.getElementById('confirm-btn').disabled = false;
            document.getElementById('confirm-btn').textContent = 'Confirm Skip';
        }

        function confirmMatch() {
            const item = gameData[currentIndex];

            if (selectedMatch === '__SKIP__') {
                skipped.add(item.sprite.filename);
            } else if (selectedMatch) {
                matches[item.sprite.filename] = selectedMatch;
            }

            currentIndex++;
            saveState();
            renderCurrentCard();
        }

        function skipSprite() {
            currentIndex++;
            saveState();
            renderCurrentCard();
        }

        function jumpToUnmatched() {
            currentIndex = 0;
            renderCurrentCard();
        }

        function exportMatches() {
            document.getElementById('modal-title').textContent = 'Matched Sprites (JSON)';
            document.getElementById('export-text').value = JSON.stringify(matches, null, 2);
            document.getElementById('export-modal').classList.add('active');
        }

        function exportRenameScript() {
            let script = '#!/bin/bash\\n';
            script += '# Rename matched sprites\\n';
            script += '# Run from the extracted sprites directory\\n\\n';

            for (const [original, newName] of Object.entries(matches)) {
                script += `mv "${original}" "${newName}.png"\\n`;
            }

            document.getElementById('modal-title').textContent = 'Rename Script (Bash)';
            document.getElementById('export-text').value = script;
            document.getElementById('export-modal').classList.add('active');
        }

        function copyExport() {
            const text = document.getElementById('export-text');
            text.select();
            document.execCommand('copy');
            alert('Copied to clipboard!');
        }

        function closeModal() {
            document.getElementById('export-modal').classList.remove('active');
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '6') {
                const idx = parseInt(e.key) - 1;
                const item = gameData[currentIndex];
                if (item && item.matches[idx]) {
                    selectMatch(idx, item.matches[idx].name);
                }
            } else if (e.key === 'Enter' && selectedMatch) {
                confirmMatch();
            } else if (e.key === 's' || e.key === 'S') {
                skipSprite();
            } else if (e.key === '0') {
                selectNoMatch();
            }
        });

        // Start
        renderCurrentCard();
    </script>
</body>
</html>
"""

    with open(output_file, 'w') as f:
        f.write(html)

    print(f"Matching game saved to {output_file}")


def main():
    sprites_dir = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/extracted/atlas_"
    existing_dirs = [
        "/Users/bias/Documents/reactdev/sosgb/public/images/recipes",
        "/Users/bias/Documents/reactdev/sosgb/public/images/ingredients"
    ]
    output_file = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/matching_game.html"

    print("="*60)
    print("Sprite Matching Game Generator")
    print("="*60)

    # Load existing images
    print("\nLoading existing named images...")
    all_existing = {}
    for directory in existing_dirs:
        images = load_images(directory)
        all_existing.update(images)
        print(f"  {directory}: {len(images)} images")
    print(f"  Total: {len(all_existing)} existing images")

    # Load extracted sprites (filter to likely icon sizes)
    print("\nLoading extracted sprites...")
    sprites = load_images(sprites_dir, size_filter=(50, 150))
    print(f"  Loaded {len(sprites)} sprites (50-150px)")

    # Find matches for each sprite
    print("\nComputing matches (this may take a minute)...")
    sprites_with_matches = []

    total = len(sprites)
    for i, (filename, features) in enumerate(sprites.items()):
        if (i + 1) % 50 == 0:
            print(f"  Processing {i + 1}/{total}...")

        best_matches = find_best_matches(features, all_existing, top_n=6)

        sprites_with_matches.append({
            'filename': filename + '.png',
            'path': features['path'],
            'size': features['size'],
            'matches': best_matches
        })

    # Sort by best match score (easiest matches first)
    sprites_with_matches.sort(key=lambda x: x['matches'][0]['score'] if x['matches'] else 999)

    print(f"\nGenerating matching game...")
    generate_matching_game_html(sprites_with_matches, output_file)

    print(f"\n{'='*60}")
    print("Done! Open in your browser:")
    print(f"  file://{output_file}")
    print()
    print("Keyboard shortcuts:")
    print("  1-6: Select match option")
    print("  0: Select 'No Match'")
    print("  Enter: Confirm selection")
    print("  S: Skip sprite")
    print("="*60)


if __name__ == '__main__':
    main()
