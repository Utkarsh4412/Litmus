/** Test/capture data only. Never import this module from a production entry. */
const sources = Array.from({ length: 5 }, (_, i) => ({ chunk_id: `doc-${i + 1}:1`, handle: `S${i + 1}`, document: `retrieval-${i + 1}.md`, title: `Retrieval notes ${i + 1}`, section: 'Method', page: i + 1, quote: 'Semantic and lexical retrieval provide complementary evidence.' }));
const base = {
  question: 'How does hybrid retrieval use evidence?',
  answer: 'Semantic and lexical searches find candidates [S1]. Fusion combines their ranks [S2]. Reranking orders the context [S3]. Every answer is always correct [S4][S5].',
  confidence: .71, refusal: false, grounded: false, status: 'partial', citation_count: 5, invalid_citations: [],
  claims: [
    { text: 'Semantic and lexical searches find candidates', supported: true, citations: ['S1'], chunk_ids: ['doc-1:1'] },
    { text: 'Fusion combines their ranks', supported: true, citations: ['S2'], chunk_ids: ['doc-2:1'] },
    { text: 'Reranking orders the context', supported: true, citations: ['S3'], chunk_ids: ['doc-3:1'] },
    { text: 'Every answer is always correct', supported: false, citations: ['S4', 'S5'], chunk_ids: ['doc-4:1', 'doc-5:1'] },
  ], sources, provider: 'openai', model: 'fixture-model', latency_ms: 220, input_tokens: 900, output_tokens: 90,
  retrieval: { mode: 'hybrid', reranker: 'cross-encoder', counts: { dense: 40, sparse: 35, fused: 60, reranked: 12, final: 5 }, latency_ms: { preprocess: 10, dense: 40, sparse: 60, fusion: 5, rerank: 25 }, degraded: [], chunks: sources.map((s, i) => ({ chunk_id: s.chunk_id, doc_id: `doc-${i + 1}`, dense_rank: i === 2 ? null : i + 1, sparse_rank: i === 1 ? null : i + 2, fused_score: .03 - i * .002, rerank_score: 4 - i })) },
  metrics: { strategy: 'classic', provider: 'openai', model: 'fixture-model', input_tokens: 900, output_tokens: 90, estimated_cost_usd: .001, retrieved_chunks: 60, context_chunks: 5, llm_calls: 1, latency_ms: { total: 220, retrieval: 75, rerank: 25, generation: 100, citation_validation: 10, other: 10 } },
};
export const comparableReport = { status: 'PASS', comparable: true, config_mismatch: [], baseline: { id: 'baseline', judge_provider: 'anthropic', judge_model: 'fixture-judge' }, current: { id: 'current', judge_provider: 'anthropic', judge_model: 'fixture-judge' }, checks: [{ metric: 'faithfulness', baseline: .8, current: .82, delta: .02, status: 'PASS', threshold: 'delta >= -0.03', reason: null }] };
export const mismatchReport = { ...structuredClone(comparableReport), status: 'SKIPPED', comparable: false, config_mismatch: ['judge_provider', 'judge_model'], current: { id: 'other', judge_provider: 'openai', judge_model: 'other-judge' }, checks: [{ metric: 'faithfulness', baseline: .8, current: .99, delta: .19, status: 'SKIPPED' }] };
export const cases = {};
function variant(name, mutate = () => {}, metadata = {}) { const answer = structuredClone(base); mutate(answer); cases[name] = { answer, metadata }; }
variant('hybrid');
variant('dense-only', a => { a.retrieval.mode = 'dense'; a.retrieval.counts.sparse = 0; a.retrieval.latency_ms.sparse = 0; });
variant('sparse-only', a => { a.retrieval.mode = 'sparse'; a.retrieval.counts.dense = 0; a.retrieval.latency_ms.dense = 0; });
variant('degraded', a => { a.retrieval.degraded = ['sparse']; a.retrieval.counts.sparse = 0; a.retrieval.latency_ms.sparse = 5; });
variant('bm25-fallback', a => { a.retrieval.reranker = 'bm25-fallback'; a.retrieval.chunks[0].rerank_score = 28.7; });
variant('reranker-none', a => { a.retrieval.reranker = 'none'; a.retrieval.latency_ms.rerank = 0; a.metrics.latency_ms.rerank = 0; a.metrics.latency_ms.other = 35; a.retrieval.chunks.forEach(c => { c.rerank_score = null; }); });
variant('retrieval-null', a => { a.retrieval = null; });
variant('text-mode', a => { a.claims = []; }, { groundingMode: 'text' });
function refuse(a, text) { a.refusal = true; a.confidence = .99; a.answer = text; a.claims = []; a.status = 'insufficient_context'; a.citation_count = 0; a.sources = [{ chunk_id: 'none', quote: '' }]; }
variant('refusal', a => refuse(a, 'The available documents do not support an answer.'));
variant('truncated', a => refuse(a, 'The provider reply was truncated. Please narrow the question or raise MAX_ANSWER_TOKENS.'), { refusalReason: 'truncated' });
variant('final-zero', a => { refuse(a, 'No chunk reached the context.'); a.retrieval.counts.final = 0; a.retrieval.chunks = []; });
variant('invalid-citations', a => { a.invalid_citations = ['S9']; });
variant('unsupported-claim');
variant('missing-handle', a => { a.answer += ' Another assertion [S9].'; });
variant('duplicate-handles', a => { a.sources[1].handle = 'S1'; });
variant('long-quote', a => { a.sources[0].quote = 'Une citation très longue avec des accents et des détails. '.repeat(250); });
variant('timing-mismatch', a => { a.metrics.latency_ms.total = 250; });
variant('graph-trace', a => { a.strategy = 'graph'; a.retrieval = null; a.trace = [{ step: 'graph_search', data: { count: 5 } }]; a.extra = {}; });
variant('agentic-trace', a => { a.strategy = 'agentic'; a.retrieval = null; a.trace = [{ step: 'tool:search', data: { iterations: 2 } }]; a.extra = {}; });
variant('large', a => { a.retrieval.chunks = Array.from({ length: 200 }, (_, i) => ({ chunk_id: a.sources[i]?.chunk_id ?? `large-${i}`, doc_id: a.sources[i] ? `doc-${i + 1}` : `document-${i}`, dense_rank: i + 1, sparse_rank: i % 2 ? null : i + 2, fused_score: 1 / (60 + i), rerank_score: 5 - i / 30 })); a.retrieval.counts = { dense: 300, sparse: 250, fused: 400, reranked: 200, final: 200 }; a.metrics.context_chunks = 200; a.metrics.retrieved_chunks = 400; });
export const disabledHealth = { status: 'ok', version: 'fixture', auth_required: false, providers: { openai: true, anthropic: false }, capabilities: Object.fromEntries(['graph', 'agentic', 'graph_build', 'judge'].map(k => [k, { enabled: false, reason: 'An Anthropic key is required; configure ANTHROPIC_API_KEY to enable this feature.' }])) };
export function strategyResult(name, answer = cases.hybrid.answer) { return { ...structuredClone(answer), strategy: name, trace: answer.trace ?? [], extra: answer.extra ?? {}, iterations: 0 }; }
