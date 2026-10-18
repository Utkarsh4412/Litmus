import { useI18n } from "../../lib/i18n";
import { type EvalRun } from "./api";
import { questionTypeBreakdown, type ConfigRow, type QualityMetric } from "./dashboard";
import { AggCell, StrategyKey } from "./shared";

export function BreakdownTable({
  rows,
  details,
  metric,
  metricLabel,
  loading,
}: {
  rows: ConfigRow[];
  details: Record<string, EvalRun | undefined>;
  metric: QualityMetric;
  metricLabel: string;
  loading: boolean;
}) {
  const { t } = useI18n();
  const table = questionTypeBreakdown(rows, details, metric);
  return (
    <section className="card !p-4 flex flex-col gap-2" aria-labelledby="dash-breakdown-title">
      <h2 id="dash-breakdown-title" className="text-sm font-semibold text-white">
        {t("dash.breakdown", { metric: metricLabel })}
      </h2>
      {table.rows.length === 0 ? (
        <p className="text-xs text-zinc-500">{loading ? t("dash.breakdownLoading") : t("dash.breakdownEmpty")}</p>
      ) : (
        <div className="overflow-x-auto -mx-1" tabIndex={0} role="region" aria-labelledby="dash-breakdown-title" data-scroll>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500">
                <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.config")}</th>
                {table.types.map((ty) => (
                  <th key={ty} scope="col" className="py-1.5 px-1 font-medium font-mono">{ty}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {table.rows.map((r) => (
                <tr key={r.key} className="border-t border-bg-border">
                  <th scope="row" className="py-1.5 px-1 text-left font-normal text-zinc-200">
                    <StrategyKey strategy={r.strategy} label={r.label} />
                  </th>
                  {table.types.map((ty) => (
                    <td key={ty} className="py-1.5 px-1">
                      <AggCell agg={r.cells[ty]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
