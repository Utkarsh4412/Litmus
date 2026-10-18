import { useCapabilities } from "../../lib/api/useCapabilities";
import { useQuery } from "@tanstack/react-query";
import { startTransition, useId, useMemo, useState } from "react";
import ErrorAlert from "../../design-system/ErrorAlert";
import { errorMessage, get } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { type StrategyName } from "../answer/types";
import { compareStrategies, type CompareStrategiesRequest, type CompareStrategiesResponse } from "./api";
import { bestValues } from "./compareInsights";
import { ALL_TYPES, GraphStats, QuestionSource, SAMPLES, STRATEGIES } from "./constants";
import { GoldenPicker } from "./GoldenPicker";
import { AdminKeyField, GraphStatus } from "./GraphControls";
import { ReferenceFields } from "./ReferenceFields";
import { StrategyCard } from "./StrategyCard";
import { SummaryTable } from "./SummaryTable";
import { useGraphBuild } from "./useGraphBuild";

/** Split "a.md, b.md" into ["a.md", "b.md"]. */
export function parseDocList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Compare() {
  const { t } = useI18n();
  const unavailable = useCapabilities();
  const judgeReason = unavailable("judge");
  const availableStrategies = STRATEGIES.filter((strategy) => !unavailable(strategy));
  const [q, setQ] = useState("");
  const [source, setSource] = useState<QuestionSource>("own");
  const [visibleStrategy, setVisibleStrategy] = useState<StrategyName>("classic");
  const [dataset, setDataset] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [goldenId, setGoldenId] = useState("");
  const [evaluate, setEvaluate] = useState(false);
  const [idealAnswer, setIdealAnswer] = useState("");
  const [relevantDocs, setRelevantDocs] = useState("");
  const [res, setRes] = useState<CompareStrategiesResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const evaluateHelpId = useId();
  const { data: graphStats = null, refetch: refetchStats } = useQuery({
    queryKey: ["graph-stats"],
    queryFn: () => get<GraphStats>("/graph/stats"),
  });

  const { buildingGraph, buildProgress, buildGraph } = useGraphBuild(refetchStats, setErr, setShowAdminKey);

  const golden = source === "golden";
  const canRun = !busy && availableStrategies.length > 0 && !!q.trim() && (!golden || !!goldenId);

  function buildRequest(): CompareStrategiesRequest {
    const req: CompareStrategiesRequest = { question: q, strategies: availableStrategies };
    if (!evaluate || judgeReason) return req;
    req.evaluate = true;
    if (golden) {
      req.golden = { dataset, id: goldenId };
    } else {
      const docs = parseDocList(relevantDocs);
      if (idealAnswer.trim() || docs.length > 0) {
        req.reference = {
          ...(idealAnswer.trim() ? { ideal_answer: idealAnswer.trim() } : {}),
          ...(docs.length > 0 ? { relevant_doc_ids: docs } : {}),
        };
      }
    }
    return req;
  }

  async function run() {
    if (!canRun) return;
    setErr(null);
    setBusy(true);
    setRes(null);
    try {
      const response = await compareStrategies(buildRequest());
      startTransition(() => setRes(response));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const results = useMemo(() => res?.results ?? [], [res]);
  const best = useMemo(() => bestValues(results), [results]);
  const byName = (n: StrategyName) => results.find((r) => r.strategy === n);

  function switchSource(next: QuestionSource) {
    setSource(next);
    setQ("");
    setGoldenId("");
  }

  return (
    <div className="compare-page flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="display text-4xl font-semibold text-white">{t("compare.title")}</h1>
        <p className="text-sm text-zinc-400">{t("compare.subtitle")}</p>
      </header>

      <div className="card flex flex-col gap-3 p-3 sm:p-4">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{t("compare.sourceLabel")}</legend>
          {(["own", "golden"] as const).map((s) => (
            <label
              key={s}
              className={`chip cursor-pointer min-h-[36px] focus-within:ring-2 focus-within:ring-accent/50 ${
                source === s ? "!border-accent/60 !text-white" : "hover:text-white"
              }`}
            >
              <input
                type="radio"
                name="compare-source"
                value={s}
                checked={source === s}
                onChange={() => switchSource(s)}
                className="sr-only"
              />
              {t(s === "own" ? "compare.source.own" : "compare.source.golden")}
            </label>
          ))}
        </fieldset>

        {golden && (
          <GoldenPicker
            dataset={dataset}
            onDataset={(d) => {
              setDataset(d);
              setGoldenId("");
              setQ("");
              setTypeFilter(ALL_TYPES);
            }}
            typeFilter={typeFilter}
            onTypeFilter={setTypeFilter}
            selectedId={goldenId}
            onSelect={(id, question) => {
              setGoldenId(id);
              setQ(question);
            }}
          />
        )}

        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("compare.question")}</span>
          <textarea
            value={q}
            readOnly={golden}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
            rows={2}
            placeholder={golden ? t("compare.goldenPick") : t("compare.placeholder")}
            className={`input resize-none text-sm ${golden ? "opacity-80" : ""}`}
          />
        </label>

        {!golden && (
          <div className="flex flex-wrap gap-1">
            {SAMPLES.map((key) => {
              const s = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQ(s)}
                  className="chip text-xs text-left hover:text-white hover:border-accent/40 min-h-[36px]"
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-200 cursor-pointer self-start min-h-[36px]">
            <input
              type="checkbox"
              role="switch"
              checked={evaluate && !judgeReason}
              disabled={!!judgeReason}
              onChange={(e) => setEvaluate(e.target.checked)}
              aria-describedby={evaluateHelpId}
              className="h-4 w-4 accent-[#e8a93c]"
            />
            {t("compare.evaluate")}
          </label>
          <p id={evaluateHelpId} className="text-xs text-zinc-500 max-w-2xl">
            {judgeReason ?? t("compare.evaluateHelp")}
          </p>
          {evaluate && !judgeReason && golden && (
            <p className="text-xs text-zinc-400">{t("compare.goldenReference")}</p>
          )}
          {evaluate && !judgeReason && !golden && (
            <ReferenceFields
              idealAnswer={idealAnswer}
              onIdealAnswer={setIdealAnswer}
              relevantDocs={relevantDocs}
              onRelevantDocs={setRelevantDocs}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <details className="graph-index">
            <summary className="text-sm text-zinc-400 cursor-pointer">{t("compare.graphIndex")}</summary>
          <GraphStatus
            stats={graphStats}
            busy={buildingGraph}
            progress={buildProgress}
            onBuild={buildGraph}
          />
          <AdminKeyField open={showAdminKey} onToggle={setShowAdminKey} />
          </details>
          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="btn-primary text-sm px-4 py-2 min-h-[44px] w-full sm:w-auto"
          >
            {busy ? t("common.running") : t("compare.run")}
          </button>
        </div>
        {err && (
          <ErrorAlert
            error={err}
            onRetry={() => {
              setErr(null);
              run();
            }}
            onDismiss={() => setErr(null)}
          />
        )}
      </div>

      {busy && evaluate && !judgeReason && <p className="text-xs text-zinc-400" role="status">{t("compare.evaluating")}</p>}

      {results.length > 1 && <SummaryTable results={results} best={best} />}

      <div className="strategy-tabs" role="tablist" aria-label={t("ask.strategy")}>
        {STRATEGIES.map((s, index) => <button key={s} id={`strategy-tab-${s}`} role="tab" aria-controls={`strategy-panel-${s}`} aria-selected={visibleStrategy === s} tabIndex={visibleStrategy === s ? 0 : -1} className="btn-ghost" onClick={() => setVisibleStrategy(s)} onKeyDown={event => {
          const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
          if (next < 0) return;
          event.preventDefault(); setVisibleStrategy(STRATEGIES[next]);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next].focus();
        }}>{t(`strategy.${s}.short`)}</button>)}
      </div>
      <div className="strategy-columns">
        {STRATEGIES.map((s) => (
          <div key={s} id={`strategy-panel-${s}`} role="tabpanel" aria-labelledby={`strategy-tab-${s}`} className={`strategy-pane ${visibleStrategy === s ? "selected" : ""}`}>
          <StrategyCard key={s} name={s} result={byName(s)} loading={busy} best={best} />
          </div>
        ))}
      </div>
    </div>
  );
}
