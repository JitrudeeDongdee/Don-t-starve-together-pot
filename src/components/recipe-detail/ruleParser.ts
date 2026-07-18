// Pure parser for a recipe's `test` expression (the JS port of the game's Lua
// predicate). No app/data imports on purpose: this is plain logic so it can be
// unit-tested directly with `node scripts/validate_rules.mjs`.

export interface RuleChip {
  type: "name" | "tag";
  key: string;
  /** Minimum required amount, when the clause carries a `>=` / `>` threshold. */
  min?: number;
  /** True when the threshold is strict (`> n`) rather than inclusive (`>= n`). */
  minExclusive?: boolean;
  /** Upper bound, when the clause caps the amount (`<= n` with n > 0). */
  max?: number;
}

export interface RuleSet {
  required: RuleChip[];
  forbidden: RuleChip[];
  oneOf: RuleChip[][];
}

export const NON_FOOD_TAGS = new Set(["precook", "dried", "decoration", "seed"]);

export const normalizeNameKey = (name: string) =>
  name.replace(/_(cooked|dried)$/, "");

/** Split on `op` only where parenthesis depth is 0. */
function splitTopLevel(expr: string, op: "&&" | "||"): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && expr.slice(i, i + 2) === op) {
      parts.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Strip a wrapping pair of parens — but only when the leading "(" is the one
 * closed by the trailing ")". Counting parens is NOT enough: `(A) && (B)` also
 * starts with "(" and ends with ")" while having balanced counts inside, and
 * stripping it corrupts the depth tracking used to split the expression.
 */
function stripOuterParens(s: string): string {
  let out = s.trim();
  while (out.startsWith("(") && out.endsWith(")")) {
    let depth = 0;
    let wraps = true;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === "(") depth++;
      else if (out[i] === ")") {
        depth--;
        if (depth === 0 && i < out.length - 1) {
          wraps = false;
          break;
        }
      }
    }
    if (!wraps || depth !== 0) break;
    out = out.slice(1, -1).trim();
  }
  return out;
}

function parseAtom(
  atom: string,
): { chip: RuleChip; forbidden: boolean } | null {
  let a = stripOuterParens(atom);
  let forbidden = false;

  if (a.startsWith("!")) {
    forbidden = true;
    a = stripOuterParens(a.slice(1));
  }

  const nameWithCount = a.match(/^names\.(\w+)\s*(>=|<=|>|<|===)\s*([\d.]+)$/);
  if (nameWithCount) {
    const [, key, op, rawValue] = nameWithCount;
    const value = Number(rawValue);
    return {
      chip: {
        type: "name",
        key,
        ...(op === ">=" || op === ">"
          ? { min: value, ...(op === ">" ? { minExclusive: true } : {}) }
          : {}),
        ...((op === "<=" || op === "<") && value > 0 ? { max: value } : {}),
      },
      forbidden:
        forbidden || ((op === "<=" || op === "<" || op === "===") && value <= 0),
    };
  }

  // e.g. `(names.kelp || 0) + (names.kelp_cooked || 0) === 2`
  const groupedNames = [...a.matchAll(/names\.(\w+)/g)].map((m) => m[1]);
  if (groupedNames.length > 0 && /(>=|<=|>|<|===)/.test(a)) {
    const normalized = [...new Set(groupedNames.map(normalizeNameKey))];
    const amount = a.match(/(?:>=|>|===)\s*([\d.]+)/);
    return {
      chip: {
        type: "name",
        key: normalized[0] ?? groupedNames[0],
        ...(amount ? { min: Number(amount[1]) } : {}),
      },
      forbidden,
    };
  }

  const nameOnly = a.match(/^names\.(\w+)$/);
  if (nameOnly) return { chip: { type: "name", key: nameOnly[1] }, forbidden };

  const tagWithCount = a.match(/^tags\.(\w+)\s*(>=|<=|>|<|===)\s*([\d.]+)$/);
  if (tagWithCount) {
    const [, key, op, rawValue] = tagWithCount;
    const value = Number(rawValue);
    return {
      chip: {
        type: "tag",
        key,
        ...(op === ">=" || op === ">"
          ? { min: value, ...(op === ">" ? { minExclusive: true } : {}) }
          : {}),
        ...((op === "<=" || op === "<") && value > 0 ? { max: value } : {}),
      },
      forbidden:
        forbidden || ((op === "<=" || op === "<" || op === "===") && value <= 0),
    };
  }

  const tagOnly = a.match(/^tags\.(\w+)$/);
  if (tagOnly) return { chip: { type: "tag", key: tagOnly[1] }, forbidden };

  return null;
}

/** Name chips collapse their `_cooked`/`_dried` variants onto the base item. */
function normalizeChip(chip: RuleChip): RuleChip {
  return chip.type === "name"
    ? { ...chip, key: normalizeNameKey(chip.key) }
    : chip;
}

function isNegatedClause(expr: string): boolean {
  const e = stripOuterParens(expr);
  if (e.startsWith("!")) return true;
  return Boolean(parseAtom(e)?.forbidden);
}

/** Dedupe by type+key, keeping the strictest bounds seen (largest min, smallest max). */
function uniqChips(items: RuleChip[]): RuleChip[] {
  const byKey = new Map<string, RuleChip>();
  for (const it of items) {
    const key = `${it.type}:${it.key}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, it);
      continue;
    }
    const merged: RuleChip = { ...prev };
    if (it.min != null && (prev.min == null || it.min > prev.min)) {
      merged.min = it.min;
      // carry the operator with the bound, or `> 1` degrades into `>= 1`
      if (it.minExclusive) merged.minExclusive = true;
      else delete merged.minExclusive;
    }
    if (it.max != null && (prev.max == null || it.max < prev.max)) {
      merged.max = it.max;
    }
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}

/**
 * Representative chip for one member of an OR group. The member may itself be a
 * compound clause (e.g. `(tags.veggie && tags.veggie >= 0.5)`), in which case we
 * collapse it to its underlying chip.
 */
function memberChip(expr: string): RuleChip | null {
  const e = stripOuterParens(expr);
  const direct = parseAtom(e);
  if (direct) return direct.forbidden ? null : normalizeChip(direct.chip);

  const sub: RuleSet = { required: [], forbidden: [], oneOf: [] };
  collectRules(e, sub);
  return uniqChips(sub.required)[0] ?? null;
}

/**
 * Walk a test expression, collecting required / forbidden / one-of chips.
 * Recursive so that parenthesised clauses — half of the recipe set, e.g.
 * `(names.dragonfruit || names.dragonfruit_cooked)` — are not dropped.
 */
function collectRules(expr: string, acc: RuleSet): void {
  const e = stripOuterParens(expr);
  if (!e || e === "true") return;

  const andParts = splitTopLevel(e, "&&");
  if (andParts.length > 1) {
    for (const part of andParts) collectRules(part, acc);
    return;
  }

  const orParts = splitTopLevel(e, "||");
  if (orParts.length > 1) {
    // `(!tags.monster || tags.monster <= 1)` is an upper bound, not a
    // requirement — never surface it as "required".
    if (orParts.some(isNegatedClause)) return;

    const group = uniqChips(
      orParts.map(memberChip).filter((c): c is RuleChip => Boolean(c)),
    );
    if (group.length > 1) acc.oneOf.push(group);
    else if (group.length === 1) acc.required.push(group[0]);
    return;
  }

  const parsed = parseAtom(e);
  if (!parsed) return;
  const chip = normalizeChip(parsed.chip);
  if (parsed.forbidden) acc.forbidden.push(chip);
  else acc.required.push(chip);
}

export function extractVisualRules(test: string): RuleSet {
  if (test.trim() === "true")
    return { required: [], forbidden: [], oneOf: [] };

  const acc: RuleSet = { required: [], forbidden: [], oneOf: [] };
  collectRules(test, acc);

  // A chip required outright shouldn't be repeated inside a one-of group.
  const requiredKeys = new Set(acc.required.map((c) => `${c.type}:${c.key}`));
  return {
    required: uniqChips(acc.required),
    forbidden: uniqChips(acc.forbidden),
    oneOf: acc.oneOf.filter(
      (group) => !group.every((c) => requiredKeys.has(`${c.type}:${c.key}`)),
    ),
  };
}
