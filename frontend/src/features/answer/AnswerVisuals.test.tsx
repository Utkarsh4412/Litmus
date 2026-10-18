import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { cases } from '../../test-fixtures/visuals.mjs';
import AnswerVisuals from './AnswerVisuals';
import { waitForRendered } from '../../test-utils/waitForRendered';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render() {
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  act(() => root.render(<I18nProvider initialLanguage="en"><AnswerVisuals answer={cases.hybrid.answer} /></I18nProvider>));
  dispose = () => { act(() => root.unmount()); el.remove(); }; return el;
}
it('keyboard focus and hover link one source and provenance row, with unique native alternatives', async () => {
  const el = render();
  await waitForRendered(() => el.querySelectorAll('table').length === 3
    && !el.querySelector('[aria-busy="true"]'));
  const marker = el.querySelector<HTMLButtonElement>('.citation-marker')!;
  act(() => marker.focus());
  expect(el.querySelectorAll('.source-card[data-active="true"]')).toHaveLength(1);
  expect(el.querySelectorAll('.provenance-row[data-active="true"]')).toHaveLength(1);
  act(() => marker.blur()); expect(el.querySelectorAll('[data-active="true"]')).toHaveLength(0);
  act(() => marker.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
  expect(el.querySelectorAll('.source-card[data-active="true"]')).toHaveLength(1);
  expect(el.querySelectorAll('.provenance-row[data-active="true"]')).toHaveLength(1);
  expect(el.querySelectorAll('table')).toHaveLength(3);
  const tabs = el.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  act(() => tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  expect(tabs[1].getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(tabs[1]);
  expect(el.querySelectorAll('table')).toHaveLength(3);
  expect(el.querySelectorAll('.provenance-link')).toHaveLength(5);
  act(() => el.querySelector<HTMLAnchorElement>('.provenance-link')!.click());
  expect(el.querySelectorAll('.source-card[data-active="true"]')).toHaveLength(1);
});
