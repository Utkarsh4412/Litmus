import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../lib/i18n';
import { comparableReport, mismatchReport } from '../../test-fixtures/visuals.mjs';
import type { RegressionReport } from './api';
import BaselineStrip from './BaselineStrip';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
function render(report: RegressionReport) {
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  act(() => root.render(<I18nProvider initialLanguage="en"><BaselineStrip report={report} /></I18nProvider>));
  dispose = () => { act(() => root.unmount()); el.remove(); }; return el;
}
describe('BaselineStrip', () => {
  it('shows a single native table, signed computed delta, status words and both judge identities', () => {
    const el = render(comparableReport); expect(el.querySelectorAll('table')).toHaveLength(1);
    expect(el.querySelector('tbody')?.textContent).toContain('+0.020'); expect(el.textContent).toContain('Pass');
    expect(el.textContent).toContain('anthropic'); expect(el.textContent).toContain('fixture-judge');
  });
  it('subtracts nothing when not comparable, including a misleading returned delta', () => {
    const el = render(mismatchReport); expect(el.textContent).toContain('Not comparable');
    expect(el.textContent).toContain('judge_provider, judge_model'); expect(el.textContent).not.toContain('+0.190');
    expect(el.querySelector('tbody tr td:nth-child(5)')?.textContent).toBe('—');
  });
  it('requires explicit comparability and never fills absent measurements', () => {
    const el = render({ status: 'SKIPPED', checks: [{ metric: 'missing', status: 'SKIPPED', current: 0.9 }] });
    expect(el.textContent).toContain('Not comparable'); expect(el.querySelector('tbody')?.textContent).toContain('—');
  });
});
