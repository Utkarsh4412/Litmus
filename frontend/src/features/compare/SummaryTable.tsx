import { formatLatency, formatScore, formatTokens, formatUsd } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { COMPARE_METRICS, isFailedRow, type CompareMetric } from "./compareInsights";
import { Best, META, STRATEGIES, StrategyOut } from "./constants";

/** Format one comparison metric value for display. */
export function useMetricText() {
  const { t, locale, formatNumber } = useI18n();
  return (m: CompareMetric, v: number | null | undefined): string => {
    if (v == null || !Number.isFinite(v)) return t("compare.notMeasured");
    switch (m.kind) {
      case "score":
        return formatScore(v, 2, locale);
      case "latency":
        return formatLatency(v, locale);
      case "tokens":
        return formatTokens(v, locale);
      case "usd":
        return formatUsd(v, locale);
      default:
        return formatNumber(v);
    }
  };
}

export function BestMark() {
  const { t } = useI18n();
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-accent/50 bg-accent/10 px-1.5 text-[10px] font-semibold text-accent">
      <span aria-hidden="true">★</span>
      <span aria-hidden="true">{t("compare.best")}</span>
      <span className="sr-only">{t("compare.bestAria")}</span>
    </span>
  );
}

/** Metrics as rows, strategies as columns; best measured value per metric marked. */
export function SummaryTable({ results, best }: { results: StrategyOut[]; best: Best }) {
  const { t } = useI18n();
  const text = useMetricText();
  const shown = COMPARE_METRICS.filter((m) => results.some((r) => m.value(r) != null && !isFailedRow(r)));
  if (shown.length === 0) return null;
  const cols = STRATEGIES.filter((s) => results.some((r) => r.strategy === s));
  return (
    <section className="card !p-3 sm:!p-4 flex flex-col gap-2" aria-labelledby="compare-summary">
      <h2 id="compare-summary" className="text-sm font-semibold text-white">{t("compare.summary")}</h2>
      <p className="text-xs text-zinc-500">{t("compare.summaryNote")}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-500">
              <th scope="col" className="py-1.5 pr-3 font-medium">{t("compare.metric")}</th>
              {cols.map((s) => (
                <th key={s} scope="col" className="py-1.5 pr-3 font-medium text-zinc-300">
                  {t(META[s].short)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id} className="border-t border-bg-border">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-zinc-400">{t(m.label)}</th>
                {cols.map((s) => {
                  const row = results.find((r) => r.strategy === s)!;
                  const isBest = best[m.id]?.has(s);
                  return (
                    <td key={s} className={`py-1.5 pr-3 font-mono tabular-nums ${isBest ? "text-white font-semibold" : "text-zinc-300"}`}>
                      {isFailedRow(row) ? "–" : text(m, m.value(row))}
                      {isBest && <BestMark />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
