import { updateFavicon } from "./favicon";
export type Theme = "dark" | "light" | "system";
export type Effects = "on" | "off";

export function readPreferences(): { theme: Theme; effects: Effects } {
  try {
    const theme = localStorage.getItem("litmus.theme");
    return { theme: theme === "dark" || theme === "light" ? theme : "system", effects: localStorage.getItem("litmus.effects") === "off" ? "off" : "on" };
  } catch { return { theme: "system", effects: "on" }; }
}

export function applyPreferences(theme: Theme, effects: Effects) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.effects = effects;
  updateFavicon();
}

export function savePreferences(theme: Theme, effects: Effects) {
  applyPreferences(theme, effects);
  try {
    localStorage.setItem("litmus.theme", theme);
    localStorage.setItem("litmus.effects", effects);
  } catch { /* Private/blocked storage still permits preferences for this visit. */ }
}
