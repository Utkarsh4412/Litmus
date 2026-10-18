import { describe, expect, it } from 'vitest';
import { cases } from '../../test-fixtures/visuals.mjs';
import { evidenceFacts } from './evidenceFacts';
describe('evidence facts', () => {
  for (const [name, { answer }] of Object.entries(cases)) it(`${name}: trusts only returned evidence`, () => {
    const facts = evidenceFacts(answer);
    if (answer.refusal) { expect(facts.score).toBeNull(); expect(facts.reason).toBe(answer.answer); }
    else expect(facts.score).toBe(answer.confidence);
    expect(facts.invalid).toBe(answer.invalid_citations?.length ?? null);
  });
  it('reports three of four supported, five citations and zero invalid', () => {
    expect(evidenceFacts(cases.hybrid.answer)).toMatchObject({ supported: 3, claims: 4, citations: 5, invalid: 0, score: .71 });
  });
  it('cannot claim text mode, a refusal reason code or absent counts', () => {
    expect(evidenceFacts({ answer: 'Plain answer', sources: [], refusal: false })).toMatchObject({ claims: null, supported: null, citations: null, invalid: null, score: null, claimsUnavailable: true });
    expect(evidenceFacts(cases['text-mode'].answer).claimsUnavailable).toBe(true);
    expect(evidenceFacts(cases.truncated.answer).reason).not.toContain('{');
  });
});
