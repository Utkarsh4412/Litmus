import { memo, useId, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { baselineRows } from '../visuals/viewModels';
import type { RegressionReport } from './api';
import { formatCheckDelta, formatCheckValue } from './runHistory';
import { RegressionBadge } from './shared';
import '../visuals/visuals.css';

export default memo(function BaselineStrip({ report }: { report: RegressionReport }) {
  const { t, locale } = useI18n();
  const id = useId();
  const rows = useMemo(() => baselineRows(report), [report]);
  return <section className="visual-panel baseline-strip" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{t('visual.baselineTitle')}</h3>
    <div className="baseline-identities"><RegressionBadge status={report.status} tip="eval.regTip" />
      {report.baseline?.id ? <span>{t('eval.reportBaseline', { id: report.baseline.id, source: report.baseline_source ? t(`eval.baseline.${report.baseline_source}`) : t('visual.unreported') })}</span> : <span>{t('eval.reportNoBaseline')}</span>}
    </div>
    <div className="baseline-identities">{(['baseline', 'current'] as const).map(which => <p key={which}><strong>{t(which === 'baseline' ? 'eval.col.baseline' : 'eval.col.current')}</strong>: {t('visual.judgeIdentity', { provider: report[which]?.judge_provider ?? t('visual.unreported'), model: report[which]?.judge_model ?? t('visual.unreported') })}</p>)}</div>
    {report.comparable !== true && <p className="visual-note">! {t('visual.notComparable')}{report.config_mismatch?.length ? ` · ${t('visual.configMismatch', { fields: report.config_mismatch.join(', ') })}` : ''}</p>}
    {!rows.length ? <p className="visual-note">{t('eval.reportEmpty')}</p> : <>
      <p className="visual-scroll-hint">{t('visual.scrollHint')}</p>
      <div className="visual-scroll" tabIndex={0} role="region" aria-label={t('eval.reportCaption')} data-scroll><table>
        <caption className="sr-only">{t('eval.reportCaption')}</caption>
        <thead><tr>{(['status', 'metric', 'baseline', 'current', 'delta', 'threshold', 'note'] as const).map(column => <th scope="col" key={column}>{t(`eval.col.${column}`)}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.metric}><td><RegressionBadge status={row.status} tip={null} /></td><th scope="row">{row.metric}</th><td>{row.baseline === null ? t('common.na') : formatCheckValue(row.metric, row.baseline, locale)}</td><td>{row.current === null ? t('common.na') : formatCheckValue(row.metric, row.current, locale)}</td><td>{row.delta === null ? (report.comparable === true ? t('common.na') : '—') : formatCheckDelta(row.metric, row.delta, locale)}</td><td>{row.threshold ?? '—'}</td><td>{row.reason ?? ''}</td></tr>)}</tbody>
      </table></div>
    </>}
    <details className="visual-origin"><summary>{t('visual.dataSource')}</summary><code>GET /eval/runs/&#123;id&#125;/regression · comparable, config_mismatch, checks, baseline, current</code></details>
  </section>;
});
