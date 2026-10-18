import { memo, useMemo } from 'react';
import { indexSources, sourceAnchor, splitCitations, unsupportedSegments } from '../../lib/citations';
import { cleanAnswer, formatScore } from '../../lib/formatting';
import { useI18n } from '../../lib/i18n';
import { CitedText, SourceLocation, type CitedSource } from './Citations';
import type { EvidenceInput } from './types';

type Props = { answer: EvidenceInput; anchorPrefix: string; activeChunk?: string | null; onActiveChunk?: (chunk: string | null) => void; collapsed?: boolean; showSources?: boolean };
export const SourceCards = memo(function SourceCards({ sources, anchorPrefix, activeChunk }: { sources: CitedSource[]; anchorPrefix: string; activeChunk?: string | null }) {
  const { t, locale } = useI18n();
  const lookup = useMemo(() => indexSources(sources), [sources]);
  const real = useMemo(() => sources.filter(s => s.chunk_id && s.chunk_id !== 'none'), [sources]);
  if (!real.length) return null;
  return <section className="source-cards" aria-label={t('visual.evidence')}>
    <h3>{t('common.sources', { count: real.length })}</h3>
    <ol>{real.map((source, i) => <li key={`${source.chunk_id}-${i}`} id={source.handle && lookup.get(source.handle)?.length === 1 ? sourceAnchor(anchorPrefix, source.handle) : `${anchorPrefix}-source-${i}`}
      className="source-card" tabIndex={-1} data-chunk-id={source.chunk_id} data-active={source.chunk_id === activeChunk} aria-current={source.chunk_id === activeChunk ? true : undefined}>
      <div className="source-heading"><span className="font-mono">{source.handle ? `[${source.handle}]` : '—'}</span> <SourceLocation s={source} /><code>{source.chunk_id}</code></div>
      {source.relevance_score != null && <p className="text-xs text-zinc-500">{t('compare.relevanceScore', { score: formatScore(source.relevance_score, 2, locale) })}</p>}
      {source.quote && (source.quote.length > 500 ? <details><summary>{t('visual.quote')}</summary><blockquote>{source.quote}</blockquote></details> : <blockquote>{source.quote}</blockquote>)}
    </li>)}</ol>
  </section>;
});

export default memo(function EvidenceAnswer({ answer, anchorPrefix, activeChunk, onActiveChunk, collapsed = false, showSources = true }: Props) {
  const { t } = useI18n();
  const text = cleanAnswer(answer.answer ?? '');
  const sources = useMemo(() => answer.sources ?? [], [answer.sources]);
  const pieces = useMemo(() => unsupportedSegments(text, answer.claims), [text, answer.claims]);
  const lookup = useMemo(() => indexSources(sources), [sources]);
  const warnings = useMemo(() => {
    const handles = new Set([...(answer.invalid_citations ?? []), ...splitCitations(text).flatMap(segment => segment.kind === 'cite' && lookup.get(segment.handle)?.length !== 1 ? [segment.handle] : [])]);
    return [...handles].map(handle => ({ handle, ambiguous: (lookup.get(handle)?.length ?? 0) > 1 }));
  }, [text, answer.invalid_citations, lookup]);
  const unmatched = useMemo(() => (answer.claims ?? []).filter(claim => claim.supported === false && !pieces.some(piece => piece.unsupported && piece.text === claim.text)), [answer.claims, pieces]);
  return <div className="evidence-answer">
    {!answer.refusal && !answer.claims?.length && <p className="visual-note">{t('visual.claimsUnavailable')}</p>}
    <p className={`answer-text ${collapsed ? 'line-clamp-6' : ''}`}>{pieces.map((piece, i) => piece.unsupported ? <span key={i} className="unsupported-claim" role="note" aria-label={t('visual.unsupported')}><span className="claim-flag" aria-hidden="true">!</span><CitedText text={piece.text} anchorPrefix={anchorPrefix} sources={sources} interactive onSourceActive={onActiveChunk} /></span> : <CitedText key={i} text={piece.text} anchorPrefix={anchorPrefix} sources={sources} interactive onSourceActive={onActiveChunk} />)}</p>
    {unmatched.length > 0 && <div className="visual-note"><p>{t('visual.unmatchedClaims')}</p><ul>{unmatched.map((claim, i) => <li key={i}><span aria-hidden="true">! </span>{claim.text}</li>)}</ul></div>}
    {answer.unsupported_notes && <p className="visual-note">{t('grounding.notCovered', { notes: answer.unsupported_notes })}</p>}
    {warnings.length > 0 && <ul className="visual-note" aria-live="polite">{warnings.map(({ handle, ambiguous }) => <li key={handle}>{t(ambiguous ? 'visual.ambiguousMarker' : 'visual.invalidMarker', { handle })}</li>)}</ul>}
    {showSources && <SourceCards sources={sources} anchorPrefix={anchorPrefix} activeChunk={activeChunk} />}
  </div>;
});
