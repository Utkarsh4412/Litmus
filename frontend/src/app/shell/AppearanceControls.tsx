import { useRef, useState } from "react";
import { useT } from "../../lib/i18n";
import { readPreferences, savePreferences, type Theme } from "./preferences";

export default function AppearanceControls() {
  const t = useT();
  const [preferences, setPreferences] = useState(readPreferences);
  const disclosure = useRef<HTMLDetailsElement>(null);
  function update(theme: Theme, effects: "on" | "off") {
    savePreferences(theme, effects);
    setPreferences({ theme, effects });
  }
  return (
    <details ref={disclosure} className="preferences" onKeyDown={event => {
      if (event.key === "Escape" && disclosure.current) {
        disclosure.current.open = false;
        disclosure.current.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label={t("preferences.title")} title={t("preferences.title")}>◐</summary>
      <div className="preferences-panel glass-l2" data-transient>
        <label className="flex flex-col gap-2 text-sm">
          {t("preferences.theme")}
          <select aria-label={t("preferences.theme")} className="input" value={preferences.theme} onChange={event => update(event.target.value as Theme, preferences.effects)}>
            {(["dark", "light", "system"] as const).map(value => <option key={value} value={value}>{t(`preferences.${value}`)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={preferences.effects === "off"} onChange={event => update(preferences.theme, event.target.checked ? "off" : "on")} />
          {t("preferences.reduceEffects")}
        </label>
      </div>
    </details>
  );
}
