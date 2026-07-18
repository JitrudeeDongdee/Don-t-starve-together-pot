// Ranks partial-pot suggestions so dishes that specifically REQUIRE what is
// already in the pot come first.
//
// `engine.reachable()` returns every dish still winnable, ordered by the game's
// own priority. That buries the dishes the player is obviously heading towards:
// with Honey in the pot, Honey Nuggets (which names honey outright) should rank
// above a dish that merely tolerates honey as filler.

// .ts extension so this module also runs directly under node (scripts/*.mjs)
import { extractVisualRules } from "../components/recipe-detail/ruleParser.ts";
import type { Recipe } from "./types";

const baseName = (n: string) => n.replace(/_(cooked|dried)$/, "");

export interface SuggestionScore {
  /** Named requirements of the recipe that the pot already satisfies. */
  hits: number;
  /** Named requirements still missing. */
  missing: number;
}

/**
 * Score one recipe against the pot's contents.
 * A `oneOf` group counts as a single requirement: satisfied if ANY member is in
 * the pot — matching how the game's test actually reads.
 */
export function scoreRecipe(recipe: Recipe, potPrefabs: string[]): SuggestionScore {
  const inPot = new Set(potPrefabs.map(baseName));
  const { required, oneOf } = extractVisualRules(recipe.test);

  const units: string[][] = [
    ...required.filter((c) => c.type === "name").map((c) => [c.key]),
    ...oneOf
      .map((group) => group.filter((c) => c.type === "name").map((c) => c.key))
      .filter((keys) => keys.length > 0),
  ];

  let hits = 0;
  for (const unit of units) {
    if (unit.some((key) => inPot.has(baseName(key)))) hits++;
  }
  return { hits, missing: units.length - hits };
}

/**
 * Order: most pot-satisfied named requirements first; then the dish closest to
 * completion (fewest named ingredients still missing); then the game's own
 * priority; then name, so the list is stable.
 */
export function rankSuggestions(recipes: Recipe[], potPrefabs: string[]): Recipe[] {
  return recipes
    .map((recipe) => ({ recipe, ...scoreRecipe(recipe, potPrefabs) }))
    .sort(
      (a, b) =>
        b.hits - a.hits ||
        a.missing - b.missing ||
        b.recipe.priority - a.recipe.priority ||
        a.recipe.name.localeCompare(b.recipe.name),
    )
    .map((x) => x.recipe);
}
