import type { EvidenceInput } from './types';

/** Only returned facts: no confidence calibration, inferred counts or mode code. */
export function evidenceFacts(answer: EvidenceInput) {
  const claims = answer.claims;
  const hasClaims = Array.isArray(claims) && claims.length > 0;
  return {
    score: answer.refusal || typeof answer.confidence !== 'number' || !Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1 ? null : answer.confidence,
    refusal: answer.refusal === true,
    reason: answer.refusal ? answer.answer ?? null : null,
    claims: hasClaims ? claims.length : null,
    supported: hasClaims && claims.every(c => typeof c.supported === 'boolean') ? claims.filter(c => c.supported === true).length : null,
    citations: typeof answer.citation_count === 'number' && Number.isFinite(answer.citation_count) && answer.citation_count >= 0 ? answer.citation_count : null,
    invalid: Array.isArray(answer.invalid_citations) ? answer.invalid_citations.length : null,
    claimsUnavailable: !hasClaims,
  };
}
