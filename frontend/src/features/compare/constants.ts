import { type MessageKey } from "../../lib/i18n";
import { STRATEGY_NAMES, type StrategyComparison, type StrategyName } from "../answer/types";

export type StrategyOut = StrategyComparison;

export type GraphStats = { triples: number; entities: number };

export type JobStatus = "queued" | "running" | "completed" | "failed";

/** POST /graph/build answers 202 with a job; GET /graph/build/{id} reports on it. */
export type BuildJob = {
  id?: string;
  job_id?: string;
  status: JobStatus;
  total?: number;
  completed?: number;
  failures?: string[];
  error?: string;
};

export type QuestionSource = "own" | "golden";

export type Best = Record<string, Set<StrategyName>>;

export const POLL_INTERVAL_MS = 2000;

export const ALL_TYPES = "";

export const STRATEGIES: StrategyName[] = [...STRATEGY_NAMES];

export const META: Record<
  StrategyName,
  { title: MessageKey; short: MessageKey; tagline: MessageKey }
> = {
  classic: {
    title: "strategy.classic",
    short: "strategy.classic.short",
    tagline: "compare.tagline.classic",
  },
  graph: {
    title: "strategy.graph",
    short: "strategy.graph.short",
    tagline: "compare.tagline.graph",
  },
  agentic: {
    title: "strategy.agentic",
    short: "strategy.agentic.short",
    tagline: "compare.tagline.agentic",
  },
};

export const SAMPLES: MessageKey[] = ["compare.sample1", "compare.sample2", "compare.sample3"];

export const JOB_STATUS: Record<JobStatus, MessageKey> = {
  queued: "compare.status.queued",
  running: "compare.status.running",
  completed: "compare.status.completed",
  failed: "compare.status.failed",
};
