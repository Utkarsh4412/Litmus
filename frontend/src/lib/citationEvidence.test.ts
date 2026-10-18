import { describe, expect, it } from 'vitest';
import { cases } from '../test-fixtures/visuals.mjs';
import { indexSources, unsupportedSegments } from './citations';
describe('citation evidence extensions', () => {
  it('never picks an arbitrary duplicate handle or invents a missing one', () => {
    const lookup = indexSources(cases['duplicate-handles'].answer.sources);
    expect(lookup.get('S1')).toHaveLength(2); expect(lookup.has('S9')).toBe(false);
  });
  it('preserves original text and marks literal unsupported ranges only', () => {
    const a = cases.hybrid.answer;
    const pieces = unsupportedSegments(a.answer, a.claims);
    expect(pieces.map(p => p.text).join('')).toBe(a.answer);
    expect(pieces.filter(p => p.unsupported).map(p => p.text)).toEqual(['Every answer is always correct']);
    expect(unsupportedSegments('Other text', [{ text: 'absent', supported: false }])).toEqual([{ text: 'Other text', unsupported: false }]);
  });
});
