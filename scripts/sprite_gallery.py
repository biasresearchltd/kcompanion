#!/usr/bin/env python3
"""
Sprite Gallery Generator
Creates an HTML gallery for browsing and manually identifying extracted sprites.
"""

import os
import json
from pathlib import Path
from PIL import Image
from collections import defaultdict

def categorize_by_size(sprites_dir: str):
    """
    Categorize sprites by size ranges.
    """
    categories = defaultdict(list)

    for img_path in Path(sprites_dir).glob('*.png'):
        try:
            img = Image.open(img_path)
            width, height = img.size
            max_dim = max(width, height)

            # Categorize by size
            if max_dim <= 50:
                cat = "tiny (<=50px)"
            elif max_dim <= 80:
                cat = "small (51-80px) - likely item icons"
            elif max_dim <= 120:
                cat = "medium (81-120px) - likely item icons"
            elif max_dim <= 200:
                cat = "large (121-200px)"
            else:
                cat = "extra-large (>200px) - UI/buildings"

            categories[cat].append({
                'path': str(img_path),
                'filename': img_path.name,
                'width': width,
                'height': height
            })
        except Exception as e:
            print(f"Error processing {img_path}: {e}")

    return categories


def generate_gallery_html(categories: dict, output_file: str, existing_names: list = None):
    """
    Generate an interactive HTML gallery for manual sprite identification.
    """
    existing_json = json.dumps(existing_names or [])

    html = """<!DOCTYPE html>
<html>
<head>
    <title>Sprite Gallery - Manual Identification</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #1a1a2e;
            color: #eee;
            margin: 0;
        }
        h1 { color: #fff; margin-bottom: 10px; }
        .stats { color: #888; margin-bottom: 20px; }
        .controls {
            position: sticky;
            top: 0;
            background: #1a1a2e;
            padding: 15px 0;
            z-index: 100;
            border-bottom: 1px solid #333;
            margin-bottom: 20px;
        }
        .controls input {
            padding: 10px 15px;
            font-size: 16px;
            border: 1px solid #444;
            border-radius: 8px;
            background: #2a2a3e;
            color: #fff;
            width: 300px;
            margin-right: 10px;
        }
        .controls button {
            padding: 10px 20px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-right: 10px;
        }
        .controls button.primary { background: #4CAF50; color: white; }
        .controls button.secondary { background: #555; color: white; }

        .category {
            margin-bottom: 40px;
        }
        .category h2 {
            color: #4CAF50;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            position: sticky;
            top: 70px;
            background: #1a1a2e;
            z-index: 50;
        }
        .sprite-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 15px;
        }
        .sprite-card {
            background: #2a2a3e;
            border-radius: 12px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }
        .sprite-card:hover {
            background: #3a3a4e;
            transform: translateY(-2px);
        }
        .sprite-card.selected {
            border-color: #4CAF50;
            background: #2a3a2e;
        }
        .sprite-card.named {
            border-color: #2196F3;
            background: #2a2a3e;
        }
        .sprite-card img {
            max-width: 100%;
            max-height: 80px;
            background: #fff;
            border-radius: 8px;
            padding: 5px;
        }
        .sprite-card .filename {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
            word-break: break-all;
        }
        .sprite-card .size {
            font-size: 11px;
            color: #888;
        }
        .sprite-card .assigned-name {
            font-size: 12px;
            color: #4CAF50;
            font-weight: bold;
            margin-top: 5px;
        }

        .modal {
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
        .modal.active { display: flex; }
        .modal-content {
            background: #2a2a3e;
            padding: 30px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
        }
        .modal-content img {
            max-width: 200px;
            max-height: 200px;
            background: #fff;
            border-radius: 8px;
            display: block;
            margin: 0 auto 20px;
        }
        .modal-content input {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 1px solid #444;
            border-radius: 8px;
            background: #1a1a2e;
            color: #fff;
            margin-bottom: 15px;
        }
        .modal-content .suggestions {
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
        }
        .modal-content .suggestion {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
        }
        .modal-content .suggestion:hover {
            background: #3a3a4e;
        }
        .modal-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .modal-buttons button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }

        #export-area {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2a3e;
            padding: 30px;
            border-radius: 16px;
            z-index: 1001;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
        }
        #export-area textarea {
            width: 100%;
            height: 400px;
            font-family: monospace;
            font-size: 12px;
            background: #1a1a2e;
            color: #fff;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 10px;
        }
    </style>
</head>
<body>
    <h1>Sprite Gallery</h1>
    <div class="stats" id="stats"></div>

    <div class="controls">
        <input type="text" id="search" placeholder="Filter sprites by filename...">
        <button class="primary" onclick="exportMappings()">Export Mappings (JSON)</button>
        <button class="secondary" onclick="exportRenameScript()">Export Rename Script</button>
        <span id="named-count" style="margin-left: 20px; color: #4CAF50;"></span>
    </div>

    <div id="gallery"></div>

    <div class="modal" id="modal">
        <div class="modal-content">
            <img id="modal-img" src="">
            <div id="modal-filename" style="text-align: center; color: #888; margin-bottom: 15px;"></div>
            <input type="text" id="modal-input" placeholder="Enter item name (e.g., curry_rice)">
            <div class="suggestions" id="suggestions"></div>
            <div class="modal-buttons">
                <button style="background: #f44336; color: white;" onclick="closeModal()">Cancel</button>
                <button style="background: #4CAF50; color: white;" onclick="saveName()">Save</button>
            </div>
        </div>
    </div>

    <div id="export-area">
        <h3>Export</h3>
        <textarea id="export-text" readonly></textarea>
        <button onclick="document.getElementById('export-area').style.display='none'" style="margin-top: 10px;">Close</button>
    </div>

    <script>
        const existingNames = """ + existing_json + """;
        const mappings = JSON.parse(localStorage.getItem('spriteMappings') || '{}');
        let currentSprite = null;

        const categories = """ + json.dumps(categories) + """;

        function renderGallery(filter = '') {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '';
            let totalSprites = 0;
            let namedSprites = 0;

            const filterLower = filter.toLowerCase();

            for (const [catName, sprites] of Object.entries(categories)) {
                const filteredSprites = sprites.filter(s =>
                    s.filename.toLowerCase().includes(filterLower) ||
                    (mappings[s.filename] || '').toLowerCase().includes(filterLower)
                );

                if (filteredSprites.length === 0) continue;

                totalSprites += filteredSprites.length;

                const section = document.createElement('div');
                section.className = 'category';
                section.innerHTML = `<h2>${catName} (${filteredSprites.length})</h2>`;

                const grid = document.createElement('div');
                grid.className = 'sprite-grid';

                for (const sprite of filteredSprites) {
                    const isNamed = !!mappings[sprite.filename];
                    if (isNamed) namedSprites++;

                    const card = document.createElement('div');
                    card.className = 'sprite-card' + (isNamed ? ' named' : '');
                    card.onclick = () => openModal(sprite);
                    card.innerHTML = `
                        <img src="file://${sprite.path}" loading="lazy">
                        <div class="size">${sprite.width}x${sprite.height}</div>
                        ${isNamed ? `<div class="assigned-name">${mappings[sprite.filename]}</div>` : ''}
                        <div class="filename">${sprite.filename}</div>
                    `;
                    grid.appendChild(card);
                }

                section.appendChild(grid);
                gallery.appendChild(section);
            }

            document.getElementById('stats').textContent = `Total: ${totalSprites} sprites across ${Object.keys(categories).length} categories`;
            document.getElementById('named-count').textContent = `Named: ${namedSprites} / ${totalSprites}`;
        }

        function openModal(sprite) {
            currentSprite = sprite;
            document.getElementById('modal').classList.add('active');
            document.getElementById('modal-img').src = 'file://' + sprite.path;
            document.getElementById('modal-filename').textContent = sprite.filename;
            document.getElementById('modal-input').value = mappings[sprite.filename] || '';
            document.getElementById('modal-input').focus();
            updateSuggestions('');
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('active');
            currentSprite = null;
        }

        function updateSuggestions(query) {
            const suggestionsDiv = document.getElementById('suggestions');
            const queryLower = query.toLowerCase();

            const matches = existingNames
                .filter(name => name.toLowerCase().includes(queryLower))
                .slice(0, 20);

            suggestionsDiv.innerHTML = matches.map(name =>
                `<div class="suggestion" onclick="selectSuggestion('${name}')">${name}</div>`
            ).join('');
        }

        function selectSuggestion(name) {
            document.getElementById('modal-input').value = name;
        }

        function saveName() {
            if (!currentSprite) return;
            const name = document.getElementById('modal-input').value.trim();
            if (name) {
                mappings[currentSprite.filename] = name;
            } else {
                delete mappings[currentSprite.filename];
            }
            localStorage.setItem('spriteMappings', JSON.stringify(mappings));
            closeModal();
            renderGallery(document.getElementById('search').value);
        }

        function exportMappings() {
            const exportArea = document.getElementById('export-area');
            document.getElementById('export-text').value = JSON.stringify(mappings, null, 2);
            exportArea.style.display = 'block';
        }

        function exportRenameScript() {
            let script = '#!/bin/bash\\n# Rename sprites to their identified names\\n\\n';
            for (const [original, newName] of Object.entries(mappings)) {
                script += `mv "${original}" "${newName}.png"\\n`;
            }
            const exportArea = document.getElementById('export-area');
            document.getElementById('export-text').value = script;
            exportArea.style.display = 'block';
        }

        // Event listeners
        document.getElementById('search').addEventListener('input', (e) => {
            renderGallery(e.target.value);
        });

        document.getElementById('modal-input').addEventListener('input', (e) => {
            updateSuggestions(e.target.value);
        });

        document.getElementById('modal-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveName();
            if (e.key === 'Escape') closeModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') closeModal();
        });

        // Initial render
        renderGallery();
    </script>
</body>
</html>
"""

    with open(output_file, 'w') as f:
        f.write(html)

    print(f"Gallery saved to {output_file}")


def load_existing_names(directories: list):
    """Load existing image names for autocomplete suggestions."""
    names = set()
    for directory in directories:
        dir_path = Path(directory)
        if dir_path.exists():
            for img_path in dir_path.glob('*.png'):
                names.add(img_path.stem)
    return sorted(names)


def main():
    sprites_dir = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/extracted/atlas_"
    output_file = "/Users/bias/Documents/reactdev/sosgb/SOSGB-Icons/gallery.html"
    existing_dirs = [
        "/Users/bias/Documents/reactdev/sosgb/public/images/recipes",
        "/Users/bias/Documents/reactdev/sosgb/public/images/ingredients"
    ]

    print("Categorizing sprites by size...")
    categories = categorize_by_size(sprites_dir)

    for cat, sprites in sorted(categories.items()):
        print(f"  {cat}: {len(sprites)} sprites")

    print("\nLoading existing names for suggestions...")
    existing_names = load_existing_names(existing_dirs)
    print(f"  Found {len(existing_names)} existing names")

    print("\nGenerating gallery...")
    generate_gallery_html(categories, output_file, existing_names)

    print(f"\nDone! Open in browser:")
    print(f"  file://{output_file}")


if __name__ == '__main__':
    main()
