/* PHASE 8 — PROOF SEQUENCE (screens 54–68)
   Slower, quieter. Diagram left, equations right, in fixed rows that never
   jump: the goal sits on top, each linear-pair equation gets its own row,
   the combined equation sits below. Earlier rows step back to a secondary
   tone instead of disappearing. Equations are built term by term on the
   narrator's words, and a term glows together with its angle on the figure.
   Gamification is the logical unlock: the goal turns into PROVED. */
(function () {
  const { crossFig, reveal, lineTrace, oppConnector, tag } = Lab;
  const PO = { x: 560, y: 525 }, RX = 1190;
  const Y = { goal: 250, r1: 362, r2: 452, r3: 595, done: 780 };
  const IDS = ['O', 'OB', 'OA', 'OC', 'OD', 'a1', 'a2', 'a3', 'a4'];
  const ARCS = ['a1', 'a2', 'a3', 'a4'];
  const COL = { 1: 'gold', 2: 'cyan', 3: 'gold', 4: 'cyan' };
  // the line formed by the two outer arms of each linear pair
  const LINE = { '12': ['OA', 'OB'], '23': ['OC', 'OD'], '14': ['OC', 'OD'], '34': ['OA', 'OB'] };

  /** proof figure: lines muted, only the angles in play are bright */
  function proofFig(S, hi = [], { full = false } = {}) {
    crossFig(S, { c: 62, mode: 'pairs', O: PO, len: [380, 300], dimLines: full ? 0 : 0.5 });
    Lab.turnCD(S, 62, 700);   // a figure carried back from the application screens returns to this proof's crossing
    ARCS.forEach(id => S.get(id).to({ dim: full || hi.includes(id) ? 0 : 0.75, fillOp: hi.includes(id) ? 1.5 : 0.8 }, 350));
    UI.setFocus(PO.x, PO.y);
  }

  /* --- equation rows ------------------------------------------------- */
  const A = (n, k) => `<span class="tok c-${COL[n]}" data-k="${k}">∠${n}</span>`;
  const O = (t, k) => `<span class="tok op" data-k="${k}">${t}</span>`;
  const V = (t, k) => `<span class="tok c-white" data-k="${k}">${t}</span>`;
  const sumRow = (m, n) => `<div class="eq lg">${A(m, 'a')}${O('+', 'p')}${A(n, 'b')}${O('=', 'e')}${V('180°', 'v')}</div>`;
  const eqRow = (l1, l2, r1, r2) => `<div class="eq lg">${A(l1, 'a')}${O('+', 'p1')}${A(l2, 'b')}${O('=', 'e')}${A(r1, 'c')}${O('+', 'p2')}${A(r2, 'd')}</div>`;
  const goalHTML = (m, n, done) => `<div class="goal"><span class="gk">${done ? 'PROVED' : 'PROVE'}</span><div class="eq lg">${A(m, 'a')}${O('=', 'e')}${A(n, 'b')}</div></div>`;
  const GHOST_SUM = { a: 'ghost', p: 'ghost', b: 'ghost', e: 'ghost', v: 'ghost' };
  const DONE_SUM = { a: '', p: '', b: '', e: '', v: 'okc' };

  function row(id, html, y, cls = '') { return P.set(id, { html, x: RX, y, cls: 'eqrow ' + cls }); }
  function state(id, map) { Lab.toks(id, map); }
  /** a term lifts from its angle on the figure into the row; both glow together */
  async function term(ctx, S, id, k, arc) {
    const t = P.q(id, `.tok[data-k="${k}"]`);
    S.pulse(arc, 700);
    await ctx.$(UI.fly(t.textContent, S.get(arc).labelPoint(), t, { dur: 560, onArrive: () => { t.classList.remove('ghost'); t.classList.add('hl'); } }));
    setTimeout(() => t.classList.remove('hl'), 600);
  }
  /** an operator ticks into place */
  function op(id, k) { state(id, { [k]: '' }); Sound.play('ui.select'); }
  /** "= 180°": the equals sign, then the total resolves */
  function equals(id) { op(id, 'e'); }
  function total(id) { state(id, { v: 'okc' }); Sound.play('equation.resolve'); }
  /** strike, then collapse, the cancelled terms */
  async function cancel(ctx, id, keys) {
    state(id, Object.fromEntries(keys.map(k => [k, 'cancel'])));
    Sound.play('cancel');
    await ctx.wait(650);
    state(id, Object.fromEntries(keys.map(k => [k, 'gone'])));
    await ctx.wait(550);
  }
  const doneChip = () => P.set('done1', { html: '<div class="chip ok">∠1 = ∠3 ✓</div>', x: RX, y: Y.done, cls: 'sec' });
  const goal = (m, n, cls = 'sec', done = false) => P.set('goal', { html: goalHTML(m, n, done), x: RX, y: Y.goal, cls: 'eqrow ' + cls });

  /** "∠m and ∠n form a linear pair" — the row builds term by term on the words */
  function buildCues(ctx, S, id, m, n) {
    let first;
    return {
      [`∠${m}`]: () => (first = term(ctx, S, id, 'a', 'a' + m)),
      [`∠${n}`]: async () => { await first; op(id, 'p'); await term(ctx, S, id, 'b', 'a' + n); },
      'linear pair': () => lineTrace(S, ...LINE[`${m}${n}`], { color: 'gold', dur: 900, hold: 200 }),
    };
  }

  /* ===================================================== 54 */
  const S54 = {
    id: 'S54', chapter: 7, topic: 'PROOF', topicShort: 'Can we prove it?', holdTitle: true,
    title: 'Can we *prove* that ∠1 = ∠3?',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a3']);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        prove: () => { goal(1, 3, ''); Sound.play('equation.snap'); },
        '∠3': () => { S.pulseMany(['a1', 'a3'], 800); return oppConnector(S, 'a1', 'a3', { hold: 600 }); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 55 */
  const S55 = {
    id: 'S55', chapter: 7, topic: 'PROOF · STEP 1', topicShort: '∠1, ∠2 linear pair', persist: ['goal'], holdTitle: true,
    title: '∠1 and ∠2 form a *linear pair.*',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a2']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1);
      state('r1', GHOST_SUM);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: buildCues(ctx, S, 'r1', 1, 2) });
      ctx.complete();
    },
  };

  /* ===================================================== 56 */
  const S56 = {
    id: 'S56', chapter: 7, topic: 'PROOF · STEP 1', topicShort: '∠1 + ∠2 = 180°', persist: ['goal', 'r1'], holdTitle: true,
    title: 'Therefore, *∠1 + ∠2 = 180°.*',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a2']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1);
      state('r1', { a: '', p: '', b: '', e: 'ghost', v: 'ghost' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        '∠1': () => { S.pulse('a1', 600); state('r1', { a: 'hl' }); },
        '∠2': () => { S.pulse('a2', 600); state('r1', { a: '', b: 'hl' }); },
        '=': () => { state('r1', { b: '' }); equals('r1'); },
        '180°': () => total('r1'),
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 57 */
  const S57 = {
    id: 'S57', chapter: 7, topic: 'PROOF · STEP 2', topicShort: '∠2, ∠3 linear pair', persist: ['goal', 'r1'], holdTitle: true,
    title: '∠2 and ∠3 also form a *linear pair.*',
    async run(ctx, S) {
      proofFig(S, ['a2', 'a3']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1, 'sec');
      state('r1', DONE_SUM);
      row('r2', sumRow(2, 3), Y.r2);
      state('r2', GHOST_SUM);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: buildCues(ctx, S, 'r2', 2, 3) });
      ctx.complete();
    },
  };

  /* ===================================================== 58 */
  const S58 = {
    id: 'S58', chapter: 7, topic: 'PROOF · STEP 2', topicShort: '∠2 + ∠3 = 180°', persist: ['goal', 'r1', 'r2'], holdTitle: true,
    title: 'Therefore, *∠2 + ∠3 = 180°.*',
    async run(ctx, S) {
      proofFig(S, ['a2', 'a3']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1, 'sec');
      state('r1', DONE_SUM);
      row('r2', sumRow(2, 3), Y.r2);
      state('r2', { a: '', p: '', b: '', e: 'ghost', v: 'ghost' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        '∠2': () => { S.pulse('a2', 600); state('r2', { a: 'hl' }); },
        '∠3': () => { S.pulse('a3', 600); state('r2', { a: '', b: 'hl' }); },
        '=': () => { state('r2', { b: '' }); equals('r2'); },
        '180°': () => total('r2'),
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 59 */
  const S59 = {
    id: 'S59', chapter: 7, topic: 'PROOF · STEP 3', topicShort: 'Both equal 180°', persist: ['goal', 'r1', 'r2'], holdTitle: true,
    title: 'Both expressions are equal to *180°.*',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a2', 'a3']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1);
      row('r2', sumRow(2, 3), Y.r2);
      state('r1', DONE_SUM); state('r2', DONE_SUM);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        expressions: () => { state('r1', { a: 'hl', b: 'hl' }); state('r2', { a: 'hl', b: 'hl' }); },
        // the two totals pulse together
        '180°': async () => {
          state('r1', { a: '', b: '' }); state('r2', { a: '', b: '' });
          for (let i = 0; i < 2; i++) {
            state('r1', { v: 'hl' }); state('r2', { v: 'hl' }); Sound.play('ui.select');
            await ctx.wait(500);
            state('r1', { v: 'okc' }); state('r2', { v: 'okc' });
            await ctx.wait(280);
          }
          state('r1', { v: 'hl' }); state('r2', { v: 'hl' });
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 60 */
  const S60 = {
    id: 'S60', chapter: 7, topic: 'PROOF · STEP 3', topicShort: 'Equal expressions', persist: ['goal', 'r1', 'r2'], holdTitle: true,
    title: 'So *∠1 + ∠2 = ∠2 + ∠3.*',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a2', 'a3']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1); row('r2', sumRow(2, 3), Y.r2);
      state('r1', { a: '', p: '', b: '', e: '', v: 'hl' }); state('r2', { a: '', p: '', b: '', e: '', v: 'hl' });
      row('r3', eqRow(1, 2, 2, 3), Y.r3);
      state('r3', { a: 'ghost', p1: 'ghost', b: 'ghost', e: 'ghost', c: 'ghost', p2: 'ghost', d: 'ghost' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      const fly = (from, key, text, to, show) => {
        const r = UI.rectOf(P.q(from, `[data-k="${key}"]`));
        return UI.fly(text, { x: r.x + (text.length > 4 ? 80 : r.w / 2), y: r.cy }, P.q('r3', `[data-k="${to}"]`), { dur: 720, onArrive: show });
      };
      let left;
      await ctx.say(this.title, { cues: {
        // the left-hand expression of the first row drops into the new equation …
        so: () => (left = fly('r1', 'a', '∠1 + ∠2', 'p1', () => state('r3', { a: '', p1: '', b: '' }))),
        // … the two equal totals converge into its "=" …
        '=': async () => {
          await left;
          const v1 = UI.rectOf(P.q('r1', '[data-k="v"]')), v2 = UI.rectOf(P.q('r2', '[data-k="v"]')), e3 = P.q('r3', '[data-k="e"]');
          state('r1', { v: 'dimt' }); state('r2', { v: 'dimt' });
          UI.fly('180°', { x: v1.cx, y: v1.cy }, e3, { dur: 650 });
          await UI.fly('180°', { x: v2.cx, y: v2.cy }, e3, { dur: 650 });
          state('r3', { e: '' });
          Sound.play('equation.snap');
        },
        // … and the second row's expression completes the right-hand side
        '∠3': async () => {
          await left;
          await fly('r2', 'a', '∠2 + ∠3', 'p2', () => state('r3', { c: '', p2: '', d: '' }));
          state('r3', { a: '', p1: '', b: '', e: '', c: '', p2: '', d: '' });
          P.cls('r1', 'sec'); P.cls('r2', 'sec');
          Sound.play('equation.resolve');
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 61 */
  const S61 = {
    id: 'S61', chapter: 7, topic: 'PROOF · STEP 4', topicShort: 'Subtract ∠2', persist: ['goal', 'r1', 'r2', 'r3'], holdTitle: true,
    title: 'Subtract the same *∠2* from both sides.',
    async run(ctx, S) {
      proofFig(S, ['a2']);
      goal(1, 3);
      row('r1', sumRow(1, 2), Y.r1, 'sec'); row('r2', sumRow(2, 3), Y.r2, 'sec');
      state('r1', { v: 'dimt' }); state('r2', { v: 'dimt' });
      row('r3', eqRow(1, 2, 2, 3), Y.r3);
      state('r3', { a: '', p1: '', b: '', e: '', c: '', p2: '', d: '' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        // the same angle on the figure and on both sides of the equation
        '∠2': () => { state('r3', { b: 'ul', c: 'ul' }); Sound.play('equation.snap'); return S.pulse('a2', 900); },
        sides: async () => { await ctx.wait(400); await cancel(ctx, 'r3', ['p1', 'b', 'c', 'p2']); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 62 */
  const S62 = {
    id: 'S62', chapter: 7, topic: 'PROOF · RESULT', topicShort: '∠1 = ∠3 proved', persist: ['goal', 'r3'], holdTitle: true,
    title: 'We are left with *∠1 = ∠3.*',
    async run(ctx, S) {
      proofFig(S, ['a1', 'a3']);
      goal(1, 3);
      row('r3', eqRow(1, 2, 2, 3), Y.r3);
      state('r3', { a: '', p1: 'gone', b: 'gone', e: '', c: 'gone', p2: 'gone', d: '' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        // the result grows slightly while the two angles light on the figure
        '∠1': () => { P.cls('r3', 'big'); S.pulseMany(['a1', 'a3'], 900); },
        '∠3': async () => {
          await oppConnector(S, 'a1', 'a3', { hold: 400 });
          // the goal unlocks
          goal(1, 3, 'done', true);
          Sound.play('proof.resolve');
          S.ripple(PO, 'gold', 1.6);
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 63 */
  const S63 = {
    id: 'S63', chapter: 7, topic: 'PROOF · SECOND PAIR', topicShort: 'Prove ∠2 = ∠4?', cfu: true, holdTitle: true,
    title: 'Can you prove that *∠2 = ∠4?*',
    async run(ctx, S) {
      proofFig(S, ['a2', 'a4']);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        prove: () => { goal(2, 4, ''); doneChip(); Sound.play('equation.snap'); },
        '∠4': () => oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 500 }),
      } });
      // transfer: the learner finds the angle that plays ∠2's old role
      ctx.sayNow('Which angle forms a linear pair with *both* ∠2 and ∠4?');
      ['a1', 'a3'].forEach(id => S.get(id).to({ dim: 0.35 }, 300));
      let finish; const got = ctx.until(r => finish = r);
      let pick = null;
      ARCS.forEach(id => S.tap(id, () => {
        if (id === 'a1' || id === 'a3') { pick = id; S.clearInteractions(); finish(); return; }
        UI.incorrect(); S.pulse(id, 500);
        ctx.sayNow('That is one of the two angles we are comparing. Look *between* ∠2 and ∠4.', { tone: 'warn' });
      }));
      ctx.ready();
      ctx.idle(() => S.pulseMany(['a1', 'a3'], 800));
      await got;
      S.get(pick).to({ dim: 0, fillOp: 1.6 }, 250);
      lineTrace(S, ...LINE[pick === 'a1' ? '12' : '34'], { color: 'gold', dur: 700, hold: 100 });
      setTimeout(() => lineTrace(S, ...LINE[pick === 'a1' ? '14' : '23'], { color: 'gold', dur: 700, hold: 100 }), 750);
      await ctx.good(pick === 'a1' ? '∠1 sits next to *both* ∠2 and ∠4.' : '∠3 works too — we will use *∠1*, which also sits next to both.');
      ctx.complete();
    },
  };

  /* ===================================================== 64 & 65 — the two linear-pair equations */
  function sumScreen({ id, short, title, m, n, rowId, y, prev, persist }) {
    return {
      id, chapter: 7, topic: 'PROOF · SECOND PAIR', topicShort: short, persist, holdTitle: true, title,
      async run(ctx, S) {
        proofFig(S, [`a${m}`, `a${n}`]);
        goal(2, 4); doneChip();
        if (prev) { row(prev, sumRow(1, 2), Y.r1, 'sec'); state(prev, DONE_SUM); }
        row(rowId, sumRow(m, n), y);
        state(rowId, GHOST_SUM);
        ctx.state('DEMONSTRATE');
        await reveal(ctx, S, IDS, 70);
        let first, second;
        await ctx.say(this.title, { cues: {
          [`∠${m}`]: () => { lineTrace(S, ...LINE[`${m}${n}`], { color: 'gold', dur: 800, hold: 200 }); return (first = term(ctx, S, rowId, 'a', `a${m}`)); },
          [`∠${n}`]: () => (second = (async () => { await first; op(rowId, 'p'); await term(ctx, S, rowId, 'b', `a${n}`); })()),
          '=': async () => { await second; equals(rowId); },
          '180°': async () => { await second; await ctx.wait(150); total(rowId); },
        } });
        ctx.complete();
      },
    };
  }
  const S64 = sumScreen({ id: 'S64', short: '∠1 + ∠2 = 180°', title: '*∠1 + ∠2 = 180°.*', m: 1, n: 2, rowId: 's1', y: Y.r1, persist: ['goal', 'done1'] });
  const S65 = sumScreen({ id: 'S65', short: '∠1 + ∠4 = 180°', title: '*∠1 + ∠4 = 180°.*', m: 1, n: 4, rowId: 's2', y: Y.r2, prev: 's1', persist: ['goal', 'done1', 's1'] });

  /* ===================================================== 66 */
  const S66 = {
    id: 'S66', chapter: 7, topic: 'PROOF · SECOND PAIR', topicShort: 'Subtract ∠1', persist: ['goal', 'done1', 's1', 's2'], holdTitle: true,
    title: 'Subtract *∠1* from both sides.',
    async run(ctx, S) {
      proofFig(S, ['a1']);
      goal(2, 4); doneChip();
      row('s1', sumRow(1, 2), Y.r1, 'sec'); row('s2', sumRow(1, 4), Y.r2, 'sec');
      state('s1', { a: '', p: '', b: '', e: '', v: 'dimt' }); state('s2', { a: '', p: '', b: '', e: '', v: 'dimt' });
      row('s3', eqRow(1, 2, 1, 4), Y.r3);
      state('s3', { a: 'ghost', p1: 'ghost', b: 'ghost', e: 'ghost', c: 'ghost', p2: 'ghost', d: 'ghost' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      let built;
      await ctx.say(this.title, { cues: {
        // equal totals → one equation (the same move as before, quicker this time)
        subtract: () => (built = (async () => {
          // the reason first: both sums equal the same 180°, so they equal each other
          state('s1', { v: 'hl' }); state('s2', { v: 'hl' }); Sound.play('equation.snap');
          await ctx.wait(650);
          state('s1', { v: 'dimt' }); state('s2', { v: 'dimt' });
          const l1 = UI.rectOf(P.q('s1', '[data-k="a"]')), l2 = UI.rectOf(P.q('s2', '[data-k="a"]'));
          state('s3', { e: '' });
          UI.fly('∠1 + ∠2', { x: l1.x + 80, y: l1.cy }, P.q('s3', '[data-k="p1"]'), { dur: 600 });
          await UI.fly('∠1 + ∠4', { x: l2.x + 80, y: l2.cy }, P.q('s3', '[data-k="p2"]'), { dur: 600 });
          state('s3', { a: '', p1: '', b: '', c: '', p2: '', d: '' });
          Sound.play('equation.snap');
        })()),
        '∠1': async () => { await built; state('s3', { a: 'ul', c: 'ul' }); return S.pulse('a1', 900); },
        sides: async () => { await built; await ctx.wait(500); await cancel(ctx, 's3', ['a', 'p1', 'c', 'p2']); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 67 */
  const S67 = {
    id: 'S67', chapter: 7, topic: 'PROOF · RESULT', topicShort: '∠2 = ∠4 proved', persist: ['goal', 'done1', 's3'], holdTitle: true,
    title: 'Therefore, *∠2 = ∠4.*',
    async run(ctx, S) {
      proofFig(S, ['a2', 'a4']);
      goal(2, 4); doneChip();
      row('s3', eqRow(1, 2, 1, 4), Y.r3);
      state('s3', { a: 'gone', p1: 'gone', b: '', e: '', c: 'gone', p2: 'gone', d: '' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        '∠2': () => { P.cls('s3', 'big'); S.pulseMany(['a2', 'a4'], 900); },
        '∠4': async () => {
          await oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 400 });
          goal(2, 4, 'done', true);
          Sound.play('proof.resolve');
          S.ripple(PO, 'cyan', 1.6);
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 68 */
  const S68 = {
    id: 'S68', chapter: 7, topic: 'THEOREM', topicShort: 'Vertically opposite angles are equal', holdTitle: true,
    title: 'When two lines intersect, vertically opposite angles are *equal.*',
    async run(ctx, S) {
      proofFig(S, ARCS, { full: true });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: {
        intersect: () => { Sound.play('vertex.pulse'); S.ripple(PO, 'white', 1); return lineTrace(S, 'OA', 'OB', { color: 'cyan', dur: 700, hold: 0 }); },
        'vertically opposite angles': () => { tag('tTh', 'VERTICALLY OPPOSITE<br>ANGLES', { x: RX, y: 300, color: 'gold', size: 'lg' }); Sound.play('discover'); },
        equal: async () => {
          P.set('th1', { html: `<div class="eq xl">${A(1, 'a')}${O('=', 'e')}${A(3, 'b')}</div>`, x: RX, y: 440, cls: 'eqrow' });
          await ctx.wait(300);
          P.set('th2', { html: `<div class="eq xl">${A(2, 'a')}${O('=', 'e')}${A(4, 'b')}</div>`, x: RX, y: 545, cls: 'eqrow' });
          Sound.play('proof.resolve');
          // two alternating pulses across the vertex
          for (let i = 0; i < 2; i++) {
            P.cls('th1', 'flash'); S.pulseMany(['a1', 'a3'], 650); oppConnector(S, 'a1', 'a3', { hold: 150, dur: 550 });
            await ctx.wait(750); P.cls('th1', '', 'flash');
            P.cls('th2', 'flash'); S.pulseMany(['a2', 'a4'], 650); oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 150, dur: 550 });
            await ctx.wait(750); P.cls('th2', '', 'flash');
          }
        },
      } });
      ctx.complete();
    },
  };

  Engine.register([S54, S55, S56, S57, S58, S59, S60, S61, S62, S63, S64, S65, S66, S67, S68]);
})();
