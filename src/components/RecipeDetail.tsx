import { useCallback, useEffect, useState } from "react";
import { db, engine } from "../data";
import { rollCookExamples } from "../engine/randomExample";
import type { Recipe } from "../engine/types";
import { displayName } from "../format";
import { useLocale } from "../i18n";
import Icon from "./Icon";
import ItemIcon from "./ItemIcon";
import StatMeters from "./StatMeters";
import RecipeCookExamples from "./recipe-detail/RecipeCookExamples";
import RecipeRuleCard from "./recipe-detail/RecipeRuleCard";
import SectionDivider from "./recipe-detail/SectionDivider";
import {
  cookExamples,
  extractVisualRules,
  howToSummary,
  sideEffect,
} from "./recipe-detail/recipeDetailUtils";

const EXAMPLE_COUNT = 3;

export default function RecipeDetail({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const { locale, t } = useLocale();
  const s = recipe.stats;
  const rules = extractVisualRules(recipe.test);
  const sideEffectText = sideEffect(s.temperature, t);
  const hasAnyRule =
    rules.required.length > 0 ||
    rules.forbidden.length > 0 ||
    rules.oneOf.length > 0;
  const summary = howToSummary(recipe, locale);

  // Examples are rolled live against the engine rather than read from a fixed
  // list, so re-rolling gives genuinely different ingredients. The precomputed
  // set stays as a fallback for the case the roller comes back empty.
  const roll = useCallback(
    () => {
      const rolled = rollCookExamples(recipe, engine, db, EXAMPLE_COUNT);
      return rolled.length > 0 ? rolled : cookExamples(recipe);
    },
    [recipe],
  );
  const [cookExampleList, setCookExampleList] = useState<string[][]>(roll);
  useEffect(() => setCookExampleList(roll()), [roll]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} aria-label="close">
          <Icon name="close" size={18} />
        </button>
        <h2 className="dish-title">{displayName(recipe.name, locale)}</h2>
        <div className="flourish">
          <Icon name="flourish" size={20} />
        </div>

        <div className="dish-header">
          <div className="dish-frame">
            <ItemIcon prefab={recipe.name} size={72} variant="bare" />
          </div>
          <StatMeters stats={s} size="lg" />
        </div>

        {sideEffectText !== t.none && (
          <>
            <SectionDivider label={t.sideEffects} />
            <div className="col-val">{sideEffectText}</div>
          </>
        )}

        <SectionDivider label={t.howTo} />
        {summary.length > 0 && (
          <div className="howto-summary">{summary.join(", ")}</div>
        )}
        {recipe.card_def && (
          <div className="howto recipe-visual-required">
            {recipe.card_def.map(([name, count], i) => (
              <span
                key={i}
                className="card-ing"
                title={displayName(name, locale)}
              >
                <ItemIcon
                  prefab={name}
                  size={54}
                  fallback="name"
                  variant="plain"
                />
                <span className="card-ing-count">×{count}</span>
              </span>
            ))}
          </div>
        )}

        {rules.required.length > 0 && (
          <>
            <SectionDivider label={t.requiredIngredients} />
            <div className="rule-list">
              {rules.required.map((r, i) => (
                <RecipeRuleCard
                  key={`req-${r.type}-${r.key}-${i}`}
                  chip={r}
                  iconOnly
                />
              ))}
            </div>
          </>
        )}

        {rules.oneOf.length > 0 && (
          <>
            <div className="rule-title"><Icon name="shuffle" size={16} /> {t.oneOfIngredients}</div>
            <div className="rule-groups">
              {rules.oneOf.map((group, i) => (
                <div className="rule-list rule-group" key={`oneof-${i}`}>
                  {group.map((r, j) => (
                    <RecipeRuleCard
                      key={`oneof-${i}-${r.type}-${r.key}-${j}`}
                      chip={r}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {rules.forbidden.length > 0 && (
          <>
            <SectionDivider label={t.forbiddenIngredients} />
            <div className="rule-list">
              {rules.forbidden.map((r, i) => (
                <RecipeRuleCard
                  key={`ban-${r.type}-${r.key}-${i}`}
                  chip={r}
                  forbidden
                  iconOnly
                />
              ))}
            </div>
          </>
        )}

        {cookExampleList.length > 0 && (
          <>
            <SectionDivider label={t.cookExample} />
            <div className="cook-example-actions">
              <button
                className="reroll-btn"
                onClick={() => setCookExampleList(roll())}
                title={t.reroll}
              >
                <Icon name="shuffle" size={16} />
                {t.reroll}
              </button>
            </div>
            <RecipeCookExamples combos={cookExampleList} locale={locale} />
          </>
        )}

        {!hasAnyRule && <div className="col-val">{t.noSpecificRule}</div>}
      </div>
    </div>
  );
}
