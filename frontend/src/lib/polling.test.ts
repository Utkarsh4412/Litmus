import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "vite";
import config from "../../vite.config";
import process from "node:process";

vi.mock("vite", async (importOriginal) => ({
  ...await importOriginal<typeof import("vite")>(),
  loadEnv: vi.fn(() => ({})),
}));

afterEach(() => vi.clearAllMocks());

describe("Vite file watching", () => {
  it.each([undefined, "0", "true", "", "1"])("reads VITE_POLL=%s from Vite's environment", async (value) => {
    vi.mocked(loadEnv).mockReturnValue(value === undefined ? {} : { VITE_POLL: value });
    const resolved = typeof config === "function"
      ? await config({ command: "serve", mode: "test" }) : await config;
    expect(resolved.server?.watch?.usePolling).toBe(value === "1");
    expect(resolved.server?.watch?.interval).toBe(300);
    expect(loadEnv).toHaveBeenCalledWith("test", process.cwd(), "VITE_");
  });
});
