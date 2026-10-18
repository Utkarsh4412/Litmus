import { useQueries, useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import ErrorAlert from "../../design-system/ErrorAlert";
import LoadingSpinner from "../../design-system/LoadingSpinner";
import { errorMessage } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { BreakdownTable } from "./BreakdownTable";
import BaselineForRun from "./BaselineForRun";
import { ConfigTable } from "./ConfigTable";
import { QualityCostChart } from "./QualityCostChart";
import { getEvalRun, listEvalRuns, type EvalRun } from "./api";
import { COST_AXES, QUALITY_METRICS, datasetsOf, hasCostData, latestPerConfig, type CostAxis, type QualityMetric } from "./dashboard";

export const EMPTY_COMMAND = "python tools/run_eval.py --dataset golden_v3 --all";

/**
 * Overview tab of the Evaluation page: the latest run of every configuration of
 * one dataset, as a quality-vs-cost scatter, a table and a per-question-type
 * breakdown. It is the only place that ships the charting library, so the
 * Evaluation page loads it lazily.
 */
export default function EvalOverview() {
  const { t } = useI18n();
  const ids = { dataset: useId(), metric: useId(), axis: useId(), baseline: useId() };
  const runs = useQuery({ queryKey: ["runs"], queryFn: listEvalRuns });
  const datasets = useMemo(() => datasetsOf(runs.data ?? []), [runs.data]);
  const [picked, setPicked] = useState("");
  const dataset = picked && datasets.includes(picked) ? picked : (datasets[0] ?? "");
  const [metric, setMetric] = useState<QualityMetric>("faithfulness");
  const [axisChoice, setAxis] = useState<CostAxis>("tokens");
  const [baselineRun, setBaselineRun] = useState('');

  const rows = useMemo(() => latestPerConfig(runs.data ?? [], dataset), [runs.data, dataset]);
  const costAvailable = hasCostData(rows);
  const axis: CostAxis = axisChoice === "cost" && !costAvailable ? "tokens" : axisChoice;

  const detailQueries = useQueries({
    queries: rows.map((r) => ({
      queryKey: ["run", r.runId],
      queryFn: () => getEvalRun(r.runId),
      staleTime: Infinity,
    })),
  });
  const details = useMemo(() => {
    const out: Record<string, EvalRun | undefined> = {};
    rows.forEach((r, i) => (out[r.runId] = detailQueries[i]?.data));
    return out;
  }, [rows, detailQueries]);
  const detailsLoading = detailQueries.some((q) => q.isLoading);

  const metricLabel = t(QUALITY_METRICS.find((m) => m.id === metric)!.label);
  const axisLabel = t(COST_AXES.find((a) => a.id === axis)!.label);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <p className="text-sm text-zinc-400 max-w-2xl">{t("dash.subtitle")}</p>
        <p className="text-xs text-zinc-500 max-w-2xl">{t("dash.caption")}</p>
      </div>

      {runs.isLoading && <LoadingSpinner message={t("dash.loading")} />}
      {runs.error && (
        <ErrorAlert
          error={t("dash.loadFailed", { error: errorMessage(runs.error) })}
          onRetry={() => runs.refetch()}
        />
      )}

      {runs.isSuccess && datasets.length === 0 && (
        <div className="card text-center py-10 flex flex-col items-center gap-3">
          <h2 className="text-white font-semibold">{t("dash.empty")}</h2>
          <p className="text-zinc-400 text-sm max-w-md">{t("dash.emptyHelp")}</p>
          <code className="font-mono text-xs text-amber-200 bg-bg-elevated border border-bg-border rounded px-3 py-2 break-all">
            {EMPTY_COMMAND}
          </code>
        </div>
      )}

      {datasets.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 items-end">
            <label htmlFor={ids.dataset} className="flex flex-col gap-1 text-xs text-zinc-400">
              {t("dash.dataset")}
              <select id={ids.dataset} value={dataset} onChange={(e) => setPicked(e.target.value)} className="input !py-2 text-sm">
                {datasets.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label htmlFor={ids.metric} className="flex flex-col gap-1 text-xs text-zinc-400">
              {t("dash.quality")}
              <select
                id={ids.metric}
                value={metric}
                onChange={(e) => setMetric(e.target.value as QualityMetric)}
                className="input !py-2 text-sm"
              >
                {QUALITY_METRICS.map((m) => (
                  <option key={m.id} value={m.id}>{t(m.label)}</option>
                ))}
              </select>
            </label>
            <label htmlFor={ids.axis} className="flex flex-col gap-1 text-xs text-zinc-400">
              {t("dash.xAxis")}
              <select
                id={ids.axis}
                value={axis}
                onChange={(e) => setAxis(e.target.value as CostAxis)}
                className="input !py-2 text-sm"
              >
                {COST_AXES.filter((a) => a.id !== "cost" || costAvailable).map((a) => (
                  <option key={a.id} value={a.id}>{t(a.label)}</option>
                ))}
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <div className="card text-zinc-400 text-sm">{t("dash.emptyDataset")}</div>
          ) : (
            <>
              <section className="min-w-0">
                <label htmlFor={ids.baseline} className="flex flex-col gap-1 text-xs text-zinc-400">{t('visual.baselineRun')}
                  <select id={ids.baseline} className="input !py-2 text-sm" value={rows.some(row => row.runId === baselineRun) ? baselineRun : rows[0].runId} onChange={event => setBaselineRun(event.target.value)}>
                    {rows.map(row => <option key={row.runId} value={row.runId}>{row.label}</option>)}
                  </select>
                </label>
                <BaselineForRun runId={rows.some(row => row.runId === baselineRun) ? baselineRun : rows[0].runId} />
              </section>
              <QualityCostChart rows={rows} metric={metric} axis={axis} metricLabel={metricLabel} axisLabel={axisLabel} />
              <ConfigTable rows={rows} />
              <BreakdownTable
                rows={rows}
                details={details}
                metric={metric}
                metricLabel={metricLabel}
                loading={detailsLoading}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
