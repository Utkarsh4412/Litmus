import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { cases } from '../../test-fixtures/visuals.mjs';
import EvidenceScore from './EvidenceScore';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render(node: React.ReactNode) {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container); act(() => root.render(<I18nProvider initialLanguage="en">{node}</I18nProvider>));
  dispose = () => { act(() => root.unmount()); container.remove(); };
  return container;
}
describe('EvidenceScore', () => {
  for (const [name, { answer }] of Object.entries(cases)) it(`${name}: honest score or public refusal`, () => {
    const el = render(<EvidenceScore answer={answer} />);
    expect(el.querySelector('[role="progressbar"]')).toBeNull();
    expect(el.textContent).not.toContain('%');
    if (answer.refusal) { expect(el.textContent).toContain(answer.answer); expect(el.querySelector('strong')).toBeNull(); }
    else expect(el.textContent).toContain('evidence score');
  });
  it('states the API definition and returned facts', () => {
    const el = render(<EvidenceScore answer={cases.hybrid.answer} />);
    expect(el.textContent).toContain('3 of 4 claims supported'); expect(el.textContent).toContain('5 citations'); expect(el.textContent).toContain('0 invalid');
    expect(el.textContent).toContain('not a calibrated probability');
  });
});
