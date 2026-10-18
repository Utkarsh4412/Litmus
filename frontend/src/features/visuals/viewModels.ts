import type { RequestMetrics, RetrievalDiagnostics, RetrievedChunkDiagnostics } from '../answer/types';

const nonnegative = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export type Stage = 'preprocess' | 'dense' | 'sparse' | 'fusion' | 'retrieval' | 'rerank' | 'generation' | 'citation_validation' | 'other';
export type TimingRow = { stage: Stage; ms: number | null; skipped: boolean; derived?: boolean };
export type TimingSlot = { rows: TimingRow[]; ms: number | null };

export function pipelineSegments(retrieval?: RetrievalDiagnostics | null, metrics?: RequestMetrics | null) {
  const detail: TimingSlot[] = [];
  const row = (stage: Stage, value: unknown): TimingRow => ({ stage, ms: nonnegative(value), skipped: retrieval?.degraded?.includes(stage) === true });
  if (retrieval) {
    const times = retrieval.latency_ms;
    detail.push({ rows: [row('preprocess', times?.preprocess)], ms: nonnegative(times?.preprocess) });
    const parallel = [retrieval.mode !== 'sparse' ? row('dense', times?.dense) : null, retrieval.mode !== 'dense' ? row('sparse', times?.sparse) : null].filter((r): r is TimingRow => r !== null);
    const reported = parallel.flatMap(r => r.ms === null ? [] : [r.ms]);
    detail.push({ rows: parallel, ms: reported.length === parallel.length && reported.length ? Math.max(...reported) : null });
    detail.push({ rows: [row('fusion', times?.fusion)], ms: nonnegative(times?.fusion) });
    if (retrieval.reranker && retrieval.reranker !== 'none') detail.push({ rows: [row('rerank', times?.rerank)], ms: nonnegative(times?.rerank) });
  }
  const names = ['retrieval', 'rerank', 'generation', 'citation_validation', 'other'] as const;
  const timings = metrics?.latency_ms;
  const metricRows: TimingRow[] = timings ? names.map(stage => ({ stage, ms: nonnegative(timings[stage]), skipped: false })) : [];
  const total = nonnegative(timings?.total);
  const sum = metricRows.reduce((n, r) => n + (r.ms ?? 0), 0);
  const complete = metricRows.length === names.length && metricRows.every(r => r.ms !== null);
  const remainder = complete && total !== null ? total - sum : null;
  if (remainder !== null && remainder > 1e-7) {
    const other = metricRows.find(r => r.stage === 'other')!;
    other.ms = other.ms! + remainder; other.derived = true;
  }
  if (retrieval) for (const stage of ['generation', 'citation_validation', 'other'] as const) {
    const r = metricRows.find(r => r.stage === stage);
    if (r) detail.push({ rows: [r], ms: r.ms });
  }
  return { detail, metrics: metricRows, total, missingDetail: !retrieval, overReported: remainder !== null && remainder < -1e-7 };
}

export function funnelRows(counts?: RetrievalDiagnostics['counts'] | null, mode?: RetrievalDiagnostics['mode']) {
  if (!counts || !mode) return [];
  const stages = (['dense', 'sparse', 'fused', 'reranked', 'final'] as const).filter(stage => !(stage === 'dense' && mode === 'sparse') && !(stage === 'sparse' && mode === 'dense'));
  const max = Math.max(0, ...stages.flatMap(stage => nonnegative(counts[stage]) === null ? [] : [counts[stage]]));
  return stages.map(stage => ({ stage, count: nonnegative(counts[stage]), fraction: nonnegative(counts[stage]) === null || max === 0 ? null : counts[stage] / max }));
}

export function provenanceRows(chunks?: readonly RetrievedChunkDiagnostics[] | null) {
  return (chunks ?? []).map(chunk => ({ chunk_id: chunk.chunk_id, doc_id: chunk.doc_id, dense_rank: nonnegative(chunk.dense_rank), sparse_rank: nonnegative(chunk.sparse_rank), fused_score: finite(chunk.fused_score), rerank_score: finite(chunk.rerank_score) }));
}

export type BaselineInput = { comparable?: boolean; checks?: readonly { metric: string; status: string; baseline?: number | null; current?: number | null; threshold?: string | null; reason?: string | null }[] };
export function baselineRows(report?: BaselineInput | null) {
  return (report?.checks ?? []).map(check => {
    const baseline = finite(check.baseline), current = finite(check.current);
    const delta = report?.comparable === true && baseline !== null && current !== null ? current - baseline : null;
    return { metric: check.metric, status: check.status, baseline, current, delta: delta === 0 ? 0 : delta, threshold: check.threshold ?? null, reason: check.reason ?? null };
  });
}
