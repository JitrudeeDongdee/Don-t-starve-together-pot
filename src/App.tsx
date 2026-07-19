import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { recipeByName } from "./data";
import { initAnalytics, track } from "./analytics";
import NavBar from "./components/NavBar";
import CookTabs from "./components/CookTabs";
import { isCookPath } from "./routes";
import KitchenPage from "./pages/KitchenPage";
import RecipesPage from "./pages/RecipesPage";
import FarmingPage from "./pages/FarmingPage";
import RecipeDetail from "./components/RecipeDetail";
import ContactUsModal from "./components/ContactUsModal";

const CONTACT_EMAIL = "jitrudee9723@gmail.com";
const CONTACT_LINKEDIN =
  "https://www.linkedin.com/in/jitreudee-doungdee-a034972a6/";

export default function App() {
  const location = useLocation();
  const [detail, setDetail] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => initAnalytics(), []);

  const openDetail = (name: string) => {
    setDetail(name);
    track("view_recipe", { dish: name });
  };

  const detailRecipe = detail ? (recipeByName.get(detail) ?? null) : null;
  const isBrowser = location.pathname.startsWith("/recipes");

  return (
    <div className={`app${isBrowser ? " app-browser" : ""}`}>
      <NavBar onContact={() => setShowContact(true)} />

      <div className="app-body">
        {isCookPath(location.pathname) && (
          <header className="app-header">
            <CookTabs />
          </header>
        )}

        <main className="content">
          <Routes>
            <Route
              path="/"
              element={<KitchenPage onSelectRecipe={openDetail} />}
            />
            <Route
              path="/recipes"
              element={<RecipesPage onSelectRecipe={openDetail} />}
            />
            <Route path="/farming" element={<FarmingPage />} />
            {/* unknown paths fall back to the main tool rather than a dead end */}
            <Route
              path="*"
              element={<KitchenPage onSelectRecipe={openDetail} />}
            />
          </Routes>
        </main>
      </div>

      {detailRecipe && (
        <RecipeDetail recipe={detailRecipe} onClose={() => setDetail(null)} />
      )}
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
