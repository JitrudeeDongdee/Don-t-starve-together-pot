import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';
import { ROUTES } from '../routes';
import { useDocumentMeta } from '../useDocumentMeta';
import Icon from '../components/Icon';

const FARMING_ROUTE = ROUTES.find((r) => r.path === '/farming')!;

export default function FarmingPage() {
  const { locale, t } = useLocale();
  useDocumentMeta(FARMING_ROUTE);

  return (
    <div className="panel wip-panel">
      <h1 className="wip-title">
        {locale === 'th' ? FARMING_ROUTE.headingTh : FARMING_ROUTE.heading}
      </h1>
      <div className="flourish"><Icon name="sprout" size={22} /></div>

      <div className="wip-badge">{t.comingSoonTitle}</div>
      <p className="wip-body">{t.comingSoonBody}</p>

      <Link className="wip-back" to="/">
        <Icon name="arrow-left" size={16} /> {t.backToKitchen}
      </Link>
    </div>
  );
}
