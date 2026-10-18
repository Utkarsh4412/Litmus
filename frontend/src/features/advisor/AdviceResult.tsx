import { formatLatency } from "../../lib/formatting";
import { useI18n, type MessageKey } from "../../lib/i18n";
import { AdviseResponse } from "./api";
import { FRESHNESS_LABEL, LEVEL_LABEL, META, QUESTION_TYPE_LABEL, SIZE_LABEL } from "./constants";
import { RecommendationCard } from "./RecommendationCard";

export function AdviceResult({ result }: { result: AdviseResponse }) {
  const { t, locale, formatNumber } = useI18n();
  const p = result.profile;
  const mix = p.question_mix;
  const label = <T extends string>(map: Record<T, MessageKey>, v: T) => (map[v] ? t(map[v]) : v);
  return (
    <section className="flex flex-col gap-4">
      <div className="card p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{t("advisor.profile")}</h2>
          <span className="chip" title={t("advisor.profileSourceTitle")}>
            {p.source === "llm" ? t("advisor.sourceLlm") : t("advisor.sourceHeuristic")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="chip">
            {t("advisor.chip.corpus", { size: label(SIZE_LABEL, p.corpus_size) })}
            {p.corpus_size_docs != null
              ? t("advisor.chip.docs", { count: formatNumber(p.corpus_size_docs) })
              : ""}
          </span>
          <span className="chip">
            {t("advisor.chip.languages", { list: p.languages.join(", ") || "?" })}
          </span>
          <span className="chip">
            {t("advisor.chip.latency", {
              value:
                p.latency_budget_ms != null
                  ? formatLatency(p.latency_budget_ms, locale)
                  : t("advisor.notStated"),
            })}
          </span>
          <span className="chip">
            {t("advisor.chip.cost", { value: label(LEVEL_LABEL, p.cost_sensitivity) })}
          </span>
          <span className="chip">
            {t("advisor.chip.freshness", { value: label(FRESHNESS_LABEL, p.data_freshness) })}
          </span>
          <span className="chip">
            {t("advisor.chip.entities", { value: label(LEVEL_LABEL, p.entity_richness) })}
          </span>
          {p.document_types.map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
          {p.compliance.map((c) => (
            <span key={c} className="chip !border-amber-500/40 !text-amber-200">
              {c}
            </span>
          ))}
        </div>
        <div className="text-xs text-zinc-400">
          {t("advisor.mix", {
            single: formatNumber(mix.single_fact),
            relational: formatNumber(mix.relational_multi_hop),
            exploratory: formatNumber(mix.exploratory_multi_step),
          })}
          {p.overridden_fields.length > 0 && (
            <span className="text-zinc-500">
              {t("advisor.overridden", { fields: p.overridden_fields.join(", ") })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {result.recommendations.map((r) => (
          <RecommendationCard key={r.strategy} rec={r} top={r.strategy === result.top_strategy} />
        ))}
      </div>

      {result.hybrid_routing.recommended && (
        <div className="card p-4 flex flex-col gap-2 !border-accent/40">
          <h3 className="text-sm font-semibold text-white">{t("advisor.hybrid")}</h3>
          <p className="text-sm text-zinc-300">{result.hybrid_routing.rationale}</p>
          <ul className="text-sm text-zinc-300 space-y-0.5">
            {result.hybrid_routing.routes.map((route) => (
              <li key={route.question_type}>
                {label(QUESTION_TYPE_LABEL, route.question_type)} (
                {formatNumber(route.share_pct / 100, { style: "percent" })}) →{" "}
                <span className={META[route.strategy].text}>{t(META[route.strategy].title)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.compliance_notes.length > 0 && (
        <div className="card p-4 flex flex-col gap-2 !border-amber-500/30">
          <h3 className="text-sm font-semibold text-white">{t("advisor.notes")}</h3>
          <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
            {result.compliance_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-4 text-sm text-zinc-300 !bg-accent-soft/40 !border-accent/30">
        <span className="font-semibold text-accent">{t("advisor.nextStep")}</span>
        {result.next_step.summary}
      </div>
    </section>
  );
}
