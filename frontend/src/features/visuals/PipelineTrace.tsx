import { memo, useId, useMemo } from 'react';
import PlotWell from '../../design-system/PlotWell';
import { STAGE_COLORS } from '../../design-system/chartPalette';
import { useI18n } from '../../lib/i18n';
import type { RequestMetrics, RetrievalDiagnostics } from '../answer/types';
import ChartTable from './ChartTable';
import { pipelineSegments, type Stage, type TimingSlot } from './viewModels';

const colours: Record<Stage, string> = { preprocess: STAGE_COLORS.retrieval, dense: STAGE_COLORS.retrieval, sparse: STAGE_COLORS.retrieval, fusion: STAGE_COLORS.retrieval, retrieval: STAGE_COLORS.retrieval, rerank: STAGE_COLORS.rerank, generation: STAGE_COLORS.generation, citation_validation: STAGE_COLORS.citation_validation, other: STAGE_COLORS.other };
export default memo(function PipelineTrace({ retrieval, metrics, endpoint = '/ask' }: { retrieval?: RetrievalDiagnostics | null; metrics?: RequestMetrics | null; endpoint?: string }) {
  const { t, locale } = useI18n();
  const id = useId().replace(/:/g, '');
  const model = useMemo(() => pipelineSegments(retrieval, metrics), [retrieval, metrics]);
  const rows = useMemo(() => [...model.detail.flatMap(slot => slot.rows.map(row => ({ ...row, band: 'detail' as const }))), ...model.metrics.map(row => ({ ...row, band: 'request' as const }))], [model]);
  const label = (stage: Stage) => t(`visual.stage.${stage}`);
  const formatters = useMemo(() => ({ number: new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }), share: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }) }), [locale]);
  const number = (ms: number | null) => ms === null ? '—' : formatters.number.format(ms);
  const hasMarks = rows.some(row => row.ms !== null && row.ms > 0);
  function band(slots: TimingSlot[], y: number, prefix: string) {
    const duration = slots.reduce((sum, slot) => sum + (slot.ms ?? 0), 0);
    let offset = 24;
    return slots.map((slot, i) => {
      const width = duration > 0 && slot.ms !== null ? slot.ms / duration * 852 : 0;
      const x = offset; offset += width;
      return <g key={i}>
        {width >= 16 && <text x={x + width / 2} y={y - 6} textAnchor="middle">{prefix}{i + 1}</text>}
        {slot.rows.map((row, lane) => {
          const laneWidth = slot.ms && row.ms !== null ? width * row.ms / slot.ms : 0;
          const rowY = slot.rows.length > 1 ? y + lane * 24 : y + 12;
          return row.ms !== null && row.ms > 0 ? <g key={row.stage}><rect data-stage={row.stage} data-lane={lane} data-ms={row.ms} data-skipped={row.skipped} x={x + 1} y={rowY} width={Math.max(0, laneWidth - 2)} height={slot.rows.length > 1 ? 20 : 24} fill={colours[row.stage]} />{row.skipped && <rect x={x + 1} y={rowY} width={Math.max(0, laneWidth - 2)} height={slot.rows.length > 1 ? 20 : 24} fill={`url(#${id}-${prefix}-hatch)`} />}</g> : null;
        })}
      </g>;
    });
  }
  function labelledBand(slots: TimingSlot[], prefix: 'D' | 'R') {
    const title = t(prefix === 'D' ? 'visual.retrievalDetail' : 'visual.requestTimings');
    return <div className="timing-band">
      <h4 className="visual-note">{title}</h4>
      {hasMarks && <div className="visual-scroll" tabIndex={0} role="region" aria-label={title} data-scroll>
        <svg role="img" aria-labelledby={`${id}-${prefix}-title ${id}-${prefix}-description`} viewBox="0 0 900 76" className="pipeline-svg">
          <title id={`${id}-${prefix}-title`}>{t('visual.pipelineTitle')}: {title}</title>
          <desc id={`${id}-${prefix}-description`}>{t(prefix === 'D' ? 'visual.parallelNote' : 'visual.requestTimings')}</desc>
          <defs><pattern id={`${id}-${prefix}-hatch`} patternUnits="userSpaceOnUse" width="8" height="8"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="var(--ink)" strokeWidth="1.5" /></pattern></defs>
          {band(slots, 28, prefix)}
        </svg>
      </div>}
      <ol className="timing-legend" aria-label={title}>{slots.map((slot, i) => <li key={i}><span className="font-mono">{prefix}{i + 1}.</span> {slot.rows.map(row => `${label(row.stage)} ${number(row.ms)} ms${row.skipped ? ` · ! ${t('visual.skipped')}` : ''}`).join(' / ')}</li>)}</ol>
    </div>;
  }
  return <section className="visual-panel pipeline-trace" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{t('visual.pipelineTitle')}</h3>
    {model.missingDetail && <p className="visual-note">{t('visual.detailMissing')}</p>}
    {!model.metrics.length && <p className="visual-note">{t('visual.noMetrics')}</p>}
    {rows.length > 0 && <>{hasMarks && <p className="visual-scroll-hint">{t('visual.scrollHint')}</p>}<PlotWell>
      {model.detail.length > 0 && labelledBand(model.detail, 'D')}
      {model.metrics.length > 0 && labelledBand(model.metrics.map(row => ({ rows: [row], ms: row.ms })), 'R')}
    </PlotWell></>}
    {model.detail.length > 0 && <p className="visual-note">{t('visual.parallelNote')}</p>}
    {model.metrics.length > 0 && <p className="visual-note">{number(model.total)} ms</p>}
    {retrieval?.reranker === 'bm25-fallback' && <p className="visual-note">! {t('visual.fallback')}</p>}
    {model.overReported && <p className="visual-note">! {t('visual.timingMismatch')}</p>}
    {model.metrics.some(row => row.derived) && <p className="visual-note">{t('visual.derivedOther')}</p>}
    {rows.length > 0 && <ChartTable caption={t('visual.pipelineTitle')}><thead><tr><th scope="col">{t('visual.pipeline')}</th><th scope="col">{t('visual.latency')}</th><th scope="col">{t('visual.share')}</th><th scope="col">{t('visual.status')}</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i}><th scope="row">{t(row.band === 'detail' ? 'visual.retrievalDetail' : 'visual.requestTimings')}: {label(row.stage)}</th><td>{number(row.ms)}</td><td>{row.ms !== null && model.total !== null && model.total > 0 ? formatters.share.format(row.ms / model.total) : '—'}</td><td>{row.skipped ? `! ${t('visual.skipped')}` : row.ms === null ? t('visual.unreported') : t('visual.reported')}</td></tr>)}</tbody></ChartTable>}
    <details className="visual-origin"><summary>{t('visual.dataSource')}</summary><code>POST {endpoint} · retrieval.latency_ms, retrieval.degraded, retrieval.reranker, metrics.latency_ms</code></details>
  </section>;
});
