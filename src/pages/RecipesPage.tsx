import { useLocale } from '../i18n';
import { ROUTES } from '../routes';
import { useDocumentMeta } from '../useDocumentMeta';
import RecipeBrowser from '../components/RecipeBrowser';

export default function RecipesPage({ onSelectRecipe }: { onSelectRecipe: (name: string) => void }) {
  const { locale } = useLocale();
  useDocumentMeta(ROUTES[1]);

  return (
    <>
      <h1 className="sr-only">{locale === 'th' ? ROUTES[1].headingTh : ROUTES[1].heading}</h1>
      <RecipeBrowser onSelect={onSelectRecipe} showBorder={false} />
    </>
  );
}
