import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { cases } from '../../test-fixtures/visuals.mjs';
import RetrievalFunnel from './RetrievalFunnel';
import { waitForRendered } from '../../test-utils/waitForRendered';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render(answer = cases.hybrid.answer, activeChunk?: string) {
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  act(() => root.render(<I18nProvider initialLanguage="en"><RetrievalFunnel retrieval={answer.retrieval} refusalReason={answer.refusal ? answer.answer : undefined} activeChunk={activeChunk} /></I18nProvider>));
  dispose = () => { act(() => root.unmount()); el.remove(); }; return el;
}
describe('RetrievalFunnel', () => {
  for (const [name, { answer }] of Object.entries(cases)) it(`${name}: real counts and one native provenance table`, async () => {
    const el = render(answer);
    await waitForRendered(() => !el.querySelector('.provenance-scroll table[aria-busy="true"]'));
    if (!answer.retrieval) { expect(el.querySelector('table')).toBeNull(); expect(el.textContent).toContain('not reported'); return; }
    expect(el.querySelectorAll('table')).toHaveLength(2);
    expect(el.querySelectorAll('.provenance-scroll tbody tr')).toHaveLength(answer.retrieval.chunks.length);
    expect(el.querySelector('.provenance-scroll caption')?.textContent).toContain('provenance');
    expect(el.querySelector('table.funnel-counts caption')?.textContent).toContain('funnel');
    expect(el.querySelector('[data-stage="final"]')?.textContent).toContain(String(answer.retrieval.counts.final));
    if (answer.refusal) expect(el.textContent).toContain(answer.answer);
  });
  it('highlights the matching chunk and uses a dash for missing ranks without changing score scale', () => {
    const el = render(cases.hybrid.answer, cases.hybrid.answer.retrieval!.chunks[0].chunk_id);
    expect(el.querySelectorAll('tr[data-active="true"]')).toHaveLength(1);
    expect(el.querySelector('.provenance-scroll tbody')?.textContent).toContain('—');
    expect(el.querySelector('.provenance-scroll thead')?.textContent).toContain('cross-encoder');
    expect(el.querySelector('td[style]')).toBeNull();
  });
  it('shows final-zero refusal words instead of a decorative empty funnel', () => {
    const el = render(cases['final-zero'].answer); expect(el.textContent).toContain('No chunk reached the context');
    expect(el.querySelector('svg')).toBeNull();
  });
});
