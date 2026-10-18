import type { CitedSource, Grounding } from "./Citations";

export type StrategyName = "classic" | "graph" | "agentic";

export const STRATEGY_NAMES: readonly StrategyName[] = ["classic", "graph", "agentic"];

/** Per-request cost and latency breakdown (optional: newer backends only). */
export interface RequestMetrics {
  strategy: string;
  model: string | null;
  provider: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number | null;
  latency_ms: {
    total: number;
    retrieval: number;
    rerank: number;
    generation: number;
    citation_validation: number;
    other: number;
  };
  retrieved_chunks: number;
  context_chunks: number;
  llm_calls: number;
}

export interface RetrievedChunkDiagnostics {
  chunk_id: string;
  doc_id: string;
  dense_rank: number | null;
  sparse_rank: number | null;
  fused_score: number | null;
  rerank_score: number | null;
}

export interface RetrievalDiagnostics {
  mode: "dense" | "sparse" | "hybrid";
  reranker: "cross-encoder" | "bm25-fallback" | "none";
  query_truncated?: boolean;
  counts: { dense: number; sparse: number; fused: number; reranked: number; final: number };
  latency_ms: { preprocess: number; dense: number; sparse: number; fusion: number; rerank: number };
  degraded?: string[];
  chunks: RetrievedChunkDiagnostics[];
}

export type JudgeDimension =
  | "faithfulness"
  | "answer_relevance"
  | "context_precision"
  | "context_recall"
  | "answer_correctness";

/** Scores attached to a comparison row when it was requested with evaluate=true. */
export interface StrategyEvaluation {
  status: "scored" | "judge_failed" | "refusal_checked" | "not_evaluated";
  scores: Partial<Record<JudgeDimension, number | null>> | null;
  reasoning: Record<string, string>;
  /** mrr, recall@K, precision@K, hit_rate@K, ndcg@K. Null when no relevant documents are known. */
  retrieval: Record<string, number> | null;
  retrieved_docs: string[];
  relevant_docs: string[] | null;
  has_reference_answer: boolean;
  correct_refusal: number | null;
  judge_model: string | null;
  rubric_version: string | null;
  judge_attempts: number;
  judge_input_tokens: number;
  judge_output_tokens: number;
  error_type: string | null;
  error: string | null;
}

export type TraceStep = { step?: string; [k: string]: unknown };

export type StrategyComparison = Grounding & {
  strategy: StrategyName;
  question: string;
  answer: string;
  sources: CitedSource[];
  refusal: boolean;
  confidence: number;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  iterations: number;
  trace: TraceStep[];
  extra: Record<string, unknown>;
  trace_id?: string | null;
  retrieval?: RetrievalDiagnostics | null;
  metrics?: RequestMetrics | null;
  evaluation?: StrategyEvaluation | null;
};

/** POST /ask, bound to schemas.Answer without adding any response field. */
export type AnswerData = Grounding & {
  question: string;
  answer: string;
  sources: CitedSource[];
  confidence: number;
  refusal: boolean;
  provider?: string | null;
  model?: string | null;
  latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  trace_id?: string | null;
  retrieval?: RetrievalDiagnostics | null;
  metrics?: RequestMetrics | null;
};
export type EvidenceInput = Grounding & Partial<Pick<AnswerData, 'answer' | 'sources' | 'confidence' | 'refusal'>>;
