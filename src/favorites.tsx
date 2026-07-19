// Favourites for ingredients and dishes, kept in localStorage.
//
// Two separate sets rather than one namespaced set: a prefab can be both an
// ingredient and a dish name in this data (cooked items), and merging them
// would make starring the ingredient light up the dish too.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FavKind = 'ingredient' | 'recipe';

const STORAGE_KEY = 'favorites';

interface Stored {
  ingredient: string[];
  recipe: string[];
}

/** localStorage is unavailable during prerender and in some privacy modes. */
function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ingredient: [], recipe: [] };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      ingredient: Array.isArray(parsed.ingredient) ? parsed.ingredient : [],
      recipe: Array.isArray(parsed.recipe) ? parsed.recipe : [],
    };
  } catch {
    // corrupt or blocked — start empty rather than crashing the app
    return { ingredient: [], recipe: [] };
  }
}

interface FavContext {
  isFav: (kind: FavKind, id: string) => boolean;
  toggle: (kind: FavKind, id: string) => void;
  count: (kind: FavKind) => number;
  ready: boolean;
}

const Ctx = createContext<FavContext>({
  isFav: () => false,
  toggle: () => {},
  count: () => 0,
  ready: false,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  // Start empty so the first client render matches server-rendered markup,
  // then adopt what is stored — same pattern as the locale provider.
  const [sets, setSets] = useState<Record<FavKind, Set<string>>>({
    ingredient: new Set(),
    recipe: new Set(),
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = read();
    setSets({
      ingredient: new Set(stored.ingredient),
      recipe: new Set(stored.recipe),
    });
    setReady(true);
  }, []);

  const toggle = useCallback((kind: FavKind, id: string) => {
    setSets((prev) => {
      const next = new Set(prev[kind]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const merged = { ...prev, [kind]: next };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ingredient: [...merged.ingredient],
            recipe: [...merged.recipe],
          }),
        );
      } catch {
        // favourites just won't persist this session
      }
      return merged;
    });
  }, []);

  const value = useMemo<FavContext>(
    () => ({
      isFav: (kind, id) => sets[kind].has(id),
      toggle,
      count: (kind) => sets[kind].size,
      ready,
    }),
    [sets, toggle, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFavorites = () => useContext(Ctx);
