import { displayName } from "../../format";
import type { Locale } from "../../i18n";
import ItemIcon from "../ItemIcon";
import { comboKey } from "./recipeDetailUtils";

interface Props {
  combos: string[][];
  locale: Locale;
}

export default function RecipeCookExamples({ combos, locale }: Props) {
  return (
    <div className="cook-example-list">
      {combos.map((combo, comboIndex) => (
        <div className="cook-example-row" key={comboKey(combo) || comboIndex}>
          {combo.map((name, i) => (
            <span
              key={`${comboIndex}-${name}-${i}`}
              className="cook-example-slot"
              title={displayName(name, locale)}
            >
              <ItemIcon
                prefab={name}
                size={48}
                fallback="name"
                variant="square"
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
