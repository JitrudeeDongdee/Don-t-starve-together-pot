// Pure crock-pot cooking engine — a faithful port of scripts/lua/cooking.lua
// (GetIngredientValues / GetCandidateRecipes / CalculateRecipe).
//
// No DOM, no game runtime. Construct with the extracted data via createEngine().

import type {
  CookChance,
  IngredientData,
  IngredientDB,
  Recipe,
} from './types';

type TestFn = (cooker: string, names: Record<string, number>, tags: Record<string, number>) => unknown;

/**
 * Compile a recipe's JS test expression into a predicate.
 * The expressions are build-time artifacts produced by scripts/extract.mjs from
 * the game's own Lua (a trusted source), so Function() here is intentional.
 * Missing keys read as `undefined` (falsy) — matching Lua's `nil` semantics.
 */
export function compileTest(expr: string): TestFn {
  // eslint-disable-next-line no-new-func
  return new Function('cooker', 'names', 'tags', `return (${expr});`) as TestFn;
}

export interface Engine {
  /** Aggregate a set of ingredient prefabs (any length) into names+tags. */
  getIngredientData(prefabs: string[]): IngredientData;
  /** All recipes valid for the pot, reduced to the highest-priority group. */
  getCandidates(cooker: string, prefabs: string[]): Recipe[];
  /** Weighted-random pick among the winning group (uses `rng` for testability). */
  cook(cooker: string, prefabs: string[], rng?: () => number): Recipe;
  /** The winning group plus each member's probability. */
  chances(cooker: string, prefabs: string[]): { candidates: Recipe[]; chances: CookChance[] };
  /**
   * Dishes that can still WIN with the current partial pot: enumerate every
   * multiset completion of the empty slots from `fillers` and union the
   * winning (top-priority) candidates across completions.
   */
  reachable(cooker: string, partial: string[], fillers: string[]): Recipe[];
  isCookingIngredient(prefab: string): boolean;
  recipes: Recipe[];
}

/** All multisets (order-insensitive combinations with repetition) of size k. */
function* multisets<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    for (const rest of multisets(arr.slice(i), k - 1)) yield [arr[i], ...rest];
  }
}

export function createEngine(db: IngredientDB, recipeList: Recipe[]): Engine {
  const compiled = new Map<string, TestFn>();
  for (const r of recipeList) compiled.set(r.name, compileTest(r.test));

  const resolve = (prefab: string): string => db.aliases[prefab] ?? prefab;

  function getIngredientData(prefabs: string[]): IngredientData {
    const names: Record<string, number> = {};
    const tags: Record<string, number> = {};
    for (const raw of prefabs) {
      const name = resolve(raw);
      names[name] = (names[name] ?? 0) + 1;
      const ing = db.ingredients[name];
      if (ing) {
        for (const [t, v] of Object.entries(ing.tags)) tags[t] = (tags[t] ?? 0) + v;
      }
    }
    return { names, tags };
  }

  function getCandidates(cooker: string, prefabs: string[]): Recipe[] {
    const { names, tags } = getIngredientData(prefabs);
    const pass = recipeList.filter(
      (r) => r.cookers.includes(cooker) && Boolean(compiled.get(r.name)!(cooker, names, tags)),
    );
    if (pass.length === 0) return [];
    const top = Math.max(...pass.map((r) => r.priority));
    return pass.filter((r) => r.priority === top);
  }

  function chances(cooker: string, prefabs: string[]) {
    const candidates = getCandidates(cooker, prefabs);
    const total = candidates.reduce((s, r) => s + (r.weight || 1), 0) || 1;
    const list: CookChance[] = candidates.map((r) => ({
      name: r.name,
      weight: r.weight || 1,
      chance: (r.weight || 1) / total,
    }));
    return { candidates, chances: list };
  }

  function cook(cooker: string, prefabs: string[], rng: () => number = Math.random): Recipe {
    const candidates = getCandidates(cooker, prefabs);
    if (candidates.length === 0) throw new Error('no candidate recipe (unexpected: wetgoop should always match)');
    const total = candidates.reduce((s, r) => s + (r.weight || 1), 0);
    let roll = rng() * total;
    for (const r of candidates) {
      roll -= r.weight || 1;
      if (roll <= 0) return r;
    }
    return candidates[candidates.length - 1];
  }

  function reachable(cooker: string, partial: string[], fillers: string[]): Recipe[] {
    const empty = 4 - partial.length;
    if (empty <= 0) return getCandidates(cooker, partial);
    const winners = new Map<string, Recipe>();
    for (const combo of multisets(fillers, empty)) {
      for (const r of getCandidates(cooker, [...partial, ...combo])) winners.set(r.name, r);
    }
    return [...winners.values()].sort(
      (a, b) => b.priority - a.priority || a.name.localeCompare(b.name),
    );
  }

  return {
    getIngredientData,
    getCandidates,
    cook,
    chances,
    reachable,
    isCookingIngredient: (prefab) => db.ingredients[resolve(prefab)] != null,
    recipes: recipeList,
  };
}
