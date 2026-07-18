import { useMemo, useState } from 'react';
import { engine, fillersFor } from '../data';
import { rankSuggestions } from '../engine/rankSuggestions';
import { useLocale } from '../i18n';
import { ROUTES } from '../routes';
import { useDocumentMeta } from '../useDocumentMeta';
import CookPot, { type Suggestion } from '../components/CookPot';
import IngredientPicker from '../components/IngredientPicker';

const COOKER = 'cookpot';
const EMPTY: (string | null)[] = [null, null, null, null];

export default function KitchenPage({ onSelectRecipe }: { onSelectRecipe: (name: string) => void }) {
  const { locale } = useLocale();
  useDocumentMeta(ROUTES[0]);
  const [slots, setSlots] = useState<(string | null)[]>(EMPTY);

  const filled = slots.filter((s): s is string => Boolean(s));
  const ready = filled.length === 4;

  // live suggestions from the first ingredient onward:
  // full pot -> exact winning group with chances; partial -> reachable dishes
  const suggestion = useMemo<Suggestion | null>(() => {
    if (filled.length === 0) return null;
    if (ready) return { exact: engine.chances(COOKER, filled).chances };
    const reachable = engine
      .reachable(COOKER, filled, fillersFor(4 - filled.length))
      .filter((r) => r.name !== 'wetgoop');
    // dishes that specifically require what's already in the pot come first
    return { reach: rankSuggestions(reachable, filled) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const addIngredient = (prefab: string) => {
    setSlots((s) => {
      const idx = s.findIndex((x) => x === null);
      if (idx === -1) return s;
      const next = [...s];
      next[idx] = prefab;
      return next;
    });
  };

  const removeSlot = (i: number) => {
    setSlots((s) => s.map((x, k) => (k === i ? null : x)));
  };

  return (
    <>
      <h1 className="sr-only">{locale === 'th' ? ROUTES[0].headingTh : ROUTES[0].heading}</h1>
      <div className={`layout${filled.length === 0 ? ' layout-empty' : ''}`}>
        <CookPot
          slots={slots}
          suggestion={suggestion}
          onRemove={removeSlot}
          onSelectRecipe={onSelectRecipe}
          showBorder={false}
        />
        <IngredientPicker potFull={ready} onAdd={addIngredient} />
      </div>
    </>
  );
}
