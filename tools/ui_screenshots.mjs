/** Deterministic, backend-free captures. Requires the frontend's local Playwright. */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tokens } from './validate_palette.mjs';
import { measureBlur } from './blur_area.mjs';
import { auditVisualFixtures } from './visual_fixture_audit.mjs';
import { cases, comparableReport, mismatchReport, disabledHealth, strategyResult } from '../frontend/src/test-fixtures/visuals.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = resolve(root, 'frontend');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const theme = option('--theme', 'dark');
if (!['dark', 'light'].includes(theme)) throw new Error('--theme must be dark or light');
const output = resolve(option('--out', 'tools/artifacts/screenshots'));
const scenario = option('--fixture', 'hybrid');
const visual = option('--visual', 'answer');
const language = option('--lang', 'en');
if (!['en', 'fr'].includes(language)) throw new Error('--lang must be en or fr');
if (!(scenario in cases) && !['disabled', 'not-comparable'].includes(scenario)) throw new Error('Unknown fixture');
const answerFixture = cases[scenario]?.answer ?? cases.hybrid.answer;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= 'D:/litmus-zips/pw-browsers';
const require = createRequire(resolve(frontend, 'package.json'));
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const command = (program, argv, options = {}) => new Promise((done, reject) => {
  const child = spawn(program, argv, { cwd: frontend, windowsHide: true, ...options });
  let log = '';
  child.stdout?.on('data', b => { log += b; });
  child.stderr?.on('data', b => { log += b; });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? done(log) : reject(new Error(log.slice(-3000))));
});
if (!args.includes('--skip-build')) {
  const log = await command(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32' });
  console.log(log.trim().split('\n').slice(-7).join('\n'));
}
const strategies = ['classic', 'graph', 'agentic'];
const runs = strategies.map((strategy, i) => ({
  id: `fixture-${strategy}`, dataset: 'golden_v3', strategy, provider: 'anthropic',
  model: 'claude-sonnet-5', prompt_version: null, judge_model: 'claude-opus-5',
  config_hash: `fixture-${i}`, retrieval_mode: 'hybrid', n: 30, n_scored: 30,
  aggregates: { faithfulness: { mean: 0.78 + i * 0.06, std: 0.04, n: 30 },
    'recall@5': { mean: 0.70 + i * 0.08, std: 0.05, n: 30 } },
  cost: { mean_tokens_per_question: [1200, 3400, 8000][i], p50_latency_ms: 900 + i * 600, p95_latency_ms: 2100 + i * 1000 },
  regression_status: 'PASS', created_at: '2026-09-01T10:00:00+00:00',
}));
const fixtures = {
  '/ask': answerFixture,
  '/compare/strategies': { question: answerFixture.question, results: scenario === 'disabled' ? [strategyResult('classic', answerFixture)] : [strategyResult('classic', answerFixture), strategyResult('graph', cases['graph-trace'].answer), strategyResult('agentic', cases['agentic-trace'].answer)] },
  '/health': { status: 'ok', version: 'screenshot-fixture', auth_required: false, providers: {},
    capabilities: Object.fromEntries(['judge', 'graph', 'graph_build', 'agentic'].map(k => [k, { enabled: true, reason: null }])) },
  '/graph/stats': { nodes: 120, edges: 240, communities: 12, indexed_chunks: 360 },
  '/ingest/stats': { indexed_chunks: 360 },
  '/ingest/formats': { extensions: ['.pdf', '.docx', '.txt', '.md', '.csv'] },
  '/eval/golden': ['golden_v3'], '/eval/runs': runs,
  ...Object.fromEntries(runs.map(run => [`/eval/runs/${run.id}`, { ...run, by_question_type: {
    single_hop: { n_examples: 30, n_scored: 30, aggregates: run.aggregates },
  } }])),
  ...Object.fromEntries(runs.map(run => [`/eval/runs/${run.id}/regression`, { ...(scenario === 'not-comparable' ? mismatchReport : comparableReport), current: { ...(scenario === 'not-comparable' ? mismatchReport.current : comparableReport.current), id: run.id } }])),
};
if (scenario === 'disabled') fixtures['/health'] = disabledHealth;
const preview = spawn(process.execPath, [resolve(frontend, 'node_modules/vite/bin/vite.js'),
  'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { cwd: frontend, windowsHide: true, stdio: 'ignore' });
const manifest = { theme, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  reducedMotion: true, routes: [], errors: [], unmocked: [], fontFailures: [], foundation: [], preferences: [], states: [], fixtures: [] };
async function auditFoundation(context) {
  const page=await context.newPage();
  const assert=(condition,message)=>{if(!condition) throw new Error(message);};
  await page.goto('http://127.0.0.1:4179',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    for(let level=1;level<=3;level++) {
      const el=document.createElement('div');el.id=`probe-${level}`;el.className=`glass-l${level}`;
      el.style.cssText='position:fixed;top:0;width:100px;height:100px;pointer-events:none';document.body.append(el);
    }
    const motion=document.createElement('div');motion.id='motion-probe';motion.className='skeleton animate-spin';document.body.append(motion);
  });
  const read=()=>page.evaluate(()=>[1,2,3].map(level=>{
    const el=document.getElementById(`probe-${level}`),c=getComputedStyle(el);
    const solid=document.createElement('div');solid.style.background=`var(--surface-solid-l${level})`;document.body.append(solid);
    const expected=getComputedStyle(solid).backgroundColor;solid.remove();
    return {level,background:c.backgroundColor,expected,filter:c.backdropFilter,border:c.borderColor};
  }));
  const normal=await read();
  assert(normal.every((r,i)=>r.filter.includes(`blur(${[12,16,20][i]}px)`)),'Glass filters');
  manifest.foundation.push({mode:'normal',levels:normal});
  assert(await page.locator('#motion-probe').evaluate(el=>getComputedStyle(el).animationName)==='none','Reduced motion');
  await page.evaluate(()=>delete document.documentElement.dataset.theme);
  const initial=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--plane-base').trim());
  assert(initial===tokens(theme)['plane-base'],'OS initial theme');
  const opposite=theme==='dark'?'light':'dark';
  await page.evaluate(value=>{document.documentElement.dataset.theme=value;},opposite);
  const explicit=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--plane-base').trim());
  assert(explicit===tokens(opposite)['plane-base'],'Explicit theme overrides OS');
  await page.evaluate(value=>{document.documentElement.dataset.theme=value;document.documentElement.dataset.effects='off';},theme);
  const effects=await read();
  assert(effects.every(r=>r.filter==='none'&&r.background===r.expected),'Effects-off');
  manifest.foundation.push({mode:'effects-off',levels:effects});
  await page.evaluate(()=>delete document.documentElement.dataset.effects);
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme},{name:'prefers-reduced-transparency',value:'reduce'}]});
  const transparency=await read();
  assert(transparency.every(r=>r.filter==='none'&&r.background===r.expected),'Reduced transparency');
  manifest.foundation.push({mode:'reduced-transparency',levels:transparency});
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  await page.emulateMedia({colorScheme:theme,contrast:'more',reducedMotion:'reduce'});
  const contrast=await read();
  assert(contrast.every(r=>r.filter==='none'&&r.background===r.expected),'Increased contrast');
  manifest.foundation.push({mode:'contrast-more',levels:contrast});
  await page.emulateMedia({colorScheme:theme,contrast:'no-preference',forcedColors:'active',reducedMotion:'reduce'});
  const forced=await read();assert(forced.every(r=>r.filter==='none'),'Forced colors');
  manifest.foundation.push({mode:'forced-colors',levels:forced});
  await page.close();
}
async function auditPreferences(context, width) {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4179', { waitUntil: 'networkidle' });
  // Shared preference/auth assertions use English labels after locale captures.
  if (await page.locator('html').getAttribute('lang') !== 'en') {
    await page.locator('button[lang="en"]:visible').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
  }
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  if (width === 820) {
    await page.locator('.shell-sidebar .nav-link').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    check(await page.locator('.shell-sidebar .nav-link').first().locator('.rail-label').isVisible(), 'Rail label on keyboard focus');
  }
  const appearance = page.getByLabel('Appearance', { exact: true });
  await appearance.click();
  const overlay = await page.evaluate(measureBlur);
  check(overlay.blurredElements <= 2 && overlay.blurredViewportFraction <= .35, 'Preference overlay blur budget');
  await page.addScriptTag({ path: axePath });
  const severe = await page.evaluate(async () => (await window.axe.run(document)).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
  check(severe.length === 0, `Preferences axe: ${severe}`);
  await page.screenshot({ path: resolve(output, `preferences-${width}-${theme}.png`), animations: 'disabled' });
  const opposite = theme === 'dark' ? 'light' : 'dark';
  await page.getByLabel('Theme', { exact: true }).selectOption(opposite);
  await page.getByLabel('Reduce effects', { exact: true }).check();
  check(await page.evaluate(value => document.documentElement.dataset.theme === value && localStorage.getItem('litmus.theme') === value && localStorage.getItem('litmus.effects') === 'off', opposite), 'Preferences persisted');
  check((await page.evaluate(measureBlur)).blurredViewportFraction === 0, 'Effects-off removes blur');
  await page.reload({ waitUntil: 'networkidle' });
  check(await page.evaluate(value => document.documentElement.dataset.theme === value && document.documentElement.dataset.effects === 'off', opposite), 'Preferences survive reload');
  await page.screenshot({ path: resolve(output, `effects-off-${width}-${theme}.png`), animations: 'disabled' });
  await appearance.click();
  await page.getByLabel('Theme', { exact: true }).selectOption('system');
  await page.emulateMedia({ colorScheme: theme });
  check(await page.evaluate(() => !document.documentElement.hasAttribute('data-theme')), 'System has no override');
  check(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--plane-base').trim()) === tokens(theme)['plane-base'], 'System follows media');
  await page.emulateMedia({ colorScheme: opposite });
  check(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--plane-base').trim()) === tokens(opposite)['plane-base'], 'System follows live media changes');
  await page.keyboard.press('Escape');
  check(await page.locator('.preferences').evaluate(el => !el.open && document.activeElement === el.querySelector('summary')), 'Escape restores summary focus');
  await page.evaluate(() => { localStorage.removeItem('litmus.theme'); localStorage.removeItem('litmus.effects'); });
  manifest.preferences.push({ name: 'preferences', width, ...overlay, persistence: true, effectsOff: true, liveSystemTheme: true, escapeFocus: true, axeSeriousCritical: 0 });
  await page.close();
}
async function auditStates(context, width) {
  const page = await context.newPage();
  await page.route('**/api/ingest/stats', route => route.fulfill({ json: { indexed_chunks: 0 } }));
  await page.goto('http://127.0.0.1:4179', { waitUntil: 'networkidle' });
  if (!await page.getByRole('heading', { name: 'Nothing indexed yet' }).isVisible()) throw new Error('Known-empty corpus state');
  await page.screenshot({ path: resolve(output, `empty-corpus-${width}-${theme}.png`), animations: 'disabled' });
  await page.route('**/api/health', route => route.fulfill({ json: { ...fixtures['/health'], auth_required: true } }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.auth-dialog').waitFor({ state: 'visible' });
  await page.screenshot({ path: resolve(output, `auth-${width}-${theme}.png`), animations: 'disabled' });
  await page.keyboard.press('Shift+Tab');
  if (!await page.evaluate(() => !!document.activeElement.closest('.auth-dialog'))) throw new Error('Auth focus trap');
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => (await window.axe.run(document)).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
  if (violations.length) throw new Error(`Auth axe: ${violations}`);
  const blur = await page.evaluate(measureBlur);
  if (blur.blurredElements > 2 || blur.blurredViewportFraction > .35) throw new Error(`Auth blur budget: ${JSON.stringify(blur)}`);
  await page.keyboard.press('Escape');
  if (await page.locator('.auth-dialog').isVisible()) throw new Error('Auth Escape');
  await page.getByRole('button', { name: 'This backend requires an API key', exact: true }).click();
  await page.locator('.auth-dialog').waitFor({ state: 'visible' });
  manifest.states.push({ name: 'auth', width, ...blur, emptyCorpus: true, focusTrap: true, escapeAndReopen: true, axeSeriousCritical: 0 });
  if (width < 768) {
    await page.unroute('**/api/health');
    await page.goto('http://127.0.0.1:4179/compare', { waitUntil: 'networkidle' });
    await page.locator('#strategy-tab-classic').focus();
    await page.keyboard.press('ArrowRight');
    if (await page.locator('#strategy-tab-graph').getAttribute('aria-selected') !== 'true' || !await page.locator('#strategy-panel-graph').isVisible()) throw new Error('Mobile strategy keyboard');
    if (await page.locator('#strategy-tab-graph').evaluate(el => getComputedStyle(el).outlineWidth) !== '2px') throw new Error('Visible keyboard focus');
    await page.keyboard.press('End');
    if (await page.locator('#strategy-tab-agentic').getAttribute('aria-selected') !== 'true') throw new Error('Mobile strategy End');
    await page.keyboard.press('Home');
    if (await page.locator('#strategy-tab-classic').getAttribute('aria-selected') !== 'true') throw new Error('Mobile strategy Home');
  }
  await page.close();
}
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch('http://127.0.0.1:4179')).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw new Error('vite preview did not start');
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const width of option('--widths', '390,820,1440').split(',').map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1,
      colorScheme: theme, reducedMotion: 'reduce', locale: language === 'fr' ? 'fr-FR' : 'en-US', timezoneId: 'UTC' });
    await context.route('**/api/**', async route => {
      const key = new URL(route.request().url()).pathname.replace(/^\/api/, '');
      if (!(key in fixtures)) manifest.unmocked.push(key);
      await route.fulfill({ status: key in fixtures ? 200 : 501, contentType: 'application/json',
        body: JSON.stringify(fixtures[key] ?? { detail: `Unmocked screenshot API: ${key}` }) });
    });
    for (const [name, path] of [['ask', '/'], ['compare', '/compare'], ['eval', '/eval'], ['advisor', '/advisor'], ['ingest', '/ingest']]) {
      if (option('--page', name) !== name) continue;
      if(preview.exitCode!==null) throw new Error('Owned preview exited (possibly a port conflict)');
      const page = await context.newPage();
      page.on('pageerror', err => manifest.errors.push(`${name}: ${err.message}`));
      page.on('requestfailed', req => { if (/fonts\.(googleapis|gstatic)|\.woff2/.test(req.url())) manifest.fontFailures.push(req.url()); });
      page.on('response',response=>{if(/\.woff2/.test(response.url())&&!response.ok())manifest.fontFailures.push(`${response.status()} ${response.url()}`);});
      await page.goto(`http://127.0.0.1:4179${path}`, { waitUntil: 'networkidle' });
      if (language === 'fr') {
        if (await page.locator('html').getAttribute('lang') !== 'fr') await page.locator('button[lang="fr"]:visible').click();
        await page.waitForFunction(() => document.documentElement.lang === 'fr');
      }
      if (name === 'ask') {
        await page.locator('.ask-composer textarea').fill(answerFixture.question);
        await page.locator('.ask-composer button.btn-primary').click();
        await page.locator('[data-evidence-score]').waitFor();
        await page.waitForFunction(() => !document.querySelector('.answer-visuals [aria-busy="true"]'));
        await page.locator('.ask-page > header').scrollIntoViewIfNeeded();
        if (width < 768 && ['pipeline', 'funnel'].includes(visual)) await page.locator('.evidence-tabs button').last().click();
        if (['pipeline', 'funnel'].includes(visual)) await page.locator('.answer-slot').evaluate((slot, kind) => {
          const heading = slot.querySelector(kind === 'pipeline' ? '.pipeline-trace h3' : '.retrieval-funnel h3');
          slot.scrollTop += heading.getBoundingClientRect().top - slot.getBoundingClientRect().top - 24;
        }, visual);
        const chunks = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /EvalOverview.*\.js/.test(r.name)).map(r => r.name));
        if (chunks.length) throw new Error('Ask loaded the Recharts overview chunk');
      }
      if (name === 'compare') {
        await page.locator('textarea').first().fill(answerFixture.question);
        await page.locator('button.btn-primary').last().click();
        await page.locator('.strategy-sheet').filter({ hasText: answerFixture.answer.slice(0, 30) }).first().waitFor();
        await page.waitForFunction(() => !document.querySelector('.answer-visuals [aria-busy="true"]'));
        if (width >= 768) {
          const tops = await page.locator('.strategy-sheet .evidence-score').evaluateAll(scores => scores.map(score => score.getBoundingClientRect().top));
          if (tops.length === 3 && Math.max(...tops) - Math.min(...tops) > 1) throw new Error(`Compare score rows misaligned: ${tops}`);
        }
      }
      if (name === 'ask' && visual === 'pipeline' && answerFixture.retrieval) {
        const legends = await page.locator('.timing-band .timing-legend').allTextContents();
        if (legends.length !== 2 || !legends[0].includes('D1.') || !legends[1].includes('R1.')) throw new Error('Trace band legends missing or ambiguous');
        const visible = await page.locator('.answer-slot').evaluate(slot => [...slot.querySelectorAll('.timing-legend')].every(legend => {
          const box = legend.getBoundingClientRect(), well = slot.getBoundingClientRect();
          const nav = document.querySelector('.shell-bottom');
          const bottom = nav?.checkVisibility() ? Math.min(well.bottom, nav.getBoundingClientRect().top) : well.bottom;
          return box.top >= well.top && box.bottom <= bottom;
        }));
        if (!visible) throw new Error('Trace legends are clipped in the capture');
      }
      await page.mouse.move(1, 1);
      await page.evaluate(() => document.fonts.ready);
      if (name === 'eval') await page.locator('svg.recharts-surface').first().waitFor();
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        smallTargets: innerWidth >= 768 ? [] : [...document.querySelectorAll('button, select, summary, input:not([type="file"])')].flatMap(el => {
          let r = el.getBoundingClientRect();
          if (!el.checkVisibility() || !r.width || !r.height) return [];
          if (el.matches('input[type="checkbox"], input[type="radio"]')) r = (el.closest('label') ?? el).getBoundingClientRect();
          return r.width < 44 || r.height < 44 ? [{ tag: el.tagName, width: r.width, height: r.height }] : [];
        }) }));
      if (layout.scrollWidth > width || layout.smallTargets.length) throw new Error(`Layout/touch ${name}/${width}: ${JSON.stringify(layout)}`);
      const file = `${name}-${width}-${theme}${scenario === 'hybrid' ? '' : `-${scenario}`}${visual === 'answer' ? '' : `-${visual}`}${language === 'en' ? '' : '-fr'}.png`;
      await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
      const audit = await page.evaluate(() => {
        const fonts = performance.getEntriesByType('resource').filter(r => /\.woff2/.test(r.name));
        return { fonts: fonts.map(r => ({ url: r.name, bytes: r.transferSize })),
          loadedFamilies:[...new Set([...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family))],
          fontBytes: fonts.reduce((n, r) => n + r.transferSize, 0) };
      });
      Object.assign(audit, await page.evaluate(measureBlur));
      await page.addScriptTag({ path: axePath });
      const axe = await page.evaluate(async () => {
        const result = await window.axe.run(document);
        return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      manifest.routes.push({ name, width, file, ...audit, axe, layout });
      const severe = axe.filter(v => ['serious', 'critical'].includes(v.impact));
      if (severe.length) throw new Error(`axe ${name}/${width}: ${JSON.stringify(severe)}`);
      if(args.includes('--audit')) {
        if(audit.fontBytes>180000||audit.blurredElements>2||audit.blurredViewportFraction>.35)throw new Error(`Performance budget: ${name}/${width}`);
        for(const family of ['Instrument Sans Variable','Newsreader Variable','JetBrains Mono Variable']) {
          if(!audit.loadedFamilies.some(f=>f.replaceAll('"','').replaceAll("'",'')===family))throw new Error(`Font missing: ${family}`);
        }
      }
      await page.close();
    }
    if(args.includes('--audit')) {
      if(width===1440) await auditFoundation(context);
      await auditPreferences(context, width);
      await auditStates(context, width);
    }
    if (args.includes('--matrix')) await auditVisualFixtures(context, width, { theme, output, axePath, manifest, only: option('--matrix-case', ''), profile: args.includes('--profile-large') });
    await context.close();
  }
  await writeFile(resolve(output, `manifest-${option('--page', theme)}${args.includes('--page') ? `-${theme}` : ''}${scenario === 'hybrid' ? '' : `-${scenario}`}${visual === 'answer' ? '' : `-${visual}`}${language === 'en' ? '' : '-fr'}${args.includes('--matrix') ? `-matrix${option('--matrix-case', '') ? `-${option('--matrix-case', '')}` : ''}` : ''}.json`), JSON.stringify(manifest, null, 2));
  if (manifest.errors.length || manifest.unmocked.length) throw new Error(JSON.stringify({ errors: manifest.errors, unmocked: manifest.unmocked }));
  if(args.includes('--audit')&&manifest.fontFailures.length)throw new Error('Font requests failed');
  console.log(`${theme}: ${manifest.routes.length} screenshots; foundation modes=${manifest.foundation.length}; font failures=${manifest.fontFailures.length}; output=${output}`);
} finally {
  await browser?.close();
  preview.kill();
}
