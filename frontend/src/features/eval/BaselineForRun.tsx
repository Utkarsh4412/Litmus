import { useQuery } from '@tanstack/react-query';
import ErrorAlert from '../../design-system/ErrorAlert';
import LoadingSpinner from '../../design-system/LoadingSpinner';
import { errorMessage } from '../../lib/api/client';
import { useI18n } from '../../lib/i18n';
import { getRunRegression } from './api';
import BaselineStrip from './BaselineStrip';

export default function BaselineForRun({ runId }: { runId: string }) {
  const { t } = useI18n();
  const report = useQuery({ queryKey: ['regression', runId], queryFn: () => getRunRegression(runId) });
  return <div className="baseline-slot" aria-busy={report.isLoading}>
    {report.isLoading && <LoadingSpinner message={t('eval.reportLoading')} />}
    {report.error && <ErrorAlert error={t('eval.reportFailed', { error: errorMessage(report.error) })} onRetry={() => report.refetch()} />}
    {report.data && <BaselineStrip report={report.data} />}
  </div>;
}
