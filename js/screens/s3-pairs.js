/* PHASE 3 — RELATIONSHIP ANALYSIS (screens 13–18)
   example → result → name, twice: complementary (90°), then supplementary
   (180°) using the same two-diagram layout so the patterns can be compared.
   The result is shown, not told: a copy of the second angle swings in next
   to the first, and the combined opening is read off as one angle. */
(function () {
  const { reveal, turn, tag, eq, toks } = Lab;
  const V1 = { x: 380, y: 570 }, V2 = { x: 940, y: 570 };
  const EQ = { x: 800, y: 790 };
  const PAIR_IDS = ['V1', 'p1a', 'p1b', 'q1', 'V2', 'p2a', 'p2b', 'q2'];
  const MERGE_IDS = ['gx', 'gq', 'gT', 'gR'];

  /** the two separate angles. Returns true when built from nothing. */
  function pairFig(S, { b1, extra = [], enter = false }) {
    const fresh = !S.has('V1');
    const off = fresh && enter;   // first arrival: the angles slide in from opposite sides
    S.keep([...PAIR_IDS, ...extra]);
    const vis = off ? { op: 1 } : {};
    S.vertex('V1', { x: off ? -300 : V1.x, y: V1.y, label: '', size: 1.1, dim: 0, ...vis });
    S.ray('p1a', { from: 'V1', angle: 0, len: 300, color: 'cyan', label: '', dim: 0, ...(off ? { prog: 1 } : {}) });
    S.ray('p1b', { from: 'V1', len: 300, color: 'cyan', label: '', dim: 0, ...(fresh ? { angle: b1 } : {}), ...(off ? { prog: 1 } : {}) });
    S.arc('q1', { at: 'V1', from: 'p1a', to: 'p1b', r: 112, color: 'cyan', label: 'auto', labelOp: 1, labelColor: '#35E7FF', labelGap: 44, dim: 0, fillOp: 0.8, ...(off ? { prog: 1 } : {}) });
    S.vertex('V2', { x: off ? 1900 : V2.x, y: V2.y, label: '', size: 1.1, dim: 0, ...vis });
    S.ray('p2a', { from: 'V2', angle: 0, len: 300, color: 'mag', label: '', dim: 0, ...(off ? { prog: 1 } : {}) });
    S.ray('p2b', { from: 'V2', angle: 55, len: 300, color: 'mag', label: '', dim: 0, ...(off ? { prog: 1 } : {}) });
    S.arc('q2', { at: 'V2', from: 'p2a', to: 'p2b', r: 112, color: 'mag', label: 'auto', labelOp: 1, labelColor: '#FF48D7', labelGap: 44, dim: 0, fillOp: 0.8, ...(off ? { prog: 1 } : {}) });
    UI.setFocus(660, 520);
    return { fresh, off };
  }
  /** a carried first angle is turned back to this screen's measure (BACK, map jumps) */
  async function fixB1(ctx, S, b1) {
    if (Math.abs(G.delta(S.get('p1b').st.angle, b1)) > 0.5) await ctx.$(turn(S, 'p1b', b1, 800));
  }
  async function arrive(ctx, S, f) {
    if (f.off) {
      Sound.play('transition.soft');
      S.get('V1').to({ x: V1.x }, 900, Ease.outCubic);
      await ctx.$(S.get('V2').to({ x: V2.x }, 900, Ease.outCubic));
    } else await reveal(ctx, S, PAIR_IDS, 60);
  }

  /** the copy of the 55° angle swings in beside the first angle (V1) */
  async function merge(ctx, S, from, to) {
    S.ray('gx', { from: 'V1', angle: from, len: 300, color: 'mag', label: '', dash: 1, prog: 0 });
    S.arc('gq', { at: 'V1', from: 'p1b', to: 'gx', r: 112, color: 'mag', label: '', fillOp: 1.2, prog: 1 });
    S.arc('gT', { at: 'V1', from: 'p1a', to: 'gx', r: 222, color: 'gold', label: 'auto', labelOp: 1, labelColor: '#FFD84A', labelGap: 36, fillOp: 0, rightMark: false, prog: 0 });
    S.pulse('q2', 700);
    await ctx.$(S.show('gx', { dur: 450 }));
    S.show('gT', { dur: 300 });
    await ctx.$(turn(S, 'gx', to, 1100, Ease.inOutCubic));
    Sound.play('snap.lock');
    S.ripple(S.pt('V1'), 'gold', 0.9);
    if (to === 90) { S.arc('gR', { at: 'V1', from: 'p1a', to: 'gx', r: 40, color: 'gold', label: '', fillOp: 0, rightMark: true, prog: 0 }); S.show('gR'); }
    else Lab.lineTrace(S, 'gx', 'p1a', { color: 'gold', dur: 700, hold: 300, width: 4 });
  }

  /** "a° + b° = ?" with a total picker; resolves when answered correctly */
  async function predict(ctx, S, { a, b, options, hint }) {
    P.set('sum', { html: eq([{ t: `${a}°`, k: 'a', c: 'cyan', cls: 'ghost' }, '+', { t: `${b}°`, k: 'b', c: 'mag', cls: 'ghost' }, '=', `<span class="ans">${UI.pickHTML('t')}</span>`], 'lg'), ...EQ, cls: 'eqrow' });
    await ctx.wait(350);
    for (const [k, id] of [['a', 'q1'], ['b', 'q2']]) {
      const t = P.q('sum', `.tok[data-k="${k}"]`);
      S.pulse(id, 600);
      await ctx.$(UI.fly(`${S.get(id).measure}°`, S.get(id).labelPoint(), t, { dur: 650, onArrive: () => t.classList.remove('ghost') }));
    }
    let finish; const solved = ctx.until(r => finish = r);
    const pk = UI.pick(P.q('sum', '.pick'), {
      options, correct: a + b, label: 'Total',
      onResult: (ok, v) => { if (ok) finish(); else { UI.incorrect(); ctx.sayNow(hint(v), { tone: 'warn' }); } },
    });
    ctx.ready();
    ctx.idle(() => pk.hint());
    await solved;
    ctx.state('CORRECT');
    S.pulseMany(['q1', 'q2'], 700);
  }
  const resolved = (a, b, t) => eq([{ t: `${a}°`, k: 'a', c: 'cyan' }, '+', { t: `${b}°`, k: 'b', c: 'mag' }, '=', { t: `${t}°`, k: 't', c: 'gold', cls: 'ghost' }], 'lg');

  /* ===================================================== 13 */
  const S13 = {
    id: 'S13', chapter: 2, topic: 'ANGLE SUMS', topicShort: 'Sum: 35° + 55°', cfu: true,
    title: 'What is the *sum* of these angles?',
    async run(ctx, S) {
      const f = pairFig(S, { b1: 35, enter: true });
      ctx.state('DEMONSTRATE');
      await arrive(ctx, S, f);
      if (Math.abs(G.delta(S.get('p1b').st.angle, 35)) > 0.5) await turn(S, 'p1b', 35, 700);
      ctx.say(this.title).catch(() => { });
      await predict(ctx, S, {
        a: 35, b: 55, options: [80, 90, 100],
        hint: v => v === 80 ? 'A little more — *35 + 50* is 85, then add 5.' : 'A little less — *35 + 50* is 85, then add 5.',
      });
      UI.correct();
      await ctx.advance();
    },
  };

  /* ===================================================== 14 */
  const S14 = {
    id: 'S14', chapter: 2, topic: 'ANGLE SUMS', topicShort: 'They make 90°', holdTitle: true, persist: ['sum'],
    title: 'Correct! These two angles add to *90°.*',
    async run(ctx, S) {
      pairFig(S, { b1: 35 });
      P.set('sum', { html: resolved(35, 55, 90), ...EQ, cls: 'eqrow' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, PAIR_IDS, 60);
      await fixB1(ctx, S, 35);
      // "two angles" → both pulse · "add" → the copy swings in · "90°" → the total resolves
      let merged;
      await ctx.say(this.title, { tone: 'good', cues: {
        'two angles': () => S.pulseMany(['q1', 'q2'], 700),
        add: () => (merged = merge(ctx, S, 35, 90)),
        '90°': async () => { await merged; toks('sum', { t: 'okc' }); Sound.play('equation.resolve'); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 15 */
  const S15 = {
    id: 'S15', chapter: 2, topic: 'COMPLEMENTARY', topicShort: 'Complementary angles', holdTitle: true, persist: ['sum'],
    title: 'Angles whose measures add to 90° | are called *complementary angles.*',
    async run(ctx, S) {
      pairFig(S, { b1: 35 });   // the swung-in copy fades: the two original angles remain
      P.set('sum', { html: resolved(35, 55, 90), ...EQ, cls: 'eqrow' });
      toks('sum', { t: 'okc' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, PAIR_IDS, 60);
      await fixB1(ctx, S, 35);
      await ctx.say(this.title, { cues: {
        'add to': () => S.pulseMany(['q1', 'q2'], 800),
        'complementary angles': () => { tag('tName', 'COMPLEMENTARY', { x: 660, y: 292, color: 'white', size: 'xl' }); Sound.play('discover'); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 16 */
  const S16 = {
    id: 'S16', chapter: 2, topic: 'ANGLE SUMS', topicShort: 'Sum: 125° + 55°', cfu: true,
    title: 'What about *these two?*',
    async run(ctx, S) {
      const f = pairFig(S, { b1: 125, enter: true });
      ctx.state('DEMONSTRATE');
      await arrive(ctx, S, f);
      ctx.say(this.title).catch(() => { });
      // the same first angle keeps opening: 35° becomes 125°
      if (Math.abs(G.delta(S.get('p1b').st.angle, 125)) > 0.5) { await ctx.wait(300); await turn(S, 'p1b', 125, 1100); }
      await predict(ctx, S, {
        a: 125, b: 55, options: [170, 180, 190],
        hint: v => v === 170 ? 'A little more — *125 + 50* is 175, then add 5.' : 'A little less — *125 + 50* is 175, then add 5.',
      });
      UI.correct();
      await ctx.advance();
    },
  };

  /* ===================================================== 17 */
  const S17 = {
    id: 'S17', chapter: 2, topic: 'ANGLE SUMS', topicShort: 'They make 180°', holdTitle: true, persist: ['sum'],
    title: 'Correct! These two angles add to *180°.*',
    async run(ctx, S) {
      pairFig(S, { b1: 125 });
      P.set('sum', { html: resolved(125, 55, 180), ...EQ, cls: 'eqrow' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, PAIR_IDS, 60);
      await fixB1(ctx, S, 125);
      // "two angles" → both pulse · "add" → the copy swings in · "180°" → the total resolves
      let merged;
      await ctx.say(this.title, { tone: 'good', cues: {
        'two angles': () => S.pulseMany(['q1', 'q2'], 700),
        add: () => (merged = merge(ctx, S, 125, 180)),
        '180°': async () => { await merged; toks('sum', { t: 'okc' }); Sound.play('equation.resolve'); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 18 */
  const S18 = {
    id: 'S18', chapter: 2, topic: 'SUPPLEMENTARY', topicShort: 'Supplementary angles', holdTitle: true, persist: ['sum'],
    title: 'Angles whose measures add to 180° are *supplementary.*',
    async run(ctx, S) {
      pairFig(S, { b1: 125 });
      P.set('sum', { html: resolved(125, 55, 180), ...EQ, cls: 'eqrow' });
      toks('sum', { t: 'okc' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, PAIR_IDS, 60);
      await fixB1(ctx, S, 125);
      await ctx.say(this.title, { cues: {
        'add to': () => S.pulseMany(['q1', 'q2'], 800),
        'supplementary': () => { tag('tName', 'SUPPLEMENTARY', { x: 660, y: 292, color: 'white', size: 'xl' }); Sound.play('discover'); },
      } });
      ctx.complete();
    },
  };

  Engine.register([S13, S14, S15, S16, S17, S18]);
})();
