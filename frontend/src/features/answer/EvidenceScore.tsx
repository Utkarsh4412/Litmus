import { useId, useMemo, useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { evidenceFacts } from './evidenceFacts';
import type { EvidenceInput } from './types';

export default function EvidenceScore({ answer, endpoint = '/ask' }: { answer: EvidenceInput; endpoint?: string }) {
  const { t, formatNumber } = useI18n();
  const facts = useMemo(() => evidenceFacts(answer), [answer]);
  const [help, setHelp] = useState(false);
  const helpId = useId();
  return <section className="evidence-score" data-evidence-score aria-label={t('visual.evidenceScore')}>
    {facts.refusal ? <p className="refusal-reason"><span aria-hidden="true">× </span>{t('common.refused')}: {facts.reason || answer.status || t('visual.unreported')}</p> : <>
      <div className="score-heading"><span>{t('visual.evidenceScore')}</span><strong className="font-mono">{facts.score === null ? '—' : formatNumber(facts.score, { maximumSignificantDigits: 3 })}</strong>
        <span className="score-help" onMouseEnter={() => setHelp(true)} onMouseLeave={() => setHelp(false)} onFocus={() => setHelp(true)} onBlur={() => setHelp(false)} onKeyDown={event => { if (event.key === 'Escape') setHelp(false); }}>
          <button type="button" className="btn-ghost text-xs" aria-describedby={helpId} onClick={() => setHelp(value => !value)}>{t('visual.definition')}</button>
          <span id={helpId} role="tooltip" hidden={!help} className="score-tooltip">{t('visual.scoreDefinition')}</span>
        </span>
      </div>
      <ul className="evidence-facts">
        <li>{facts.claims !== null && facts.supported !== null ? t('visual.claimFacts', { supported: facts.supported, total: facts.claims }) : t('visual.claimsUnreported')}</li>
        <li>{facts.citations === null ? t('visual.citationsUnreported') : t('visual.citationFacts', { n: facts.citations })}</li>
        <li>{facts.invalid === null ? t('visual.invalidUnreported') : t('visual.invalidFacts', { n: facts.invalid })}</li>
      </ul>
    </>}
    <details className="visual-origin"><summary>{t('visual.dataSource')}</summary><code>POST {endpoint} · confidence, refusal, status, claims[].supported, citation_count, invalid_citations</code></details>
  </section>;
}
