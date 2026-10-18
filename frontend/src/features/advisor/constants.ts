import { type MessageKey } from "../../lib/i18n";
import { AdviseOverrides, Freshness, Level, ProjectProfile, QuestionMix, StrategyName } from "./api";

export const META: Record<StrategyName, { title: MessageKey; text: string; bar: string; border: string }> = {
  classic: {
    title: "strategy.classic",
    text: "text-sky-300",
    bar: "bg-sky-400",
    border: "border-sky-500/40",
  },
  graph: {
    title: "strategy.graph",
    text: "text-violet-300",
    bar: "bg-violet-400",
    border: "border-violet-500/40",
  },
  agentic: {
    title: "strategy.agentic",
    text: "text-emerald-300",
    bar: "bg-emerald-400",
    border: "border-emerald-500/40",
  },
};

export const QUESTION_TYPE_LABEL: Record<keyof QuestionMix, MessageKey> = {
  single_fact: "advisor.qtype.single_fact",
  relational_multi_hop: "advisor.qtype.relational_multi_hop",
  exploratory_multi_step: "advisor.qtype.exploratory_multi_step",
};

export const LEVEL_LABEL: Record<Level, MessageKey> = {
  low: "advisor.level.low",
  medium: "advisor.level.medium",
  high: "advisor.level.high",
};

export const FRESHNESS_LABEL: Record<Freshness, MessageKey> = {
  static: "advisor.freshness.static",
  monthly: "advisor.freshness.monthly",
  weekly: "advisor.freshness.weekly",
  daily: "advisor.freshness.daily",
  realtime: "advisor.freshness.realtime",
};

export const SIZE_LABEL: Record<ProjectProfile["corpus_size"], MessageKey> = {
  tiny: "advisor.size.tiny",
  small: "advisor.size.small",
  medium: "advisor.size.medium",
  large: "advisor.size.large",
  xlarge: "advisor.size.xlarge",
};

export type OverrideForm = {
  corpus_size_docs: string;
  languages: string;
  latency_budget_ms: string;
  cost_sensitivity: "" | Level;
  data_freshness: "" | Freshness;
  entity_richness: "" | Level;
  compliance: string;
  question_examples: string;
};

export const EMPTY_OVERRIDES: OverrideForm = {
  corpus_size_docs: "",
  languages: "",
  latency_budget_ms: "",
  cost_sensitivity: "",
  data_freshness: "",
  entity_richness: "",
  compliance: "",
  question_examples: "",
};

export function splitList(s: string, sep: RegExp = /[,;]/): string[] {
  return s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function toOverrides(f: OverrideForm): AdviseOverrides {
  return {
    corpus_size_docs: f.corpus_size_docs ? Number(f.corpus_size_docs) : undefined,
    languages: splitList(f.languages),
    latency_budget_ms: f.latency_budget_ms ? Number(f.latency_budget_ms) : undefined,
    cost_sensitivity: f.cost_sensitivity || undefined,
    data_freshness: f.data_freshness || undefined,
    entity_richness: f.entity_richness || undefined,
    compliance: splitList(f.compliance),
    question_examples: splitList(f.question_examples, /\r?\n/),
  };
}
