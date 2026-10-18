import { formatLatency, formatTokens, formatUsd } from "../../lib/formatting";
import { useI18n } from "../../lib/i18n";
import { type CostAxis } from "./dashboard";

export function useAxisFormat() {
  const { locale } = useI18n();
  return (axis: CostAxis, v: number) =>
    axis === "tokens" ? formatTokens(Math.round(v), locale) : axis === "cost" ? formatUsd(v, locale) : formatLatency(v, locale);
}
