import { useEffect, useMemo, useState } from 'react';
import { engine, fillersFor, recipeByName } from './data';
import { initAnalytics, track } from './analytics';
import { useLocale } from './i18n';
import IngredientPicker from './components/IngredientPicker';
import CookPot, { type Suggestion } from './components/CookPot';
import RecipeBrowser from './components/RecipeBrowser';
import RecipeDetail from './components/RecipeDetail';
import ContactUsModal from './components/ContactUsModal';

const COOKER = 'cookpot';
const EMPTY: (string | null)[] = [null, null, null, null];
const CONTACT_EMAIL = 'jitrudee9723@gmail.com';
const CONTACT_LINKEDIN = 'https://www.linkedin.com/in/jitreudee-doungdee-a034972a6/';

type Tab = 'kitchen' | 'browser';

export default function App() {
  const { locale, t, setLocale } = useLocale();
  const [tab, setTab] = useState<Tab>('kitchen');
  const [slots, setSlots] = useState<(string | null)[]>(EMPTY);
  const [detail, setDetail] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => initAnalytics(), []);

  const filled = slots.filter((s): s is string => Boolean(s));
  const ready = filled.length === 4;

  // live suggestions from the first ingredient onward:
  // full pot -> exact winning group with chances; partial -> reachable dishes
  const suggestion = useMemo<Suggestion | null>(() => {
    if (filled.length === 0) return null;
    if (ready) return { exact: engine.chances(COOKER, filled).chances };
    return {
      reach: engine
        .reachable(COOKER, filled, fillersFor(4 - filled.length))
        .filter((r) => r.name !== 'wetgoop'),
    };
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

  const openDetail = (name: string) => {
    setDetail(name);
    track('view_recipe', { dish: name });
  };

  const detailRecipe = detail ? recipeByName.get(detail) ?? null : null;

  return (
    <div className={`app${tab === 'browser' ? ' app-browser' : ''}`}>
      <header className="app-header">
        <nav className="tabs">
          <button className={`tab${tab === 'kitchen' ? ' active' : ''}`} onClick={() => setTab('kitchen')}>{t.kitchen}</button>
          <button className={`tab${tab === 'browser' ? ' active' : ''}`} onClick={() => setTab('browser')}>{t.allRecipes}</button>
        </nav>
        <div className="header-actions">
          <button
            className="contact-toggle"
            onClick={() => setShowContact(true)}
            title={t.contactUs}
            aria-label={t.contactUs}
          >
            ✉
          </button>
          <button
            className="lang-toggle"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            🌐 {locale === 'th' ? 'EN' : 'ไทย'}
          </button>
        </div>
      </header>

      <main className="content">
        <h1 className="sr-only">
          {locale === 'th'
            ? 'เครื่องจำลองสูตรหม้อปรุงอาหาร Don’t Starve Together'
            : 'Don’t Starve Together Crock Pot Simulator'}
        </h1>
        {tab === 'kitchen' ? (
          <div className={`layout${filled.length === 0 ? ' layout-empty' : ''}`}>
            <CookPot
              slots={slots}
              suggestion={suggestion}
              onRemove={removeSlot}
              onSelectRecipe={openDetail}
              showBorder={false}
            />
            <IngredientPicker potFull={ready} onAdd={addIngredient} />
          </div>
        ) : (
          <RecipeBrowser onSelect={openDetail} showBorder={false} />
        )}
      </main>

      {detailRecipe && <RecipeDetail recipe={detailRecipe} onClose={() => setDetail(null)} />}
      {showContact && (
        <ContactUsModal
          username="JitrudeeDongdee"
          publicEmail={CONTACT_EMAIL}
          linkedInUrl={CONTACT_LINKEDIN}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  );
}
