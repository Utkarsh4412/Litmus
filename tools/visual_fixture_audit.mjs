/** Browser checks use exactly the same response fixtures as Vitest. No app fixture path. */
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { cases, comparableReport, mismatchReport, disabledHealth, strategyResult } from '../frontend/src/test-fixtures/visuals.mjs';
import { measureBlur } from './blur_area.mjs';

export async function auditVisualFixtures(context, width, { theme, output, axePath, manifest, only = '', profile = false }) {
  const check = (condition, message) => { if (!condition) throw new Error(`Response ${width}/${theme}: ${message}`); };
  async function audit(page, name, file, extra = {}) {
    await page.mouse.move(1, 1);
    await page.addScriptTag({ path: axePath });
    const axe = await page.evaluate(async () => (await window.axe.run(document)).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
    check(!axe.some(v => ['serious', 'critical'].includes(v.impact)), `axe ${name}: ${JSON.stringify(axe)}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow ${name}`);
    const blur = await page.evaluate(measureBlur);
    check(blur.blurredElements <= 2 && blur.blurredViewportFraction <= .35, `blur ${name}`);
    await page.screenshot({ path: resolve(output, file), fullPage: true });
    manifest.fixtures.push({ name, width, file, axe, ...blur, ...extra });
  }
  for (const [name, { answer }] of Object.entries(cases)) {
    if (only && name !== only) continue;
    if (['graph-trace', 'agentic-trace'].includes(name)) continue;
    const page = await context.newPage();
    page.on('pageerror', err => manifest.errors.push(`fixture ${name}: ${err.message}`));
    let release, started;
    const held = new Promise(resolve => { release = resolve; });
    const requested = new Promise(resolve => { started = resolve; });
    await page.route('**/api/ask', async route => { started(); await held; await route.fulfill({ contentType: 'application/json', body: JSON.stringify(answer) }); });
    await page.goto('http://127.0.0.1:4179/', { waitUntil: 'networkidle' });
    let cdp, traceEvents = [];
    if (profile && name === 'large') {
      cdp = await context.newCDPSession(page);
      cdp.on('Tracing.dataCollected', data => traceEvents.push(...data.value));
      await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing', transferMode: 'ReportEvents' });
    }
    await page.locator('.ask-composer textarea').fill(answer.question);
    await page.locator('.ask-composer button.btn-primary').click();
    await requested;
    const before = await page.locator('.answer-slot').evaluate(el => ({ height: el.getBoundingClientRect().height, bottom: el.offsetTop + el.offsetHeight }));
    // Measure the held API response through rendering, scroll and keyboard work.
    // Composer typing and the loading-slot insertion precede the response.
    await page.evaluate(() => {
      window.__responseTasks = [];
      window.__responseEntries = []; window.__responseTimings = { release: performance.now() };
      performance.mark('response-response-release');
      window.__responseObserver = new PerformanceObserver(list => { window.__responseTasks.push(...list.getEntries().map(e => e.duration)); window.__responseEntries.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))); });
      window.__responseObserver.observe({ type: 'longtask' });
    });
    release();
    await page.locator('[data-evidence-score]').waitFor();
    if (name === 'large') await page.evaluate(() => { window.__responseTimings.scoreReady = performance.now(); performance.mark('response-score-ready'); });
    await page.locator('.retrieval-funnel').waitFor({ state: 'attached' });
    const after = await page.locator('.answer-slot').evaluate(el => ({ height: el.getBoundingClientRect().height, bottom: el.offsetTop + el.offsetHeight }));
    check(before.height === after.height && before.bottom === after.bottom, `response moved reserved bounds ${name}`);
    if (answer.refusal) check(await page.locator('[data-evidence-score] strong').count() === 0, `refusal numeric score ${name}`);
    if (name === 'hybrid') {
      const marker = page.locator('.citation-marker').first();
      await marker.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      check(await page.locator('.source-card[data-active="true"]').count() === 1, 'keyboard source highlight');
      check(await page.locator('.provenance-row[data-active="true"]').count() === 1, 'keyboard provenance highlight');
      check(await marker.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth) >= 2), 'marker focus outline');
      if (width === 390) check(await marker.evaluate(el => el.getBoundingClientRect().width >= 44 && el.getBoundingClientRect().height >= 44), 'marker touch size');
      await marker.blur(); await marker.hover();
      check(await page.locator('.provenance-row[data-active="true"]').count() === 1, 'hover provenance highlight');
      await page.mouse.move(1, 1);
    }
    if (['missing-handle', 'duplicate-handles'].includes(name)) {
      check(await page.locator('.citation-marker:disabled').count() > 0, `ambiguous/missing marker ${name}`);
      check(await page.locator('.source-card[data-active="true"]').count() === 0, `no arbitrary source ${name}`);
    }
    if (name === 'long-quote') {
      await page.locator('.source-card details summary').first().click();
      check(await page.locator('.source-card details').first().evaluate(el => el.open), 'long quote native disclosure');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'open long quote contained');
    }
    if (width < 768) {
      const tabs = page.locator('.evidence-tabs [role="tab"]');
      await tabs.first().focus(); await page.keyboard.press('ArrowRight');
      check(await tabs.last().getAttribute('aria-selected') === 'true', `mobile pipeline tab ${name}`);
      check(await tabs.last().evaluate(el => el === document.activeElement), `mobile tab focus ${name}`);
    }
    check(await page.locator('.pipeline-trace table').count() === 1, `one timing table ${name}`);
    check(await page.locator('.retrieval-funnel table').count() === (answer.retrieval ? 2 : 0), `native funnel alternatives ${name}`);
    if (name === 'reranker-none') check(await page.locator('.pipeline-trace svg [data-stage="rerank"]').count() === 0, 'none reranker omits segments');
    if (name === 'degraded') check(await page.locator('svg [data-skipped="true"]').count() > 0 && (await page.locator('.pipeline-trace').textContent()).includes('skipped'), 'degraded hatch and word');
    if (name === 'timing-mismatch') check((await page.locator('.pipeline-trace').textContent()).includes('unattributed remainder'), 'measured other remainder');
    if (name === 'large') {
      await page.locator('.provenance-scroll table[aria-busy="false"]').waitFor({ state: 'attached' });
      await page.evaluate(() => { window.__responseTimings.rowsReady = performance.now(); });
      check(await page.locator('.provenance-row').count() === 200, 'exactly 200 rows, no hidden duplicate');
      await page.locator('.provenance-scroll').scrollIntoViewIfNeeded();
      await page.locator('.provenance-scroll').evaluate(el => { el.scrollTop = el.scrollHeight - el.clientHeight; });
      await page.evaluate(() => { window.__responseTimings.scrolled = performance.now(); });
      const marker = page.locator('.citation-marker').first();
      await marker.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      check(await page.locator('.provenance-row[data-active="true"]').count() === 1, '200-row keyboard highlight');
      await marker.blur(); await page.mouse.move(1, 1);
      await page.evaluate(() => { window.__responseTimings.focused = performance.now(); });
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const longTasks = await page.evaluate(() => { window.__responseObserver.disconnect(); return window.__responseTasks; });
    if (cdp) {
      const finished = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.end'); await finished;
      await writeFile(resolve(output, `profile-${width}-${theme}.json`), JSON.stringify(traceEvents));
      await cdp.detach();
    }
    if (name === 'large') check(Math.max(0, ...longTasks) <= 50, `200-row response long task ${Math.max(...longTasks)}ms ${JSON.stringify(await page.evaluate(() => ({ timings: window.__responseTimings, tasks: window.__responseEntries })))}`);
    const requestedChunks = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /EvalOverview.*\.js/.test(r.name)).map(r => r.name));
    check(requestedChunks.length === 0, `Ask requested Recharts ${name}`);
    // Capture the relevant state; all underlying tables and evidence were checked above.
    if (answer.refusal || ['hybrid', 'text-mode', 'invalid-citations', 'missing-handle', 'duplicate-handles', 'unsupported-claim', 'long-quote'].includes(name)) {
      if (width < 768) await page.locator('.evidence-tabs [role="tab"]').first().click();
      await page.locator('.answer-slot').evaluate(el => { el.scrollTop = 0; });
    } else await page.locator('.answer-slot').evaluate(el => {
      const heading = el.querySelector('.pipeline-trace h3'); el.scrollTop += heading.getBoundingClientRect().top - el.getBoundingClientRect().top - 24;
    });
    await page.locator('.ask-page > header').scrollIntoViewIfNeeded();
    await audit(page, `ask-${name}`, `ask-${width}-${theme}-${name}-matrix.png`, { longTasks, reservedBounds: { before, after } });
    await page.close();
  }
  if (only) return;
  for (const disabled of [false, true]) {
    const page = await context.newPage();
    if (disabled) await page.route('**/api/health', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(disabledHealth) }));
    await page.route('**/api/compare/strategies', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ question: cases.hybrid.answer.question, results: disabled ? [strategyResult('classic')] : [strategyResult('classic'), strategyResult('graph', cases['graph-trace'].answer), strategyResult('agentic', cases['agentic-trace'].answer)] }) }));
    await page.goto('http://127.0.0.1:4179/compare', { waitUntil: 'networkidle' });
    await page.locator('textarea').first().fill(cases.hybrid.answer.question); await page.locator('button.btn-primary').last().click();
    await page.locator('[data-evidence-score]').first().waitFor();
    await page.waitForFunction(() => !document.querySelector('.answer-visuals [aria-busy="true"]'));
    check(await page.locator('.strategy-sheet').first().evaluate(el => el.clientHeight <= innerHeight * .78 + 1 && el.scrollHeight > el.clientHeight), 'strategy results stay in their reading well');
    if (disabled) {
      check(await page.locator('.strategy-sheet[aria-disabled="true"]').count() === 2, 'graph/agentic capabilities disabled');
      check(await page.locator('.strategy-sheet[aria-disabled="true"] svg[role="img"]').count() === 0, 'disabled strategy has no empty chart');
      check((await page.locator('.strategy-sheet[aria-disabled="true"]').allTextContents()).every(text => text.includes('ANTHROPIC_API_KEY')), 'disabled reason retained');
    } else {
      const remote = page.locator('.strategy-sheet').filter({ hasText: 'Stage detail not reported by this strategy.' });
      check(await remote.count() === 2, 'graph and agentic honestly report no retrieval detail');
      check(await remote.locator('.retrieval-funnel table').count() === 0, 'no fabricated graph funnel');
    }
    await audit(page, `compare-${disabled ? 'disabled' : 'traces'}`, `compare-${width}-${theme}-${disabled ? 'disabled' : 'traces'}-matrix.png`);
    await page.close();
  }
  for (const [name, report] of [['comparable', comparableReport], ['not-comparable', mismatchReport]]) {
    const page = await context.newPage();
    await page.route('**/api/eval/runs/*/regression', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(report) }));
    await page.goto('http://127.0.0.1:4179/eval', { waitUntil: 'networkidle' });
    await page.locator('.baseline-strip').waitFor();
    const text = await page.locator('.baseline-strip').textContent();
    check(report.comparable ? text.includes('+0.020') : text.includes('Not comparable') && text.includes('judge_model') && !text.includes('+0.190'), `baseline delta contract ${name}`);
    await audit(page, `eval-${name}`, `eval-${width}-${theme}-${name}-matrix.png`);
    await page.goto('http://127.0.0.1:4179/eval?tab=runs', { waitUntil: 'networkidle' });
    await page.locator('article button[aria-expanded]').first().click();
    await page.locator('.baseline-strip').waitFor();
    check(await page.locator('.baseline-strip table').count() === 1, 'Runs uses one native baseline table');
    await audit(page, `eval-runs-${name}`, `eval-runs-${width}-${theme}-${name}-matrix.png`);
    await page.close();
  }
}
