import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { cases } from '../../test-fixtures/visuals.mjs';
import EvidenceAnswer from './EvidenceAnswer';
import { vi } from 'vitest';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render(node: React.ReactNode) {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container); act(() => root.render(<I18nProvider initialLanguage="en">{node}</I18nProvider>));
  dispose = () => { act(() => root.unmount()); container.remove(); };
  return container;
}
describe('EvidenceAnswer', () => {
  for (const [name, { answer }] of Object.entries(cases)) it(`${name}: preserves readable evidence and honest missing states`, () => {
    const el = render(<EvidenceAnswer answer={answer} anchorPrefix="a" />);
    expect(el.textContent).toContain(answer.answer.split(' [S')[0]);
    expect(new Set([...el.querySelectorAll('[id]')].map(n => n.id)).size).toBe(el.querySelectorAll('[id]').length);
    if (!answer.refusal && !answer.claims?.length) expect(el.textContent).toContain('could not be checked claim by claim');
  });
  it('uses buttons, calls the same chunk for hover/focus and labels unsupported claims', () => {
    const change = vi.fn();
    const el = render(<EvidenceAnswer answer={cases.hybrid.answer} anchorPrefix="a" activeChunk="doc-1:1" onActiveChunk={change} />);
    const button = el.querySelector<HTMLButtonElement>('.citation-marker')!;
    act(() => button.focus()); expect(change).toHaveBeenLastCalledWith('doc-1:1');
    change.mockClear();
    act(() => button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))); expect(change).toHaveBeenLastCalledWith('doc-1:1');
    expect(el.querySelector('.source-card[data-active="true"]')?.getAttribute('data-chunk-id')).toBe('doc-1:1');
    expect(el.querySelector('.unsupported-claim')?.getAttribute('aria-label')).toBe('Not supported by cited sources');
  });
  it('disables unresolved/duplicate handles and explains them in words', () => {
    const missing = render(<EvidenceAnswer answer={cases['duplicate-handles'].answer} anchorPrefix="a" />);
    expect(missing.querySelector<HTMLButtonElement>('.citation-marker')!.disabled).toBe(true);
    expect(missing.textContent).toContain('matches multiple sources');
  });
});
