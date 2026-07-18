import { displayName, TAG_SHORT } from "../../format";
import { useLocale } from "../../i18n";
import ItemIcon from "../ItemIcon";
import type { RuleChip } from "./recipeDetailUtils";

const TAG_ICON_PREFAB: Record<string, string> = {
  meat: "meat",
  fish: "fish",
  veggie: "carrot",
  fruit: "berries",
  egg: "egg",
  sweetener: "honey",
  dairy: "butter",
  fat: "butter",
  monster: "monstermeat",
  inedible: "twigs",
  magic: "nightmarefuel",
  frozen: "ice",
};

interface Props {
  chip: RuleChip;
  forbidden?: boolean;
  iconOnly?: boolean;
}

export default function RecipeRuleCard({
  chip,
  forbidden,
  iconOnly,
}: Props) {
  const { locale } = useLocale();
  const prefab =
    chip.type === "name" ? chip.key : (TAG_ICON_PREFAB[chip.key] ?? chip.key);
  const label =
    chip.type === "name"
      ? displayName(chip.key, locale)
      : (TAG_SHORT[locale][chip.key] ?? chip.key);
  const bounds = [
    chip.min != null ? `${chip.minExclusive ? ">" : "≥"}${chip.min}` : null,
    chip.max != null ? `≤${chip.max}` : null,
  ].filter(Boolean);
  const amount = bounds.length ? bounds.join(" ") : null;
  const title = amount ? `${label} ${amount}` : label;

  return (
    <div className={`rule-chip${iconOnly ? " icon-only" : ""}`} title={title}>
      <span className="rule-icon-wrap">
        <ItemIcon
          prefab={prefab}
          size={44}
          fallback="name"
          variant={forbidden ? "forbidden" : "square"}
        />
        {amount && !forbidden && <span className="rule-amount">{amount}</span>}
      </span>
      {!iconOnly && <span className="rule-text">{label}</span>}
    </div>
  );
}
