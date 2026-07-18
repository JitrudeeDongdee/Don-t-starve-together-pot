import { NavLink } from 'react-router-dom';
import { useLocale } from '../i18n';

// Side rail on desktop, top bar on mobile — the switch is pure CSS (see .nav).
const ITEMS = [
  { to: '/', end: true, icon: '🍲', key: 'kitchen' as const },
  { to: '/recipes', end: false, icon: '📖', key: 'allRecipes' as const },
  { to: '/farming', end: false, icon: '🌱', key: 'farming' as const },
];

export default function NavBar() {
  const { t } = useLocale();

  return (
    <nav className="nav" aria-label="Sections">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{t[item.key]}</span>
        </NavLink>
      ))}
    </nav>
  );
}
