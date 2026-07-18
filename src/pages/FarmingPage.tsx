import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';
import { ROUTES } from '../routes';
import { useDocumentMeta } from '../useDocumentMeta';

const FARMING_ROUTE = ROUTES.find((r) => r.path === '/farming')!;

export default function FarmingPage() {
  const { locale, t } = useLocale();
  useDocumentMeta(FARMING_ROUTE);

  return (
    <div className="panel wip-panel">
      <h1 className="wip-title">
        {locale === 'th' ? FARMING_ROUTE.headingTh : FARMING_ROUTE.heading}
      </h1>
      <div className="flourish"><span>🌱</span></div>

      <div className="wip-badge">{t.comingSoonTitle}</div>
      <p className="wip-body">{t.comingSoonBody}</p>

      <Link className="wip-back" to="/">← {t.backToKitchen}</Link>
    </div>
  );
}
