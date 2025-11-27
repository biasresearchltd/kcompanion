#!/usr/bin/env python3
"""
Data Normalizer for Grand Bazaar Kitchen Companion

Normalizes, enriches, and validates scraped data.
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, asdict
import re

OUTPUT_DIR = Path(__file__).parent.parent / "output"
FINAL_DIR = OUTPUT_DIR / "final"


# Comprehensive ingredient data based on scraped wiki info
INGREDIENT_DATA = {
    # === CROPS ===
    # Spring crops
    "asparagus": {"category": "crops", "subcategory": "spring", "season": ["spring"], "price": 300, "source": "farming"},
    "broccoli": {"category": "crops", "subcategory": "spring", "season": ["spring", "winter"], "price": 45, "source": "farming"},
    "cabbage": {"category": "crops", "subcategory": "spring", "season": ["spring", "winter"], "price": 470, "source": "farming"},
    "daikon_radish": {"category": "crops", "subcategory": "spring", "season": ["spring", "winter"], "price": 280, "source": "farming"},
    "garlic": {"category": "crops", "subcategory": "spring", "season": ["spring"], "price": 120, "source": "farming"},
    "onion": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer"], "price": 250, "source": "farming"},
    "potato": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer", "winter"], "price": 60, "source": "farming"},
    "radish": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer", "fall"], "price": 50, "source": "farming"},
    "rice": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer", "fall"], "price": 70, "source": "farming"},
    "soybean": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer", "fall"], "price": 65, "source": "farming"},
    "spring_tea_leaves": {"category": "crops", "subcategory": "spring", "season": ["spring"], "price": 70, "source": "farming"},
    "strawberry": {"category": "crops", "subcategory": "spring", "season": ["spring"], "price": 120, "source": "farming"},
    "turnip": {"category": "crops", "subcategory": "spring", "season": ["spring"], "price": 200, "source": "farming"},
    "wheat": {"category": "crops", "subcategory": "spring", "season": ["spring", "summer", "fall"], "price": 75, "source": "farming"},

    # Summer crops
    "corn": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 145, "source": "farming"},
    "cucumber": {"category": "crops", "subcategory": "summer", "season": ["summer", "fall"], "price": 40, "source": "farming"},
    "eggplant": {"category": "crops", "subcategory": "summer", "season": ["summer", "fall"], "price": 50, "source": "farming"},
    "green_bell_pepper": {"category": "crops", "subcategory": "summer", "season": ["summer", "fall"], "price": 48, "source": "farming"},
    "melon": {"category": "crops", "subcategory": "summer", "season": ["summer", "fall"], "price": 470, "source": "farming"},
    "pineapple": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 330, "source": "farming"},
    "pumpkin": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 400, "source": "farming"},
    "red_bell_pepper": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 48, "source": "farming"},
    "summer_tea_leaves": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 70, "source": "farming"},
    "tomato": {"category": "crops", "subcategory": "summer", "season": ["summer", "fall"], "price": 42, "source": "farming"},
    "watermelon": {"category": "crops", "subcategory": "summer", "season": ["summer"], "price": 540, "source": "farming"},

    # Fall crops
    "autumn_tea_leaves": {"category": "crops", "subcategory": "fall", "season": ["fall"], "price": 70, "source": "farming"},
    "bok_choy": {"category": "crops", "subcategory": "fall", "season": ["fall", "winter"], "price": 200, "source": "farming"},
    "carrot": {"category": "crops", "subcategory": "fall", "season": ["fall", "winter"], "price": 300, "source": "farming"},
    "cauliflower": {"category": "crops", "subcategory": "fall", "season": ["fall"], "price": 430, "source": "farming"},
    "chili_pepper": {"category": "crops", "subcategory": "fall", "season": ["fall"], "price": 135, "source": "farming"},
    "spinach": {"category": "crops", "subcategory": "fall", "season": ["fall"], "price": 285, "source": "farming"},
    "sweet_potato": {"category": "crops", "subcategory": "fall", "season": ["fall"], "price": 155, "source": "farming"},

    # Winter crops
    "burdock": {"category": "crops", "subcategory": "winter", "season": ["winter"], "price": 155, "source": "farming"},
    "green_onion": {"category": "crops", "subcategory": "winter", "season": ["winter"], "price": 75, "source": "farming"},
    "napa_cabbage": {"category": "crops", "subcategory": "winter", "season": ["winter"], "price": 340, "source": "farming"},

    # === TREE FRUITS ===
    "apple": {"category": "fruits", "subcategory": "tree", "season": ["fall", "winter"], "price": 180, "source": "tree"},
    "avocado": {"category": "fruits", "subcategory": "tree", "season": ["spring"], "price": 200, "source": "tree"},
    "banana": {"category": "fruits", "subcategory": "tree", "season": ["summer"], "price": 150, "source": "tree"},
    "blueberry": {"category": "fruits", "subcategory": "tree", "season": ["fall"], "price": 90, "source": "tree"},
    "cherry": {"category": "fruits", "subcategory": "tree", "season": ["spring"], "price": 80, "source": "tree"},
    "green_grapes": {"category": "fruits", "subcategory": "tree", "season": ["fall"], "price": 160, "source": "tree"},
    "lemon": {"category": "fruits", "subcategory": "tree", "season": ["summer", "winter"], "price": 100, "source": "tree"},
    "mango": {"category": "fruits", "subcategory": "tree", "season": ["summer"], "price": 200, "source": "tree"},
    "olive": {"category": "fruits", "subcategory": "tree", "season": ["fall"], "price": 120, "source": "tree"},
    "orange": {"category": "fruits", "subcategory": "tree", "season": ["spring", "winter"], "price": 130, "source": "tree"},
    "peach": {"category": "fruits", "subcategory": "tree", "season": ["summer"], "price": 130, "source": "tree"},
    "red_grapes": {"category": "fruits", "subcategory": "tree", "season": ["fall"], "price": 150, "source": "tree"},
    "coffee_bean": {"category": "fruits", "subcategory": "tree", "season": ["spring"], "price": 100, "source": "tree"},
    "cacao_bean": {"category": "fruits", "subcategory": "tree", "season": ["summer"], "price": 100, "source": "tree"},
    "almond": {"category": "fruits", "subcategory": "tree", "season": ["summer"], "price": 150, "source": "tree"},

    # === ANIMAL PRODUCTS ===
    "egg": {"category": "animal_products", "subcategory": "eggs", "season": ["all"], "price": 90, "source": "chicken", "variants": ["egg_plus"]},
    "silkie_egg": {"category": "animal_products", "subcategory": "eggs", "season": ["all"], "price": 120, "source": "silkie_chicken", "variants": ["silkie_egg_plus"]},
    "milk": {"category": "animal_products", "subcategory": "milk", "season": ["all"], "price": 150, "source": "cow", "variants": ["milk_plus"]},
    "buffalo_milk": {"category": "animal_products", "subcategory": "milk", "season": ["all"], "price": 200, "source": "buffalo", "variants": ["buffalo_milk_plus"]},
    "cheese": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 500, "source": "windmill", "variants": ["cheese_plus"]},
    "butter": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 400, "source": "windmill", "variants": ["butter_plus"]},
    "yogurt": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 600, "source": "windmill", "variants": ["yogurt_plus"]},
    "mayonnaise": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 300, "source": "windmill", "variants": ["mayonnaise_plus"]},
    "herb_cheese": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 750, "source": "windmill"},
    "herb_butter": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 600, "source": "windmill"},
    "herb_mayonnaise": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 450, "source": "windmill"},
    "fruit_yogurt": {"category": "animal_products", "subcategory": "dairy", "season": ["all"], "price": 1200, "source": "windmill"},
    "wool": {"category": "animal_products", "subcategory": "wool", "season": ["all"], "price": 200, "source": "sheep"},
    "alpaca_wool": {"category": "animal_products", "subcategory": "wool", "season": ["all"], "price": 250, "source": "alpaca"},

    # === FISH ===
    "amur_minnow": {"category": "fish", "subcategory": "small", "season": ["spring", "fall", "winter"], "price": 50, "source": "fishing"},
    "barbel_steed": {"category": "fish", "subcategory": "medium", "season": ["spring", "summer", "fall"], "price": 150, "source": "fishing"},
    "basa": {"category": "fish", "subcategory": "small", "season": ["all"], "price": 80, "source": "fishing"},
    "bighead_carp": {"category": "fish", "subcategory": "medium", "season": ["summer", "fall"], "price": 200, "source": "fishing"},
    "bitterling": {"category": "fish", "subcategory": "small", "season": ["winter"], "price": 60, "source": "fishing"},
    "black_bass": {"category": "fish", "subcategory": "medium", "season": ["all"], "price": 180, "source": "fishing"},
    "bluegill": {"category": "fish", "subcategory": "small", "season": ["spring", "summer", "fall"], "price": 70, "source": "fishing"},
    "brown_trout": {"category": "fish", "subcategory": "medium", "season": ["fall", "winter"], "price": 160, "source": "fishing"},
    "char": {"category": "fish", "subcategory": "medium", "season": ["fall", "winter"], "price": 200, "source": "fishing"},
    "cherry_salmon": {"category": "fish", "subcategory": "medium", "season": ["spring", "summer"], "price": 180, "source": "fishing"},
    "crucian_carp": {"category": "fish", "subcategory": "small", "season": ["all"], "price": 60, "source": "fishing"},
    "dace": {"category": "fish", "subcategory": "small", "season": ["all"], "price": 55, "source": "fishing"},
    "dark_chub": {"category": "fish", "subcategory": "small", "season": ["spring", "summer"], "price": 65, "source": "fishing"},
    "eel": {"category": "fish", "subcategory": "medium", "season": ["summer"], "price": 250, "source": "fishing"},
    "goldfish": {"category": "fish", "subcategory": "small", "season": ["spring", "summer", "fall"], "price": 100, "source": "fishing"},
    "grayling": {"category": "fish", "subcategory": "medium", "season": ["spring", "fall", "winter"], "price": 140, "source": "fishing"},
    "icefish": {"category": "fish", "subcategory": "small", "season": ["winter"], "price": 120, "source": "fishing"},
    "killifish": {"category": "fish", "subcategory": "small", "season": ["spring", "summer"], "price": 40, "source": "fishing"},
    "marbled_eel": {"category": "fish", "subcategory": "medium", "season": ["summer", "fall"], "price": 300, "source": "fishing"},
    "masu_trout": {"category": "fish", "subcategory": "medium", "season": ["spring", "fall"], "price": 170, "source": "fishing"},
    "mugitsuku": {"category": "fish", "subcategory": "medium", "season": ["spring", "summer"], "price": 130, "source": "fishing"},
    "nile_perch": {"category": "fish", "subcategory": "large", "season": ["summer", "fall"], "price": 350, "source": "fishing"},
    "pale_chub": {"category": "fish", "subcategory": "small", "season": ["spring", "summer", "fall"], "price": 50, "source": "fishing"},
    "pond_smelt": {"category": "fish", "subcategory": "small", "season": ["winter"], "price": 80, "source": "fishing"},
    "rainbow_trout": {"category": "fish", "subcategory": "medium", "season": ["spring", "fall"], "price": 150, "source": "fishing"},
    "salmon": {"category": "fish", "subcategory": "large", "season": ["fall"], "price": 400, "source": "fishing"},
    "sculpin": {"category": "fish", "subcategory": "small", "season": ["all"], "price": 45, "source": "fishing"},
    "silver_carp": {"category": "fish", "subcategory": "medium", "season": ["spring", "summer"], "price": 120, "source": "fishing"},
    "snakehead": {"category": "fish", "subcategory": "medium", "season": ["summer", "fall"], "price": 180, "source": "fishing"},
    "stone_moroko": {"category": "fish", "subcategory": "small", "season": ["spring", "summer", "fall"], "price": 55, "source": "fishing"},
    "sweetfish": {"category": "fish", "subcategory": "medium", "season": ["summer"], "price": 200, "source": "fishing"},
    "tamoroko": {"category": "fish", "subcategory": "small", "season": ["all"], "price": 50, "source": "fishing"},
    "three_lips_carp": {"category": "fish", "subcategory": "medium", "season": ["spring", "fall"], "price": 160, "source": "fishing"},
    "willow_shiner": {"category": "fish", "subcategory": "small", "season": ["spring", "summer"], "price": 45, "source": "fishing"},
    "yellow_perch": {"category": "fish", "subcategory": "medium", "season": ["all"], "price": 140, "source": "fishing"},

    # === FORAGED ===
    "chamomile": {"category": "foraged", "subcategory": "herbs", "season": ["spring", "summer"], "price": 50, "source": "foraging"},
    "chestnut": {"category": "foraged", "subcategory": "nuts", "season": ["fall"], "price": 150, "source": "foraging"},
    "lavender": {"category": "foraged", "subcategory": "herbs", "season": ["fall", "winter"], "price": 50, "source": "foraging"},
    "magic_blue_flower": {"category": "foraged", "subcategory": "flowers", "season": ["spring"], "price": 60, "source": "foraging"},
    "magic_red_flower": {"category": "foraged", "subcategory": "flowers", "season": ["fall"], "price": 60, "source": "foraging"},
    "mint": {"category": "foraged", "subcategory": "herbs", "season": ["all"], "price": 50, "source": "foraging"},
    "moondrop_flower": {"category": "foraged", "subcategory": "flowers", "season": ["spring"], "price": 90, "source": "foraging"},
    "pink_cat_flower": {"category": "foraged", "subcategory": "flowers", "season": ["summer"], "price": 60, "source": "foraging"},
    "toy_flower": {"category": "foraged", "subcategory": "flowers", "season": ["spring"], "price": 50, "source": "foraging"},
    "walnut": {"category": "foraged", "subcategory": "nuts", "season": ["spring", "summer", "winter"], "price": 100, "source": "foraging"},
    "seaweed": {"category": "foraged", "subcategory": "ocean", "season": ["all"], "price": 30, "source": "foraging"},
    "honeycomb": {"category": "foraged", "subcategory": "bee", "season": ["spring", "summer", "fall"], "price": 150, "source": "beekeeping"},

    # === MUSHROOMS ===
    "common_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["all"], "price": 80, "source": "mushroom_log"},
    "shiitake_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["all"], "price": 100, "source": "mushroom_log"},
    "shimeji_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["all"], "price": 90, "source": "mushroom_log"},
    "porcini_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["all"], "price": 150, "source": "mushroom_log"},
    "morel_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["all"], "price": 150, "source": "mushroom_log"},
    "matsutake_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["fall"], "price": 600, "source": "rare"},
    "monarch_mushroom": {"category": "mushrooms", "subcategory": None, "season": ["fall"], "price": 1000, "source": "rare"},

    # === PROCESSED GOODS ===
    "wheat_flour": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 100, "source": "windmill"},
    "rice_flour": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 100, "source": "windmill"},
    "buckwheat_flour": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 120, "source": "windmill"},
    "refined_rice_flour": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 200, "source": "windmill"},
    "soybean_flour": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 100, "source": "windmill"},
    "breadcrumbs": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 150, "source": "windmill"},
    "white_breadcrumbs": {"category": "processed", "subcategory": "flour", "season": ["all"], "price": 180, "source": "windmill"},
    "oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 100, "source": "store"},
    "olive_oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 200, "source": "windmill"},
    "nut_oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 180, "source": "windmill"},
    "herb_oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 180, "source": "windmill"},
    "grape_oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 200, "source": "windmill"},
    "pumpkin_oil": {"category": "processed", "subcategory": "oil", "season": ["all"], "price": 200, "source": "windmill"},
    "miso": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 150, "source": "windmill"},
    "soy_sauce": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 100, "source": "windmill"},
    "vinegar": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 80, "source": "windmill"},
    "salt": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 50, "source": "store"},
    "sugar": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 60, "source": "store"},
    "pepper": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 80, "source": "windmill"},
    "spice": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 100, "source": "windmill"},
    "curry_powder": {"category": "processed", "subcategory": "seasoning", "season": ["all"], "price": 150, "source": "store"},
    "chocolate": {"category": "processed", "subcategory": "sweet", "season": ["all"], "price": 200, "source": "windmill"},
    "honey": {"category": "processed", "subcategory": "sweet", "season": ["all"], "price": 200, "source": "windmill"},
    "royal_honey": {"category": "processed", "subcategory": "sweet", "season": ["all"], "price": 800, "source": "windmill"},
    "coffee_pack": {"category": "processed", "subcategory": "beverage", "season": ["all"], "price": 150, "source": "windmill"},
    "soy_milk": {"category": "processed", "subcategory": "beverage", "season": ["all"], "price": 85, "source": "recipe"},
    "tofu": {"category": "processed", "subcategory": "soy", "season": ["all"], "price": 205, "source": "recipe"},
    "fried_tofu": {"category": "processed", "subcategory": "soy", "season": ["all"], "price": 267, "source": "recipe"},
    "mochi": {"category": "processed", "subcategory": "rice", "season": ["all"], "price": 200, "source": "windmill"},

    # === PREPARED INGREDIENTS (made from other recipes) ===
    "cooked_rice": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 91, "source": "recipe"},
    "bread": {"category": "prepared", "subcategory": "bread", "season": ["all"], "price": 195, "source": "recipe"},
    "white_bread": {"category": "prepared", "subcategory": "bread", "season": ["all"], "price": 182, "source": "recipe"},
    "baguettes": {"category": "prepared", "subcategory": "bread", "season": ["all"], "price": 662, "source": "recipe"},
    "focaccia_bread": {"category": "prepared", "subcategory": "bread", "season": ["all"], "price": 843, "source": "recipe"},
    "pasta": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 328, "source": "recipe"},
    "sashimi": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 195, "source": "recipe"},
    "tempura": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 1152, "source": "recipe"},
    "fish_cake": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 195, "source": "recipe"},
    "onigiri": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 370, "source": "recipe"},
    "omelet": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 721, "source": "recipe"},
    "castella": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 801, "source": "recipe"},
    "mixed_salad": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 404, "source": "recipe"},
    "black_tea": {"category": "prepared", "subcategory": "tea", "season": ["all"], "price": 401, "source": "recipe"},
    "hot_coffee": {"category": "prepared", "subcategory": "beverage", "season": ["all"], "price": 380, "source": "recipe"},
    "curry_rice": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 911, "source": "recipe"},
    "supreme_curry": {"category": "prepared", "subcategory": None, "season": ["all"], "price": 3724, "source": "recipe"},

    # === TEA TINS ===
    "green_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 100, "source": "windmill"},
    "black_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 120, "source": "windmill"},
    "matcha_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 130, "source": "windmill"},
    "sencha_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 120, "source": "windmill"},
    "oolong_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 120, "source": "windmill"},
    "puer_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 120, "source": "windmill"},
    "mint_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 100, "source": "windmill"},
    "chamomile_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 100, "source": "windmill"},
    "lavender_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 100, "source": "windmill"},
    "strawberry_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 150, "source": "windmill"},
    "apple_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 180, "source": "windmill"},
    "orange_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 160, "source": "windmill"},
    "lemon_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 150, "source": "windmill"},
    "peach_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 160, "source": "windmill"},
    "cherry_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 150, "source": "windmill"},
    "banana_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 170, "source": "windmill"},
    "mango_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 200, "source": "windmill"},
    "pineapple_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 220, "source": "windmill"},
    "blueberry_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 140, "source": "windmill"},
    "red_grape_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 180, "source": "windmill"},
    "green_grape_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 180, "source": "windmill"},
    "olive_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 160, "source": "windmill"},
    "melon_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 280, "source": "windmill"},
    "watermelon_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 300, "source": "windmill"},
    "spring_blend_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["spring"], "price": 400, "source": "windmill"},
    "summer_blend_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["summer"], "price": 400, "source": "windmill"},
    "autumn_blend_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["fall"], "price": 400, "source": "windmill"},
    "golden_blend_tea_tin": {"category": "processed", "subcategory": "tea_tin", "season": ["all"], "price": 2000, "source": "windmill"},

    # === JAMS ===
    "apple_jam": {"category": "prepared", "subcategory": "jam", "season": ["all"], "price": 932, "source": "recipe"},
    "strawberry_jam": {"category": "prepared", "subcategory": "jam", "season": ["all"], "price": 855, "source": "recipe"},
    "grape_jam": {"category": "prepared", "subcategory": "jam", "season": ["all"], "price": 1007, "source": "recipe"},
    "blueberry_jam": {"category": "prepared", "subcategory": "jam", "season": ["all"], "price": 863, "source": "recipe"},

    # === JUICES ===
    "apple_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 221, "source": "recipe"},
    "grape_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 228, "source": "recipe"},
    "strawberry_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 156, "source": "recipe"},
    "orange_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 180, "source": "recipe"},
    "cherry_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 182, "source": "recipe"},
    "banana_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 260, "source": "recipe"},
    "peach_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 182, "source": "recipe"},
    "lemon_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 176, "source": "recipe"},
    "blueberry_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 163, "source": "recipe"},
    "mango_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 260, "source": "recipe"},
    "melon_juice": {"category": "prepared", "subcategory": "juice", "season": ["all"], "price": 658, "source": "recipe"},
    "spring_juice": {"category": "prepared", "subcategory": "juice", "season": ["spring"], "price": 935, "source": "recipe"},
    "summer_juice": {"category": "prepared", "subcategory": "juice", "season": ["summer"], "price": 1020, "source": "recipe"},
    "autumn_juice": {"category": "prepared", "subcategory": "juice", "season": ["fall"], "price": 1010, "source": "recipe"},

    # === BOTTLED ITEMS ===
    "bottled_chestnuts": {"category": "processed", "subcategory": "bottled", "season": ["all"], "price": 200, "source": "windmill"},
    "bottled_walnuts": {"category": "processed", "subcategory": "bottled", "season": ["all"], "price": 150, "source": "windmill"},

    # === RARE CROPS ===
    "star_potato": {"category": "rare_crops", "subcategory": None, "season": ["spring"], "price": 500, "source": "rare"},
    "three_forked_carrot": {"category": "rare_crops", "subcategory": None, "season": ["fall"], "price": 800, "source": "rare"},
    "giant_tomato": {"category": "rare_crops", "subcategory": None, "season": ["summer"], "price": 600, "source": "rare"},
    "curled_chili_pepper": {"category": "rare_crops", "subcategory": None, "season": ["fall"], "price": 400, "source": "rare"},
    "jewel_pineapple": {"category": "rare_crops", "subcategory": None, "season": ["summer"], "price": 1000, "source": "rare"},
    "heart_watermelon": {"category": "rare_crops", "subcategory": None, "season": ["summer"], "price": 1500, "source": "rare"},

    # === SPECIAL ITEMS ===
    "urchin": {"category": "ocean", "subcategory": None, "season": ["summer"], "price": 200, "source": "diving"},
}


# Variant mappings - when a recipe says "(any)" for an ingredient
VARIANT_GROUPS = {
    "cheese": ["cheese", "cheese_plus", "herb_cheese"],
    "butter": ["butter", "butter_plus", "herb_butter"],
    "yogurt": ["yogurt", "yogurt_plus", "fruit_yogurt"],
    "mayonnaise": ["mayonnaise", "mayonnaise_plus", "herb_mayonnaise"],
    "milk": ["milk", "milk_plus", "buffalo_milk", "buffalo_milk_plus"],
    "egg": ["egg", "egg_plus", "silkie_egg", "silkie_egg_plus"],
    "mushroom": ["common_mushroom", "shiitake_mushroom", "shimeji_mushroom",
                 "porcini_mushroom", "morel_mushroom", "matsutake_mushroom", "monarch_mushroom"],
    "oil": ["oil", "olive_oil", "nut_oil", "herb_oil", "grape_oil", "pumpkin_oil"],
    "honey": ["honey", "invigorating_honey", "mellow_honey", "royal_honey"],
    "jam": ["apple_jam", "strawberry_jam", "grape_jam", "blueberry_jam"],
    "bread": ["bread", "white_bread", "baguettes", "focaccia_bread"],
    "flour": ["wheat_flour", "rice_flour"],
    "herb": ["mint", "chamomile", "lavender"],
}


class DataNormalizer:
    def __init__(self):
        self.parsed_dir = OUTPUT_DIR / "parsed"
        self.final_dir = OUTPUT_DIR / "final"
        self.final_dir.mkdir(parents=True, exist_ok=True)

    def load_parsed_data(self) -> Dict:
        """Load the parsed data from the scraper."""
        with open(self.parsed_dir / "scraped_data.json", 'r', encoding='utf-8') as f:
            return json.load(f)

    def normalize_ingredients(self, raw_ingredients: List[dict]) -> List[dict]:
        """Normalize and enrich ingredient data."""
        normalized = []
        seen_ids = set()

        # First, add all known ingredients from our data
        for ing_id, data in INGREDIENT_DATA.items():
            if ing_id not in seen_ids:
                seen_ids.add(ing_id)
                normalized.append({
                    "id": ing_id,
                    "name": ing_id.replace('_', ' ').title(),
                    "category": data["category"],
                    "subcategory": data.get("subcategory"),
                    "season": data.get("season", ["all"]),
                    "source": data.get("source", ""),
                    "basePrice": data.get("price"),
                    "variants": data.get("variants", []),
                    "icon": f"{ing_id}.png"
                })

        # Then add any ingredients from recipes that we don't have
        for ing in raw_ingredients:
            ing_id = ing['id']
            if ing_id not in seen_ids and ing_id not in ['choice', 'fish_choice']:
                seen_ids.add(ing_id)
                # Try to get data from our known data
                data = INGREDIENT_DATA.get(ing_id, {})
                normalized.append({
                    "id": ing_id,
                    "name": ing['name'],
                    "category": data.get("category", ing.get("category", "other")),
                    "subcategory": data.get("subcategory", ing.get("subcategory")),
                    "season": data.get("season", ["all"]),
                    "source": data.get("source", ""),
                    "basePrice": data.get("price"),
                    "variants": data.get("variants", []),
                    "icon": f"{ing_id}.png"
                })

        # Sort by category, then name
        category_order = ['crops', 'fruits', 'animal_products', 'fish', 'foraged',
                         'mushrooms', 'processed', 'prepared', 'rare_crops', 'ocean', 'other']

        def sort_key(ing):
            cat_idx = category_order.index(ing['category']) if ing['category'] in category_order else 999
            return (cat_idx, ing['name'])

        normalized.sort(key=sort_key)
        return normalized

    def normalize_recipes(self, raw_recipes: List[dict]) -> List[dict]:
        """Normalize recipe data."""
        normalized = []

        for recipe in raw_recipes:
            # Clean up ingredients
            ingredients = []
            for ing in recipe.get('ingredients', []):
                cleaned_ing = self._clean_ingredient(ing)
                if cleaned_ing:
                    ingredients.append(cleaned_ing)

            # Determine utensil more accurately
            utensil = self._determine_utensil(recipe['name'], recipe.get('category', ''))

            normalized.append({
                "id": recipe['id'],
                "name": recipe['name'],
                "category": recipe.get('category', 'other'),
                "utensil": utensil,
                "ingredients": ingredients,
                "baseValue": recipe.get('base_value', 0),
                "effect": recipe.get('effect'),
                "effectLevel": recipe.get('effect_level'),
                "unlockMethod": recipe.get('unlock_method', ''),
                "icon": f"{recipe['id']}.png"
            })

        return normalized

    def _clean_ingredient(self, ing: dict) -> Optional[dict]:
        """Clean and normalize a single ingredient entry."""
        if not ing:
            return None

        result = {
            "id": ing.get('id'),
            "required": ing.get('required', True)
        }

        # Handle oneOf alternatives
        if ing.get('oneOf'):
            result['oneOf'] = ing['oneOf']

        # Handle anyVariant flag
        if ing.get('anyVariant'):
            # Expand to known variants
            base_id = ing['id']
            if base_id in VARIANT_GROUPS:
                result['oneOf'] = VARIANT_GROUPS[base_id]
                result['id'] = 'choice'
            else:
                result['anyVariant'] = True

        # Handle count
        if ing.get('count', 1) > 1:
            result['count'] = ing['count']

        # Handle plus quality requirement
        if ing.get('plusQuality'):
            result['plusQuality'] = True

        return result

    def _determine_utensil(self, name: str, category: str) -> str:
        """Determine the utensil for a recipe based on name and category."""
        name_lower = name.lower()
        category_lower = category.lower()

        # No utensil (raw preparations, juices, teas, jams)
        no_utensil = ['salad', 'juice', 'tea', 'sashimi', 'jam', 'honey',
                      'milk', 'warm milk', 'walnut juice', 'chestnut juice',
                      'soy milk', 'happy forest mix', 'happy chef salad',
                      'happy mushroom fry', 'happy fruit platter']
        if any(kw in name_lower for kw in no_utensil):
            return 'none'
        if category_lower == 'salad':
            return 'none'

        # Pot recipes
        pot_recipes = ['soup', 'stew', 'boiled', 'curry', 'rice', 'porridge',
                       'risotto', 'fondue', 'pasta', 'udon', 'soba', 'hot pot',
                       'simmered', 'steamed', 'chili con carne', 'ukha',
                       'paella', 'bouillabaisse', 'oden', 'macaroni']
        if any(kw in name_lower for kw in pot_recipes):
            return 'pot'
        if category_lower == 'soup':
            return 'pot'

        # Frying pan recipes
        pan_recipes = ['fried', 'sautéed', 'stir-fry', 'omelet', 'pancake',
                       'hash brown', 'tempura', 'croquette', 'gyoza', 'grilled',
                       'okonomiyaki', 'galette', 'meuniere', 'carpaccio',
                       'popcorn', 'french fries', 'fish & chips', 'yakisoba']
        if any(kw in name_lower for kw in pan_recipes):
            return 'frying_pan'

        # Seasoning set (baked goods, desserts)
        baked = ['bread', 'cake', 'pie', 'cookie', 'bun', 'muffin', 'scone',
                 'donut', 'churro', 'pudding', 'tart', 'roll', 'toast',
                 'baumkuchen', 'castella', 'dango', 'mochi', 'dumpling',
                 'ice cream', 'quiche', 'pizza', 'sandwich', 'khachapuri']
        if any(kw in name_lower for kw in baked):
            return 'seasoning_set'
        if category_lower == 'dessert':
            return 'seasoning_set'

        # Default based on category
        if category_lower == 'main_dish':
            return 'pot'
        if category_lower == 'side':
            return 'frying_pan'

        return 'none'

    def normalize_effects(self, raw_effects: List[dict]) -> List[dict]:
        """Normalize effect data."""
        # Add descriptions to effects
        effect_descriptions = {
            "stamina_saver": "Reduces stamina consumption for actions",
            "max_stamina_up": "Temporarily increases maximum stamina",
            "run_speed_up": "Increases movement speed",
            "watering_rare_crop": "Increases chance of rare crop mutation when watering",
            "rod_durability_up": "Reduces fishing rod durability loss",
            "chat_friendship_boost": "Increases friendship gained from conversations",
            "petting_happiness_up": "Increases animal happiness from petting",
            "petting_rare_item": "Increases chance of rare items when petting animals",
            "pet_training_up": "Increases effectiveness of pet training",
            "happy_energy_gain": "Increases Happy Energy earned at the bazaar",
            "jump_distance_up": "Increases jump distance",
            "double_forage": "Chance to gather double foraged items",
        }

        normalized = []
        for effect in raw_effects:
            effect_id = effect['id']
            normalized.append({
                "id": effect_id,
                "name": effect['name'],
                "description": effect_descriptions.get(effect_id, ""),
                "maxLevel": effect['maxLevel'],
                "category": effect.get('category', 'other')
            })

        return normalized

    def create_categories(self) -> dict:
        """Create the categories configuration."""
        return {
            "ingredientCategories": [
                {"id": "crops", "name": "Crops", "icon": "crops.png", "order": 1},
                {"id": "fruits", "name": "Fruits", "icon": "fruits.png", "order": 2},
                {"id": "animal_products", "name": "Animal Products", "icon": "animal.png", "order": 3},
                {"id": "fish", "name": "Fish", "icon": "fish.png", "order": 4},
                {"id": "foraged", "name": "Foraged Items", "icon": "foraged.png", "order": 5},
                {"id": "mushrooms", "name": "Mushrooms", "icon": "mushrooms.png", "order": 6},
                {"id": "processed", "name": "Processed Goods", "icon": "processed.png", "order": 7},
                {"id": "prepared", "name": "Prepared Ingredients", "icon": "prepared.png", "order": 8},
                {"id": "rare_crops", "name": "Rare Crops", "icon": "rare.png", "order": 9},
                {"id": "other", "name": "Other", "icon": "other.png", "order": 10},
            ],
            "recipeCategories": [
                {"id": "salad", "name": "Salads", "icon": "salad.png"},
                {"id": "soup", "name": "Soups", "icon": "soup.png"},
                {"id": "side", "name": "Sides", "icon": "side.png"},
                {"id": "main_dish", "name": "Main Dishes", "icon": "main.png"},
                {"id": "dessert", "name": "Desserts", "icon": "dessert.png"},
                {"id": "other", "name": "Other", "icon": "other.png"},
            ],
            "utensils": [
                {"id": "none", "name": "No Utensil", "unlockCost": 0},
                {"id": "pot", "name": "Pot", "unlockCost": 10000},
                {"id": "frying_pan", "name": "Frying Pan", "unlockCost": 10000},
                {"id": "seasoning_set", "name": "Seasoning Set", "unlockCost": 10000},
            ],
            "variantGroups": VARIANT_GROUPS
        }

    def normalize_all(self) -> Dict:
        """Run the full normalization pipeline."""
        print("Loading parsed data...")
        data = self.load_parsed_data()

        print("Normalizing ingredients...")
        ingredients = self.normalize_ingredients(data.get('ingredients', []))

        print("Normalizing recipes...")
        recipes = self.normalize_recipes(data.get('recipes', []))

        print("Normalizing effects...")
        effects = self.normalize_effects(data.get('effects', []))

        print("Creating categories...")
        categories = self.create_categories()

        return {
            "ingredients": ingredients,
            "recipes": recipes,
            "effects": effects,
            "categories": categories,
            "metadata": {
                "version": "1.0.0",
                "game": "Story of Seasons: Grand Bazaar (Switch)",
                "recipeCount": len(recipes),
                "ingredientCount": len(ingredients),
                "effectCount": len(effects),
                "source": data.get('source', 'stratswiki.com/sos-gb'),
                "normalizedAt": __import__('time').strftime('%Y-%m-%d %H:%M:%S')
            }
        }

    def save(self, data: Dict):
        """Save normalized data to final directory."""
        # Save combined file
        with open(self.final_dir / "data.json", 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved: {self.final_dir / 'data.json'}")

        # Save individual files for the app
        with open(self.final_dir / "ingredients.json", 'w', encoding='utf-8') as f:
            json.dump({"ingredients": data['ingredients']}, f, indent=2, ensure_ascii=False)
        print(f"Saved: {self.final_dir / 'ingredients.json'}")

        with open(self.final_dir / "recipes.json", 'w', encoding='utf-8') as f:
            json.dump({"recipes": data['recipes']}, f, indent=2, ensure_ascii=False)
        print(f"Saved: {self.final_dir / 'recipes.json'}")

        with open(self.final_dir / "effects.json", 'w', encoding='utf-8') as f:
            json.dump({"effects": data['effects']}, f, indent=2, ensure_ascii=False)
        print(f"Saved: {self.final_dir / 'effects.json'}")

        with open(self.final_dir / "categories.json", 'w', encoding='utf-8') as f:
            json.dump(data['categories'], f, indent=2, ensure_ascii=False)
        print(f"Saved: {self.final_dir / 'categories.json'}")


def main():
    normalizer = DataNormalizer()
    data = normalizer.normalize_all()
    normalizer.save(data)

    print(f"\nNormalization complete!")
    print(f"  Recipes: {data['metadata']['recipeCount']}")
    print(f"  Ingredients: {data['metadata']['ingredientCount']}")
    print(f"  Effects: {data['metadata']['effectCount']}")


if __name__ == '__main__':
    main()
