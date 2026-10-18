import { useI18n } from "../../lib/i18n";
import { type TraceStep } from "../answer/types";
import { StrategyOut } from "./constants";

export function ExtraDetails({
  name,
  extra,
}: {
  name: StrategyOut["strategy"];
  extra: Record<string, unknown>;
}) {
  const { t } = useI18n();
  if (name === "graph") {
    return (
      <details className="text-xs">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">
          {t("compare.kgDetails")}
        </summary>
        <div className="mt-3 space-y-3">
          {Array.isArray(extra.entities) && extra.entities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-semibold">
                {t("compare.extractedEntities")}
              </div>
              <div className="flex flex-wrap gap-1">
                {extra.entities.map((e, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono"
                    >
                      {String(e)}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Array.isArray(extra.related_entities) && extra.related_entities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-semibold">
                {t("compare.relatedEntities")}
              </div>
              <div className="flex flex-wrap gap-1">
                {extra.related_entities.map((e, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-200 text-[10px]"
                    >
                      {String(e)}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {typeof extra.subgraph === "string" && extra.subgraph.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-semibold">
                {t("compare.kgStructure")}
              </div>
              <pre className="bg-bg-elevated rounded-md p-2 overflow-x-auto text-[10px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {String(extra.subgraph)}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">
        {t("compare.strategyDetails")}
      </summary>
      <pre className="mt-2 bg-bg-elevated rounded-md p-2 overflow-x-auto text-[11px] text-zinc-300 whitespace-pre-wrap">
        {JSON.stringify(extra, null, 2)}
      </pre>
    </details>
  );
}

export function TraceDetails({ trace }: { trace: TraceStep[] }) {
  const { t, tp } = useI18n();
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none font-semibold">
        🔍 {tp("compare.trace", trace.length)}
      </summary>
      <div className="mt-2 space-y-1.5 text-[10px]">
        {trace.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-shrink-0 text-zinc-600 font-mono">{String(i + 1).padStart(2, "0")}.</div>
            <div className="flex-1 bg-zinc-900/50 border border-zinc-700/50 rounded px-2 py-1">
              <div className="font-mono text-accent">{step.step ?? t("common.step")}</div>
              <div className="text-zinc-400 mt-0.5">{JSON.stringify(rest(step))}</div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function rest(t: TraceStep) {
  const r: Record<string, unknown> = {};
  for (const k of Object.keys(t)) if (k !== "step") r[k] = (t as Record<string, unknown>)[k];
  return r;
}
