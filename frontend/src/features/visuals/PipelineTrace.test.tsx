import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { cases } from '../../test-fixtures/visuals.mjs';
import PipelineTrace from './PipelineTrace';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render(node: React.ReactNode) {
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  act(() => root.render(<I18nProvider initialLanguage="en">{node}</I18nProvider>));
  dispose = () => { act(() => root.unmount()); el.remove(); }; return el;
}
describe('PipelineTrace alternatives', () => {
  for (const [name, { answer }] of Object.entries(cases)) it(`${name}: every chart has one native table by default`, () => {
    const el = render(<PipelineTrace retrieval={answer.retrieval} metrics={answer.metrics} />);
    expect(el.querySelector('svg[role="img"]')).not.toBeNull(); expect(el.querySelectorAll('table')).toHaveLength(1);
    expect(el.querySelector('svg')!.getAttribute('aria-labelledby')).toBeTruthy();
    expect(el.querySelector('.visual-table-sr table')).not.toBeNull();
    act(() => el.querySelector<HTMLButtonElement>('.chart-table button')!.click());
    expect(el.querySelector('.visual-scroll table')).not.toBeNull(); expect(el.querySelectorAll('table')).toHaveLength(1);
    if (!answer.retrieval) expect(el.textContent).toContain('Stage detail not reported');
  });
  it('keeps concurrent lanes at the same x and marks sparse degradation with hatch and words', () => {
    const a = cases.degraded.answer, el = render(<PipelineTrace retrieval={a.retrieval} metrics={a.metrics} />);
    expect(el.querySelector('[data-stage="dense"]')?.getAttribute('x')).toBe(el.querySelector('[data-stage="sparse"]')?.getAttribute('x'));
    expect(el.querySelector('[data-skipped="true"]')).not.toBeNull(); expect(el.querySelector('pattern')).not.toBeNull(); expect(el.textContent).toContain('skipped');
  });
  it('does not create an empty chart for absent diagnostics', () => {
    const el = render(<PipelineTrace />); expect(el.querySelector('svg')).toBeNull(); expect(el.textContent).toContain('Request timing not reported');
  });
  it('uses distinct band labels with an adjacent visible legend for each and one table', () => {
    const a = cases.hybrid.answer, el = render(<PipelineTrace retrieval={a.retrieval} metrics={a.metrics} />);
    const bands = el.querySelectorAll('.timing-band');
    expect(bands).toHaveLength(2);
    for (const [index, prefix] of ['D', 'R'].entries()) {
      const legend = bands[index].querySelector('.timing-legend')!;
      expect(legend.closest('.visual-table-sr')).toBeNull();
      expect(legend.previousElementSibling?.querySelector('svg')).not.toBeNull();
      expect(legend.textContent).toContain(`${prefix}1.`);
      const marks = [...bands[index].querySelectorAll('svg text')].map(mark => mark.textContent);
      expect(marks.length).toBeGreaterThan(0);
      expect(marks.every(mark => new RegExp(`^${prefix}\\d+$`).test(mark ?? ''))).toBe(true);
    }
    expect(el.querySelectorAll('table')).toHaveLength(1);
  });
});
