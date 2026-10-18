import { describe, expect, it } from 'vitest';
import { cases, comparableReport, mismatchReport } from '../../test-fixtures/visuals.mjs';
import { baselineRows, funnelRows, pipelineSegments, provenanceRows } from './viewModels';

describe('verified visual projections', () => {
  for (const [name, { answer }] of Object.entries(cases)) {
    it(`${name}: conserves reported numbers and provenance order`, () => {
      const pipeline = pipelineSegments(answer.retrieval, answer.metrics);
      expect(pipeline.metrics.every(row => row.ms === null || Number.isFinite(row.ms))).toBe(true);
      const rows = provenanceRows(answer.retrieval?.chunks);
      expect(rows.map(row => row.chunk_id)).toEqual(answer.retrieval?.chunks.map(c => c.chunk_id) ?? []);
      const funnel = funnelRows(answer.retrieval?.counts, answer.retrieval?.mode);
      if (answer.retrieval) expect(funnel.find(r => r.stage === 'final')?.count).toBe(answer.retrieval.counts.final);
      else expect(funnel).toEqual([]);
    });
  }
  it('dense and sparse occupy one max-duration slot', () => {
    const a = cases.hybrid.answer;
    const slot = pipelineSegments(a.retrieval, a.metrics).detail.find(s => s.rows.some(r => r.stage === 'dense'))!;
    expect(slot.ms).toBe(60); expect(slot.rows.map(r => r.ms)).toEqual([40, 60]);
  });
  it('does not draw inactive modes or the none reranker', () => {
    expect(funnelRows(cases['dense-only'].answer.retrieval!.counts, 'dense').some(r => r.stage === 'sparse')).toBe(false);
    expect(funnelRows(cases['sparse-only'].answer.retrieval!.counts, 'sparse').some(r => r.stage === 'dense')).toBe(false);
    const a = cases['reranker-none'].answer;
    expect(pipelineSegments(a.retrieval, a.metrics).detail.flatMap(s => s.rows).some(r => r.stage === 'rerank')).toBe(false);
  });
  it('labels a degraded stage skipped, without inventing its duration', () => {
    const a = cases.degraded.answer;
    expect(pipelineSegments(a.retrieval, a.metrics).detail.flatMap(s => s.rows).find(r => r.stage === 'sparse')).toMatchObject({ skipped: true, ms: 5 });
  });
  it('assigns measured positive remainder to other and warns on over-reporting', () => {
    const a = cases['timing-mismatch'].answer;
    expect(pipelineSegments(a.retrieval, a.metrics).metrics.find(r => r.stage === 'other')?.ms).toBe(40);
    const metrics = structuredClone(a.metrics!); metrics.latency_ms.total = 100;
    expect(pipelineSegments(null, metrics).overReported).toBe(true);
    expect(pipelineSegments(null, metrics).metrics.find(r => r.stage === 'other')?.ms).toBe(10);
  });
  it('never turns missing/invalid numbers into zero or an estimated remainder', () => {
    const metrics = structuredClone(cases.hybrid.answer.metrics!);
    delete (metrics.latency_ms as Partial<typeof metrics.latency_ms>).generation;
    expect(pipelineSegments(null, metrics).metrics.find(r => r.stage === 'generation')?.ms).toBeNull();
    expect(pipelineSegments(null, metrics).metrics.find(r => r.stage === 'other')?.ms).toBe(10);
    expect(provenanceRows([{ chunk_id: 'c', doc_id: 'd', dense_rank: null, sparse_rank: null, fused_score: null, rerank_score: null }])[0].dense_rank).toBeNull();
    expect(funnelRows({ dense: NaN, sparse: 0, fused: 1, reranked: 1, final: 0 }, 'hybrid')[0].count).toBeNull();
  });
  it('computes baseline deltas only for explicit comparability', () => {
    expect(baselineRows(comparableReport)[0].delta).toBeCloseTo(.02, 14);
    expect(baselineRows(mismatchReport)[0].delta).toBeNull();
    expect(baselineRows({ ...comparableReport, comparable: undefined })[0].delta).toBeNull();
    expect(baselineRows({ comparable: true, checks: [{ metric: 'x', status: 'SKIPPED', baseline: null, current: .2 }] })[0].delta).toBeNull();
  });
  it('does not infer a concurrent slot duration when one active lane is unreported', () => {
    const retrieval = structuredClone(cases.hybrid.answer.retrieval!);
    delete (retrieval.latency_ms as Partial<typeof retrieval.latency_ms>).dense;
    const slot = pipelineSegments(retrieval, cases.hybrid.answer.metrics).detail.find(s => s.rows.some(row => row.stage === 'sparse'))!;
    expect(slot.ms).toBeNull();
    expect(slot.rows.find(row => row.stage === 'sparse')?.ms).toBe(60);
    expect(slot.rows.find(row => row.stage === 'dense')?.ms).toBeNull();
  });
  it('keeps cited source ids joinable in the full 200-chunk fixture', () => {
    const answer = cases.large.answer;
    const ids = new Set(provenanceRows(answer.retrieval!.chunks).map(row => row.chunk_id));
    expect(answer.sources.every(source => ids.has(source.chunk_id))).toBe(true);
    expect(ids.size).toBe(200);
  });
});
