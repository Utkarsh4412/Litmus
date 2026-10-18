import { STAGE_COLORS } from "../../design-system/chartPalette";
import PlotWell from "../../design-system/PlotWell";
import { formatLatency } from "../../lib/formatting";
import { useI18n, type MessageKey } from "../../lib/i18n";
import { latencyStages } from "./compareInsights";
import { StrategyOut } from "./constants";

/**
 * Stacked bar of the per-request latency stages. The legend beneath lists every
 * value, so nothing depends on hovering or on colour alone.
 */
export function LatencyBar({ result }: { result: StrategyOut }) {
  const { t, locale } = useI18n();
  const stages = latencyStages(result);
  if (!stages || stages.length === 0) return null;
  const total = stages.reduce((s, x) => s + x.ms, 0);
  const label = (stage: string) => t(`compare.stage.${stage}` as MessageKey);
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-[11px] text-zinc-500">{t("compare.latencyBreakdown")}</figcaption>
      <PlotWell><div className="flex h-2.5 w-full gap-[2px]" aria-hidden="true">
        {stages.map(({ stage, ms }, i) => (
          <div
            key={stage}
            title={`${label(stage)}: ${formatLatency(ms, locale)}`}
            className={`h-full ${i === 0 ? "rounded-l-[4px]" : ""} ${i === stages.length - 1 ? "rounded-r-[4px]" : ""}`}
            style={{ width: `${(ms / total) * 100}%`, minWidth: 2, backgroundColor: STAGE_COLORS[stage] }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
        {stages.map(({ stage, ms }) => (
          <li key={stage} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: STAGE_COLORS[stage] }} />
            {label(stage)} <span className="font-mono tabular-nums text-zinc-300">{formatLatency(ms, locale)}</span>
          </li>
        ))}
      </ul></PlotWell>
    </figure>
  );
}
