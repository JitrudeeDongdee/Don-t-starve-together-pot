// Shared types for the cooking engine and UI.

export type TagMap = Record<string, number>;

export interface Ingredient {
  tags: TagMap;
}

export interface IngredientDB {
  aliases: Record<string, string>;
  ingredients: Record<string, Ingredient>;
}

export interface RecipeStats {
  health: number | null;
  hunger: number | null;
  sanity: number | null;
  perishtime: number | null;
  cooktime: number | null;
  temperature: number | null;
  temperatureduration: number | null;
}

export interface Recipe {
  name: string;
  cookers: string[];
  priority: number;
  weight: number;
  foodtype: string | null;
  stats: RecipeStats;
  /** JS boolean expression over (cooker, names, tags), compiled at load time. */
  test: string;
  /** Guaranteed example combo: [prefab, count][]. */
  card_def: [string, number][] | null;
}

/** Aggregated view of what is in the pot: summed tag values + per-prefab counts. */
export interface IngredientData {
  names: Record<string, number>;
  tags: TagMap;
}

export interface CookChance {
  name: string;
  weight: number;
  /** probability in [0,1] within the winning priority group. */
  chance: number;
}
