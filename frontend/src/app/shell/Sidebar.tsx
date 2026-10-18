import { NavLink } from "react-router-dom";
import { useT } from "../../lib/i18n";
import { NAV } from "../routes";
import { BackendStatus } from "./BackendStatus";
import { Wordmark } from "./Wordmark";

export function Sidebar() {
  const t = useT();
  return (
    <aside className="shell-sidebar glass-l1">
      <div className="space-y-1.5">
        <Wordmark />
        <div className="rail-label text-xs text-zinc-500">
          {t("nav.tagline")}
        </div>
      </div>

      <nav aria-label={t("nav.workspace")} className="flex flex-col gap-1">
        <div className="rail-label text-xs uppercase tracking-wider text-zinc-600 px-3 mb-2">
          {t("nav.workspace")}
        </div>
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={t(label)}
            aria-label={t(label)}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon className="w-4 h-4" />
            <span className="rail-label">{t(label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rail-label mt-auto space-y-3">
        <BackendStatus />
        <div className="flex items-center justify-between pt-3 border-t border-bg-border text-[11px] text-zinc-500">
          <span className="font-mono">v0.3</span>
          <a
            href="https://github.com/Utkarsh4412"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            github →
          </a>
        </div>
      </div>
    </aside>
  );
}
