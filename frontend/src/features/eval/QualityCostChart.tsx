import { CartesianGrid, Tooltip as ChartTooltip, LabelList, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import { CHART_INK, strategyColor } from "../../design-system/chartPalette";
import PlotWell from "../../design-system/PlotWell";
import { formatScore } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { useAxisFormat } from "./axisFormat";
import { scatterPoints, seriesByStrategy, type ConfigRow, type CostAxis, type QualityMetric, type ScatterPoint } from "./dashboard";

export function QualityCostChart({
  rows,
  metric,
  axis,
  metricLabel,
  axisLabel,
}: {
  rows: ConfigRow[];
  metric: QualityMetric;
  axis: CostAxis;
  metricLabel: string;
  axisLabel: string;
}) {
  const { t, locale } = useI18n();
  const fmtX = useAxisFormat();
  const { points, missing } = scatterPoints(rows, metric, axis);
  // One series per strategy, so colour (and the legend) follows the strategy.
  const series = seriesByStrategy(points);

  return (
    <section className="card !p-4 flex flex-col gap-2" aria-labelledby="dash-chart-title">
      <h2 id="dash-chart-title" className="text-sm font-semibold text-white">
        {t("dash.chartTitle", { metric: metricLabel, axis: axisLabel })}
      </h2>
      {points.length === 0 ? (
        <p className="text-sm text-zinc-400">{t("dash.noPoints")}</p>
      ) : (
        <PlotWell><div role="img" aria-label={t("dash.chartAria", { metric: metricLabel, axis: axisLabel })} className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 24, bottom: 28, left: 4 }}>
              <CartesianGrid stroke={CHART_INK.grid} strokeWidth={1} />
              <XAxis
                type="number"
                dataKey="x"
                name={axisLabel}
                domain={[0, "auto"]}
                tickFormatter={(v: number) => fmtX(axis, v)}
                stroke={CHART_INK.axis}
                tick={{ fill: CHART_INK.muted, fontSize: 11 }}
                label={{ value: axisLabel, position: "insideBottom", offset: -16, fill: CHART_INK.muted, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={metricLabel}
                domain={[0, 1]}
                tickFormatter={(v: number) => formatScore(v, 1, locale)}
                stroke={CHART_INK.axis}
                tick={{ fill: CHART_INK.muted, fontSize: 11 }}
                width={36}
              />
              <ZAxis range={[90, 90]} />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as ScatterPoint | undefined) : undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-md border border-bg-border bg-bg-elevated px-3 py-2 text-xs shadow-lg">
                      <div className="text-white font-semibold text-sm tabular-nums">
                        {formatScore(p.y, 3, locale)}
                        {p.std != null && <span className="text-zinc-400 font-normal"> ± {formatScore(p.std, 3, locale)}</span>}
                      </div>
                      <div className="text-zinc-300 tabular-nums">{fmtX(axis, p.x)}</div>
                      <div className="text-zinc-400 mt-1 flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-0.5 w-3" style={{ backgroundColor: strategyColor(p.strategy) }} />
                        {p.label}
                      </div>
                      <div className="text-zinc-500">{t("dash.pointN", { n: p.n })}</div>
                    </div>
                  );
                }}
              />
              {series.map(([strategy, pts]) => (
                <Scatter
                  key={strategy}
                  name={strategy}
                  data={pts}
                  fill={strategyColor(strategy)}
                  stroke={CHART_INK.surface}
                  strokeWidth={2}
                  isAnimationActive={false}
                  shape={(props: unknown) => {
                    const { cx, cy, fill, payload } = props as { cx: number; cy: number; fill: string; payload: ScatterPoint };
                    return <><title>{`${payload.label}: ${metricLabel} ${formatScore(payload.y, 3, locale)}, ${axisLabel} ${fmtX(axis, payload.x)}`}</title><circle cx={cx} cy={cy} r={Math.sqrt(90 / Math.PI)} fill={fill} stroke={CHART_INK.surface} strokeWidth={2} /></>;
                  }}
                >
                  <LabelList
                    dataKey="strategy"
                    position="top"
                    offset={8}
                    style={{ fill: CHART_INK.secondary, fontSize: 10 }}
                  />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div></PlotWell>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-zinc-500">{t("dash.missing", { list: missing.join("; ") })}</p>
      )}
    </section>
  );
}
