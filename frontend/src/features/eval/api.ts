import { LONG_TIMEOUT_MS, get, post } from "../../lib/api/client";
import { enc } from "../../lib/api/golden";
import { StrategyName } from "../answer/types";

export interface MetricAggregate {
  mean: number | null;
  std: number | null;
  n: number;
}

export interface RunCost {
  mean_latency_ms?: number;
  p50_latency_ms?: number | null;
  p95_latency_ms?: number | null;
  total_input_tokens?: number;
  total_output_tokens?: number;
  mean_tokens_per_question?: number | null;
  judge_input_tokens?: number;
  judge_output_tokens?: number;
  /** Present only when the backend priced the run. */
  mean_cost_usd_per_question?: number | null;
  total_cost_usd?: number | null;
}

/** PASS, FAIL, SKIPPED (no baseline or too few examples) or ERROR (thresholds unreadable). */
export type RegressionStatus = "PASS" | "FAIL" | "SKIPPED" | "ERROR";

/** One row of GET /eval/runs. */
export interface EvalRunSummary {
  id: string;
  dataset: string | null;
  strategy: string | null;
  provider?: string | null;
  model?: string | null;
  prompt_version?: string | null;
  judge_model?: string | null;
  n: number;
  n_scored: number;
  n_unscored?: number;
  n_judge_failed?: number | null;
  n_generation_failed?: number | null;
  rubric_version?: string | null;
  retrieval_mode?: string | null;
  config_hash?: string | null;
  regression_status?: RegressionStatus | null;
  aggregates?: Record<string, MetricAggregate> | null;
  /** Older runs: flat judge means, before `aggregates` carried std and n. */
  aggregate?: Record<string, number | null> | null;
  /** Older runs: flat retrieval means (mrr, recall@K, ...). */
  retrieval_aggregate?: Record<string, number | null> | null;
  cost?: RunCost | null;
  created_at?: string | null;
}

export interface RunBreakdown {
  n_examples: number;
  n_scored: number;
  aggregates: Record<string, MetricAggregate>;
}

/** GET /eval/runs/{id}: a summary plus breakdowns and per-example rows. */
export interface EvalRun extends EvalRunSummary {
  schema_version?: number;
  by_question_type?: Record<string, RunBreakdown>;
  by_difficulty?: Record<string, RunBreakdown>;
  regression?: { status?: RegressionStatus; error?: string } | null;
  per_example?: Record<string, unknown>[];
}

/** One metric of a regression report. */
export interface RegressionCheck {
  metric: string;
  status: RegressionStatus | string;
  baseline?: number | null;
  current?: number | null;
  delta?: number | null;
  delta_pct?: number | null;
  /** Human-readable bound, e.g. "delta >= -0.03". */
  threshold?: string | null;
  /** Why the check failed or was skipped. */
  reason?: string | null;
}

export interface RegressionRunRef {
  id: string | null;
  created_at?: string | null;
  judge_provider?: string | null;
  judge_model?: string | null;
}

/** GET /eval/runs/{id}/regression. */
export interface RegressionReport {
  status: RegressionStatus;
  checks?: RegressionCheck[];
  baseline?: RegressionRunRef | null;
  current?: RegressionRunRef | null;
  baseline_source?: "pinned" | "previous" | "explicit" | null;
  comparable?: boolean;
  config_mismatch?: string[];
  markdown?: string;
}

/** Body of POST /eval/run. */
export interface EvalRunRequest {
  dataset: string;
  strategy?: StrategyName;
}

/**
 * POST /eval/run. Answers and judges every golden question inside one request,
 * so it gets the long timeout.
 */
export function runEvaluation(req: EvalRunRequest): Promise<EvalRun> {
  return post<EvalRun>("/eval/run", req, { timeoutMs: LONG_TIMEOUT_MS });
}

/** GET /eval/runs: every recorded run, newest first. */
export function listEvalRuns(): Promise<EvalRunSummary[]> {
  return get<EvalRunSummary[]>("/eval/runs");
}

/** GET /eval/runs/{id}. */
export function getEvalRun(id: string): Promise<EvalRun> {
  return get<EvalRun>(`/eval/runs/${enc(id)}`);
}

/** GET /eval/runs/{id}/regression. */
export function getRunRegression(id: string): Promise<RegressionReport> {
  return get<RegressionReport>(`/eval/runs/${enc(id)}/regression`);
}
