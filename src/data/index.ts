// Typed data loader — Vite imports the extracted JSON directly.
import ingredientsJson from './ingredients.json';
import recipesJson from './recipes.json';
import { createEngine } from '../engine/cooking';
import type { IngredientDB, Recipe } from '../engine/types';

export const db = ingredientsJson as IngredientDB;
export const recipes = recipesJson as Recipe[];
export const engine = createEngine(db, recipes);

/** Sorted list of all cookable prefab names (for the ingredient picker). */
export const ingredientNames = Object.keys(db.ingredients).sort();

/** Recipes lookup by name. */
export const recipeByName = new Map(recipes.map((r) => [r.name, r]));

// --- filler sets for partial-pot suggestions (engine.reachable) ---
// Core: one representative per tag profile + the most recipe-critical names.
const FILLERS_CORE = [
  'meat', 'monstermeat', 'drumstick', 'fishmeat', 'eel', 'egg', 'tallbirdegg',
  'berries', 'dragonfruit', 'honey', 'royal_jelly', 'butter', 'goatmilk', 'ice',
  'twigs', 'butterflywings', 'mandrake', 'pumpkin', 'potato', 'corn', 'red_cap',
  'cactus_flower', 'plantmeat', 'kelp',
];
// Mid: every base prefab referenced by name in recipe tests (from recipes.json), plus core.
const FILLERS_MID = [
  ...new Set([
    ...FILLERS_CORE,
    'acorn', 'asparagus', 'barnacle', 'batnose', 'berries_juicy', 'blue_cap',
    'cactus_meat', 'cave_banana', 'cutlichen', 'eggplant', 'fig', 'forgetmelots',
    'froglegs', 'garlic', 'green_cap', 'mole', 'moon_cap', 'moonbutterflywings',
    'onion', 'pepper', 'pondeel', 'refined_dust', 'rock_avocado_fruit_ripe',
    'tomato', 'trunk_summer', 'watermelon', 'wobster_sheller_land', 'kelp_dried',
  ]),
];

/** Pick a filler set sized to the number of empty slots (fewer empties -> more precision). */
export function fillersFor(emptySlots: number): string[] {
  if (emptySlots >= 3) return FILLERS_CORE;
  if (emptySlots === 2) return FILLERS_MID;
  return ingredientNames; // 1 empty slot: try everything
}
