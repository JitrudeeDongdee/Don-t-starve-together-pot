import { NavLink } from 'react-router-dom';
import { useLocale } from '../i18n';
import Icon, { type IconName } from './Icon';
import { COOK_PATHS } from '../routes';

const TABS: { to: string; end: boolean; icon: IconName; key: 'kitchen' | 'allRecipes' }[] = [
  { to: COOK_PATHS[0], end: true, icon: 'pot', key: 'kitchen' },
  { to: COOK_PATHS[1], end: false, icon: 'book', key: 'allRecipes' },
];

/** Second-level tabs, shown only inside the Cook section. */
export default function CookTabs() {
  const { t } = useLocale();

  return (
    <div className="subtabs" role="tablist" aria-label="Cook pages">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `subtab${isActive ? ' active' : ''}`}
        >
          <Icon name={tab.icon} size={18} />
          <span>{t[tab.key]}</span>
        </NavLink>
      ))}
    </div>
  );
}
