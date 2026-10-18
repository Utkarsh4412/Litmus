import { useI18n } from "../../lib/i18n";
import { StrategyRecommendation } from "./api";
import { META } from "./constants";

export function RecommendationCard({ rec, top }: { rec: StrategyRecommendation; top: boolean }) {
  const { t, formatNumber } = useI18n();
  const m = META[rec.strategy];
  const c = rec.suggested_config;
  const title = t(m.title);
  return (
    <article className={`card p-4 flex flex-col gap-3 ${top ? m.border : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-500">#{rec.rank}</span>
        <h3 className={`font-semibold ${m.text}`}>{title}</h3>
        {top && <span className="chip !text-accent !border-accent/40">{t("advisor.recommended")}</span>}
        <span className="ml-auto font-mono text-sm text-white">{formatNumber(rec.score)}/100</span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rec.score}
        aria-label={t("advisor.scoreAria", { title })}
      >
        <div className={`h-full ${m.bar} transition-all`} style={{ width: `${rec.score}%` }} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{t("advisor.why")}</h4>
          <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
            {rec.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{t("advisor.tradeoffs")}</h4>
          <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1">
            {rec.tradeoffs.map((tradeoff) => (
              <li key={tradeoff}>{tradeoff}</li>
            ))}
          </ul>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">
          {t("advisor.suggestedConfig")}
        </summary>
        <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 font-mono text-xs text-zinc-300">
          <div>RETRIEVAL_TOP_K = {c.retrieval_top_k}</div>
          <div>RERANK_TOP_K = {c.rerank_top_k}</div>
          <div>rerank = {c.rerank ? t("advisor.on") : t("advisor.off")}</div>
          <div>CHUNK_SIZE_TOKENS = {c.chunk_size_tokens}</div>
          <div>CHUNK_OVERLAP_TOKENS = {c.chunk_overlap_tokens}</div>
          <div className="break-all">EMBEDDING_MODEL = {c.embedding_model}</div>
          {Object.entries(c.models).map(([stage, model]) => (
            <div key={stage} className="break-all">
              {stage}: {model}
            </div>
          ))}
          <div>
            {t("advisor.relative", {
              cost: formatNumber(c.expected_relative_cost),
              latency: formatNumber(c.expected_relative_latency),
            })}
          </div>
        </div>
        {c.notes.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-zinc-400 space-y-1">
            {c.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}
