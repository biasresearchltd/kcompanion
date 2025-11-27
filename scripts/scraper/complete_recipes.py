#!/usr/bin/env python3
"""
Complete Recipe Dataset Builder for Story of Seasons: Grand Bazaar (Switch)
Combines StratsWiki data (266 recipes, effects, prices) with utensil mappings
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any

# Utensil mappings based on recipe category and cooking method patterns
# Derived from Fogu.com DS data and adapted for Switch version names

UTENSIL_RULES = {
    # Category-based defaults
    "salad": "none",
    "soup": "pot",
    "dessert": "frying_pan",  # Most desserts use frying pan
    "other": "pot",  # Most drinks/teas use pot

    # Specific overrides by recipe name pattern
}

# Specific utensil assignments for recipes
UTENSIL_OVERRIDES = {
    # Salads - mostly no utensil
    "caprese_salad": "none",
    "guacamole_salad": "none",
    "herb_salad": "none",
    "kinpira_gobo": "frying_pan",  # Stir-fried dish
    "macaroni_salad": "none",
    "marinated_peppers": "none",
    "mashed_potatoes": "pot",
    "mixed_salad": "none",
    "onion_salad": "none",
    "poke": "none",
    "tomato_salad": "none",
    "turnip_salad": "none",

    # Soups - all use pot
    "asparagus_soup": "pot",
    "corn_soup": "pot",
    "egg_drop_soup": "pot",
    "gazpacho_soup": "pot",
    "herb_soup": "pot",
    "miso_soup": "pot",
    "onion_soup": "pot",
    "pumpkin_soup": "pot",
    "radish_soup": "pot",
    "vichyssoise_soup": "pot",

    # Sides - mixed
    "babaocai": "frying_pan",
    "baguettes": "seasoning_set",
    "baked_sweet_potato": "seasoning_set",
    "boiled_egg": "pot",
    "bread": "seasoning_set",
    "broccoli_and_garlic_saute": "frying_pan",
    "buttered_potato": "frying_pan",
    "buttered_roll": "seasoning_set",
    "cheese_bun": "seasoning_set",
    "cheese_croquettes": "frying_pan",
    "chili_con_carne": "pot",
    "chilled_tofu": "none",
    "cooked_rice": "pot",
    "corn_flakes_cereal": "frying_pan",
    "cream_croquettes": "frying_pan",
    "croquettes": "frying_pan",
    "curry_bun": "seasoning_set",
    "fish_and_chips": "frying_pan",
    "fish_cake": "pot",
    "focaccia_bread": "seasoning_set",
    "freeze_dried_tofu": "pot",
    "french_fries": "frying_pan",
    "french_toast": "frying_pan",
    "fried_egg": "frying_pan",
    "fried_mushrooms": "frying_pan",
    "fried_tofu": "frying_pan",
    "galette": "frying_pan",
    "grilled_corn": "frying_pan",
    "gyoza": "frying_pan",
    "hash_browns": "frying_pan",
    "khachapuri": "seasoning_set",
    "lightly_fried_tofu": "frying_pan",
    "miso_glazed_eggplant": "frying_pan",
    "morel_cream_stew": "pot",
    "poached_egg": "pot",
    "popcorn": "frying_pan",
    "potato_pancakes": "frying_pan",
    "quiche": "seasoning_set",
    "rolled_egg": "frying_pan",
    "sashimi": "none",
    "sauteed_cauliflower": "frying_pan",
    "sauteed_turnips": "frying_pan",
    "scones": "seasoning_set",
    "shumai_dumplings": "pot",
    "soy_okara": "pot",
    "spring_rolls": "frying_pan",
    "steamed_bun": "pot",
    "steamed_egg_custard": "pot",
    "steamed_muffin": "pot",
    "stew": "pot",
    "stir_fried_vegetables": "frying_pan",
    "stuffed_cabbage": "pot",
    "toast": "seasoning_set",
    "tofu": "pot",
    "tofu_skin": "pot",
    "white_bread": "seasoning_set",

    # Main Dishes
    "boiled_tofu": "pot",
    "bok_choy_soy_cream_stew": "pot",
    "bouillabaisse": "pot",
    "burgundy_fondue": "pot",
    "carpaccio": "none",
    "cheese_fondue": "pot",
    "chestnut_rice": "pot",
    "chirashi_sushi": "none",
    "curry_bread": "frying_pan",
    "curry_rice": "pot",
    "donburi_rice_bowl": "pot",
    "dry_curry": "pot",
    "egg_over_rice": "pot",
    "farmers_breakfast": "frying_pan",
    "fried_eggplant": "frying_pan",
    "fried_matsutake_mushrooms": "frying_pan",
    "fried_onigiri": "frying_pan",
    "fried_rice": "frying_pan",
    "fried_rice_noodles": "frying_pan",
    "fried_udon": "frying_pan",
    "fruit_sandwich": "none",
    "gratin": "pot",
    "grilled_fish": "frying_pan",
    "herb_bread": "seasoning_set",
    "herb_pasta": "pot",
    "herb_rice_porridge": "pot",
    "herb_sandwich": "none",
    "hot_pot": "pot",
    "inari_sushi": "none",
    "jam_filled_bun": "seasoning_set",
    "macaroni_and_cheese": "pot",
    "marinated_fish": "none",
    "matsutake_rice": "pot",
    "meuniere_fish": "frying_pan",
    "milk_curry": "pot",
    "milk_hot_pot": "pot",
    "milk_rice_porridge": "pot",
    "mushroom_pasta": "pot",
    "mushroom_polenta": "pot",
    "mushroom_rice": "pot",
    "okonomiyaki": "frying_pan",
    "omelet": "frying_pan",
    "omelet_rice": "frying_pan",
    "onigiri": "none",
    "paella": "frying_pan",
    "pasta": "pot",
    "pasta_salad": "pot",
    "penne_pasta": "pot",
    "pink_fondue": "pot",
    "pizza": "seasoning_set",
    "pizzoccheri": "pot",
    "raclette_cheese": "pot",
    "rainbow_curry": "pot",
    "raisin_bread": "seasoning_set",
    "rice_and_mixed_vegetables": "pot",
    "rice_gratin": "pot",
    "rice_porridge": "pot",
    "risotto": "pot",
    "sandwich": "none",
    "seaweed_curry": "pot",
    "simmered_fish": "pot",
    "spaghetti_peperoncino": "pot",
    "spaghetti_soup": "pot",
    "spicy_curry": "pot",
    "steamed_mushrooms": "pot",
    "supreme_curry": "seasoning_set",
    "sushi": "none",
    "tempura": "frying_pan",
    "tempura_rice_bowl": "pot",
    "tempura_soba": "pot",
    "tempura_udon": "pot",
    "tofu_steak": "frying_pan",
    "tomato_fondue": "pot",
    "udon": "pot",
    "ukha": "pot",
    "ultimate_curry": "seasoning_set",
    "unadon": "pot",
    "vegetable_curry": "pot",
    "yakisoba": "frying_pan",
    "zaru_soba": "pot",

    # Desserts
    "apple_pie": "frying_pan",
    "baked_apple": "seasoning_set",
    "baumkuchen": "frying_pan",
    "blueberry_pie": "frying_pan",
    "cake": "frying_pan",
    "castella": "frying_pan",
    "cheesecake": "frying_pan",
    "cherry_pie": "frying_pan",
    "chestnut_paste": "pot",
    "chocolate_cake": "frying_pan",
    "chocolate_cookies": "seasoning_set",
    "chocolate_fondue": "pot",
    "chocolate_covered_banana": "none",
    "churros": "frying_pan",
    "cookies": "seasoning_set",
    "dango": "pot",
    "donuts": "frying_pan",
    "egg_tart": "frying_pan",
    "engadiner_nusstorte": "frying_pan",
    "fruit_dumplings": "pot",
    "herb_cookies": "seasoning_set",
    "honey_cake": "frying_pan",
    "ice_cream": "seasoning_set",
    "mont_blanc_cake": "frying_pan",
    "pancakes": "frying_pan",
    "pineapple_pie": "frying_pan",
    "pudding": "pot",
    "pumpkin_pudding": "pot",
    "rueblitorte": "frying_pan",
    "soy_milk_pudding": "pot",
    "steamed_cake": "pot",
    "strawberry_mochi": "none",
    "strawberry_pie": "frying_pan",
    "sweet_potato_cakes": "pot",
    "toasted_mochi": "frying_pan",
    "trifle": "seasoning_set",
    "walnut_cookies": "seasoning_set",
    "whole_cake": "seasoning_set",
    "whole_cheesecake": "seasoning_set",
    "whole_chocolate_cake": "seasoning_set",
    "wrapped_rice_cakes": "pot",

    # Other (drinks, jams, etc.)
    "apple_jam": "pot",
    "apple_juice": "none",
    "apple_tea": "pot",
    "autumn_blend_tea": "pot",
    "autumn_juice": "none",
    "banana_juice": "none",
    "banana_tea": "pot",
    "black_tea": "pot",
    "blueberry_jam": "pot",
    "blueberry_juice": "none",
    "blueberry_tea": "pot",
    "cafe_au_lait": "pot",
    "cappuccino": "pot",
    "chamomile_tea": "pot",
    "cherry_juice": "none",
    "cherry_tea": "pot",
    "chestnut_juice": "none",
    "fruit_juice": "none",
    "golden_blend_tea": "seasoning_set",
    "grape_jam": "pot",
    "grape_juice": "none",
    "green_grape_tea": "pot",
    "green_tea": "pot",
    "happy_chef_salad": "none",
    "happy_forest_mix": "none",
    "happy_fruit_platter": "none",
    "happy_mushroom_fry": "frying_pan",
    "honey_juice": "none",
    "hot_coffee": "pot",
    "jam_tea": "pot",
    "lavender_tea": "pot",
    "lemon_juice": "none",
    "lemon_tea": "pot",
    "mango_juice": "none",
    "mango_tea": "pot",
    "matcha_tea": "pot",
    "melon_juice": "none",
    "melon_tea": "pot",
    "milk_tea": "pot",
    "mint_tea": "pot",
    "olive_tea": "pot",
    "oolong_tea": "pot",
    "orange_juice": "none",
    "orange_tea": "pot",
    "peach_juice": "none",
    "peach_tea": "pot",
    "pineapple_juice": "none",
    "pineapple_tea": "pot",
    "puer_tea": "pot",
    "red_grape_tea": "pot",
    "royal_milk_tea": "seasoning_set",
    "sencha_tea": "pot",
    "simmered_seaweed": "pot",
    "soy_milk": "pot",
    "specialty_juice": "seasoning_set",
    "spring_blend_tea": "pot",
    "spring_juice": "none",
    "strawberry_jam": "pot",
    "strawberry_juice": "none",
    "strawberry_tea": "pot",
    "summer_blend_tea": "pot",
    "summer_juice": "none",
    "tomato_juice": "none",
    "walnut_juice": "none",
    "warm_milk": "pot",
    "watermelon_juice": "none",
    "watermelon_tea": "pot",
}

def to_id(name: str) -> str:
    """Convert recipe name to ID format."""
    # Handle special characters
    name = name.replace("&", "and")
    name = name.replace("'", "")
    name = name.replace("é", "e")
    name = name.replace("ü", "u")
    # Convert to snake_case
    id_str = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    return id_str


def parse_ingredient_name(name: str) -> str:
    """Convert an ingredient name to ID, handling + suffix for quality."""
    name = name.strip()
    if name.endswith('+'):
        # Handle quality suffix like "Cheese+" -> "cheese_plus"
        base_name = name[:-1].strip()
        return to_id(base_name) + "_plus"
    return to_id(name)


def parse_ingredients(ingredients_text: str) -> List[Dict[str, Any]]:
    """Parse ingredient text into structured format."""
    ingredients = []

    # Split by comma first, then handle complex cases
    parts = [p.strip() for p in ingredients_text.split(',')]

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Check for (×2) or similar count notation first
        count = 1
        if '(×' in part or '(x' in part.lower():
            match = re.search(r'\(×?x?(\d+)\)', part, re.IGNORECASE)
            count = int(match.group(1)) if match else 1
            part = re.sub(r'\s*\(×?x?\d+\)', '', part, flags=re.IGNORECASE).strip()

        # Check for alternatives with "/"
        if '/' in part:
            options = [parse_ingredient_name(opt) for opt in part.split('/')]
            # Remove duplicates while preserving order
            seen = set()
            unique_options = []
            for opt in options:
                if opt not in seen:
                    seen.add(opt)
                    unique_options.append(opt)

            ing = {
                "id": "choice",
                "required": True,
                "oneOf": unique_options
            }
            if count > 1:
                ing["count"] = count
            ingredients.append(ing)
        # Check for standalone quality requirement (+) - only if not part of alternatives
        elif part.endswith('+'):
            base_name = part[:-1].strip()
            ing = {
                "id": to_id(base_name) + "_plus",
                "required": True,
                "plusQuality": True
            }
            if count > 1:
                ing["count"] = count
            ingredients.append(ing)
        else:
            ing = {
                "id": to_id(part),
                "required": True
            }
            if count > 1:
                ing["count"] = count
            ingredients.append(ing)

    return ingredients


def get_utensil(recipe_id: str, category: str) -> str:
    """Determine utensil for a recipe."""
    if recipe_id in UTENSIL_OVERRIDES:
        return UTENSIL_OVERRIDES[recipe_id]
    return UTENSIL_RULES.get(category, "none")


# Complete recipe data from StratsWiki
COMPLETE_RECIPES = [
    # ============ SALADS (12) ============
    {"name": "Caprese Salad", "category": "salad", "ingredients": "Tomato, Cheese/Cheese+/Herb Cheese, Olive Oil, Salt", "price": 2429, "effect": "watering_rare_crop", "effect_level": 4, "unlock": "Avant-Garde Crops request from Erik"},
    {"name": "Guacamole Salad", "category": "salad", "ingredients": "Avocado, Onion, Tomato, Salt", "price": 1309, "effect": "stamina_saver", "effect_level": 3, "unlock": "Plower title, Nadine's Bistro"},
    {"name": "Herb Salad", "category": "salad", "ingredients": "Mint/Chamomile/Lavender (×2)", "price": 137, "effect": "stamina_saver", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Kinpira Gobo", "category": "salad", "ingredients": "Burdock, Carrot, Chili Pepper", "price": 909, "effect": "stamina_saver", "effect_level": 3, "unlock": "Clara's Diner"},
    {"name": "Macaroni Salad", "category": "salad", "ingredients": "Pasta, Cucumber, Mayonnaise/Mayonnaise+/Herb Mayonnaise, Carrot", "price": 1859, "effect": "stamina_saver", "effect_level": 4, "unlock": "Nadine's Bistro"},
    {"name": "Marinated Peppers", "category": "salad", "ingredients": "Red Bell Pepper, Vinegar, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 598, "effect": "stamina_saver", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Mashed Potatoes", "category": "salad", "ingredients": "Potato, Butter/Butter+/Herb Butter", "price": 677, "effect": "watering_rare_crop", "effect_level": 2, "unlock": "Café Madeleine"},
    {"name": "Mixed Salad", "category": "salad", "ingredients": "Tomato, Cucumber, Cucumber/Onion/Asparagus/Tomato/Red Bell Pepper/Carrot/Turnip/Sweet Potato/Pumpkin/Eggplant", "price": 404, "effect": "stamina_saver", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Onion Salad", "category": "salad", "ingredients": "Onion", "price": 325, "effect": "watering_rare_crop", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Poke", "category": "salad", "ingredients": "Avocado, Salmon, Soy Sauce", "price": 1197, "effect": "watering_rare_crop", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Turnip Salad", "category": "salad", "ingredients": "Turnip", "price": 260, "effect": "stamina_saver", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Tomato Salad", "category": "salad", "ingredients": "Tomato, Mint/Chamomile/Lavender", "price": 126, "effect": "stamina_saver", "effect_level": 1, "unlock": "Mini Madeleine's"},

    # ============ SOUPS (10) ============
    {"name": "Asparagus Soup", "category": "soup", "ingredients": "Asparagus, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Onion", "price": 1728, "effect": "rod_durability_up", "effect_level": 4, "unlock": "Clara's Diner"},
    {"name": "Corn Soup", "category": "soup", "ingredients": "Corn, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Butter/Butter+/Herb Butter, Onion", "price": 1815, "effect": "run_speed_up", "effect_level": 4, "unlock": "Mini Madeleine's"},
    {"name": "Egg Drop Soup", "category": "soup", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 117, "effect": "run_speed_up", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Gazpacho Soup", "category": "soup", "ingredients": "Tomato, Garlic, Bread/White Bread/Baguettes/Focaccia Bread", "price": 490, "effect": "run_speed_up", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Herb Soup", "category": "soup", "ingredients": "Mint/Chamomile/Lavender (×2)", "price": 137, "effect": "run_speed_up", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Miso Soup", "category": "soup", "ingredients": "Miso, Tofu/Green Onion/Fried Tofu/Potato/Shimeji Mushroom", "price": 260, "effect": "rod_durability_up", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Onion Soup", "category": "soup", "ingredients": "Onion, Butter/Butter+/Herb Butter", "price": 1024, "effect": "rod_durability_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Pumpkin Soup", "category": "soup", "ingredients": "Pumpkin, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Onion", "price": 1320, "effect": "run_speed_up", "effect_level": 3, "unlock": "Clara's Calamity request from Clara"},
    {"name": "Radish Soup", "category": "soup", "ingredients": "Radish, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Salt", "price": 770, "effect": "rod_durability_up", "effect_level": 2, "unlock": "Pantry Patron request from Mina"},
    {"name": "Vichyssoise Soup", "category": "soup", "ingredients": "Potato, Onion, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 709, "effect": "run_speed_up", "effect_level": 2, "unlock": "Nadine's Bistro"},

    # ============ SIDES (56) ============
    {"name": "Babaocai", "category": "side", "ingredients": "Napa Cabbage, Carrot, Green Bell Pepper, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom", "price": 1509, "effect": "watering_rare_crop", "effect_level": 3, "unlock": "Hydrator title, Nadine's Bistro"},
    {"name": "Baguettes", "category": "side", "ingredients": "Wheat Flour, Salt", "price": 662, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Baked Sweet Potato", "category": "side", "ingredients": "Sweet Potato", "price": 202, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Felix's Fixings (Autumn)"},
    {"name": "Boiled Egg", "category": "side", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 117, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Bread", "category": "side", "ingredients": "Wheat Flour", "price": 195, "effect": None, "effect_level": None, "unlock": "Café Madeleine, Mini Madeleine's, Nadine's Bistro, Clara's Diner"},
    {"name": "Broccoli & Garlic Sauté", "category": "side", "ingredients": "Broccoli, Garlic, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 563, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Buttered Potato", "category": "side", "ingredients": "Potato, Butter/Butter+/Herb Butter", "price": 677, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Count on Coach! request from Freya"},
    {"name": "Buttered Roll", "category": "side", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter", "price": 1056, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Café Madeleine"},
    {"name": "Cheese Bun", "category": "side", "ingredients": "Wheat Flour, Cheese/Cheese+/Herb Cheese, Buffalo Milk", "price": 1320, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Cheese Croquettes", "category": "side", "ingredients": "Potato, Breadcrumbs/White Breadcrumbs, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Cheese/Cheese+/Herb Cheese", "price": 1844, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Nadine's Bistro"},
    {"name": "Chili con Carne", "category": "side", "ingredients": "Tomato, Soybean, Chili Pepper, Pepper", "price": 911, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Chilled Tofu", "category": "side", "ingredients": "Tofu, Soy Sauce", "price": 458, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Cooked Rice", "category": "side", "ingredients": "Rice", "price": 91, "effect": None, "effect_level": None, "unlock": "Café Madeleine, Mini Madeleine's, Nadine's Bistro, Clara's Diner"},
    {"name": "Corn Flakes Cereal", "category": "side", "ingredients": "Corn, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 403, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Cream Croquettes", "category": "side", "ingredients": "Potato, Breadcrumbs/White Breadcrumbs, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 1098, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Croquettes", "category": "side", "ingredients": "Potato, Breadcrumbs/White Breadcrumbs, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 709, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Curry Bun", "category": "side", "ingredients": "Wheat Flour, Curry Powder, Onion, Carrot", "price": 1920, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Clara's Diner"},
    {"name": "Fish & Chips", "category": "side", "ingredients": "Yellow Perch/Snakehead/Masu Trout/Char/Salmon/Icefish/Cherry Salmon, Potato, Wheat Flour/Rice Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1584, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Fish Cake", "category": "side", "ingredients": "Amur Minnow/Dace/Pale Chub/Sculpin/Dark Chub/Bitterling/Tamoroko/Rainbow Trout/Silver Carp/Basa", "price": 195, "effect": "rod_durability_up", "effect_level": 1, "unlock": "Bottled Nuts Wanted request from Nadine"},
    {"name": "Focaccia Bread", "category": "side", "ingredients": "Wheat Flour, Olive Oil", "price": 843, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Bookshelves in Lloyd's House"},
    {"name": "Freeze-Dried Tofu", "category": "side", "ingredients": "Tofu, Soy Sauce, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 824, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "French Fries", "category": "side", "ingredients": "Potato, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 355, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "French Toast", "category": "side", "ingredients": "Bread/White Bread, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 647, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Fried Egg", "category": "side", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 396, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Fried Mushrooms", "category": "side", "ingredients": "Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom", "price": 195, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Felix's Fixings (Autumn)"},
    {"name": "Fried Tofu", "category": "side", "ingredients": "Tofu", "price": 267, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Galette", "category": "side", "ingredients": "Buckwheat Flour, Potato, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1122, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Grilled Corn", "category": "side", "ingredients": "Corn, Soy Sauce, Sugar", "price": 886, "effect": "watering_rare_crop", "effect_level": 2, "unlock": "Felix's Fixings (Summer)"},
    {"name": "Gyoza", "category": "side", "ingredients": "Wheat Flour, Cabbage, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1353, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Clara's Diner"},
    {"name": "Hash Browns", "category": "side", "ingredients": "Potato, Wheat Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 632, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Khachapuri", "category": "side", "ingredients": "Wheat Flour, Cheese+, Yogurt+, Butter+", "price": 10098, "effect": "double_forage", "effect_level": 1, "unlock": "A Homemade Meal request from Samir"},
    {"name": "Lightly Fried Tofu", "category": "side", "ingredients": "Tofu, Wheat Flour/Rice Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 809, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Miso Glazed Eggplant", "category": "side", "ingredients": "Eggplant, Miso", "price": 246, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Morel Cream Stew", "category": "side", "ingredients": "Morel Mushroom, Buffalo Milk, Butter/Butter+/Herb Butter, Urchin", "price": 2592, "effect": "max_stamina_up", "effect_level": 4, "unlock": "Nadine's Bistro"},
    {"name": "Poached Egg", "category": "side", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Soy Sauce", "price": 301, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Popcorn", "category": "side", "ingredients": "Corn, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 508, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Neighborly title, Mini Madeleine's"},
    {"name": "Potato Pancakes", "category": "side", "ingredients": "Potato, Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 429, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Quiche", "category": "side", "ingredients": "Wheat Flour, Spinach, Pumpkin, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom", "price": 1892, "effect": "max_stamina_up", "effect_level": 4, "unlock": "Main Mushroom request from Mina"},
    {"name": "Rolled Egg", "category": "side", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Soy Sauce, Sugar", "price": 801, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Sashimi", "category": "side", "ingredients": "Amur Minnow/Dace/Pale Chub/Sculpin/Dark Chub/Bitterling/Tamoroko/Rainbow Trout/Silver Carp/Basa", "price": 195, "effect": "rod_durability_up", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Sautéed Cauliflower", "category": "side", "ingredients": "Cauliflower", "price": 602, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Sautéed Turnips", "category": "side", "ingredients": "Turnip, Butter/Butter+/Herb Butter", "price": 882, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Café Madeleine"},
    {"name": "Scones", "category": "side", "ingredients": "Wheat Flour, Butter/Butter+/Herb Butter, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 1155, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Café Madeleine"},
    {"name": "Shumai Dumplings", "category": "side", "ingredients": "Wheat Flour, Onion, Bluegill/Willow Shiner/Killifish/Stone Moroko/Pond Smelt/Sweetfish/Eel/Marbled Eel/Goldfish/Crucian Carp", "price": 924, "effect": "rod_durability_up", "effect_level": 2, "unlock": "Reeling in a Meal request from Sonia"},
    {"name": "Soy Okara", "category": "side", "ingredients": "Tofu, Carrot", "price": 743, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Spring Rolls", "category": "side", "ingredients": "Wheat Flour, Shiitake Mushroom, Carrot, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1530, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Clara's Diner"},
    {"name": "Steamed Bun", "category": "side", "ingredients": "Wheat Flour, Napa Cabbage, Shiitake Mushroom, Green Onion", "price": 1377, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Steamed Egg Custard", "category": "side", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Shiitake Mushroom, Fish Cake", "price": 747, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Steamed Muffin", "category": "side", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Sweet Potato", "price": 609, "effect": "max_stamina_up", "effect_level": 2, "unlock": "Bug Collector title, Generous Bug Catcher title, Clara's Diner"},
    {"name": "Stew", "category": "side", "ingredients": "Wheat Flour, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Potato/Asparagus/Carrot/Cabbage/Turnip/Cauliflower", "price": 770, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Stir-Fried Vegetables", "category": "side", "ingredients": "Cabbage, Napa Cabbage", "price": 1276, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Clara's Diner"},
    {"name": "Stuffed Cabbage", "category": "side", "ingredients": "Cabbage, Carrot", "price": 1213, "effect": "max_stamina_up", "effect_level": 3, "unlock": "Famed Foodie request from Madeleine"},
    {"name": "Toast", "category": "side", "ingredients": "Bread/White Bread", "price": 234, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Bookshelves in June's House"},
    {"name": "Tofu", "category": "side", "ingredients": "Soybean, Soy Milk", "price": 205, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Tofu Skin", "category": "side", "ingredients": "Soy Milk", "price": 111, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "White Bread", "category": "side", "ingredients": "Rice Flour", "price": 182, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},

    # ============ MAIN DISHES (80) ============
    {"name": "Boiled Tofu", "category": "main_dish", "ingredients": "Tofu, Napa Cabbage, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom", "price": 1147, "effect": None, "effect_level": None, "unlock": "High Quality's the Way to Go! request from Derek"},
    {"name": "Bok Choy Soy Cream Stew", "category": "main_dish", "ingredients": "Bok Choy, Soy Milk, Butter/Butter+/Herb Butter", "price": 1131, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Bouillabaisse", "category": "main_dish", "ingredients": "Tomato, Grayling/Bighead Carp/Nile Perch/Barbel Steed/Three-Lips Carp/Brown Trout/Black Bass/Mugitsuku, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 835, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Burgundy Fondue", "category": "main_dish", "ingredients": "Olive Oil, Bread/White Bread/Baguettes/Focaccia Bread, Broccoli/Potato/Asparagus/Red Bell Pepper/Carrot/Common Mushroom/Pumpkin", "price": 1325, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Carpaccio", "category": "main_dish", "ingredients": "Yellow Perch/Snakehead/Masu Trout/Char/Salmon/Icefish/Cherry Salmon, Onion, Vinegar", "price": 1469, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Cheese Fondue", "category": "main_dish", "ingredients": "Cheese/Cheese+/Herb Cheese, Bread/White Bread/Baguettes/Focaccia Bread, Broccoli/Potato/Asparagus/Red Bell Pepper/Carrot/Common Mushroom/Pumpkin", "price": 1452, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Chestnut Rice", "category": "main_dish", "ingredients": "Cooked Rice, Chestnut", "price": 329, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Chirashi Sushi", "category": "main_dish", "ingredients": "Sashimi, Cooked Rice, Vinegar, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 867, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Curry Bread", "category": "main_dish", "ingredients": "Wheat Flour, Curry Powder, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1073, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Curry Rice", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Potato/Carrot/Onion", "price": 911, "effect": None, "effect_level": None, "unlock": "Clara's Diner, Flex it out! mail from Felix"},
    {"name": "Donburi Rice Bowl", "category": "main_dish", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Onion, Cooked Rice", "price": 664, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Dry Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Tomato, Soybean", "price": 837, "effect": None, "effect_level": None, "unlock": "Fine Dining request from Erik"},
    {"name": "Egg Over Rice", "category": "main_dish", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Cooked Rice", "price": 248, "effect": None, "effect_level": None, "unlock": "Available at start"},
    {"name": "Farmer's Breakfast", "category": "main_dish", "ingredients": "Potato, Onion, Cheese+, Mayonnaise+", "price": 6957, "effect": None, "effect_level": None, "unlock": "Celebrated Cuisine request from Madeleine"},
    {"name": "Fried Eggplant", "category": "main_dish", "ingredients": "Eggplant, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 342, "effect": None, "effect_level": None, "unlock": "Felix's Fixings (except Winter)"},
    {"name": "Fried Matsutake Mushrooms", "category": "main_dish", "ingredients": "Matsutake Mushroom", "price": 1200, "effect": None, "effect_level": None, "unlock": "Felix's Fixings (Autumn)"},
    {"name": "Fried Onigiri", "category": "main_dish", "ingredients": "Onigiri, Soy Sauce", "price": 735, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Fried Rice", "category": "main_dish", "ingredients": "Cooked Rice, Egg/Egg+/Silkie Egg/Silkie Egg+, Onion, Carrot", "price": 1316, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Fried Rice Noodles", "category": "main_dish", "ingredients": "Rice Flour, Monarch Mushroom, Cabbage, Carrot", "price": 7508, "effect": None, "effect_level": None, "unlock": "Remarkable Mushrooms request from Nadine"},
    {"name": "Fried Udon", "category": "main_dish", "ingredients": "Wheat Flour, Cabbage, Green Bell Pepper, Soy Sauce", "price": 1437, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Fruit Sandwich", "category": "main_dish", "ingredients": "Bread/White Bread/Baguettes/Focaccia Bread, Cherry/Blueberry/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon (×2)", "price": 647, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Gratin", "category": "main_dish", "ingredients": "Wheat Flour, Cheese/Cheese+/Herb Cheese, Mayonnaise/Mayonnaise+/Herb Mayonnaise", "price": 1568, "effect": None, "effect_level": None, "unlock": "Milk Par Excellence request from Nadine"},
    {"name": "Grilled Fish", "category": "main_dish", "ingredients": "Amur Minnow/Dace/Pale Chub/Sculpin/Dark Chub/Bitterling/Tamoroko/Rainbow Trout/Silver Carp/Basa", "price": 195, "effect": None, "effect_level": None, "unlock": "Available at start"},
    {"name": "Herb Bread", "category": "main_dish", "ingredients": "Wheat Flour, Herb Butter", "price": 1182, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Herb Pasta", "category": "main_dish", "ingredients": "Wheat Flour, Mint/Chamomile/Lavender, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 616, "effect": None, "effect_level": None, "unlock": "Bookshelves in Jules' and Derek's House"},
    {"name": "Herb Rice Porridge", "category": "main_dish", "ingredients": "Rice, Salt, Mint/Chamomile/Lavender", "price": 647, "effect": None, "effect_level": None, "unlock": "Some Herbs, Please? request from Sophie"},
    {"name": "Herb Sandwich", "category": "main_dish", "ingredients": "Bread/White Bread/Baguettes/Focaccia Bread, Mint/Chamomile/Lavender, Mayonnaise/Mayonnaise+/Herb Mayonnaise", "price": 817, "effect": None, "effect_level": None, "unlock": "Secret Ingredient request from Mina"},
    {"name": "Hot Pot", "category": "main_dish", "ingredients": "Daikon Radish, Napa Cabbage, Green Onion, Nile Perch/Salmon/Masu Trout/Cherry Salmon/Brown Trout/Yellow Perch/Sweetfish", "price": 2487, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Inari Sushi", "category": "main_dish", "ingredients": "Cooked Rice, Fried Tofu, Vinegar, Sugar", "price": 1437, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Jam-Filled Bun", "category": "main_dish", "ingredients": "Wheat Flour, Apple Jam/Strawberry Jam/Grape Jam/Blueberry Jam", "price": 1339, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Macaroni & Cheese", "category": "main_dish", "ingredients": "Wheat Flour, Cheese/Cheese+/Herb Cheese, Butter/Butter+/Herb Butter, Mayonnaise/Mayonnaise+/Herb Mayonnaise", "price": 2592, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Marinated Fish", "category": "main_dish", "ingredients": "Nile Perch/Salmon/Masu Trout/Cherry Salmon/Brown Trout/Yellow Perch/Sweetfish, Onion, Vinegar, Lemon", "price": 2160, "effect": None, "effect_level": None, "unlock": "Mood Improver request from Mina"},
    {"name": "Matsutake Rice", "category": "main_dish", "ingredients": "Rice, Matsutake Mushroom, Soy Sauce", "price": 1760, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Meuniere Fish", "category": "main_dish", "ingredients": "Grayling/Bighead Carp/Nile Perch/Barbel Steed/Three-Lips Carp/Brown Trout/Black Bass/Mugitsuku, Wheat Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1073, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Milk Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Potato/Carrot/Onion", "price": 1334, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Milk Hot Pot", "category": "main_dish", "ingredients": "Milk+, Carrot, Napa Cabbage, Spinach", "price": 2640, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Milk Rice Porridge", "category": "main_dish", "ingredients": "Rice, Salt, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 801, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Mushroom Pasta", "category": "main_dish", "ingredients": "Pasta, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom, Butter/Butter+/Herb Butter", "price": 1449, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Mushroom Polenta", "category": "main_dish", "ingredients": "Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom, Corn, Butter/Butter+/Herb Butter, Cheese/Cheese+/Herb Cheese", "price": 2295, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Mushroom Rice", "category": "main_dish", "ingredients": "Rice, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom (×3)", "price": 874, "effect": None, "effect_level": None, "unlock": "Sharpen Those Skills request from Madeleine"},
    {"name": "Okonomiyaki", "category": "main_dish", "ingredients": "Wheat Flour, Cabbage, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 1172, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Omelet", "category": "main_dish", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter", "price": 721, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Omelet Rice", "category": "main_dish", "ingredients": "Omelet, Cooked Rice", "price": 1410, "effect": None, "effect_level": None, "unlock": "Bookshelves in Gabriel's House"},
    {"name": "Onigiri", "category": "main_dish", "ingredients": "Cooked Rice, Seaweed", "price": 370, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Paella", "category": "main_dish", "ingredients": "Cooked Rice, Grayling/Bighead Carp/Nile Perch/Barbel Steed/Three-Lips Carp/Brown Trout/Black Bass/Mugitsuku, Red Bell Pepper, Spice", "price": 1151, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Pasta", "category": "main_dish", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 328, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Pasta Salad", "category": "main_dish", "ingredients": "Pasta, Mixed Salad, Mayonnaise/Mayonnaise+/Herb Mayonnaise", "price": 1817, "effect": None, "effect_level": None, "unlock": "A Selfish Request request from Jules"},
    {"name": "Penne Pasta", "category": "main_dish", "ingredients": "Wheat Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Tomato", "price": 604, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Pink Fondue", "category": "main_dish", "ingredients": "Grape Juice, Bread/Baguettes/White Bread/Focaccia Bread, Broccoli/Potato/Asparagus/Red Bell Pepper/Carrot/Common Mushroom/Pumpkin", "price": 937, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Pizza", "category": "main_dish", "ingredients": "Wheat Flour, Tomato, Cheese/Cheese+/Herb Cheese", "price": 1142, "effect": None, "effect_level": None, "unlock": "Face of Zephyr Town title, Nadine's Bistro"},
    {"name": "Pizzoccheri", "category": "main_dish", "ingredients": "Buckwheat Flour, Cheese/Cheese+/Herb Cheese, Cabbage, Potato", "price": 2784, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Raclette Cheese", "category": "main_dish", "ingredients": "Cheese/Cheese+/Herb Cheese, Corn, Carrot, Broccoli", "price": 1901, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Rainbow Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Spinach, Red Bell Pepper", "price": 1304, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Raisin Bread", "category": "main_dish", "ingredients": "Wheat Flour, Red Grapes", "price": 444, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Rice & Mixed Vegetables", "category": "main_dish", "ingredients": "Rice, Fried Tofu, Carrot", "price": 1052, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Rice Gratin", "category": "main_dish", "ingredients": "Rice, Cheese/Cheese+/Herb Cheese, Buffalo Milk", "price": 1188, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Rice Porridge", "category": "main_dish", "ingredients": "Rice, Salt", "price": 544, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Risotto", "category": "main_dish", "ingredients": "Rice, Cheese/Cheese+/Herb Cheese, Tomato, Onion", "price": 1552, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Sandwich", "category": "main_dish", "ingredients": "Bread/White Bread/Baguettes/Focaccia Bread, Tomato, Cucumber", "price": 375, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Seaweed Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Seaweed, Potato/Carrot/Onion", "price": 1388, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Simmered Fish", "category": "main_dish", "ingredients": "Bluegill/Willow Shiner/Killifish/Stone Moroko/Pond Smelt/Sweetfish/Eel/Marbled Eel/Goldfish/Crucian Carp, Soy Sauce", "price": 451, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Spaghetti Peperoncino", "category": "main_dish", "ingredients": "Pasta, Chili Pepper, Garlic, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1410, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Spaghetti Soup", "category": "main_dish", "ingredients": "Pasta, Tomato, Grayling/Bighead Carp/Nile Perch/Barbel Steed/Three-Lips Carp/Brown Trout/Black Bass/Mugitsuku, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1568, "effect": None, "effect_level": None, "unlock": "Café Madeleine"},
    {"name": "Spicy Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Spice, Potato/Carrot/Onion", "price": 1424, "effect": None, "effect_level": None, "unlock": "Fondue Fancy! request from Sophie"},
    {"name": "Steamed Mushrooms", "category": "main_dish", "ingredients": "Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom, Butter/Butter+/Herb Butter", "price": 809, "effect": None, "effect_level": None, "unlock": "Heartening Mushrooms request from Clara"},
    {"name": "Supreme Curry", "category": "main_dish", "ingredients": "Curry Rice, Star Potato, Three-Forked Carrot", "price": 3724, "effect": None, "effect_level": None, "unlock": "Out of the Extra-Ordinary request from Madeleine"},
    {"name": "Sushi", "category": "main_dish", "ingredients": "Sashimi, Cooked Rice, Vinegar", "price": 657, "effect": None, "effect_level": None, "unlock": "Let's get cooking! mail, Clara's Diner"},
    {"name": "Tempura", "category": "main_dish", "ingredients": "Wheat Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Egg/Egg+/Silkie Egg/Silkie Egg+, Shiitake Mushroom/Pumpkin/Eggplant/Sweet Potato/Icefish/Pond Smelt", "price": 1152, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Tempura Rice Bowl", "category": "main_dish", "ingredients": "Tempura, Cooked Rice", "price": 2089, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Tempura Soba", "category": "main_dish", "ingredients": "Buckwheat Flour, Tempura", "price": 2641, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Tempura Udon", "category": "main_dish", "ingredients": "Wheat Flour, Tempura", "price": 2188, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Tofu Steak", "category": "main_dish", "ingredients": "Tofu, Wheat Flour/Rice Flour, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 809, "effect": None, "effect_level": None, "unlock": "Mini Madeleine's"},
    {"name": "Tomato Fondue", "category": "main_dish", "ingredients": "Tomato, Bread/White Bread/Baguettes/Focaccia Bread, Broccoli/Potato/Asparagus/Red Bell Pepper/Carrot/Common Mushroom/Pumpkin", "price": 650, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Udon", "category": "main_dish", "ingredients": "Wheat Flour, Fish Cake, Green Onion", "price": 647, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Ukha", "category": "main_dish", "ingredients": "Nile Perch/Salmon/Masu Trout/Cherry Salmon/Brown Trout/Yellow Perch/Sweetfish, Carrot, Potato, Onion", "price": 2324, "effect": None, "effect_level": None, "unlock": "Nadine's Bistro"},
    {"name": "Ultimate Curry", "category": "main_dish", "ingredients": "Supreme Curry, Giant Tomato, Curled Chili Pepper, Yogurt+", "price": 12353, "effect": None, "effect_level": None, "unlock": "Win the Cook-Off! Festival"},
    {"name": "Unadon", "category": "main_dish", "ingredients": "Cooked Rice, Eel/Marbled Eel, Soy Sauce, Sugar", "price": 1262, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Vegetable Curry", "category": "main_dish", "ingredients": "Cooked Rice, Curry Powder, Cucumber/Onion/Asparagus/Tomato/Red Bell Pepper/Carrot/Turnip/Sweet Potato/Pumpkin/Eggplant", "price": 911, "effect": None, "effect_level": None, "unlock": "First-Class Curry request from Diana"},
    {"name": "Yakisoba", "category": "main_dish", "ingredients": "Wheat Flour, Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom, Cabbage", "price": 1271, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},
    {"name": "Zaru Soba", "category": "main_dish", "ingredients": "Buckwheat Flour, Wheat Flour", "price": 838, "effect": None, "effect_level": None, "unlock": "Clara's Diner"},

    # ============ DESSERTS (41) ============
    {"name": "Apple Pie", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter, Apple", "price": 1458, "effect": "petting_rare_item", "effect_level": 3, "unlock": "Calm Amongst Chaos request from Clara"},
    {"name": "Baked Apple", "category": "dessert", "ingredients": "Apple, Butter/Butter+/Herb Butter", "price": 838, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Felix's Fixings (Autumn)"},
    {"name": "Baumkuchen", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Sugar", "price": 1242, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "It's Gotta Be Yummy request from Laurie"},
    {"name": "Blueberry Pie", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter, Blueberry", "price": 1377, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 601, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Cheer Captain title, Nadine's Bistro, Everything changes! mail from Gabriel"},
    {"name": "Castella", "category": "dessert", "ingredients": "Wheat Flour, Silkie Egg/Silkie Egg+, Honey/Invigorating Honey/Mellow Honey/Royal Honey", "price": 801, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Cheesecake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Buffalo Milk/Buffalo Milk+, Cheese/Cheese+/Herb Cheese", "price": 1602, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Dairy Driver title, Nadine's Bistro"},
    {"name": "Cherry Pie", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter, Cherry", "price": 1404, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Making Something Special! request from Maple"},
    {"name": "Chestnut Paste", "category": "dessert", "ingredients": "Bottled Chestnuts", "price": 390, "effect": "petting_happiness_up", "effect_level": 1, "unlock": "Tempura Temptations request from Nadine"},
    {"name": "Chocolate Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Chocolate", "price": 1242, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Clara's Diner"},
    {"name": "Chocolate Cookies", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Chocolate", "price": 832, "effect": "petting_rare_item", "effect_level": 2, "unlock": "Clara's Diner"},
    {"name": "Chocolate Fondue", "category": "dessert", "ingredients": "Chocolate, Bread/White Bread/Baguettes/Focaccia Bread, Apple/Red Grapes/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon", "price": 924, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Chocolate-Covered Banana", "category": "dessert", "ingredients": "Banana, Chocolate", "price": 735, "effect": "petting_rare_item", "effect_level": 2, "unlock": "Café Madeleine"},
    {"name": "Churros", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil, Sugar", "price": 1332, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Scene Stealer title, Mini Madeleine's, A rare treat! mail from Maple"},
    {"name": "Cookies", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 328, "effect": "petting_rare_item", "effect_level": 1, "unlock": "Cheer Leader title, Café Madeleine"},
    {"name": "Dango", "category": "dessert", "ingredients": "Refined Rice Flour", "price": 588, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Café Madeleine"},
    {"name": "Donuts", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Sugar, Oil/Nut Oil/Herb Oil/Olive Oil/Grape Oil", "price": 1332, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Excellent Eggs request from Sylvia, Me and mom baked em! mail from Sylvia"},
    {"name": "Egg Tart", "category": "dessert", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Wheat Flour", "price": 601, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Milker title"},
    {"name": "Engadiner Nusstorte", "category": "dessert", "ingredients": "Wheat Flour, Silkie Egg/Silkie Egg+, Sugar, Walnut", "price": 1206, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Fruit Dumplings", "category": "dessert", "ingredients": "Refined Rice Flour, Cherry/Blueberry/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon (×2)", "price": 1089, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Herb Cookies", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Mint/Chamomile/Lavender", "price": 415, "effect": "petting_happiness_up", "effect_level": 1, "unlock": "Mini Madeleine's, A kind gesture mail from Diana"},
    {"name": "Honey Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Honey/Invigorating Honey/Mellow Honey/Royal Honey", "price": 755, "effect": "petting_rare_item", "effect_level": 2, "unlock": "First Honey Day"},
    {"name": "Ice Cream", "category": "dessert", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+, Egg/Egg+/Silkie Egg/Silkie Egg+, Sugar", "price": 832, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Bookshelves in June's House"},
    {"name": "Mont Blanc Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Bottled Chestnuts", "price": 1242, "effect": "petting_rare_item", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Pancakes", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Honey/Invigorating Honey/Mellow Honey/Royal Honey", "price": 1152, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Café Madeleine"},
    {"name": "Pineapple Pie", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter, Jewel Pineapple", "price": 3130, "effect": "petting_happiness_up", "effect_level": 4, "unlock": "Reward for giving high quality tea for the Tea Party Festival"},
    {"name": "Pudding", "category": "dessert", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+, Egg/Egg+/Silkie Egg/Silkie Egg+", "price": 328, "effect": "petting_rare_item", "effect_level": 1, "unlock": "Generous Forager title, Nadine's Bistro, Family seal of approval! mail from Felix"},
    {"name": "Pumpkin Pudding", "category": "dessert", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+, Egg/Egg+/Silkie Egg/Silkie Egg+, Pumpkin", "price": 986, "effect": "petting_rare_item", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Rüeblitorte", "category": "dessert", "ingredients": "Wheat Flour, Silkie Egg/Silkie Egg+, Three-Forked Carrot, Lemon", "price": 2506, "effect": "jump_distance_up", "effect_level": 1, "unlock": "It's Gotta Be PERFECT! request from Sylvia"},
    {"name": "Soy Milk Pudding", "category": "dessert", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+, Egg/Egg+/Silkie Egg/Silkie Egg+, Soy Milk", "price": 501, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Mini Madeleine's, Energies entwined mail from Kagetsu"},
    {"name": "Steamed Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Milk/Milk+/Buffalo Milk/Buffalo Milk+, Pumpkin", "price": 1422, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Strawberry Mochi", "category": "dessert", "ingredients": "Mochi, Strawberry", "price": 618, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Big Hops title, Clara's Diner, Hip ideas of the youth mail from Madeleine"},
    {"name": "Strawberry Pie", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Butter/Butter+/Herb Butter, Strawberry", "price": 1368, "effect": "petting_happiness_up", "effect_level": 3, "unlock": "Acrobat title, Café Madeleine"},
    {"name": "Sweet Potato Cakes", "category": "dessert", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+, Sugar, Sweet Potato", "price": 932, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Toasted Mochi", "category": "dessert", "ingredients": "Mochi", "price": 390, "effect": "petting_happiness_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Trifle", "category": "dessert", "ingredients": "Castella, Silkie Egg+, Yogurt+, Cherry/Blueberry/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon", "price": 6192, "effect": "petting_happiness_up", "effect_level": 4, "unlock": "The Gift of Gratitude request from Samir"},
    {"name": "Walnut Cookies", "category": "dessert", "ingredients": "Wheat Flour, Egg/Egg+/Silkie Egg/Silkie Egg+, Walnut", "price": 524, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Ivy's Friend title, Café Madeleine"},
    {"name": "Whole Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg+/Silkie Egg+, Milk+/Buffalo Milk+, Strawberry", "price": 1350, "effect": "petting_rare_item", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Whole Cheesecake", "category": "dessert", "ingredients": "Wheat Flour, Egg+/Silkie Egg+, Buffalo Milk+, Cheese/Cheese+/Herb Cheese", "price": 2746, "effect": "petting_rare_item", "effect_level": 4, "unlock": "Nadine's Bistro"},
    {"name": "Whole Chocolate Cake", "category": "dessert", "ingredients": "Wheat Flour, Egg+/Silkie Egg+, Milk+/Buffalo Milk+, Chocolate", "price": 1786, "effect": "petting_rare_item", "effect_level": 4, "unlock": "Win the Bake-Off! Festival"},
    {"name": "Wrapped Rice Cakes", "category": "dessert", "ingredients": "Mochi, Summer Tea Leaves", "price": 544, "effect": "petting_happiness_up", "effect_level": 2, "unlock": "Clara's Diner"},

    # ============ OTHER (67) ============
    {"name": "Apple Jam", "category": "other", "ingredients": "Apple, Sugar, Lemon", "price": 932, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Apple Juice", "category": "other", "ingredients": "Apple", "price": 221, "effect": "pet_training_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Apple Tea", "category": "other", "ingredients": "Apple Tea Tin", "price": 740, "effect": "pet_training_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Autumn Blend Tea", "category": "other", "ingredients": "Autumn Blend Tea Tin", "price": 1452, "effect": "pet_training_up", "effect_level": 3, "unlock": "Café Madeleine (Autumn Only)"},
    {"name": "Autumn Juice", "category": "other", "ingredients": "Blueberry Juice, Grape Juice, Apple Juice", "price": 1010, "effect": "pet_training_up", "effect_level": 3, "unlock": "Mini Madeleine's (Autumn Only)"},
    {"name": "Banana Juice", "category": "other", "ingredients": "Banana", "price": 260, "effect": "pet_training_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Banana Tea", "category": "other", "ingredients": "Banana Tea Tin", "price": 832, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Black Tea", "category": "other", "ingredients": "Black Tea Tin", "price": 401, "effect": "watering_rare_crop", "effect_level": 1, "unlock": "Café Madeleine, A trip with a goddess mail from Erik"},
    {"name": "Blueberry Jam", "category": "other", "ingredients": "Blueberry, Sugar, Lemon", "price": 863, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Blueberry Juice", "category": "other", "ingredients": "Blueberry", "price": 163, "effect": "pet_training_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Blueberry Tea", "category": "other", "ingredients": "Blueberry Tea Tin", "price": 601, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Café au Lait", "category": "other", "ingredients": "Hot Coffee, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 780, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Bookshelves in Freya's House"},
    {"name": "Cappuccino", "category": "other", "ingredients": "Hot Coffee, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 780, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Chamomile Tea", "category": "other", "ingredients": "Chamomile Tea Tin", "price": 344, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Bug Chaser title, Café Madeleine"},
    {"name": "Cherry Juice", "category": "other", "ingredients": "Cherry", "price": 182, "effect": "pet_training_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Cherry Tea", "category": "other", "ingredients": "Cherry Tea Tin", "price": 647, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Chestnut Juice", "category": "other", "ingredients": "Bottled Chestnuts", "price": 390, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Fruit Juice", "category": "other", "ingredients": "Grape Juice, Apple, Orange", "price": 826, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Golden Blend Tea", "category": "other", "ingredients": "Golden Blend Tea Tin", "price": 13031, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Apple Pie Award request from Clara"},
    {"name": "Grape Jam", "category": "other", "ingredients": "Red Grapes, Sugar, Lemon", "price": 1007, "effect": "pet_training_up", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Grape Juice", "category": "other", "ingredients": "Red Grapes", "price": 228, "effect": "pet_training_up", "effect_level": 1, "unlock": "First Juice Festival, Nadine's Bistro"},
    {"name": "Green Grape Tea", "category": "other", "ingredients": "Green Grape Tea Tin", "price": 777, "effect": "pet_training_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Green Tea", "category": "other", "ingredients": "Green Tea Tin", "price": 182, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Happy Chef Salad", "category": "other", "ingredients": "Egg/Egg+/Silkie Egg/Silkie Egg+, Corn, Onion, Cucumber/Onion/Asparagus/Tomato/Red Bell Pepper/Carrot/Turnip/Sweet Potato/Pumpkin/Eggplant", "price": 1233, "effect": "happy_energy_gain", "effect_level": 3, "unlock": "Sprite's Bazaar Stand"},
    {"name": "Happy Forest Mix", "category": "other", "ingredients": "Walnut", "price": 130, "effect": "happy_energy_gain", "effect_level": 1, "unlock": "Sprite's Bazaar Stand"},
    {"name": "Happy Fruit Platter", "category": "other", "ingredients": "Heart Watermelon, Cherry/Blueberry/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon, Apple/Red Grapes/Green Grapes/Strawberry/Mango/Pineapple/Banana/Peach/Orange/Melon", "price": 3274, "effect": "happy_energy_gain", "effect_level": 4, "unlock": "Sprite's Bazaar Stand"},
    {"name": "Happy Mushroom Fry", "category": "other", "ingredients": "Common Mushroom/Shiitake Mushroom/Shimeji Mushroom/Porcini Mushroom/Morel Mushroom/Matsutake Mushroom/Monarch Mushroom, Salt", "price": 662, "effect": "happy_energy_gain", "effect_level": 2, "unlock": "Sprite's Bazaar Stand"},
    {"name": "Honey Juice", "category": "other", "ingredients": "Honey/Invigorating Honey/Mellow Honey/Royal Honey", "price": 325, "effect": "stamina_saver", "effect_level": 1, "unlock": "Generous Beekeeper title, Café Madeleine"},
    {"name": "Hot Coffee", "category": "other", "ingredients": "Coffee Pack", "price": 380, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Jam Tea", "category": "other", "ingredients": "Black Tea, Apple Jam/Strawberry Jam/Grape Jam/Blueberry Jam", "price": 1850, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Mini Madeleine's"},
    {"name": "Lavender Tea", "category": "other", "ingredients": "Lavender Tea Tin", "price": 344, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Lemon Juice", "category": "other", "ingredients": "Lemon", "price": 176, "effect": "pet_training_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Lemon Tea", "category": "other", "ingredients": "Lemon Tea Tin", "price": 632, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Mango Juice", "category": "other", "ingredients": "Mango", "price": 260, "effect": "pet_training_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Mango Tea", "category": "other", "ingredients": "Mango Tea Tin", "price": 832, "effect": "pet_training_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Matcha Tea", "category": "other", "ingredients": "Matcha Tea Tin", "price": 364, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Melon Juice", "category": "other", "ingredients": "Melon", "price": 658, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Melon Tea", "category": "other", "ingredients": "Melon Tea Tin", "price": 1901, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Mini Madeleine's"},
    {"name": "Milk Tea", "category": "other", "ingredients": "Black Tea Tin, Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 674, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Mint Tea", "category": "other", "ingredients": "Mint Tea Tin", "price": 344, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Bringing the Cafe Home request from Freya"},
    {"name": "Olive Tea", "category": "other", "ingredients": "Olive Tea Tin", "price": 586, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Oolong Tea", "category": "other", "ingredients": "Oolong Tea Tin", "price": 401, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Chill-Out Juice! request from Derek"},
    {"name": "Orange Juice", "category": "other", "ingredients": "Orange", "price": 180, "effect": "pet_training_up", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Orange Tea", "category": "other", "ingredients": "Orange Tea Tin", "price": 642, "effect": "pet_training_up", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Peach Juice", "category": "other", "ingredients": "Peach", "price": 182, "effect": "pet_training_up", "effect_level": 1, "unlock": "Nadine's Bistro"},
    {"name": "Peach Tea", "category": "other", "ingredients": "Peach Tea Tin", "price": 647, "effect": "pet_training_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Pineapple Juice", "category": "other", "ingredients": "Pineapple", "price": 429, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Mini Madeleine's"},
    {"name": "Pineapple Tea", "category": "other", "ingredients": "Pineapple Tea Tin", "price": 1320, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Mini Madeleine's"},
    {"name": "Pu'er Tea", "category": "other", "ingredients": "Pu'er Tea Tin", "price": 401, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Red Grape Tea", "category": "other", "ingredients": "Red Grape Tea Tin", "price": 755, "effect": "pet_training_up", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Royal Milk Tea", "category": "other", "ingredients": "Black Tea, Milk+/Buffalo Milk+", "price": 1194, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Nadine's Bistro"},
    {"name": "Sencha Tea", "category": "other", "ingredients": "Sencha Tea Tin", "price": 401, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Simmered Seaweed", "category": "other", "ingredients": "Seaweed, Soy Sauce", "price": 424, "effect": "rod_durability_up", "effect_level": 1, "unlock": "Clara's Diner"},
    {"name": "Soy Milk", "category": "other", "ingredients": "Soybean", "price": 85, "effect": "max_stamina_up", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Specialty Juice", "category": "other", "ingredients": "Spring Juice, Summer Juice, Autumn Juice, Royal Honey", "price": 9511, "effect": "pet_training_up", "effect_level": 4, "unlock": "Submit a juice and win the highest evaluation at the Juice Festival"},
    {"name": "Spring Blend Tea", "category": "other", "ingredients": "Spring Blend Tea Tin", "price": 1287, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Café Madeleine (Spring Only)"},
    {"name": "Spring Juice", "category": "other", "ingredients": "Strawberry Juice, Orange Juice, Cherry Juice", "price": 935, "effect": "chat_friendship_boost", "effect_level": 3, "unlock": "Mini Madeleine's (Spring Only)"},
    {"name": "Strawberry Jam", "category": "other", "ingredients": "Strawberry, Sugar, Lemon", "price": 855, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Mini Madeleine's"},
    {"name": "Strawberry Juice", "category": "other", "ingredients": "Strawberry", "price": 156, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Strawberry Tea", "category": "other", "ingredients": "Strawberry Tea Tin", "price": 586, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Café Madeleine"},
    {"name": "Summer Blend Tea", "category": "other", "ingredients": "Summer Blend Tea Tin", "price": 1287, "effect": "run_speed_up", "effect_level": 3, "unlock": "Café Madeleine (Summer Only)"},
    {"name": "Summer Juice", "category": "other", "ingredients": "Banana Juice, Peach Juice, Lemon Juice", "price": 1020, "effect": "run_speed_up", "effect_level": 3, "unlock": "Mini Madeleine's (Summer Only)"},
    {"name": "Tomato Juice", "category": "other", "ingredients": "Tomato", "price": 55, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Café Madeleine"},
    {"name": "Walnut Juice", "category": "other", "ingredients": "Bottled Walnuts", "price": 260, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Available at start"},
    {"name": "Warm Milk", "category": "other", "ingredients": "Milk/Milk+/Buffalo Milk/Buffalo Milk+", "price": 195, "effect": "chat_friendship_boost", "effect_level": 1, "unlock": "Available at start, Café Madeleine"},
    {"name": "Watermelon Juice", "category": "other", "ingredients": "Watermelon", "price": 756, "effect": "chat_friendship_boost", "effect_level": 2, "unlock": "Nadine's Bistro"},
    {"name": "Watermelon Tea", "category": "other", "ingredients": "Watermelon Tea Tin", "price": 2148, "effect": "chat_friendship_boost", "effect_level": 4, "unlock": "Mini Madeleine's"},
]


def build_complete_recipes() -> List[Dict[str, Any]]:
    """Build the complete recipes list with proper structure."""
    recipes = []

    for raw_recipe in COMPLETE_RECIPES:
        recipe_id = to_id(raw_recipe["name"])
        category = raw_recipe["category"]
        utensil = get_utensil(recipe_id, category)

        # Parse ingredients into structured format
        ingredients = parse_ingredients(raw_recipe["ingredients"])

        recipe = {
            "id": recipe_id,
            "name": raw_recipe["name"],
            "category": category,
            "utensil": utensil,
            "ingredients": ingredients,
            "baseValue": raw_recipe["price"],
            "effect": raw_recipe["effect"],
            "effectLevel": raw_recipe["effect_level"],
            "unlockMethod": raw_recipe["unlock"],
            "icon": f"{recipe_id}.png"
        }

        recipes.append(recipe)

    return recipes


def main():
    """Generate complete recipes JSON file."""
    output_dir = Path(__file__).parent.parent / "output" / "final"
    output_dir.mkdir(parents=True, exist_ok=True)

    recipes = build_complete_recipes()

    # Write recipes.json
    output_path = output_dir / "recipes.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"recipes": recipes}, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(recipes)} recipes to {output_path}")

    # Summary by category
    categories = {}
    for r in recipes:
        cat = r["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print("\nRecipes by category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

    # Copy to public/data
    public_path = Path(__file__).parent.parent.parent / "public" / "data" / "recipes.json"
    with open(public_path, 'w', encoding='utf-8') as f:
        json.dump({"recipes": recipes}, f, indent=2, ensure_ascii=False)
    print(f"\nCopied to {public_path}")


if __name__ == "__main__":
    main()
