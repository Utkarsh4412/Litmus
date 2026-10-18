import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ErrorAlert from "../../design-system/ErrorAlert";
import LoadingSpinner from "../../design-system/LoadingSpinner";
import { errorMessage } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { AdviceResult } from "./AdviceResult";
import { AdviseResponse, advise } from "./api";
import { EMPTY_OVERRIDES, FRESHNESS_LABEL, LEVEL_LABEL, OverrideForm, toOverrides } from "./constants";
import { Field, Select } from "./fields";
import { ValidateSection } from "./ValidateSection";

export default function Advisor() {
  const { t, rich } = useI18n();
  const [description, setDescription] = useState("");
  const [showOverrides, setShowOverrides] = useState(false);
  const [form, setForm] = useState<OverrideForm>(EMPTY_OVERRIDES);

  const adviseMut = useMutation<AdviseResponse, Error, void>({
    mutationFn: () => advise(description.trim(), toOverrides(form)),
  });

  const set = <K extends keyof OverrideForm>(k: K, v: OverrideForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="advisor-page flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="display text-4xl font-semibold text-white">{t("advisor.title")}</h1>
        <p className="text-sm text-zinc-400">
          {rich("advisor.intro", {
            classic: <span className="text-sky-300">{t("strategy.classic.short")}</span>,
            graph: <span className="text-violet-300">{t("strategy.graph.short")}</span>,
            agentic: <span className="text-emerald-300">{t("strategy.agentic.short")}</span>,
          })}
        </p>
      </header>

      <form
        className="card flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (description.trim()) adviseMut.mutate();
        }}
      >
        <label htmlFor="advisor-description" className="text-sm font-medium text-zinc-200">
          {t("advisor.yourProject")}
        </label>
        <textarea
          id="advisor-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder={t("advisor.placeholder")}
          className="input resize-y text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">
            {t("advisor.anyLanguage")}{" "}
            <button
              type="button"
              onClick={() => setDescription(t("advisor.example"))}
              className="text-accent hover:text-accent-hover underline-offset-2 hover:underline"
            >
              {t("advisor.useExample")}
            </button>
          </p>
          <button
            type="button"
            onClick={() => setShowOverrides((v) => !v)}
            className="text-xs text-zinc-400 hover:text-white"
            aria-expanded={showOverrides}
          >
            {showOverrides ? "▾" : "▸"} {t("advisor.knownFacts")}
          </button>
        </div>

        {showOverrides && (
          <div className="grid gap-3 sm:grid-cols-2 border-t border-bg-border pt-3">
            <Field label={t("advisor.field.corpusSize")}>
              <input
                type="number"
                min={0}
                value={form.corpus_size_docs}
                onChange={(e) => set("corpus_size_docs", e.target.value)}
                className="input text-sm !py-2"
                placeholder={t("advisor.eg", { value: "20000" })}
              />
            </Field>
            <Field label={t("advisor.field.languages")}>
              <input
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
                className="input text-sm !py-2"
                placeholder={t("advisor.eg", { value: "fr, en" })}
              />
            </Field>
            <Field label={t("advisor.field.latency")}>
              <input
                type="number"
                min={100}
                value={form.latency_budget_ms}
                onChange={(e) => set("latency_budget_ms", e.target.value)}
                className="input text-sm !py-2"
                placeholder={t("advisor.eg", { value: "5000" })}
              />
            </Field>
            <Field label={t("advisor.field.cost")}>
              <Select
                value={form.cost_sensitivity}
                onChange={(v) => set("cost_sensitivity", v as OverrideForm["cost_sensitivity"])}
                options={LEVEL_LABEL}
              />
            </Field>
            <Field label={t("advisor.field.freshness")}>
              <Select
                value={form.data_freshness}
                onChange={(v) => set("data_freshness", v as OverrideForm["data_freshness"])}
                options={FRESHNESS_LABEL}
              />
            </Field>
            <Field label={t("advisor.field.entities")}>
              <Select
                value={form.entity_richness}
                onChange={(v) => set("entity_richness", v as OverrideForm["entity_richness"])}
                options={LEVEL_LABEL}
              />
            </Field>
            <Field label={t("advisor.field.compliance")}>
              <input
                value={form.compliance}
                onChange={(e) => set("compliance", e.target.value)}
                className="input text-sm !py-2"
                placeholder={t("advisor.egCompliance")}
              />
            </Field>
            <Field label={t("advisor.field.examples")}>
              <textarea
                value={form.question_examples}
                onChange={(e) => set("question_examples", e.target.value)}
                rows={2}
                className="input text-sm !py-2 resize-y"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!description.trim() || adviseMut.isPending}
            className="btn-primary text-sm"
          >
            {adviseMut.isPending ? t("advisor.analysing") : t("advisor.recommend")}
          </button>
        </div>
        {adviseMut.isError && (
          <ErrorAlert
            error={errorMessage(adviseMut.error)}
            onRetry={() => adviseMut.mutate()}
            onDismiss={() => adviseMut.reset()}
          />
        )}
      </form>

      {adviseMut.isPending && <LoadingSpinner message={t("advisor.loading")} />}
      {adviseMut.data && <AdviceResult result={adviseMut.data} />}
      {adviseMut.data && <ValidateSection advice={adviseMut.data} />}
    </div>
  );
}
