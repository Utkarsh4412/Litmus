import { useI18n } from "../../lib/i18n";
import { whyThisResult, type Fact } from "./compareInsights";
import { StrategyOut } from "./constants";

export function WhyPanel({ result }: { result: StrategyOut }) {
  const { t, tp } = useI18n();
  const facts = whyThisResult(result);
  const render = (f: Fact) => ("plural" in f ? tp(f.plural, f.count, f.vars) : t(f.key, f.vars));
  return (
    <details className="text-xs rounded-md border border-bg-border bg-bg-elevated/60 px-2.5 py-2">
      <summary className="cursor-pointer select-none font-semibold text-zinc-300 hover:text-white">
        {t("why.title")}
      </summary>
      <p className="mt-1.5 text-[11px] text-zinc-500">{t("why.intro")}</p>
      <ul className="mt-1.5 space-y-1 list-disc pl-4 text-zinc-300">
        {facts.map((f, i) => (
          <li key={i}>{render(f)}</li>
        ))}
      </ul>
    </details>
  );
}
