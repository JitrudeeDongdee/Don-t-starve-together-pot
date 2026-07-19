import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLocale } from '../i18n';
import Icon, { type IconName } from './Icon';
import Logo from './Logo';
import { isCookPath } from '../routes';

// Two top-level sections. Cook owns more than one page, so its own pages live
// in a second row of tabs (see CookTabs) instead of flattening into this rail.
const SECTIONS: { to: string; icon: IconName; key: 'sectionCook' | 'farming' }[] = [
  { to: '/', icon: 'pot', key: 'sectionCook' },
  { to: '/farming', icon: 'sprout', key: 'farming' },
];

interface Props {
  onContact: () => void;
}

export default function NavBar({ onContact }: Props) {
  const { locale, t, setLocale } = useLocale();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // A menu left hanging open over the new page is the classic burger-nav bug.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav className="nav" aria-label="Sections">
      {/* mobile: brand left, burger right. desktop: just the brand, at the top of the rail */}
      <div className="nav-bar">
        <Logo />
        <button
          className="nav-burger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={t.menu}
          title={t.menu}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {/* tapping outside the drawer closes it — standard on mobile, and the only
          way out once the drawer covers the page */}
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div id="nav-menu" className={`nav-menu${open ? ' open' : ''}`}>
        {SECTIONS.map((item) => {
          const active =
            item.key === 'sectionCook' ? isCookPath(pathname) : pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span className="nav-label">{t[item.key]}</span>
            </NavLink>
          );
        })}

        <div className="nav-tail">
          <button
            className="nav-item nav-action"
            title={t.contactUs}
            aria-label={t.contactUs}
            onClick={() => {
              setOpen(false);
              onContact();
            }}
          >
            <Icon name="mail" size={20} />
            <span className="nav-label">{t.contactUs}</span>
          </button>
          <button
            className="nav-item nav-action"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Icon name="globe" size={20} />
            <span className="nav-label">{locale === 'th' ? 'English' : 'ไทย'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
