import React from "react";
import ApiKeyGate from "../../features/auth/ApiKeyGate";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import LanguageSwitch from "./LanguageSwitch";
import { Wordmark } from "./Wordmark";
import { NAV } from "../routes";
import { useLocation } from "react-router-dom";
import { useT } from "../../lib/i18n";
import AppearanceControls from "./AppearanceControls";

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const t = useT();
  const current = NAV.find(item => item.to === pathname) ?? NAV[3];
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shell-top glass-l1">
          <div className="mobile-brand"><Wordmark /></div>
          <span className="shell-location">{t(current.label)}</span>
          <div className="shell-preferences"><LanguageSwitch /><AppearanceControls /></div>
        </header>
        <main id="content" className="workspace animate-fade-in">
          <ApiKeyGate />
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
