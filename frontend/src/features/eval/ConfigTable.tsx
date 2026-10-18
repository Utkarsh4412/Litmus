import { formatLatency, formatUsd } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { useAxisFormat } from "./axisFormat";
import { QUALITY_METRICS, axisValue, type ConfigRow } from "./dashboard";
import { AggCell, RegressionBadge, StrategyKey } from "./shared";

export function ConfigTable({ rows }: { rows: ConfigRow[] }) {
  const { t, locale, formatNumber } = useI18n();
  const fmtX = useAxisFormat();
  const na = <span className="text-zinc-600">{t("common.na")}</span>;
  return (
    <section className="card !p-4 flex flex-col gap-2" aria-labelledby="dash-table-title">
      <h2 id="dash-table-title" className="text-sm font-semibold text-white">{t("dash.table")}</h2>
      <p className="text-xs text-zinc-500">{t("dash.meanStd")}</p>
      <div className="overflow-x-auto -mx-1" tabIndex={0} role="region" aria-labelledby="dash-table-title" data-scroll>
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.config")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.runs")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.n")}</th>
              {QUALITY_METRICS.map((m) => (
                <th key={m.id} scope="col" className="py-1.5 px-1 font-medium">{t(m.label)}</th>
              ))}
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.tokens")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.cost")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.p50")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.p95")}</th>
              <th scope="col" className="py-1.5 px-1 font-medium">{t("dash.col.regression")}</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-bg-border align-top">
                <th scope="row" className="py-1.5 px-1 text-left font-normal text-zinc-200 max-w-[16rem]">
                  <StrategyKey strategy={r.strategy} label={r.label} />
                </th>
                <td className="py-1.5 px-1 tabular-nums">{formatNumber(r.runCount)}</td>
                <td className="py-1.5 px-1 tabular-nums">
                  {formatNumber(r.nScored)} / {formatNumber(r.n)}
                </td>
                {QUALITY_METRICS.map((m) => (
                  <td key={m.id} className="py-1.5 px-1">
                    <AggCell agg={r.metrics[m.id]} />
                  </td>
                ))}
                <td className="py-1.5 px-1 tabular-nums">
                  {axisValue(r, "tokens") != null ? fmtX("tokens", r.tokensPerQuestion!) : na}
                </td>
                <td className="py-1.5 px-1 tabular-nums">
                  {r.costPerQuestion != null ? formatUsd(r.costPerQuestion, locale) : na}
                </td>
                <td className="py-1.5 px-1 tabular-nums">
                  {r.p50LatencyMs != null ? formatLatency(r.p50LatencyMs, locale) : na}
                </td>
                <td className="py-1.5 px-1 tabular-nums">
                  {r.p95LatencyMs != null ? formatLatency(r.p95LatencyMs, locale) : na}
                </td>
                <td className="py-1.5 px-1">
                  <RegressionBadge status={r.regression} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
