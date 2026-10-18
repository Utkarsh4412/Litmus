import { formatTokens } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { COMPARE_METRICS, totalLatency } from "./compareInsights";
import { Best, StrategyOut } from "./constants";
import { BestMark, useMetricText } from "./SummaryTable";

export function MetricTile({
  label,
  value,
  isBest,
  note,
}: {
  label: string;
  value: string;
  isBest?: boolean;
  note?: string;
}) {
  return (
    <div className="rounded-md border border-bg-border bg-bg-elevated px-2 py-1.5" title={note}>
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${isBest ? "text-white font-semibold" : "text-zinc-200"}`}>
        {value}
        {isBest && <BestMark />}
      </div>
    </div>
  );
}

export const byId = (id: string) => COMPARE_METRICS.find((m) => m.id === id)!;

export function EvaluationBlock({ result, best }: { result: StrategyOut; best: Best }) {
  const { t } = useI18n();
  const text = useMetricText();
  const ev = result.evaluation;
  if (!ev) return null;

  if (ev.status === "refusal_checked") {
    return (
      <p className="text-xs text-zinc-300">
        {ev.correct_refusal === 1 ? t("compare.refusalCorrect") : t("compare.refusalWrong")}
      </p>
    );
  }

  const tiles: { id: string; note?: string }[] = [
    { id: "faithfulness" },
    { id: "answer_relevance" },
    { id: "answer_correctness", note: ev.has_reference_answer ? undefined : t("compare.noReference") },
    { id: "recall@5", note: ev.retrieval ? undefined : t("compare.noRelevantDocs") },
    { id: "mrr", note: ev.retrieval ? undefined : t("compare.noRelevantDocs") },
  ];
  return (
    <section className="flex flex-col gap-1.5" aria-label={t("compare.scores")}>
      {ev.status === "judge_failed" && (
        <p role="status" className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
          {t("compare.judgeFailed", { error: ev.error ?? ev.error_type ?? t("compare.unknownError") })}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {tiles.map(({ id, note }) => {
          const m = byId(id);
          return (
            <MetricTile
              key={id}
              label={t(m.label)}
              value={text(m, m.value(result))}
              isBest={best[id]?.has(result.strategy)}
              note={note}
            />
          );
        })}
      </div>
      {!ev.retrieval && <p className="text-[11px] text-zinc-500">{t("compare.noRelevantDocs")}</p>}
    </section>
  );
}

export function CostBlock({ result, best }: { result: StrategyOut; best: Best }) {
  const { t, locale } = useI18n();
  const text = useMetricText();
  const metrics = result.metrics;
  const inTok = metrics?.input_tokens ?? result.input_tokens;
  const outTok = metrics?.output_tokens ?? result.output_tokens;
  const latency = byId("latency");
  const cost = byId("cost");
  const calls = byId("llm_calls");
  return (
    <section className="flex flex-col gap-1.5" aria-label={t("compare.cost")}>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricTile
          label={t("meta.latency")}
          value={text(latency, totalLatency(result))}
          isBest={best.latency?.has(result.strategy)}
        />
        <MetricTile
          label={t("meta.tokens")}
          value={t("compare.tokensInOut", { input: formatTokens(inTok, locale), output: formatTokens(outTok, locale) })}
          isBest={best.tokens?.has(result.strategy)}
        />
        {metrics && (
          <MetricTile
            label={t(cost.label)}
            value={text(cost, cost.value(result))}
            isBest={best.cost?.has(result.strategy)}
          />
        )}
        {metrics && (
          <MetricTile
            label={t(calls.label)}
            value={text(calls, calls.value(result))}
            isBest={best.llm_calls?.has(result.strategy)}
          />
        )}
      </div>
    </section>
  );
}
