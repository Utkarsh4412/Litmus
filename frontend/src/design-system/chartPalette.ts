/**
 * Entity colours resolve through the active theme's opaque PlotWell tokens.
 *
 * Categorical slots from the reference palette's dark column, in fixed order.
 * Validated by tools/validate_palette.mjs against --plot-well:
 * Thresholds: marks >= 3:1; normal ΔE >= 15; CVD ΔE >= 8.
 * Strategy colour checks cover all pairs; latency colour checks cover adjacent pairs.
 * Colour follows the entity, never its rank: a strategy keeps its hue whatever
 * is filtered. Text never wears these colours; a swatch beside it does.
 */
export const STRATEGY_COLORS: Record<string, string> = {
  classic: "var(--series-classic)",
  graph: "var(--series-graph)",
  agentic: "var(--series-agentic)",
};

/** For a strategy name the palette does not know. Neutral, never a generated hue. */
export const UNKNOWN_SERIES_COLOR = "var(--series-unknown)";

export const STAGE_COLORS = {
  retrieval: "var(--series-classic)",
  rerank: "var(--series-graph)",
  generation: "var(--series-agentic)",
  citation_validation: "var(--stage-citation)",
  other: "var(--stage-other)",
} as const;

export const CHART_INK = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  muted: "var(--ink-3)",
  secondary: "var(--ink-2)",
  surface: "var(--plot-well)",
} as const;

export function strategyColor(strategy: string): string {
  return STRATEGY_COLORS[strategy] ?? UNKNOWN_SERIES_COLOR;
}
