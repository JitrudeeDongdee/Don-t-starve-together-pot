import cookExamplesJson from "../../data/cook_examples.json";
import type { Recipe } from "../../engine/types";
import { displayName, TAG_SHORT } from "../../format";
import type { Locale } from "../../i18n";
import {
  extractVisualRules,
  NON_FOOD_TAGS,
  normalizeNameKey,
  type RuleChip,
} from "./ruleParser";

const COOK_EXAMPLES = cookExamplesJson as Record<string, string[][]>;

export { extractVisualRules, normalizeNameKey };
export type { RuleChip };


export function sideEffect(
  temperature: number | null,
  t: { none: string; coolsBody: string; warmsBody: string },
): string {
  if (temperature == null || temperature === 0) return t.none;
  return temperature < 0 ? t.coolsBody : t.warmsBody;
}

function fmtAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

function chipLabel(chip: RuleChip, locale: Locale): string {
  const label =
    chip.type === "name"
      ? displayName(chip.key, locale)
      : (TAG_SHORT[locale][chip.key] ?? chip.key);
  const bounds = [
    chip.min != null
      ? `${chip.minExclusive ? ">" : "≥"}${fmtAmount(chip.min)}`
      : null,
    chip.max != null ? `≤${fmtAmount(chip.max)}` : null,
  ].filter(Boolean);
  return bounds.length ? `${label} ${bounds.join(" ")}` : label;
}

/**
 * What the recipe ACTUALLY requires, read off its own test expression.
 * (Deliberately not derived from `card_def` — that is only one example combo,
 * and summarising its tag totals states requirements the recipe doesn't have.)
 */
export function howToSummary(recipe: Recipe, locale: Locale): string[] {
  const { required, oneOf } = extractVisualRules(recipe.test);
  return [
    ...required
      .filter((chip) => !(chip.type === "tag" && NON_FOOD_TAGS.has(chip.key)))
      .map((chip) => chipLabel(chip, locale)),
    ...oneOf.map((group) =>
      group.map((chip) => chipLabel(chip, locale)).join(" / "),
    ),
  ];
}

export function comboKey(combo: string[]): string {
  return combo
    .map((name) => normalizeNameKey(name))
    .sort()
    .join("|");
}

/**
 * Guaranteed-working combos for a dish, precomputed by scripts/cook_examples.mjs.
 *
 * Read from data rather than searched at runtime: the full combo space is ~1.09M,
 * and rare dishes are pathological to search live (shroomcake has exactly one
 * valid combo). The generator also collapses raw/cooked, so a combo that works
 * with either form is listed once.
 */
export function cookExamples(recipe: Recipe): string[][] {
  return COOK_EXAMPLES[recipe.name] ?? [];
}

