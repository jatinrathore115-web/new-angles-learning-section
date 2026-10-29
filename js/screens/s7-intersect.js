/* PHASE 7 — INTERSECTION ANALYSIS (screens 42–53)
   The linear-pair figure becomes two crossing lines: the common arm extends
   through the vertex. Regions are counted, opposite pairs are found by the
   learner, and only then named. Measuring then *suggests* equality — the
   proof comes in the next phase. */
(function () {
  const { reveal, turn, tag, eq, oppConnector, demoRay } = Lab;
  const XO = { x: 640, y: 525 }, RX = 1310;
  const IDS = ['O', 'OB', 'OA', 'OC', 'OD', 'a1', 'a2', 'a3', 'a4'];
  const ARCS = ['a1', 'a2', 'a3', 'a4'];
  const NAME = { a1: '∠1', a2: '∠2', a3: '∠3', a4: '∠4' };

  /** two crossing lines. mode 'neutral' (no pair colouring) or 'pairs'
      (∠1/∠3 gold, ∠2/∠4 cyan). AB is cyan, CD magenta, as in the storyboard. */
  function crossFig(S, { c = 62, mode = 'neutral', labels = true, vals = [], O = XO, len = [450, 300], dimLines = 0, extra = [] } = {}) {
    S.keep([...IDS, ...extra]);
    const has = id => S.has(id);
    S.vertex('O', { ...O, label: '', size: 1.2, ring: 0, dim: dimLines, color: 'cyan' });
    S.ray('OB', { from: 'O', angle: 0, len: len[0], color: 'cyan', label: '', labelOp: 0, dim: dimLines, width: 5.5 });
    S.ray('OA', { from: 'O', angle: 180, len: len[0], color: 'cyan', label: '', labelOp: 0, dim: dimLines, width: 5.5 });
    S.ray('OC', { from: 'O', len: len[1], color: 'mag', label: '', labelOp: 0, dim: dimLines, width: 5.5, ...(has('OC') ? {} : { angle: c }) });
    S.ray('OD', { from: 'O', len: len[1], color: 'mag', label: '', labelOp: 0, dim: dimLines, width: 5.5, ...(has('OD') ? {} : { angle: c + 180 }) });
    const pair = { a1: 'gold', a2: 'cyan', a3: 'gold', a4: 'cyan' };
    const pairs = [['OB', 'OC'], ['OC', 'OA'], ['OA', 'OD'], ['OD', 'OB']];
    ARCS.forEach((id, i) => S.arc(id, {
      at: 'O', from: pairs[i][0], to: pairs[i][1], r: 92, labelGap: 30, minor: false,
      color: mode === 'pairs' ? pair[id] : 'white', fillOp: mode === 'pairs' ? 0.9 : 0.45,
      label: NAME[id], labelOp: labels ? 1 : 0, labelColor: '#FFD84A', dim: 0, ring: 0, hl: 0, rightMark: false,
      val: vals.includes(id) ? 'auto' : '', valOp: vals.includes(id) ? 1 : 0, valColor: '#F5F8FF', valGap: 58,
    }));
    UI.setFocus(O.x, O.y);
  }
  /** turn line CD as one object (OD stays opposite OC) */
  async function turnCD(S, c, dur = 900) {
    const OC = S.get('OC'), OD = S.get('OD');
    if (Math.abs(G.delta(OC.st.angle, c)) < 0.5 && Math.abs(G.delta(OD.st.angle, c + 180)) < 0.5) return;
    Sound.play('servo', { dur });
    OD.to({ angle: c + 180 }, dur, Ease.inOutCubic);
    await OC.to({ angle: c }, dur, Ease.inOutCubic);
  }
  /** soft coral rejection on a wrong region, then back */
  function flashBad(S, id) {
    const a = S.get(id), was = a.st.color;
    a.st.color = 'coral'; S.pulse(id, 600);
    setTimeout(() => { if (!a.dead) a.st.color = was; }, 700);
  }
  /** tap one of `candidates`; resolves with the correct one */
  async function tapAngle(ctx, S, { target, correct, candidates, hint }) {
    S.get(target).to({ ring: 1, fillOp: 1.6 }, 300);
    S.pulse(target, 800);
    let finish; const got = ctx.until(r => finish = r);
    candidates.forEach(id => S.tap(id, () => {
      if (id === correct) { S.clearInteractions(); finish(); return; }
      UI.incorrect(); flashBad(S, id);
      ctx.sayNow(hint(id), { tone: 'warn' });
    }));
    ctx.ready();
    ctx.idle(() => S.pulse(target, 900));
    await got;
  }
  Lab.crossFig = crossFig; Lab.turnCD = turnCD; Lab.XO = XO;

  /* ===================================================== 42 */
  const S42 = {
    id: 'S42', chapter: 6, topic: 'INTERSECTING LINES', topicShort: 'A line crosses a line', holdTitle: true,
    title: 'What happens when a whole line *crosses* another line?',
    async run(ctx, S) {
      const carried = S.has('OC') && !S.has('OD');
      crossFig(S, { c: 62, labels: false });
      const OD = S.get('OD');
      if (OD.st.prog > 0.99 && !carried) { /* already built: replay the extension */ OD.st.prog = 0; ['a3', 'a4'].forEach(id => S.get(id).st.prog = 0); }
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, ['O', 'OB', 'OA', 'OC'], 80);
      let settled;
      await ctx.say(this.title, { cues: {
        // the standing ray settles …
        'whole line': () => (settled = Math.abs(G.delta(S.get('OC').st.angle, 62)) > 0.5 ? turn(S, 'OC', 62, 700) : null),
        // … then extends straight through O: CD is one whole line
        crosses: async () => {
          await settled;
          OD.st.angle = S.get('OC').st.angle + 180;
          Sound.play('geometry.draw');
          await S.show('OD', { dur: 900 });
          S.trace([S.get('OC').tip(true), S.pt('O'), OD.tip(true)], { mode: 'streak', color: 'white', dur: 700, hold: 0 });
          Sound.play('snap.lock');
          S.ripple(XO, 'mag', 0.9);
          await ctx.wait(350);
          // the four regions exist only now that the lines cross
          for (const id of ARCS) { S.show(id, { dur: 350 }); await ctx.wait(120); }
          await ctx.wait(250);
          ARCS.forEach(id => S.get(id).to({ labelOp: 1 }, 400));
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 43 */
  const S43 = {
    id: 'S43', chapter: 6, topic: 'INTERSECTING LINES', topicShort: 'Count the angles', cfu: true,
    title: 'How many *angles* can you see?',
    async run(ctx, S) {
      // the names ∠1–∠4 would give the count away: each appears as its angle is found
      crossFig(S, { c: 62, labels: false });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      ctx.say(this.title).catch(() => { });
      await ctx.wait(400);
      tag('tTap', 'TAP EACH ANGLE TO COUNT IT', { x: RX, y: 400, color: 'muted', size: 'sm' });
      // each region answers a tap (and a hover) by lighting up; the count is the learner's
      const found = new Set();
      let finish; const all = ctx.until(r => finish = r);
      ARCS.forEach(id => S.tap(id, () => {
        if (found.has(id)) return;
        found.add(id);
        S.get(id).to({ fillOp: 2, color: 'gold', labelOp: 1 }, 250);
        S.pulse(id, 600);
        Sound.play('equation.snap');
        tag('cnt', String(found.size), { x: RX, y: 480, color: 'white', size: 'q' });
        if (found.size === 4) finish();
      }));
      ctx.ready();
      ctx.idle(() => { const n = ARCS.find(id => !found.has(id)); n && S.pulse(n, 800); });
      await all;
      S.clearInteractions();
      P.drop('tTap');
      UI.correct();
      await ctx.advance(700);
    },
  };

  /* ===================================================== 44 */
  const S44 = {
    id: 'S44', chapter: 6, topic: 'INTERSECTING LINES', topicShort: 'Four angles', holdTitle: true,
    title: '*Four* angles are formed.',
    async run(ctx, S) {
      crossFig(S, { c: 62 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      await ctx.say(this.title, { cues: { four: async () => {
        // four short pulses, in order
        for (const id of ARCS) {
          S.get(id).to({ fillOp: 1.8 }, 150); S.pulse(id, 500);
          Sound.play('ui.select');
          await ctx.wait(420);
          S.get(id).to({ fillOp: 0.45 }, 300);
        }
        tag('cnt', '4 angles', { x: RX, y: 480, color: 'gold', size: 'xl' });
        Sound.play('equation.resolve');
      } } });
      ctx.complete();
    },
  };

  /* ===================================================== 45 */
  const S45 = {
    id: 'S45', chapter: 6, topic: 'OPPOSITE ANGLES', topicShort: 'Opposite ∠1?', cfu: true,
    title: 'Which angle is *opposite ∠1?*',
    async run(ctx, S) {
      crossFig(S, { c: 62 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      ctx.say(this.title).catch(() => { });
      await tapAngle(ctx, S, {
        target: 'a1', correct: 'a3', candidates: ['a2', 'a3', 'a4'],
        hint: id => `${NAME[id]} shares an arm with ∠1. Look *across the vertex.*`,
      });
      S.get('a3').to({ color: 'gold', fillOp: 1.6 }, 250);
      UI.correct();
      await ctx.advance(600);
    },
  };

  /* ===================================================== 46 */
  const pairTag = (id, a, b, color, y, cls = '') => P.set(id, { html: eq([{ t: a, c: color }, '⟷', { t: b, c: color }], 'lg'), x: RX, y, cls: 'eqrow ' + cls });
  const S46 = {
    id: 'S46', chapter: 6, topic: 'OPPOSITE ANGLES', topicShort: '∠3 opposite ∠1', holdTitle: true,
    title: '∠3 lies *opposite* ∠1.',
    async run(ctx, S) {
      crossFig(S, { c: 62 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      await ctx.say(this.title, { cues: { opposite: async () => {
        ['a1', 'a3'].forEach(id => S.get(id).to({ color: 'gold', fillOp: 1.2 }, 250));
        ['a2', 'a4'].forEach(id => S.get(id).to({ dim: 0.8 }, 300));
        await oppConnector(S, 'a1', 'a3', { hold: 500 });
        pairTag('p13', '∠1', '∠3', 'gold', 470);
        Sound.play('equation.snap');
      } } });
      ctx.complete();
    },
  };

  /* ===================================================== 47 */
  const S47 = {
    id: 'S47', chapter: 6, topic: 'OPPOSITE ANGLES', topicShort: 'Opposite ∠2?', cfu: true, persist: ['p13'],
    title: 'Which angle is *opposite ∠2?*',
    async run(ctx, S) {
      crossFig(S, { c: 62 });
      ['a1', 'a3'].forEach(id => S.get(id).to({ color: 'gold', dim: 0.55 }, 250));
      pairTag('p13', '∠1', '∠3', 'gold', 430, 'sec');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      ctx.say(this.title).catch(() => { });
      await tapAngle(ctx, S, {
        target: 'a2', correct: 'a4', candidates: ['a1', 'a3', 'a4'],
        hint: id => `${NAME[id]} shares an arm with ∠2. Look *straight across* O.`,
      });
      S.get('a4').to({ color: 'cyan', fillOp: 1.6 }, 250);
      UI.correct();
      await ctx.advance(600);
    },
  };

  /* ===================================================== 48 */
  const S48 = {
    id: 'S48', chapter: 6, topic: 'OPPOSITE ANGLES', topicShort: '∠4 opposite ∠2', holdTitle: true, persist: ['p13'],
    title: '∠4 lies *opposite* ∠2.',
    async run(ctx, S) {
      crossFig(S, { c: 62, mode: 'pairs' });
      ['a1', 'a3'].forEach(id => S.get(id).to({ dim: 0.55 }, 250));
      pairTag('p13', '∠1', '∠3', 'gold', 430, 'sec');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      await ctx.say(this.title, { cues: { opposite: async () => {
        await oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 400 });
        pairTag('p24', '∠2', '∠4', 'cyan', 530);
        Sound.play('equation.snap');
        // both relationships, side by side
        await ctx.wait(300);
        ['a1', 'a3'].forEach(id => S.get(id).to({ dim: 0 }, 300));
        P.cls('p13', '', 'sec');
        oppConnector(S, 'a1', 'a3', { hold: 500 });
      } } });
      ctx.complete();
    },
  };

  /* ===================================================== 49 */
  const S49 = {
    id: 'S49', chapter: 6, topic: 'OPPOSITE ANGLES', topicShort: 'Vertically opposite angles', holdTitle: true, persist: ['p13', 'p24'],
    title: 'These pairs are called *vertically opposite angles.*',
    async run(ctx, S) {
      crossFig(S, { c: 62, mode: 'pairs' });
      pairTag('p13', '∠1', '∠3', 'gold', 470);
      pairTag('p24', '∠2', '∠4', 'cyan', 560);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 62);
      await ctx.say(this.title, { cues: { 'vertically opposite angles': () => {
        tag('tVOA', 'VERTICALLY OPPOSITE<br>ANGLES', { x: RX, y: 340, color: 'gold', size: 'lg' });
        Sound.play('discover');
      } } });
      // alternating pulses across the vertex
      for (let i = 0; i < 2; i++) {
        S.pulseMany(['a1', 'a3'], 600); await ctx.wait(650);
        S.pulseMany(['a2', 'a4'], 600); await ctx.wait(650);
      }
      ctx.complete();
    },
  };

  /* ===================================================== 50 */
  function measureFig(S, c) {
    crossFig(S, { c, mode: 'pairs', vals: ['a1', 'a3'] });
    ['a2', 'a4'].forEach(id => S.get(id).to({ dim: 0.75 }, 300));
  }
  const S50 = {
    id: 'S50', chapter: 6, topic: 'MEASURE', topicShort: 'Rotate and watch',
    title: 'Rotate one line and watch *∠1 and ∠3.*',
    async run(ctx, S) {
      measureFig(S, 68);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 68);
      ctx.say(this.title).catch(() => { });
      await ctx.wait(300);
      ctx.ready();
      let travel = 0, last = S.get('OC').st.angle, finish;
      const explored = ctx.until(r => finish = r);
      const drag = S.drag('OC', {
        constrain: a => G.clamp(a, 22, 158),
        linked: [{ id: 'OD', offset: 180 }],
        milestones: [],
        onChange: a => { ctx.state('INTERACTING'); travel += Math.abs(a - last); last = a; if (travel > 60) finish(); },
      });
      demoRay(S, 'OC', [80, 60, 68], { linked: [{ id: 'OD', offset: 180 }], step: 600 }).catch(() => { });
      ctx.idle(() => drag.hint());
      await explored;
      ctx.complete();
    },
  };

  /* ===================================================== 51 */
  const S51 = {
    id: 'S51', chapter: 6, topic: 'MEASURE', topicShort: 'They change together', holdTitle: true,
    title: 'Their measures change *together.*',
    async run(ctx, S) {
      measureFig(S, 68);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: { change: () => turnCD(S, 53, 1600) } });
      ctx.complete();
    },
  };

  /* ===================================================== 52 */
  const S52 = {
    id: 'S52', chapter: 6, topic: 'MEASURE', topicShort: 'What stays the same?',
    title: 'What *stays the same* about ∠1 and ∠3?',
    async run(ctx, S) {
      measureFig(S, 53);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      const line = ctx.say(this.title);
      await ctx.wait(320);
      await turnCD(S, 76, 1500);
      await line;
      await ctx.wait(900);   // a moment to look before the relationship is written
      S.pulseMany(['a1', 'a3'], 800);
      P.set('veq', { html: eq([{ t: '∠1', c: 'gold' }, '=', { t: '∠3', c: 'gold' }], 'xl'), x: RX, y: 470, cls: 'eqrow' });
      Sound.play('equation.resolve');
      ctx.complete();
    },
  };

  /* ===================================================== 53 */
  const S53 = {
    id: 'S53', chapter: 6, topic: 'MEASURE', topicShort: 'Measuring suggests…', holdTitle: true, persist: ['veq'],
    title: 'Measuring *suggests* that opposite angles are equal.',
    async run(ctx, S) {
      crossFig(S, { c: 62, mode: 'pairs', vals: ARCS });
      P.set('veq', { html: eq([{ t: '∠1', c: 'gold' }, '=', { t: '∠3', c: 'gold' }], 'xl'), x: RX, y: 470, cls: 'eqrow' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await ctx.say(this.title, { cues: { suggests: async () => {
        await turnCD(S, 62, 700);
        // evidence, not proof: the diagram steps back, and the claim is marked as measured
        ['O', 'OA', 'OB', 'OC', 'OD', ...ARCS].forEach(id => S.get(id).to({ dim: 0.5 }, 500));
        await ctx.wait(500);
        tag('tEv', 'MEASURED — NOT YET PROVED', { x: RX, y: 548, color: 'muted', size: 'sm' });
      } } });
      ctx.complete();
    },
  };

  Engine.register([S42, S43, S44, S45, S46, S47, S48, S49, S50, S51, S52, S53]);
})();
