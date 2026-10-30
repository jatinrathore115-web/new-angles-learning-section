// Shared QA helpers for the full learner journey: solvers for every interaction type
// (real mouse input, wrong answers before right ones) and a layout audit that runs
// inside the page at each screen's settled state.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const INDEX = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SHOTS = path.join(ROOT, 'qa', 'screens');

const nn = n => String(n).padStart(2, '0');
const stateOf = page => page.locator('#stage').getAttribute('data-state');
const screenNum = async page => +(await page.locator('#pNum').textContent());

/** every console problem, uncaught error and failed request, tagged with the screen it happened on */
function watch(page) {
  const log = [];
  let cur = 0;
  page.on('pageerror', e => log.push({ s: cur, kind: 'pageerror', msg: e.message }));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push({ s: cur, kind: 'console.' + m.type(), msg: m.text() }); });
  page.on('requestfailed', r => log.push({ s: cur, kind: 'requestfailed', msg: r.url() + ' ' + (r.failure() || {}).errorText }));
  page.on('response', r => { if (r.status() >= 400) log.push({ s: cur, kind: 'http' + r.status(), msg: r.url() }); });
  return { log, at: n => { cur = n; } };
}

async function shot(page, n, tag, dir = SHOTS) {
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `screen-${nn(n)}-${tag}.png`) });
}

/** stage point → client (CSS px) point */
function clientOf(page, p) {
  return page.evaluate(({ x, y }) => {
    const m = scene.svg.getScreenCTM();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }, p);
}

/* ------------------------------------------------------------------ solvers */

/** S02: drag each name chip onto a drawing; tries one wrong drop first, and one release outside every slot */
async function solveMatch(page, res) {
  const ORDER = ['pt', 'seg', 'ray', 'line'];
  const slotC = async j => { const b = await page.locator('.dslot').nth(j).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const dragTo = async (k, to) => {
    const c = page.locator(`.dlabel[data-k="${k}"]`);
    const b = await c.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + b.width / 2 + (to.x - b.x - b.width / 2) * i / 8, b.y + b.height / 2 + (to.y - b.y - b.height / 2) * i / 8);
    await page.mouse.up();
    await page.waitForTimeout(250);
  };
  // released in empty space: it must go home
  await dragTo('ray', { x: 30, y: 30 });
  // wrong drawing: must bounce back and say so
  await dragTo('ray', await slotC(0));
  res.wrong.push(await page.locator('.dlabel[data-k="ray"].placed').count() === 0 ? 'ray→pt rejected' : 'BUG: ray→pt accepted');
  // tap-to-pick, tap-a-slot path for one card
  await page.locator('.dlabel[data-k="pt"]').click();
  await page.locator('.dslot').nth(0).click();
  for (const k of ['seg', 'ray', 'line']) await dragTo(k, await slotC(ORDER.indexOf(k)));
}

/** card choice + CHECK: every wrong card first (each must keep the screen retryable), then the right one */
async function solveCards(page, res) {
  const n = await page.locator('.mcard').count();
  // last card first, then left to right: across the five card checks this reaches every wrong path
  const order = [n - 1, ...Array.from({ length: n - 1 }, (_, i) => i)];
  for (let i = 0; i < n; i++) {
    const card = page.locator('.mcard').nth(order[i]);
    if (await card.evaluate(c => c.classList.contains('locked'))) break;
    // CHECK must stay disabled until something is chosen
    if (i === 0) res.checks.push('check disabled before choice: ' + await page.locator('#bCheck').isDisabled());
    await card.click();
    await page.waitForTimeout(120);
    await page.locator('#bCheck').click();
    // either correct (cards lock) or incorrect (hint, then AWAIT_CHECK again)
    await page.waitForFunction(() => document.querySelector('.mcard.locked') || ['AWAIT_CHECK', 'INCORRECT'].includes(document.getElementById('stage').dataset.state) && document.querySelector('.mcard.bad'), null, { timeout: 15000 });
    if (await page.locator('.mcard.locked').count()) return;
    res.wrong.push('card ' + (await card.getAttribute('data-id')));
    // a second CHECK pressed while the hint plays must not double-fire
    await page.locator('#bCheck').click().catch(() => { });
    await page.waitForFunction(() => document.getElementById('stage').dataset.state === 'AWAIT_CHECK', null, { timeout: 15000 });
  }
}

/** answer dropdown: open, pick the first option not yet crossed out, until correct */
async function solvePick(page, res) {
  for (let tries = 0; tries < 4; tries++) {
    const trig = page.locator('.pick:not(.ok)').first();
    if (!await trig.count()) return;
    await trig.click();
    await page.locator('.pmenu.in').waitFor({ timeout: 4000 });
    const menu = await page.locator('.pmenu').boundingBox();
    const vp = page.viewportSize();
    if (menu && (menu.y < 0 || menu.y + menu.height > vp.height || menu.x < 0 || menu.x + menu.width > vp.width)) res.problems.push('dropdown menu leaves the viewport');
    const opt = page.locator('.pmenu .popt:not(.wrong)').first();
    const v = await opt.getAttribute('data-v');
    await opt.click();
    await page.waitForTimeout(300);
    if (await page.locator('.pick.ok').count() && !await page.locator('.pick:not(.ok)').count()) return;
    if (!await page.locator(`.pick.ok`).count()) res.wrong.push('pick ' + v);
    await page.waitForTimeout(1500);   // the wrong value reverts to "?"
  }
}

/** rotate a ray by its handle with the real mouse, through a list of angles */
async function dragRay(page, id, angles) {
  for (const target of angles) {
    const h = await page.evaluate(id => { const r = scene.get(id); const p = r.hHit.getBoundingClientRect(); return { x: p.left + p.width / 2, y: p.top + p.height / 2, a: r.st.angle }; }, id);
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const a = h.a + (target - h.a) * i / steps;
      const sp = await page.evaluate(([id, a]) => { const r = scene.get(id); return G.at(r.origin(), a, r.st.len * r.st.handleAt); }, [id, a]);
      const cp = await clientOf(page, sp);
      await page.mouse.move(cp.x, cp.y);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
}
const DRAGS = {
  28: ['OA', [130, 186, 180]],
  30: ['OC', [120, 40]],
  32: ['OC', [90]],
  39: ['OA', [150, 200, 180]],
  50: ['OC', [100, 40]],
};

/** tap angle regions: every live hit target, last first (so a wrong one is usually tried) */
async function solveTaps(page, res) {
  for (let round = 0; round < 6; round++) {
    const ids = await page.evaluate(() => [...scene.objs.values()].filter(o => o.hitEl && o.hitEl.isConnected).map(o => o.id));
    if (!ids.length) return;
    const id = ids[ids.length - 1 - (round % ids.length)] || ids[0];
    const p = await page.evaluate(id => { const o = scene.get(id); return o.type === 'arc' ? o.innerPoint(0.7) : scene.pt(id); }, id);
    const cp = await clientOf(page, p);
    await page.mouse.click(cp.x, cp.y);
    await page.waitForTimeout(450);
    const st = await stateOf(page);
    if (st === 'INCORRECT' || (await page.evaluate(() => document.querySelector('#heading').className)).includes('warn')) res.wrong.push('tap ' + id);
  }
}

/* --------------------------------------------------------------- layout audit */
/** runs in the page: collisions between labels, geometry strokes and the HTML layer */
async function audit(page) {
  return page.evaluate(() => {
    const out = [];
    const st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 1600;
    const toS = r => ({ x0: (r.left - st.left) / k, y0: (r.top - st.top) / k, x1: (r.right - st.left) / k, y1: (r.bottom - st.top) / k });
    const vis = e => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.3; };
    const inter = (a, b, pad = 0) => a.x0 + pad < b.x1 && b.x0 + pad < a.x1 && a.y0 + pad < b.y1 && b.y0 + pad < a.y1;
    const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    // svg labels that are actually showing
    const labels = [...document.querySelectorAll('#geo text')].filter(t => t.textContent.trim() && +(t.getAttribute('opacity') ?? 1) > 0.35 && vis(t)).map(t => {
      const r = t.getBoundingClientRect(), b = toS(r);
      // glyph box: trim the font's line spacing
      const h = b.y1 - b.y0, cy = (b.y0 + b.y1) / 2;
      return { name: 'label "' + t.textContent + '"', b: { x0: b.x0, x1: b.x1, y0: cy - h * 0.36, y1: cy + h * 0.36 } };
    });
    // HTML blocks a learner reads or presses
    const htmlSel = '#heading.in .ln:not(.gone):not(.next), #persist > .pi.in, .mcard.in, .dlabel, .dslot, .pmenu, .topnav .btn, .dock .btn:not(.hidden), .hud .progress';
    const html = [...document.querySelectorAll(htmlSel)].filter(vis).map(e => ({ name: (e.id ? '#' + e.id : '.' + [...e.classList].slice(0, 2).join('.')) + (e.dataset.id ? `[${e.dataset.id}]` : ''), b: toS(e.getBoundingClientRect()), e }))
      .filter(h => h.b.x1 - h.b.x0 > 2);
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++)
      if (area(labels[i].b, labels[j].b) > 6) out.push(`${labels[i].name} overlaps ${labels[j].name}`);
    for (const l of labels) for (const h of html) if (area(l.b, h.b) > 6) out.push(`${l.name} overlaps ${h.name}`);
    for (let i = 0; i < html.length; i++) for (let j = i + 1; j < html.length; j++) {
      const a = html[i], b = html[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      if (/dslot|dlabel/.test(a.name) && /dslot|dlabel/.test(b.name)) continue;   // a placed name sits in its slot by design
      if (area(a.b, b.b) > 20) out.push(`${a.name} overlaps ${b.name}`);
    }
    // stage bounds (inside the neon frame)
    for (const x of [...labels, ...html]) if (x.b.x0 < 24 || x.b.y0 < 20 || x.b.x1 > 1576 || x.b.y1 > 880) out.push(`${x.name} outside the frame (${x.b.x0 | 0},${x.b.y0 | 0},${x.b.x1 | 0},${x.b.y1 | 0})`);
    // labels vs strokes, using the scene's own obstacle model
    const { segs, dots } = scene.obstacles();
    const segBox = (p, q, b, hw) => {
      const x0 = b.x0 - hw, y0 = b.y0 - hw, x1 = b.x1 + hw, y1 = b.y1 + hw, dx = q.x - p.x, dy = q.y - p.y;
      let t0 = 0, t1 = 1;
      for (const [pp, qq] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dy, p.y - y0], [dy, y1 - p.y]]) {
        if (pp === 0) { if (qq < 0) return false; continue; }
        const r = qq / pp;
        if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
      return true;
    };
    for (const l of labels) {
      const hit = segs.filter(g => segBox(g.p, g.q, l.b, g.hw - 2)).length;
      if (hit) out.push(`${l.name} touches ${hit} stroke(s)`);
      for (const d of dots) { const x = Math.max(l.b.x0, Math.min(d.c.x, l.b.x1)), y = Math.max(l.b.y0, Math.min(d.c.y, l.b.y1)); if ((x - d.c.x) ** 2 + (y - d.c.y) ** 2 < (d.r - 3) ** 2) out.push(`${l.name} touches a vertex dot`); }
    }
    // geometry leaving the frame
    for (const g of segs) for (const p of [g.p, g.q]) if (p.x < 28 || p.x > 1572 || p.y < 30 || p.y > 870) { out.push(`stroke end outside the frame (${p.x | 0},${p.y | 0})`); break; }
    // duplicate ids
    const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
    for (const [id, c] of Object.entries(ids)) if (c > 1) out.push(`duplicate id #${id}`);
    return [...new Set(out)];
  });
}

module.exports = { INDEX, SHOTS, nn, stateOf, screenNum, watch, shot, clientOf, solveMatch, solveCards, solvePick, dragRay, DRAGS, solveTaps, audit };
