import { useCapabilities } from "../../lib/api/useCapabilities";
/**
 * Runs tab of the Evaluation page: launch a run on a golden dataset, then read
 * the run history (newest first) with each run's counts, measured aggregates
 * and, on demand, its regression report against the configuration's baseline.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import ErrorAlert from "../../design-system/ErrorAlert";
import LoadingSpinner from "../../design-system/LoadingSpinner";
import { errorMessage } from "../../lib/api/client";
import { listGoldenDatasets } from "../../lib/api/golden";
import { useI18n } from "../../lib/i18n";
import { STRATEGY_NAMES, type StrategyName } from "../answer/types";
import { listEvalRuns, runEvaluation, type EvalRunRequest, type EvalRunSummary } from "./api";
import { DEMO_CORPUS_DATASETS, newestFirst, runMetrics } from "./runHistory";
import { AggCell, RegressionBadge, StrategyKey } from "./shared";
import RegressionReportView from "./BaselineForRun";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export default function EvalRuns() {
  const { t, lang } = useI18n();
  const unavailable = useCapabilities();
  const queryClient = useQueryClient();
  const ids = { dataset: useId(), strategy: useId(), note: useId() };

  const golden = useQuery({ queryKey: ["golden-datasets"], queryFn: listGoldenDatasets });
  const datasets = golden.data ?? [];
  const [picked, setPicked] = useState("");
  const preferred = lang === "fr" ? "golden_fr_v1" : "golden_v1";
  const dataset =
    picked && datasets.includes(picked) ? picked : datasets.includes(preferred) ? preferred : (datasets[0] ?? "");
  const [strategy, setStrategy] = useState<StrategyName>("classic");
  const needsDemoCorpus = DEMO_CORPUS_DATASETS.has(dataset);

  const runs = useQuery({ queryKey: ["runs"], queryFn: listEvalRuns });

  const run = useMutation({
    mutationFn: runEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["regression"] });
    },
  });
  const launch = (req: EvalRunRequest) => {
    if (!unavailable("judge") && !(req.strategy && unavailable(req.strategy))) run.mutate(req);
  };

  const history = newestFirst(runs.data ?? []);

  return (
    <div className="flex flex-col gap-6">
      <section className="card !p-5 flex flex-col gap-4" aria-labelledby="eval-launch-title">
        <div>
          <h2 id="eval-launch-title" className="text-lg font-semibold text-white">{t("eval.launch")}</h2>
          <p className="text-sm text-zinc-400 mt-1">{unavailable("judge") ?? unavailable(strategy) ?? t("eval.launchHelp")}</p>
        </div>

        {golden.error ? (
          <ErrorAlert
            error={t("eval.datasetsFailed", { error: errorMessage(golden.error) })}
            onRetry={() => golden.refetch()}
          />
        ) : golden.isLoading ? (
          <LoadingSpinner message={t("eval.datasetsLoading")} />
        ) : datasets.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("eval.datasetsEmpty")}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label htmlFor={ids.dataset} className="flex flex-col gap-1 text-xs text-zinc-400">
              {t("eval.dataset")}
              <select
                id={ids.dataset}
                value={dataset}
                onChange={(e) => setPicked(e.target.value)}
                aria-describedby={needsDemoCorpus ? ids.note : undefined}
                className="input !py-2 text-sm"
              >
                {datasets.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label htmlFor={ids.strategy} className="flex flex-col gap-1 text-xs text-zinc-400">
              {t("eval.strategy")}
              <select
                id={ids.strategy}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyName)}
                className="input !py-2 text-sm"
              >
                {STRATEGY_NAMES.map((s) => (
                  <option key={s} value={s} disabled={!!unavailable(s)} title={unavailable(s)}>{t(`strategy.${s}`)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => launch({ dataset, strategy })}
              disabled={run.isPending || !dataset || !!unavailable("judge") || !!unavailable(strategy)}
              title={unavailable("judge") ?? unavailable(strategy)}
              className="btn-primary text-sm px-4 py-2 min-h-[44px]"
            >
              {run.isPending ? t("common.running") : t("eval.run")}
            </button>
          </div>
        )}

        {needsDemoCorpus && (
          <p id={ids.note} role="note" className="text-xs text-amber-200 border-l-2 border-amber-500/50 pl-3">
            {t("eval.demoCorpusNote", { dataset })}
          </p>
        )}

        {run.isPending && <LoadingSpinner message={t("eval.running")} />}
        {run.error && (
          <ErrorAlert
            error={t("eval.runFailed", { error: errorMessage(run.error) })}
            onRetry={() => run.variables && launch(run.variables)}
            onDismiss={() => run.reset()}
          />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="eval-history-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="eval-history-title" className="text-lg font-semibold text-white">{t("eval.history")}</h2>
          <span className="text-xs text-zinc-500">{t("eval.historyOrder")}</span>
        </div>

        {runs.isLoading ? (
          <LoadingSpinner message={t("eval.loading")} />
        ) : runs.error ? (
          <ErrorAlert
            error={t("eval.loadFailed", { error: errorMessage(runs.error) })}
            onRetry={() => runs.refetch()}
          />
        ) : history.length === 0 ? (
          <div className="card text-center py-8">
            <h3 className="text-white font-semibold">{t("eval.empty")}</h3>
            <p className="text-sm text-zinc-400 mt-1">{t("eval.emptyHelp")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((r) => (
              <li key={r.id}>
                <RunCard run={r} busy={run.isPending} onRerun={launch} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RunCard({
  run,
  busy,
  onRerun,
}: {
  run: EvalRunSummary;
  busy: boolean;
  onRerun: (req: EvalRunRequest) => void;
}) {
  const { t, formatDate, formatNumber } = useI18n();
  const unavailable = useCapabilities();
  const disabledReason = unavailable("judge") ?? unavailable(run.strategy as StrategyName);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const metrics = runMetrics(run);
  const date = run.created_at ? formatDate(run.created_at, DATE_FORMAT) : "";
  const strategy = run.strategy ?? "?";
  const count = (v: number | null | undefined) => (v == null ? t("common.na") : formatNumber(v));
  const rerunnable = !!run.dataset && (STRATEGY_NAMES as readonly string[]).includes(strategy);

  return (
    <article className="card !p-5 flex flex-col gap-4" aria-label={`${run.dataset ?? "?"} · ${strategy}${date ? ` · ${date}` : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white break-words">{run.dataset ?? "?"}</h3>
          <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <StrategyKey strategy={strategy} label={strategy} />
            <span>{t("eval.model", { model: run.model ?? t("eval.defaultModel") })}</span>
            {date && <time dateTime={run.created_at ?? undefined}>{date}</time>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RegressionBadge status={run.regression_status} tip="eval.regTip" />
          {rerunnable && (
            <button
              type="button"
              onClick={() => onRerun({ dataset: run.dataset!, strategy: strategy as StrategyName })}
              disabled={busy || !!disabledReason}
              title={disabledReason}
              className="btn-ghost text-sm px-3 py-1.5 min-h-[40px]"
            >
              {busy ? t("common.running") : t("eval.rerun")}
            </button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Count label={t("eval.count.scored")} value={`${count(run.n_scored)} / ${count(run.n)}`} />
        <Count label={t("eval.count.judgeFailed")} value={count(run.n_judge_failed)} />
        <Count label={t("eval.count.unscored")} value={count(run.n_unscored)} />
        <Count label={t("eval.count.generationFailed")} value={count(run.n_generation_failed)} />
      </dl>

      {metrics.length === 0 ? (
        <p className="text-xs text-zinc-500">{t("eval.noScores")}</p>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {metrics.map((m) => (
            <div key={m.id} className="rounded-md bg-bg-surface border border-bg-border px-3 py-2">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">{t(m.label)}</dt>
              <dd className="text-sm text-white mt-0.5">
                <AggCell agg={m} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-accent hover:underline"
        >
          {open ? t("eval.hideReport") : t("eval.showReport")}
        </button>
        {open && (
          <div id={panelId} className="mt-3">
            <RegressionReportView runId={run.id} />
          </div>
        )}
      </div>
    </article>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-bg-border px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-200 tabular-nums mt-0.5">{value}</dd>
    </div>
  );
}

