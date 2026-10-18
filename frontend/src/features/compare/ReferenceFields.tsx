import { useId } from "react";
import { useI18n } from "../../lib/i18n";

export function ReferenceFields({
  idealAnswer,
  onIdealAnswer,
  relevantDocs,
  onRelevantDocs,
}: {
  idealAnswer: string;
  onIdealAnswer: (v: string) => void;
  relevantDocs: string;
  onRelevantDocs: (v: string) => void;
}) {
  const { t } = useI18n();
  const ids = { answer: useId(), docs: useId(), answerHelp: useId(), docsHelp: useId() };
  return (
    <details className="text-xs text-zinc-400">
      <summary className="cursor-pointer select-none hover:text-zinc-200">{t("compare.reference")}</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.answer}>{t("compare.idealAnswer")}</label>
          <textarea
            id={ids.answer}
            rows={2}
            value={idealAnswer}
            onChange={(e) => onIdealAnswer(e.target.value)}
            aria-describedby={ids.answerHelp}
            className="input resize-y !py-2 text-sm"
          />
          <span id={ids.answerHelp} className="text-zinc-500">{t("compare.idealAnswerHelp")}</span>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.docs}>{t("compare.relevantDocs")}</label>
          <input
            id={ids.docs}
            value={relevantDocs}
            onChange={(e) => onRelevantDocs(e.target.value)}
            aria-describedby={ids.docsHelp}
            spellCheck={false}
            className="input !py-2 text-sm font-mono"
          />
          <span id={ids.docsHelp} className="text-zinc-500">{t("compare.relevantDocsHelp")}</span>
        </div>
      </div>
    </details>
  );
}
