import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../lib/i18n";
import type { HealthResponse } from "../lib/api/client";
import Ask from "../features/ask/Ask";
import Compare from "../features/compare/Compare";
import EvalRuns from "../features/eval/EvalRuns";
import { ValidateSection } from "../features/advisor/ValidateSection";
import type { AdviseResponse } from "../features/advisor/api";
import { waitForRendered } from "../test-utils/waitForRendered";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const reason = "needs ANTHROPIC_API_KEY (this runs on Anthropic models)";
let health: HealthResponse | null;
let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
let calls: { url: string; body: Record<string, unknown> }[];

beforeEach(() => {
  health = {
    status: "ok", version: "test", auth_required: false, providers: {},
    capabilities: {
      classic: { enabled: true, reason: null },
      graph: { enabled: false, reason },
      agentic: { enabled: false, reason },
      judge: { enabled: false, reason },
      graph_build: { enabled: false, reason },
    },
  };
  calls = [];
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^\/api/, "");
    if (init?.method === "POST") calls.push({ url, body: JSON.parse(String(init.body)) });
    if (url === "/health" && health === null) return new Response("unreachable", { status: 503 });
    const body = url === "/health" ? health
      : url === "/graph/stats" ? { triples: 0, entities: 0 }
        : url === "/eval/golden" ? ["golden_v1"]
          : url === "/eval/runs" ? [{ id: "r1", dataset: "golden_v1", strategy: "graph" }]
            : url === "/compare/strategies" ? { question: "question", results: [] } : [];
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});

async function settle() {
  await waitForRendered(() => client.isFetching() === 0 && !container.querySelector('.animate-spin'));
}

async function render(node: ReactNode) {
  await act(async () => root.render(
    <I18nProvider initialLanguage="en">
      <QueryClientProvider client={client}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>
    </I18nProvider>,
  ));
  await settle();
}

function button(text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`button missing: ${text}`);
  return found;
}

async function question() {
  const input = container.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, "question");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}

describe("health capabilities", () => {
  it("disables Ask strategies with the backend reason", async () => {
    await render(<Ask />);
    for (const name of ["Graph", "Agentic"]) {
      expect(button(name).disabled).toBe(true);
      expect(button(name).title).toBe(reason);
      await act(async () => button(name).click());
      expect(button(name).getAttribute("aria-pressed")).toBe("false");
    }
    expect(button("Classic").disabled).toBe(false);
    expect(calls).toEqual([]);
  });

  it("blocks keyboard submission if a selected strategy becomes unavailable", async () => {
    health!.capabilities!.graph = { enabled: true, reason: null };
    await render(<Ask />);
    await act(async () => button("Graph").click());
    health!.capabilities!.graph = { enabled: false, reason };
    await act(async () => { await client.invalidateQueries({ queryKey: ["health-capabilities"] }); });
    await settle();
    const input = await question();
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(calls).toEqual([]);
    expect(container.textContent).toContain(reason);
  });

  it("filters unavailable Compare strategies and prevents judge and graph-build calls", async () => {
    await render(<Compare />);
    const judge = container.querySelector<HTMLInputElement>('input[role="switch"]')!;
    expect(judge.disabled).toBe(true);
    expect(container.querySelectorAll('article[aria-disabled="true"]').length).toBe(2);
    expect(container.textContent).toContain(reason);
    const build = [...container.querySelectorAll("button")].find((b) => b.title === reason)!;
    expect(build.disabled).toBe(true);
    await act(async () => build.click());
    await question();
    await act(async () => button("Compare").click());
    await settle();
    expect(calls).toEqual([{ url: "/compare/strategies", body: { question: "question", strategies: ["classic"] } }]);
  });

  it("honors graph_build independently of the graph strategy", async () => {
    health!.capabilities!.graph = { enabled: true, reason: null };
    await render(<Compare />);
    expect(container.querySelectorAll('article[aria-disabled="true"]').length).toBe(1);
    expect([...container.querySelectorAll("button")].some((b) => b.disabled && b.title === reason)).toBe(true);
  });

  it("disables evaluation launch, history reruns and unavailable options", async () => {
    await render(<EvalRuns />);
    expect(button("Run Evaluation").disabled).toBe(true);
    expect(button("Run Evaluation").title).toBe(reason);
    expect(button("Re-run").disabled).toBe(true);
    expect(container.querySelector<HTMLOptionElement>('option[value="graph"]')!.disabled).toBe(true);
    expect(container.textContent).toContain(reason);
    await act(async () => button("Run Evaluation").click());
    expect(calls).toEqual([]);
  });

  it("disables advisor validation when the judge is unavailable", async () => {
    const advice: AdviseResponse = {
      profile: {
        corpus_size: "tiny", corpus_size_docs: 1, document_types: ["md"], languages: ["en"],
        question_mix: { single_fact: 1, relational_multi_hop: 0, exploratory_multi_step: 0 },
        latency_budget_ms: null, cost_sensitivity: "medium", data_freshness: "static",
        compliance: [], data_residency: null, entity_richness: "medium", example_questions: ["question"],
        source: "heuristic", overridden_fields: [],
      },
      recommendations: [], top_strategy: "classic", compliance_notes: [],
      hybrid_routing: { recommended: false, rationale: "test", routes: [] },
      next_step: { summary: "test", validate_endpoint: "/advisor/validate", suggested_strategies: ["classic", "graph", "agentic"], example_payload: {} },
    };
    await render(<ValidateSection advice={advice} />);
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(checkboxes.map((c) => c.disabled)).toEqual([false, true, true]);
    const run = container.querySelector<HTMLButtonElement>("button.btn-primary")!;
    expect(run.disabled).toBe(true);
    expect(run.title).toBe(reason);
    expect(container.querySelector('[role="status"]')!.textContent).toBe(reason);
    await act(async () => run.click());
    expect(calls).toEqual([]);
  });

  it.each(["missing", "unreachable"])("preserves older behavior when health capabilities are %s", async (mode) => {
    if (mode === "missing") delete health!.capabilities;
    else health = null;
    await render(<Ask />);
    expect(button("Graph").disabled).toBe(false);
    expect(button("Agentic").disabled).toBe(false);
    await act(async () => button("Graph").click());
    expect(button("Graph").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps a feature disabled even if its reason is missing", async () => {
    health!.capabilities!.graph = { enabled: false, reason: null };
    await render(<Ask />);
    expect(button("Graph").disabled).toBe(true);
    expect(button("Graph").title.length).toBeGreaterThan(0);
  });
});
