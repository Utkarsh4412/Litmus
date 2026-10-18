import { useCapabilities } from "../../lib/api/useCapabilities";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ErrorAlert from "../../design-system/ErrorAlert";
import LoadingSpinner from "../../design-system/LoadingSpinner";
import { errorMessage } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { AdviseResponse, MAX_VALIDATE_QUESTIONS, StrategyName, ValidateResponse, parseQuestions, validateStrategies } from "./api";
import { META } from "./constants";
import { Scorecard } from "./Scorecard";

export function ValidateSection({ advice }: { advice: AdviseResponse }) {
  const { t, tp, rich } = useI18n();
  const unavailable = useCapabilities();
  const validationReason = unavailable("judge");
  const [text, setText] = useState(() =>
    advice.profile.example_questions.slice(0, 5).join("\n"),
  );
  const [strategies, setStrategies] = useState<StrategyName[]>(advice.next_step.suggested_strategies);
  const activeStrategies = strategies.filter((strategy) => !unavailable(strategy));
  const lineCount = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const questions = parseQuestions(text);

  const mut = useMutation<ValidateResponse, Error, void>({
    mutationFn: () => validateStrategies(questions, activeStrategies, advice.profile),
  });

  const toggle = (s: StrategyName) =>
    setStrategies((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <section className="card p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{t("advisor.validate")}</h2>
        <p className="text-xs text-zinc-500 mt-1">
          {rich("advisor.validateHelp", {
            syntax: <code className="font-mono text-zinc-300">{t("advisor.validateSyntax")}</code>,
            max: MAX_VALIDATE_QUESTIONS,
          })}
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="input resize-y text-sm font-mono"
        placeholder={t("advisor.validatePlaceholder")}
      />
      {lineCount > MAX_VALIDATE_QUESTIONS && (
        <p className="text-xs text-amber-300">
          {t("advisor.tooMany", { max: MAX_VALIDATE_QUESTIONS, count: lineCount })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {(["classic", "graph", "agentic"] as StrategyName[]).map((s) => (
          <label key={s} className="chip cursor-pointer" title={unavailable(s)}>
            <input
              type="checkbox"
              checked={activeStrategies.includes(s)}
              disabled={!!unavailable(s)}
              onChange={() => toggle(s)}
              className="accent-amber-400"
            />
            <span className={META[s].text}>{t(META[s].title)}</span>
          </label>
        ))}
        <button
          onClick={() => mut.mutate()}
          disabled={questions.length === 0 || activeStrategies.length === 0 || mut.isPending || !!validationReason}
          title={validationReason}
          className="btn-primary text-sm ml-auto"
        >
          {mut.isPending ? t("common.running") : tp("advisor.runQuestions", questions.length)}
        </button>
      </div>
      {validationReason && <p className="text-xs text-zinc-500" role="status">{validationReason}</p>}
      {mut.isError && (
        <ErrorAlert
          error={errorMessage(mut.error)}
          onRetry={validationReason ? undefined : () => mut.mutate()}
          onDismiss={() => mut.reset()}
        />
      )}
      {mut.isPending && (
        <LoadingSpinner
          message={t("advisor.validating", {
            questions: questions.length,
            strategies: activeStrategies.length,
          })}
        />
      )}
      {mut.data && <Scorecard data={mut.data} />}
    </section>
  );
}
