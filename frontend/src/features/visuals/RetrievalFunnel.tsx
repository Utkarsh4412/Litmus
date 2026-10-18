import { memo, startTransition, useEffect, useId, useMemo, useState } from 'react';
import { STAGE_COLORS } from '../../design-system/chartPalette';
import PlotWell from '../../design-system/PlotWell';
import { indexSources, sourceAnchor } from '../../lib/citations';
import { useI18n } from '../../lib/i18n';
import type { CitedSource } from '../answer/Citations';
import type { RetrievalDiagnostics } from '../answer/types';
import { funnelRows, provenanceRows } from './viewModels';

const ProvenanceRow = memo(function ProvenanceRow({ row, active, formatter, handle, anchorPrefix, onSource }: { row: ReturnType<typeof provenanceRows>[number]; active: boolean; formatter: Intl.NumberFormat; handle?: string; anchorPrefix?: string; onSource?: (chunk: string) => void }) {
  const number = (value: number | null) => value === null ? '—' : formatter.format(value);
  return <tr className="provenance-row" data-chunk-id={row.chunk_id} data-active={active} aria-current={active ? true : undefined}>
    <th scope="row">{anchorPrefix && handle ? <a className="provenance-link" href={`#${sourceAnchor(anchorPrefix, handle)}`} onClick={event => { if (!onSource) return; event.preventDefault(); onSource(row.chunk_id); }}>{row.doc_id}</a> : row.doc_id}<br /><span>{row.chunk_id}</span></th>
    <td>{number(row.dense_rank)}</td><td>{number(row.sparse_rank)}</td><td>{number(row.fused_score)}</td><td>{number(row.rerank_score)}</td>
  </tr>;
});

export default memo(function RetrievalFunnel({ retrieval, refusalReason, activeChunk, endpoint = '/ask', sources, anchorPrefix, onSource }: { retrieval?: RetrievalDiagnostics | null; refusalReason?: string; activeChunk?: string | null; endpoint?: string; sources?: CitedSource[]; anchorPrefix?: string; onSource?: (chunk: string) => void }) {
  const { t, locale } = useI18n();
  const id = useId();
  const counts = useMemo(() => funnelRows(retrieval?.counts, retrieval?.mode), [retrieval?.counts, retrieval?.mode]);
  const rows = useMemo(() => provenanceRows(retrieval?.chunks), [retrieval?.chunks]);
  const [rendered, setRendered] = useState({ data: rows, limit: 10 });
  const limit = rendered.data === rows ? rendered.limit : 10;
  useEffect(() => {
    if (limit >= rows.length) return;
    const frame = requestAnimationFrame(() => startTransition(() => setRendered({ data: rows, limit: Math.min(limit + 10, rows.length) })));
    return () => cancelAnimationFrame(frame);
  }, [rows, limit]);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, { maximumSignificantDigits: 8 }), [locale]);
  const number = (value: number | null) => value === null ? '—' : formatter.format(value);
  const handles = useMemo(() => {
    const result = new Map<string, string>();
    for (const [handle, matches] of indexSources(sources ?? [])) if (matches.length === 1) result.set(matches[0].chunk_id, handle);
    return result;
  }, [sources]);
  return <section className="visual-panel retrieval-funnel" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{t('visual.funnelTitle')}</h3>
    {!retrieval ? <p className="visual-note">{t('visual.detailMissing')}</p> : <>
      <div className="funnel-modes"><span className="chip">{t(`visual.mode.${retrieval.mode}`)}</span><span>{t('visual.reranker', { name: retrieval.reranker })}</span></div>
      {retrieval.mode !== 'hybrid' && <p className="visual-note">{t('visual.absentLane', { stage: t(`visual.stage.${retrieval.mode === 'dense' ? 'sparse' : 'dense'}`), mode: retrieval.mode })}</p>}
      <PlotWell><table className="funnel-counts"><caption className="sr-only">{t('visual.funnelTitle')}</caption><thead><tr><th scope="col">{t('visual.pipeline')}</th><th scope="col">{t('visual.count')}</th></tr></thead><tbody>{counts.map(row => <tr key={row.stage} data-stage={row.stage}>
        <th scope="row">{t(`visual.stage.${row.stage}`)}</th><td><div className="funnel-count-cell"><span className="funnel-track" aria-hidden="true"><span style={{ width: `${(row.fraction ?? 0) * 100}%`, background: row.stage === 'reranked' ? STAGE_COLORS.rerank : STAGE_COLORS.retrieval }} /></span><span className="font-mono">{number(row.count)}</span>{(row.stage === 'dense' || row.stage === 'sparse') && retrieval.degraded?.includes(row.stage) && <span>! {t('visual.skipped')}</span>}</div></td>
      </tr>)}</tbody></table></PlotWell>
      {retrieval.counts.final === 0 && <p className="visual-note">! {t('visual.finalZero')} {refusalReason}</p>}
      {retrieval.counts.final !== 0 && refusalReason && <p className="visual-note">! {refusalReason}</p>}
      {retrieval.reranker === 'bm25-fallback' && <p className="visual-note">! {t('visual.fallback')}</p>}
      <p className="visual-scroll-hint">{t('visual.scrollHint')}</p>
      <div className="visual-scroll provenance-scroll" tabIndex={0} role="region" aria-label={t('visual.provenance')} data-scroll>
        <table aria-busy={limit < rows.length}><caption>{t('visual.provenance')}</caption><thead><tr><th scope="col">{t('visual.docId')} / {t('visual.chunkId')}</th><th scope="col">{t('visual.denseRank')}</th><th scope="col">{t('visual.sparseRank')}</th><th scope="col">{t('visual.fusedScore')}</th><th scope="col">{t('visual.rerankScore')}<br />{t('visual.reranker', { name: retrieval.reranker })}</th></tr></thead>
          <tbody>{rows.slice(0, limit).map((row, index) => <ProvenanceRow key={`${row.chunk_id}-${index}`} row={row} active={row.chunk_id === activeChunk} formatter={formatter} handle={handles.get(row.chunk_id)} anchorPrefix={anchorPrefix} onSource={onSource} />)}</tbody>
        </table>
      </div>
    </>}
    <details className="visual-origin"><summary>{t('visual.dataSource')}</summary><code>POST {endpoint} · retrieval.counts, retrieval.mode, retrieval.reranker, retrieval.chunks</code></details>
  </section>;
});
