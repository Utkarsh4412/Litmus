import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo } from "react";
import { errorMessage } from "../../lib/api/client";
import { listGoldenDatasets, listGoldenQuestions } from "../../lib/api/golden";
import { useI18n } from "../../lib/i18n";
import { ALL_TYPES } from "./constants";

export function GoldenPicker({
  dataset,
  onDataset,
  typeFilter,
  onTypeFilter,
  selectedId,
  onSelect,
}: {
  dataset: string;
  onDataset: (d: string) => void;
  typeFilter: string;
  onTypeFilter: (t: string) => void;
  selectedId: string;
  onSelect: (id: string, question: string) => void;
}) {
  const { t } = useI18n();
  const ids = { dataset: useId(), type: useId(), list: useId() };
  const datasets = useQuery({ queryKey: ["golden-datasets"], queryFn: listGoldenDatasets });
  const active = dataset || datasets.data?.[0] || "";
  const questions = useQuery({
    queryKey: ["golden-questions", active],
    queryFn: () => listGoldenQuestions(active),
    enabled: !!active,
  });

  // Adopt the first dataset once the list arrives, so the parent sends it.
  useEffect(() => {
    if (!dataset && active) onDataset(active);
  }, [dataset, active, onDataset]);

  const types = useMemo(
    () => [...new Set((questions.data ?? []).map((q) => q.question_type))].sort(),
    [questions.data],
  );
  const shown = (questions.data ?? []).filter((q) => !typeFilter || q.question_type === typeFilter);
  const error = datasets.error ?? questions.error;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label htmlFor={ids.dataset} className="flex flex-col gap-1 text-xs text-zinc-400">
        {t("compare.dataset")}
        <select
          id={ids.dataset}
          value={active}
          onChange={(e) => onDataset(e.target.value)}
          className="input !py-2 text-sm"
        >
          {(datasets.data ?? []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={ids.type} className="flex flex-col gap-1 text-xs text-zinc-400">
        {t("compare.questionType")}
        <select
          id={ids.type}
          value={typeFilter}
          onChange={(e) => onTypeFilter(e.target.value)}
          className="input !py-2 text-sm"
        >
          <option value={ALL_TYPES}>{t("compare.allTypes")}</option>
          {types.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={ids.list} className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
        {t("compare.question")}
        {(datasets.isLoading || questions.isLoading) && (
          <span className="text-zinc-500">{t("compare.goldenLoading")}</span>
        )}
        {error ? (
          <span className="text-rose-300">{t("compare.goldenFailed", { error: errorMessage(error) })}</span>
        ) : shown.length === 0 && questions.isSuccess ? (
          <span className="text-zinc-500">{t("compare.goldenEmpty")}</span>
        ) : (
          <select
            id={ids.list}
            size={Math.min(6, Math.max(2, shown.length))}
            value={selectedId}
            onChange={(e) => {
              const picked = shown.find((q) => q.id === e.target.value);
              if (picked) onSelect(picked.id, picked.question);
            }}
            className="input !py-1 text-sm"
          >
            {shown.map((q) => (
              <option key={q.id} value={q.id} className="py-1 whitespace-normal">
                {q.id} · {q.question_type}
                {q.difficulty ? ` · ${q.difficulty}` : ""} — {q.question}
              </option>
            ))}
          </select>
        )}
      </label>
    </div>
  );
}
