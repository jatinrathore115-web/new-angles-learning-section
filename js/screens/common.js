/* Shared constructions and helpers used across screens.
   Colour semantics (kept for the whole lesson):
     cyan    — the fixed arm / first angle family
     mag     — the turning arm / second angle family
     gold    — the common or active ray, and the relationship in focus
     white   — neutral geometry and labels
     muted   — inactive information (dim)
     mint    — success only · coral — incorrect feedback only */
(function () {
  /** reveal any of these objects that are not fully visible yet (fresh entry,
      BACK or a map jump); objects carried from the previous screen are left alone */
  async function reveal(ctx, S, ids, gap = 110) {
    let any = false;
    for (const id of ids) {
      const o = S.get(id);
      if (!o) continue;
      const hidden = o.st.op < 0.99 || (o.st.prog !== undefined && o.st.prog < 0.99);
      if (!hidden) continue;
      any = true;
      S.show(id);
      await ctx.wait(gap);
    }
    if (any) await ctx.wait(MOTION.ray - gap);
  }

  /** turn a ray to an angle with the servo sweep */
  function turn(S, id, angle, dur = 750, ease = Ease.inOutCubic) {
    const r = S.get(id);
    const d = G.delta(r.st.angle, angle);
    if (Math.abs(d) > 0.5) Sound.play('servo', { dur, down: d < 0 });
    return r.to({ angle }, dur, ease);
  }
  /** magnetic snap: approach to just short of the target, then lock onto it */
  async function snapTo(S, id, angle, dur = 800) {
    const r = S.get(id);
    const d = G.delta(r.st.angle, angle);
    await turn(S, id, angle - Math.sign(d || 1) * 4, dur, Ease.outCubic);
    await r.to({ angle }, 120, Ease.inOutCubic);
    Sound.play('snap.lock');
    S.ripple(S.get(id).origin(), 'gold', 0.8);
  }

  /** a persistent label: { x, y } or anchor(), colour and size classes */
  function tag(id, text, { x = 800, y = 450, color = 'gold', size = '', anchor = null, cls = '' } = {}) {
    return P.set(id, { html: `<div class="tg ${color} ${size}">${text}</div>`, x, y, anchor, cls });
  }

  /** equation html from a token list. '+', '=', '−' are operators;
      objects are tokens { t, c (colour), k (key), cls } */
  function eq(parts, size = '') {
    return `<div class="eq ${size}">${parts.map(p => {
      if (['+', '=', '−', '→', '⟷', '⟹'].includes(p)) return `<span class="op">${p}</span>`;
      if (typeof p === 'string') return p;
      return `<span class="tok ${p.c ? 'c-' + p.c : ''} ${p.cls || ''}" data-k="${p.k || ''}">${p.t}</span>`;
    }).join('')}</div>`;
  }
  /** set token classes inside a persistent equation: { key: 'ghost hl' | '' } */
  function toks(id, map) {
    for (const k in map) P.qa(id, `.tok[data-k="${k}"]`).forEach(t => {
      t.classList.remove('ghost', 'hl', 'okc', 'cancel', 'gone', 'dimt', 'ul');
      map[k].split(' ').filter(Boolean).forEach(c => t.classList.add(c));
    });
  }

  /** straight-line light trace through O, e.g. A → O → B */
  const tipOf = (S, id) => S.get(id).tip(true);
  function lineTrace(S, r1, r2, opt = {}) {
    return S.trace([tipOf(S, r1), S.get(r1).origin(), tipOf(S, r2)], Object.assign({ color: 'white', dur: 950, width: 6, hold: 500 }, opt));
  }
  /** dotted connector across the vertex between two angle regions */
  function oppConnector(S, a, b, opt = {}) {
    // ends inside each angle (not out on its name), so the link never crosses a label
    const pa = S.get(a).innerPoint(0.7), pb = S.get(b).innerPoint(0.7);
    return S.trace([pa, S.pt(S.get(a).st.at), pb], Object.assign({ color: 'gold', dur: 800, width: 5, hold: 900, dotted: true }, opt));
  }
  function dimOthers(S, keepIds, all = ['a1', 'a2', 'a3', 'a4']) {
    all.forEach(id => S.has(id) && S.get(id).to({ dim: keepIds.includes(id) ? 0 : 1 }, MOTION.fast));
  }

  /** Show-me demo for a "move this ray" instruction: the handle appears and the
      ray glides through `path` and back. It never completes the task, and a
      learner who grabs the handle takes over at once. */
  async function demoRay(S, id, path, { linked = [], onUpdate, step = 700 } = {}) {
    const r = S.get(id);
    if (!r) return;
    r.ensureHandle();
    r.to({ handle: 1 }, MOTION.fast);
    r.to({ hs: 1 }, MOTION.micro);
    const t0 = performance.now();
    const taken = () => (r.userMovedAt || 0) > t0;
    const off = Tween.onFrame(() => {
      if (taken()) return;
      for (const l of linked) { const o = S.get(l.id); if (o) o.st.angle = r.st.angle + l.offset; }
      onUpdate && onUpdate(r.st.angle);
    });
    try { for (const a of path) { if (taken()) break; await r.to({ angle: a }, step, Ease.inOutCubic); } }
    finally { off(); r.to({ hs: 0 }, MOTION.normal, Ease.outBack); }
  }

  /** a row of selectable diagram cards (transient overlay) */
  async function cardRow(ctx, items, { x = 800, y = 520, width = 360 } = {}) {
    const row = UI.ov(`<div class="cards">${items.map(it => `<button class="mcard" data-id="${it.id}" style="width:${width}px" aria-label="${it.aria || 'Option'}">${it.head ? `<div class="mcard-k">${it.head}</div>` : ''}${it.svg}<div class="mcard-note"></div></button>`).join('')}</div>`, { x: 0, y: 0 });
    row.style.left = (x - row.offsetWidth / 2) + 'px';
    row.style.top = (y - row.offsetHeight / 2) + 'px';
    const cards = [...row.querySelectorAll('.mcard')];
    let sel = null;
    const api = {
      row, cards,
      get value() { return sel; },
      card: id => cards.find(c => c.dataset.id === id),
      svg: id => api.card(id).querySelector('svg'),
      note: (id, html) => { api.card(id).querySelector('.mcard-note').innerHTML = html; },
      onSelect: null,
      lock(ok) { cards.forEach(c => { c.classList.add('locked'); c.classList.remove('sel', 'bad'); if (c.dataset.id !== ok) c.classList.add('dim'); else c.classList.add('ok'); }); },
    };
    cards.forEach(c => {
      ctx.on(c, 'click', () => {
        if (!ctx.S.enabled || c.classList.contains('locked')) return;
        cards.forEach(x => x.classList.remove('sel', 'bad'));
        c.classList.add('sel'); sel = c.dataset.id; Sound.play('ui.select');
        api.onSelect && api.onSelect(sel);
      });
      ctx.on(c, 'pointerenter', () => Sound.play('ui.hover'));
    });
    for (const c of cards) { c.classList.add('in'); Sound.play('geometry.point'); await ctx.wait(130); }
    return api;
  }

  /** visual condition test under a card: each condition lights ✓ or ✗ in turn */
  async function conditions(ctx, api, id, list) {
    api.note(id, `<div class="conds">${list.map(([t]) => `<span class="cond">${t}</span>`).join('')}</div>`);
    const els = [...api.card(id).querySelectorAll('.cond')];
    for (const [i, [, ok]] of list.entries()) {
      await ctx.wait(260);
      els[i].classList.add(ok ? 'ok' : 'no');
      Sound.play(ok ? 'equation.snap' : 'cancel');
    }
    await ctx.wait(300);
  }

  window.Lab = { reveal, turn, snapTo, tag, eq, toks, lineTrace, oppConnector, dimOthers, demoRay, cardRow, conditions, tipOf };
})();
