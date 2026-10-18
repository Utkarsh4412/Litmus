import { memo, startTransition, useCallback, useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../../lib/i18n';
import { indexSources, sourceAnchor } from '../../lib/citations';
import PipelineTrace from '../visuals/PipelineTrace';
import RetrievalFunnel from '../visuals/RetrievalFunnel';
import EvidenceAnswer, { SourceCards } from './EvidenceAnswer';
import EvidenceScore from './EvidenceScore';
import type { AnswerData } from './types';
import '../visuals/visuals.css';

type Props = { answer: AnswerData; endpoint?: string; collapsed?: boolean };
export default memo(function AnswerVisuals({ answer, endpoint = '/ask', collapsed = false }: Props) {
  const { t } = useI18n();
  const id = useId().replace(/:/g, '');
  const [activeChunk, setActiveChunk] = useState<string | null>(null);
  const [tab, setTab] = useState<'evidence' | 'pipeline'>('evidence');
  const [scheduled, setScheduled] = useState({ answer, stage: 0 });
  const stage = scheduled.answer === answer ? scheduled.stage : 0;
  useEffect(() => {
    if (stage >= 3) return;
    const frame = requestAnimationFrame(() => startTransition(() => setScheduled({ answer, stage: stage + 1 })));
    return () => cancelAnimationFrame(frame);
  }, [answer, stage]);
  const activate = useCallback((chunk: string | null) => { setActiveChunk(chunk); if (chunk) setTab('evidence'); }, []);
  const navigateSource = useCallback((chunk: string) => {
    activate(chunk);
    const handle = [...indexSources(answer.sources)].find(([, matches]) => matches.length === 1 && matches[0].chunk_id === chunk)?.[0];
    if (handle) requestAnimationFrame(() => {
      const source = document.getElementById(sourceAnchor(id, handle));
      source?.focus({ preventScroll: true }); source?.scrollIntoView?.({ block: 'nearest' });
    });
  }, [activate, answer.sources, id]);
  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'evidence' : event.key === 'End' ? 'pipeline' : tab === 'evidence' ? 'pipeline' : 'evidence';
    setTab(next); document.getElementById(`${id}-${next}-tab`)?.focus();
  }
  return <div className="answer-visuals">
    <EvidenceScore answer={answer} endpoint={endpoint} />
    {!answer.refusal && <EvidenceAnswer answer={answer} anchorPrefix={id} activeChunk={activeChunk} onActiveChunk={activate} showSources={false} collapsed={collapsed} />}
    <div className="evidence-tabs" role="tablist" aria-label={t('visual.evidence')}>
      {(['evidence', 'pipeline'] as const).map(name => <button type="button" role="tab" id={`${id}-${name}-tab`} aria-controls={`${id}-${name}-panel`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} key={name} onClick={() => setTab(name)} onKeyDown={onKey}>{t(`visual.${name}`)}</button>)}
    </div>
    <div className="evidence-columns">
      <section id={`${id}-evidence-panel`} className="evidence-pane" data-selected={tab === 'evidence'} aria-label={t('visual.evidence')}>
        {answer.sources.length === 0 && <p className="visual-note">{t('visual.sourcesMissing')}</p>}
        {stage < 1 ? <p className="visual-note" role="status">{t('visual.preparing')}</p> : <SourceCards sources={answer.sources} anchorPrefix={id} activeChunk={activeChunk} />}
      </section>
      <section id={`${id}-pipeline-panel`} className="evidence-pane" data-selected={tab === 'pipeline'} aria-label={t('visual.pipeline')} aria-busy={stage < 3}>
        {stage < 3 && <p className="visual-note" role="status">{t('visual.preparing')}</p>}
        {stage >= 2 && <PipelineTrace retrieval={answer.retrieval} metrics={answer.metrics} endpoint={endpoint} />}
        {stage >= 3 && <RetrievalFunnel retrieval={answer.retrieval} refusalReason={answer.refusal ? answer.answer : undefined} activeChunk={activeChunk} endpoint={endpoint} sources={answer.sources} anchorPrefix={id} onSource={navigateSource} />}
      </section>
    </div>
  </div>;
});
