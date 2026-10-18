import { formatLatency, formatScore, formatTokens } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { ValidateResponse } from "./api";
import { META } from "./constants";

export function Scorecard({ data }: { data: ValidateResponse }) {
  const { t, locale } = useI18n();
  const fmtScore = (v: number | null) => (v == null ? "–" : formatScore(v, 2, locale));
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        {data.measured_winner ? (
          <>
            <span className="text-zinc-400">{t("advisor.measuredWinner")}</span>
            <span className={`font-semibold ${META[data.measured_winner].text}`}>
              {t(META[data.measured_winner].title)}
            </span>
          </>
        ) : (
          <span className="text-amber-300">{t("advisor.noWinner")}</span>
        )}
        <p className="text-xs text-zinc-500 mt-1">{data.winner_reason}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-bg-border">
              <th className="py-2 pr-3">{t("advisor.col.strategy")}</th>
              <th className="py-2 pr-3">{t("advisor.col.refusals")}</th>
              <th className="py-2 pr-3">{t("advisor.col.errors")}</th>
              <th className="py-2 pr-3">{t("advisor.col.latency")}</th>
              <th className="py-2 pr-3">{t("advisor.col.tokens")}</th>
              <th className="py-2 pr-3">{t("advisor.col.judge")}</th>
              <th className="py-2 pr-3">{t("advisor.col.f1")}</th>
            </tr>
          </thead>
          <tbody>
            {data.scorecard.map((c) => (
              <tr
                key={c.strategy}
                className={`border-b border-bg-border/60 ${c.strategy === data.measured_winner ? "bg-bg-elevated" : ""}`}
              >
                <td className={`py-2 pr-3 font-medium ${META[c.strategy].text}`}>{t(META[c.strategy].title)}</td>
                <td className="py-2 pr-3 font-mono">
                  {c.refusals}/{c.questions}
                </td>
                <td className="py-2 pr-3 font-mono">{c.errors}</td>
                <td className="py-2 pr-3 font-mono">{formatLatency(c.avg_latency_ms, locale)}</td>
                <td className="py-2 pr-3 font-mono">
                  {formatTokens(Math.round(c.avg_tokens_per_question), locale)}
                </td>
                <td className="py-2 pr-3 font-mono">
                  {fmtScore(c.avg_judge_score)}
                  {c.judged > 0 && <span className="text-zinc-500"> (n={c.judged})</span>}
                </td>
                <td className="py-2 pr-3 font-mono">{fmtScore(c.avg_answer_f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">
          {t("advisor.perQuestion", { count: data.rows.length })}
        </summary>
        <ul className="mt-2 flex flex-col gap-2">
          {data.rows.map((r, i) => (
            <li key={i} className="border border-bg-border rounded-lg p-2 text-xs">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={META[r.strategy].text}>{t(META[r.strategy].title)}</span>
                <span className="text-zinc-300">{r.question}</span>
                {r.refusal && (
                  <span className="chip !text-rose-300">
                    {r.error ? t("common.error") : t("advisor.refused")}
                  </span>
                )}
                <span className="ml-auto font-mono text-zinc-500">
                  {formatLatency(r.latency_ms, locale)} ·{" "}
                  {formatTokens(r.input_tokens + r.output_tokens, locale)}
                </span>
              </div>
              <p className="mt-1 text-zinc-400 whitespace-pre-wrap">{r.answer}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
