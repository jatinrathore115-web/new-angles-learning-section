// Full learner journey: Start → all 74 screens → finish → start again.
// Every screen is solved with real input (wrong answers first), screenshotted at entry and
// at its settled state, and audited for overlaps, clipping and console problems.
// QA=1 env adds a JSON report at qa/report-<viewport>.json; SPEED overrides the timeline speed.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const L = require('./qa-lib');

const SPEED = +process.env.SPEED || 3;
const VO = process.env.VO === '1';

test.describe.configure({ mode: 'serial' });
// VIEWPORT=1366x768 runs the journey at another window size
if (process.env.VIEWPORT) { const [width, height] = process.env.VIEWPORT.split('x').map(Number); test.use({ viewport: { width, height } }); }

test('the whole lesson can be completed by a learner', async ({ page }, info) => {
  test.setTimeout(30 * 60_000);
  const vp = page.viewportSize();
  const tagVp = `${vp.width}x${vp.height}`;
  const shotDir = info.project.name === 'chromium' && !process.env.VIEWPORT ? L.SHOTS : path.join(L.SHOTS, '..', 'screens-' + info.project.name + '-' + tagVp);
  const W = L.watch(page);
  const report = { viewport: tagVp, screens: [] };

  await page.goto(`${L.INDEX}?speed=${SPEED}${VO ? '' : '&vo=0'}`);
  await expect(page.locator('#bStart')).toBeVisible();
  await page.locator('#bStart').click();

  for (let n = 1; n <= 74; n++) {
    W.at(n);
    const res = { n, wrong: [], checks: [], problems: [], audit: [] };
    await expect(page.locator('#pNum')).toHaveText(L.nn(n), { timeout: 20_000 });
    // NEXT must not be available on a screen the learner hasn't finished (first visit)
    const nextEarly = await page.locator('#bNext').isEnabled();
    await page.waitForTimeout(700 / SPEED + 300);
    await L.shot(page, n, 'entry', shotDir);

    // previous screen's transient UI must be gone
    const leftovers = await page.evaluate(() => document.querySelectorAll('.pmenu, .flytok').length);
    if (leftovers) res.problems.push(`${leftovers} leftover menu/token element(s) from the previous screen`);

    const t0 = Date.now();
    let solvedOnce = new Set();
    for (; ;) {
      if (await L.screenNum(page) !== n) break;              // auto-advanced after a correct prediction
      const st = await L.stateOf(page);
      if (st === 'COMPLETE') break;
      if (Date.now() - t0 > 120_000) { res.problems.push('BLOCKED: screen never completed (state ' + st + ')'); break; }
      if (['READY', 'INTERACTING', 'AWAIT_CHECK', 'INCORRECT'].includes(st)) {
        if (nextEarly === false && await page.locator('#bNext').isEnabled()) res.problems.push('NEXT enabled before the screen was complete');
        if (!solvedOnce.has('shotQ')) { solvedOnce.add('shotQ'); await L.shot(page, n, 'question', shotDir); }
        if (await page.locator('.dlabel:not(.placed)').count() && !solvedOnce.has('match')) { solvedOnce.add('match'); await L.solveMatch(page, res); continue; }
        if (await page.locator('.mcard.in:not(.locked)').count()) { await L.solveCards(page, res); await L.shot(page, n, 'after-check', shotDir); continue; }
        if (await page.locator('.pick:not(.ok):not([disabled])').count()) { await L.solvePick(page, res); continue; }
        if (L.DRAGS[n] && !solvedOnce.has('drag')) { solvedOnce.add('drag'); await L.dragRay(page, ...L.DRAGS[n]); continue; }
        if (await page.evaluate(() => [...scene.objs.values()].some(o => o.hitEl && o.hitEl.isConnected))) { await L.solveTaps(page, res); continue; }
      }
      await page.waitForTimeout(150);
    }
    if (await L.screenNum(page) === n) {
      // let the closing line and its animation settle, then audit the final learning state
      await page.waitForTimeout(1200 / SPEED + 500);
      res.audit = await L.audit(page);
      await L.shot(page, n, 'final', shotDir);
      await expect(page.locator('#bNext')).toBeEnabled();
      // a fast double press must move exactly one screen
      await page.locator('#bNext').dblclick();
    } else res.auto = true;
    res.errors = W.log.filter(e => e.s === n);
    report.screens.push(res);
    const flag = [...res.problems, ...res.audit, ...res.errors.map(e => e.kind + ': ' + e.msg)];
    console.log(`S${L.nn(n)} ${res.auto ? '(auto-advanced)' : ''} wrong=[${res.wrong.join(', ')}] ${flag.length ? '\n   ! ' + flag.join('\n   ! ') : 'ok'}`);
  }

  // past the last screen: the lesson-complete start art, and Start plays again
  await expect(page.locator('#start')).not.toHaveClass(/gone/, { timeout: 15_000 });
  await expect(page.locator('#start')).toHaveClass(/done/);
  await L.shot(page, 75, 'finish', shotDir);
  await page.locator('#bStart').click();
  await expect(page.locator('#pNum')).toHaveText('01');
  await expect.poll(() => L.stateOf(page), { timeout: 60_000 }).toBe('COMPLETE');
  await L.shot(page, 1, 'restart', shotDir);

  fs.mkdirSync(path.join(L.SHOTS, '..'), { recursive: true });
  fs.writeFileSync(path.join(L.SHOTS, '..', `report-${info.project.name}-${tagVp}.json`), JSON.stringify(report, null, 1));
  const blocked = report.screens.filter(s => s.problems.some(p => p.startsWith('BLOCKED')));
  expect(blocked.map(s => s.n)).toEqual([]);
  const errs = report.screens.flatMap(s => s.errors.filter(e => e.kind === 'pageerror' || e.kind === 'console.error' || e.kind === 'requestfailed'));
  expect(errs).toEqual([]);
});
