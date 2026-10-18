import { NavLink } from "react-router-dom";
import { useT } from "../../lib/i18n";
import { NAV } from "../routes";

export function MobileNav() {
  const t = useT();
  return (
      <nav aria-label={t("nav.workspace")} className="shell-bottom glass-l1">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon className="w-4 h-4" />
            {t(label)}
          </NavLink>
        ))}
      </nav>
  );
}
