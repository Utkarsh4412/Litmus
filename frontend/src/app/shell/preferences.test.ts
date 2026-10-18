import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPreferences, readPreferences, savePreferences } from "./preferences";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); delete document.documentElement.dataset.theme; delete document.documentElement.dataset.effects; });
describe("appearance preferences", () => {
  it("defaults invalid saved values to system and effects on", () => {
    localStorage.setItem("litmus.theme", "invalid"); localStorage.setItem("litmus.effects", "invalid");
    expect(readPreferences()).toEqual({ theme: "system", effects: "on" });
  });
  it("restores an explicit theme and effects", () => {
    savePreferences("light", "off");
    expect(readPreferences()).toEqual({ theme: "light", effects: "off" });
    expect(document.documentElement.dataset).toMatchObject({ theme: "light", effects: "off" });
  });
  it("returns system control to the live CSS media query", () => {
    applyPreferences("dark", "off"); savePreferences("system", "on");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem("litmus.theme")).toBe("system");
  });
  it("survives blocked storage reads", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readPreferences()).toEqual({ theme: "system", effects: "on" });
  });
  it("applies preferences even when storage writes are blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => savePreferences("dark", "off")).not.toThrow();
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", effects: "off" });
  });
});
