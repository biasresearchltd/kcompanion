#!/usr/bin/env python3
"""
Sprite Matching Game v2
Improved matching using multiple techniques:
1. Color histogram comparison
2. Structural similarity (SSIM)
3. Feature matching with ORB
4. Dominant color analysis
5. Edge detection comparison
"""

import os
import json
from pathlib import Path
from PIL import Image
import numpy as np
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# Try to import optional dependencies
try:
    from skimage.metrics import structural_similarity as ssim
    from skimage.feature import canny
    from skimage import color as skcolor
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False
    print("Installing scikit-image for better matching...")
    os.system("pip install scikit-image")
    from skimage.metrics import structural_similarity as ssim
    from skimage.feature import canny
    from skimage import color as skcolor

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("Installing opencv-python for better matching...")
    os.system("pip install opencv-python-headless")
    import cv2


def load_and_normalize_image(img_path: str, target_size: int = 64):
    """
    Load image and normalize to standard size with white background.
    """
    try:
        img = Image.open(img_path).convert('RGBA')

        # Create white background version
        background = Image.new('RGBA', img.size, (255, 255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img_rgb = background.convert('RGB')

        # Resize to standard size maintaining aspect ratio
        img_rgb.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)

        # Pad to exact size
        padded = Image.new('RGB', (target_size, target_size), (255, 255, 255))
        offset = ((target_size - img_rgb.width) // 2, (target_size - img_rgb.height) // 2)
        padded.paste(img_rgb, offset)

        return np.array(padded), img.size
    except Exception as e:
        print(f"Error loading {img_path}: {e}")
        return None, None


def compute_color_histogram(img_array, bins=16):
    """
    Compute normalized color histogram.
    """
    hist_r = np.histogram(img_array[:,:,0], bins=bins, range=(0, 256))[0]
    hist_g = np.histogram(img_array[:,:,1], bins=bins, range=(0, 256))[0]
    hist_b = np.histogram(img_array[:,:,2], bins=bins, range=(0, 256))[0]

    hist = np.concatenate([hist_r, hist_g, hist_b]).astype(float)
    hist /= (hist.sum() + 1e-7)  # Normalize
    return hist


def compute_dominant_colors(img_array, n_colors=5):
    """
    Extract dominant colors using k-means-like approach.
    """
    pixels = img_array.reshape(-1, 3)

    # Filter out white/near-white pixels (background)
    non_white = pixels[np.all(pixels < 250, axis=1)]

    if len(non_white) < 10:
        return np.array([[255, 255, 255]] * n_colors)

    # Simple clustering: sort by frequency
    unique, counts = np.unique(non_white // 32, axis=0, return_counts=True)  # Quantize
    sorted_idx = np.argsort(-counts)[:n_colors]

    dominant = unique[sorted_idx] * 32 + 16  # Back to color space

    # Pad if needed
    while len(dominant) < n_colors:
        dominant = np.vstack([dominant, [255, 255, 255]])

    return dominant[:n_colors]


def compute_edge_signature(img_array):
    """
    Compute edge-based signature using Canny edge detection.
    """
    gray = np.mean(img_array, axis=2).astype(np.uint8)
    edges = canny(gray, sigma=1.5)

    # Divide into grid and count edge pixels
    grid_size = 8
    h, w = edges.shape
    cell_h, cell_w = h // grid_size, w // grid_size

    signature = []
    for i in range(grid_size):
        for j in range(grid_size):
            cell = edges[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
            signature.append(cell.sum() / (cell_h * cell_w))

    return np.array(signature)


def compute_shape_context(img_array):
    """
    Compute shape context using edge contours.
    """
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

    # Threshold to get object mask
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return np.zeros(64)

    # Get largest contour
    largest = max(contours, key=cv2.contourArea)

    # Compute Hu moments (shape descriptors)
    moments = cv2.moments(largest)
    hu_moments = cv2.HuMoments(moments).flatten()

    # Log transform for better comparison
    hu_moments = -np.sign(hu_moments) * np.log10(np.abs(hu_moments) + 1e-10)

    return hu_moments


def compute_orb_features(img_array, max_features=100):
    """
    Compute ORB features for matching.
    """
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    orb = cv2.ORB_create(nfeatures=max_features)
    keypoints, descriptors = orb.detectAndCompute(gray, None)

    return keypoints, descriptors


def compute_features(img_path: str):
    """
    Compute all features for an image.
    """
    img_array, original_size = load_and_normalize_image(img_path)

    if img_array is None:
        return None

    features = {
        'path': img_path,
        'original_size': original_size,
        'img_array': img_array,
        'color_hist': compute_color_histogram(img_array),
        'dominant_colors': compute_dominant_colors(img_array),
        'edge_signature': compute_edge_signature(img_array),
    }

    if HAS_CV2:
        features['hu_moments'] = compute_shape_context(img_array)
        kp, desc = compute_orb_features(img_array)
        features['orb_descriptors'] = desc

    return features


def compare_histograms(hist1, hist2):
    """
    Compare color histograms using correlation.
    """
    return np.corrcoef(hist1, hist2)[0, 1]


def compare_dominant_colors(colors1, colors2):
    """
    Compare dominant colors.
    """
    # Find best matching for each color
    total_dist = 0
    for c1 in colors1:
        min_dist = min(np.linalg.norm(c1 - c2) for c2 in colors2)
        total_dist += min_dist

    # Normalize by max possible distance
    return 1 - (total_dist / (len(colors1) * 255 * np.sqrt(3)))


def compare_edges(edges1, edges2):
    """
    Compare edge signatures.
    """
    return np.corrcoef(edges1, edges2)[0, 1]


def compare_shapes(hu1, hu2):
    """
    Compare Hu moments.
    """
    # Use weighted Euclidean distance
    diff = np.abs(hu1 - hu2)
    return 1 / (1 + np.sum(diff[:4]))  # Focus on first 4 moments


def compare_ssim(img1, img2):
    """
    Compare using structural similarity.
    """
    gray1 = np.mean(img1, axis=2)
    gray2 = np.mean(img2, axis=2)

    return ssim(gray1, gray2, data_range=255)


def compare_orb(desc1, desc2):
    """
    Compare using ORB feature matching.
    """
    if desc1 is None or desc2 is None:
        return 0

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    try:
        matches = bf.match(desc1, desc2)

        if not matches:
            return 0

        # Score based on number and quality of matches
        good_matches = [m for m in matches if m.distance < 50]
        return len(good_matches) / max(len(desc1), len(desc2))
    except:
        return 0


def compute_match_score(sprite_features, existing_features):
    """
    Compute comprehensive match score using multiple techniques.
    """
    scores = {}

    # Color histogram (good for overall color similarity)
    hist_score = compare_histograms(
        sprite_features['color_hist'],
        existing_features['color_hist']
    )
    scores['histogram'] = max(0, hist_score)

    # Dominant colors (good for key color matching)
    color_score = compare_dominant_colors(
        sprite_features['dominant_colors'],
        existing_features['dominant_colors']
    )
    scores['colors'] = color_score

    # Edge signature (good for shape outline)
    edge_score = compare_edges(
        sprite_features['edge_signature'],
        existing_features['edge_signature']
    )
    scores['edges'] = max(0, edge_score)

    # SSIM (structural similarity)
    ssim_score = compare_ssim(
        sprite_features['img_array'],
        existing_features['img_array']
    )
    scores['ssim'] = max(0, ssim_score)

    # Shape context (Hu moments)
    if 'hu_moments' in sprite_features and 'hu_moments' in existing_features:
        shape_score = compare_shapes(
            sprite_features['hu_moments'],
            existing_features['hu_moments']
        )
        scores['shape'] = shape_score

    # ORB feature matching
    if 'orb_descriptors' in sprite_features and 'orb_descriptors' in existing_features:
        orb_score = compare_orb(
            sprite_features['orb_descriptors'],
            existing_features['orb_descriptors']
        )
        scores['orb'] = orb_score

    # Weighted combination (higher = better match)
    weights = {
        'histogram': 0.20,
        'colors': 0.25,
        'edges': 0.15,
        'ssim': 0.20,
        'shape': 0.10,
        'orb': 0.10
    }

    total_score = sum(scores.get(k, 0) * w for k, w in weights.items())

    # Invert so lower = better (for consistency with previous version)
    # Scale to roughly 0-100 range
    final_score = (1 - total_score) * 50

    return final_score, scores


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
    files = list(dir_path.glob('*.png'))

    print(f"  Processing {len(files)} images...")

    for i, img_path in enumerate(files):
        if (i + 1) % 50 == 0:
            print(f"    {i + 1}/{len(files)}...")

        # Quick size check before computing features
        if size_filter:
            try:
                with Image.open(img_path) as img:
                    w, h = img.size
                    min_size, max_size = size_filter
                    if not (min_size <= max(w, h) <= max_size):
                        continue
            except:
                continue

        features = compute_features(str(img_path))
        if features:
            images[img_path.stem] = features

    return images


def generate_matching_game_html(sprites_with_matches: list, all_existing: dict, output_file: str):
    """
    Generate an interactive HTML matching game.
    """
    # Prepare data for JavaScript (remove numpy arrays)
    game_data = []
    for item in sprites_with_matches:
        game_data.append({
            'sprite': {
                'filename': item['filename'],
                'path': item['path'],
                'size': list(item['size']) if item['size'] else [0, 0]
            },
            'matches': [
                {
                    'name': m['name'],
                    'path': m['path'],
                    'score': round(m['score'], 2),
                    'breakdown': {k: round(v, 3) for k, v in m['details'].items()}
                }
                for m in item['matches']
            ]
        })

    # Prepare list of ALL existing images for manual search
    all_existing_list = [
        {'name': name, 'path': features['path']}
        for name, features in all_existing.items()
    ]
    all_existing_list.sort(key=lambda x: x['name'])

    # Read the existing HTML template and update just the game data
    # For now, generate fresh HTML
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Sprite Matching Game v2</title>
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
        .header .version { color: #4CAF50; font-size: 0.9em; }

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
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .sprite-preview.animate {
            animation: fadeIn 0.2s ease;
        }
        .match-option.animate {
            animation: fadeIn 0.15s ease;
            animation-fill-mode: both;
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
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
            position: relative;
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
        .match-option .compare-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        .match-option .sprite-copy {
            max-width: 100px;
            max-height: 100px;
            background: #fff;
            border-radius: 8px;
            padding: 6px;
            border: 2px solid #4CAF50;
        }
        .match-option .vs-label {
            font-size: 10px;
            color: #666;
            font-weight: bold;
        }
        .match-option .candidate-img {
            max-width: 100px;
            max-height: 100px;
            background: #fff;
            border-radius: 8px;
            padding: 6px;
            border: 2px solid #2196F3;
        }
        .match-option .key-hint {
            position: absolute;
            top: 5px;
            left: 5px;
            background: #4CAF50;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
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

        .keyboard-hints {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .keyboard-hints kbd {
            background: #333;
            padding: 2px 6px;
            border-radius: 4px;
            margin: 0 2px;
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

        /* Search Modal Styles - Side panel that doesn't cover the sprite */
        #search-modal {
            display: none;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 500px;
            background: #2a2a3e;
            z-index: 1001;
            flex-direction: column;
            box-shadow: -5px 0 30px rgba(0,0,0,0.5);
        }
        #search-modal.active { display: flex; }
        .search-modal-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 20px;
        }
        .search-sprite-preview {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            margin-bottom: 15px;
        }
        .search-sprite-preview img {
            max-width: 100px;
            max-height: 100px;
            background: #fff;
            border-radius: 8px;
            padding: 8px;
        }
        .search-sprite-preview .label {
            margin-top: 8px;
            font-size: 11px;
            color: #888;
        }
        .search-header {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .search-header input {
            flex: 1;
            padding: 12px 16px;
            font-size: 16px;
            border: 2px solid #444;
            border-radius: 8px;
            background: #1a1a2e;
            color: #fff;
        }
        .search-header input:focus {
            outline: none;
            border-color: #4CAF50;
        }
        .search-header button {
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            background: #555;
            color: white;
        }
        .search-results {
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 5px 0;
        }
        .search-result-item {
            background: #1a1a2e;
            border: 2px solid transparent;
            border-radius: 10px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .search-result-item:hover {
            border-color: #4CAF50;
            transform: translateY(-2px);
        }
        .search-result-item img {
            max-width: 90px;
            max-height: 90px;
            background: #fff;
            border-radius: 6px;
            padding: 6px;
        }
        .search-result-item .name {
            margin-top: 8px;
            font-size: 11px;
            color: #ccc;
            word-break: break-all;
        }
        .search-count {
            color: #888;
            font-size: 12px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 Sprite Matching Game</h1>
        <div class="version">v2 - Improved Matching</div>
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

    <div class="keyboard-hints">
        <kbd>1</kbd>-<kbd>6</kbd> Select &amp; confirm |
        <kbd>Space</kbd> Skip |
        <kbd>B</kbd> Go back |
        <kbd>/</kbd> Search
    </div>

    <div class="controls">
        <button class="secondary" onclick="goBack()">← Back (B)</button>
        <button class="secondary" onclick="jumpToUnmatched()">Jump to Unmatched</button>
        <button class="primary" onclick="openSearch()">🔍 Search for Match (/)</button>
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

    <div id="search-modal">
        <div class="search-modal-content">
            <div class="search-sprite-preview" id="search-sprite-preview">
                <img id="search-sprite-img" src="">
                <div class="label">Matching this sprite</div>
            </div>
            <div class="search-header">
                <input type="text" id="search-input" placeholder="Search images...">
                <button onclick="closeSearch()" style="font-size: 18px; padding: 8px 14px;">✕</button>
            </div>
            <div class="search-count" id="search-count">Type to search 711 existing images</div>
            <div class="search-results" id="search-results"></div>
        </div>
    </div>

    <script>
        const gameData = """ + json.dumps(game_data) + """;
        const allExisting = """ + json.dumps(all_existing_list) + """;

        // Load saved state
        let matches = JSON.parse(localStorage.getItem('spriteMatches') || '{}');
        let skipped = new Set(JSON.parse(localStorage.getItem('spriteSkipped') || '[]'));
        let currentIndex = parseInt(localStorage.getItem('spriteCurrentIndex') || '0');

        let selectedMatch = null;
        let history = [];

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

            let matchesHTML = item.matches.map((m, idx) => {
                const confidence = Math.max(0, 100 - (m.score * 2));
                return `
                    <div class="match-option animate" onclick="selectMatch(${idx}, '${m.name}')" id="match-${idx}" style="animation-delay: ${idx * 0.03}s">
                        <span class="key-hint">${idx + 1}</span>
                        <div class="compare-container">
                            <img class="sprite-copy" src="file://${item.sprite.path}" loading="lazy">
                            <div class="vs-label">vs</div>
                            <img class="candidate-img" src="file://${m.path}" loading="lazy">
                        </div>
                        <div class="name">${m.name}</div>
                        <div class="score">Score: ${m.score.toFixed(1)}</div>
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
                        <div class="sprite-preview animate">
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
                                ❌ No Match / Skip (Space)
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="skip" onclick="skipSprite()">Skip for Later (S)</button>
                        <button class="confirm" id="confirm-btn" onclick="confirmMatch()" disabled>
                            Confirm Match
                        </button>
                    </div>
                </div>
            `;

            updateStats();
        }

        function selectMatch(idx, name) {
            document.querySelectorAll('.match-option').forEach(el => {
                el.classList.remove('selected');
            });
            document.getElementById(`match-${idx}`).classList.add('selected');
            selectedMatch = name;
            document.getElementById('confirm-btn').disabled = false;
            document.getElementById('confirm-btn').textContent = 'Confirm Match';
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
            history.push(currentIndex);

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

        function goBack() {
            if (history.length > 0) {
                const prevIndex = history.pop();
                const prevItem = gameData[prevIndex];
                if (prevItem) {
                    delete matches[prevItem.sprite.filename];
                    skipped.delete(prevItem.sprite.filename);
                }
                currentIndex = prevIndex;
                saveState();
                renderCurrentCard();
                return;
            }

            for (let i = currentIndex - 1; i >= 0; i--) {
                const item = gameData[i];
                if (matches[item.sprite.filename] || skipped.has(item.sprite.filename)) {
                    delete matches[item.sprite.filename];
                    skipped.delete(item.sprite.filename);
                    currentIndex = i;
                    saveState();
                    renderCurrentCard();
                    return;
                }
            }
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

        // Search functions
        function openSearch() {
            const item = gameData[currentIndex];
            if (!item) return;

            // Show current sprite in search panel
            document.getElementById('search-sprite-img').src = 'file://' + item.sprite.path;

            document.getElementById('search-modal').classList.add('active');
            const input = document.getElementById('search-input');
            input.value = '';
            input.focus();
            renderSearchResults('');
        }

        function closeSearch() {
            document.getElementById('search-modal').classList.remove('active');
        }

        function renderSearchResults(query) {
            const container = document.getElementById('search-results');
            const countEl = document.getElementById('search-count');
            const queryLower = query.toLowerCase();

            let filtered = allExisting;
            if (queryLower.length > 0) {
                filtered = allExisting.filter(item =>
                    item.name.toLowerCase().includes(queryLower)
                );
            }

            countEl.textContent = query
                ? `Found ${filtered.length} matches for "${query}"`
                : `Type to search ${allExisting.length} existing images`;

            // Limit displayed results for performance
            const toShow = filtered.slice(0, 100);

            container.innerHTML = toShow.map(item => `
                <div class="search-result-item" onclick="selectFromSearch('${item.name}')">
                    <img src="file://${item.path}" loading="lazy">
                    <div class="name">${item.name}</div>
                </div>
            `).join('');

            if (filtered.length > 100) {
                container.innerHTML += `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 20px;">
                    Showing first 100 of ${filtered.length} results. Type more to narrow down.
                </div>`;
            }
        }

        function selectFromSearch(name) {
            const item = gameData[currentIndex];
            if (item) {
                history.push(currentIndex);
                matches[item.sprite.filename] = name;
                currentIndex++;
                saveState();
            }
            closeSearch();
            renderCurrentCard();
        }

        // Search input handler
        document.getElementById('search-input').addEventListener('input', (e) => {
            renderSearchResults(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const searchModal = document.getElementById('search-modal');
            const searchInput = document.getElementById('search-input');
            const isSearchOpen = searchModal.classList.contains('active');
            const isSearchFocused = document.activeElement === searchInput;

            // Handle search modal - Escape always closes it
            if (isSearchOpen) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSearch();
                    return;
                }
                // Let typing work in search input, but don't block other keys
                if (isSearchFocused) {
                    return;
                }
            }

            // Handle export modal
            if (document.getElementById('export-modal').classList.contains('active')) {
                if (e.key === 'Escape') closeModal();
                return;
            }

            if (e.key === 'Escape' && isSearchOpen) {
                e.preventDefault();
                closeSearch();
            } else if (e.key === '/') {
                e.preventDefault();
                openSearch();
            } else if (e.key >= '1' && e.key <= '6') {
                e.preventDefault();
                const idx = parseInt(e.key) - 1;
                const item = gameData[currentIndex];
                if (item && item.matches[idx]) {
                    selectMatch(idx, item.matches[idx].name);
                    confirmMatch();
                }
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                selectNoMatch();
                confirmMatch();
            } else if (e.key === 'Enter' && selectedMatch) {
                e.preventDefault();
                confirmMatch();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                skipSprite();
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                goBack();
            }
        });

        // Also handle Escape on the search input specifically
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
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
    output_file = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/matching_game_v2.html"

    print("="*60)
    print("Sprite Matching Game v2 - Improved Matching")
    print("="*60)
    print("\nUsing: Color histograms, SSIM, Edge detection, Shape analysis")

    # Load existing images
    print("\nLoading existing named images...")
    all_existing = {}
    for directory in existing_dirs:
        images = load_images(directory)
        all_existing.update(images)
        print(f"  {Path(directory).name}: {len(images)} images")
    print(f"  Total: {len(all_existing)} existing images")

    # Load extracted sprites - NO size filter, include ALL sprites
    print("\nLoading extracted sprites...")
    sprites = load_images(sprites_dir, size_filter=None)
    print(f"  Loaded {len(sprites)} sprites (all sizes)")

    # Find matches for each sprite
    print("\nComputing matches (this will take a few minutes)...")
    sprites_with_matches = []

    total = len(sprites)
    for i, (filename, features) in enumerate(sprites.items()):
        if (i + 1) % 25 == 0:
            print(f"  Processing {i + 1}/{total}...")

        best_matches = find_best_matches(features, all_existing, top_n=6)

        sprites_with_matches.append({
            'filename': filename + '.png',
            'path': features['path'],
            'size': features['original_size'],
            'matches': best_matches
        })

    # Sort by best match score (easiest matches first)
    sprites_with_matches.sort(key=lambda x: x['matches'][0]['score'] if x['matches'] else 999)

    print(f"\nGenerating matching game...")
    generate_matching_game_html(sprites_with_matches, all_existing, output_file)

    print(f"\n{'='*60}")
    print("Done! Open in your browser:")
    print(f"  file://{output_file}")
    print()
    print("Keyboard shortcuts:")
    print("  1-6: Select match AND confirm")
    print("  Space: Skip (no match)")
    print("  B: Go back")
    print("  /: Search for a match manually")
    print("="*60)


if __name__ == '__main__':
    main()
