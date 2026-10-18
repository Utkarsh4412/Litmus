import { useCapabilities } from "../../lib/api/useCapabilities";
import { useId, useState } from "react";
import LoadingSpinner from "../../design-system/LoadingSpinner";
import { useI18n } from "../../lib/i18n";
import { GroundingBadge } from "../answer/Citations";
import { type StrategyName } from "../answer/types";
import { ExtraDetails, TraceDetails } from "./AnswerDetails";
import { isFailedRow } from "./compareInsights";
import { Best, META, StrategyOut } from "./constants";
import { CostBlock, EvaluationBlock } from "./StrategyMetrics";
import { WhyPanel } from "./WhyPanel";
import AnswerVisuals from "../answer/AnswerVisuals";

export function StrategyCard({
  name,
  result,
  loading,
  best,
}: {
  name: StrategyName;
  result?: StrategyOut;
  loading: boolean;
  best: Best;
}) {
  const { t } = useI18n();
  const unavailable = useCapabilities();
  const disabledReason = unavailable(name);
  const m = META[name];
  const [expanded, setExpanded] = useState(false);
  const anchorPrefix = useId().replace(/:/g, "");
  const failed = result ? isFailedRow(result) : false;

  return (
    <article
      className="strategy-sheet card flex flex-col gap-3 !p-3 sm:!p-4"
      aria-labelledby={`${anchorPrefix}-title`}
      aria-disabled={disabledReason ? true : undefined}
    >
      <header className="relative flex flex-col gap-0.5">
        <h2 id={`${anchorPrefix}-title`} className="text-sm font-bold text-white">{t(m.title)}</h2>
        <div className="text-[11px] text-zinc-500 font-mono">{disabledReason ?? t(m.tagline)}</div>
      </header>

      {loading && !result && !disabledReason && <LoadingSpinner />}

      {result && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span
              className={`chip ${result.refusal ? "!text-amber-300 !border-amber-500/40 !bg-amber-500/10" : ""}`}
            >
              <span aria-hidden="true">{result.refusal ? "×" : "✓"}</span>
              {result.refusal ? t("common.refused") : t("common.answered")}
            </span>
            <GroundingBadge g={result} />
          </div>

          {failed ? <p className="visual-note">{result.answer}</p> : <>
            <AnswerVisuals answer={result} endpoint="/compare/strategies" collapsed={!expanded} />
            {!result.refusal && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="text-xs text-accent hover:text-accent-hover font-semibold self-start">{expanded ? t("compare.showLess") : t("compare.readMore")}</button>}
          </>}

          {!failed && <EvaluationBlock result={result} best={best} />}
          {!failed && <CostBlock result={result} best={best} />}

          <WhyPanel result={result} />

          {result.extra && Object.keys(result.extra).length > 0 && (
            <ExtraDetails name={name} extra={result.extra} />
          )}
          {result.trace && result.trace.length > 0 && <TraceDetails trace={result.trace} />}
        </>
      )}
    </article>
  );
}
