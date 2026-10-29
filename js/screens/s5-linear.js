/* PHASE 5 — LINEAR PAIR CALIBRATION (screens 27–37)
   Adjacent angles → their outer arms are made collinear by the learner →
   the common arm moves while both measures change live → the learner looks
   for the invariant → 180° is discovered → only then the name "linear pair". */
(function () {
  const { reveal, turn, tag, eq, toks, lineTrace, demoRay } = Lab;
  const LO = { x: 700, y: 625 }, RX = 1330;
  const IDS = ['O', 'OB', 'OC', 'OA', 'a1', 'a2'];

  /** line-pair figure: OB fixed at 0°, common arm OC (gold), outer arm OA */
  function lpFig(S, { c = 64, a = 164, labels = ['', ''], extra = [], lenC = 340 } = {}) {
    S.keep([...IDS, ...extra]);
    const has = id => S.has(id);
    S.vertex('O', { ...LO, label: 'O', labelAngle: 270, size: 1.3, ring: 0, dim: 0, color: 'cyan' });
    S.ray('OB', { from: 'O', angle: 0, len: 460, color: 'cyan', label: 'B', labelOp: 1, dim: 0, width: 6 });
    S.ray('OC', { from: 'O', len: lenC, color: 'gold', label: 'C', labelOp: 1, dim: 0, width: 6, ...(has('OC') ? {} : { angle: c }) });
    S.ray('OA', { from: 'O', len: 460, color: 'mag', label: 'A', labelOp: 1, dim: 0, width: 6, ...(has('OA') ? {} : { angle: a }) });
    S.arc('a1', { at: 'O', from: 'OB', to: 'OC', r: 122, color: 'cyan', label: labels[0], labelOp: labels[0] ? 1 : 0, labelColor: '#35E7FF', labelGap: 44, dim: 0, ring: 0, fillOp: 0.7, val: '', minor: false });
    S.arc('a2', { at: 'O', from: 'OC', to: 'OA', r: 160, color: 'mag', label: labels[1], labelOp: labels[1] ? 1 : 0, labelColor: '#FF48D7', labelGap: 44, dim: 0, ring: 0, fillOp: 0.7, val: '', minor: false });
    UI.setFocus(LO.x, LO.y - 170);
  }
  /** bring OC / OA to their screen positions (carried figures turn, fresh ones are already there) */
  async function settle(S, c, a) {
    const jobs = [];
    if (Math.abs(G.delta(S.get('OC').st.angle, c)) > 0.5) jobs.push(turn(S, 'OC', c, 800));
    if (Math.abs(G.delta(S.get('OA').st.angle, a)) > 0.5) jobs.push(turn(S, 'OA', a, 800));
    await Promise.all(jobs);
  }
  const nonCommonTag = () => tag('tNon', 'NON-COMMON ARMS', { x: LO.x - 40, y: LO.y + 96, color: 'gold' });
  const lineTag = () => tag('tLine', 'STRAIGHT LINE', { x: LO.x, y: LO.y + 96, color: 'cyan', size: 'lg' });

  /* ===================================================== 27 */
  const S27 = {
    id: 'S27', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Non-common arms', holdTitle: true,
    title: 'What if their *non-common arms* lie on a straight line?',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 164 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 164);
      await ctx.say(this.title, { cues: {
        // the shared arm steps back; the two outer arms come forward
        'non-common arms': () => {
          S.get('OC').to({ dim: 0.6 }, 350);
          ['a1', 'a2'].forEach(id => S.get(id).to({ dim: 0.5 }, 350));
          ['OA', 'OB'].forEach(id => S.get(id).to({ width: 8.5 }, 350));
          nonCommonTag();
          return S.pulseMany(['OA', 'OB'], 900);
        },
        // a faint hint of the question: where would OA have to be?
        'straight line': async () => { const g = S.ghostRay(LO, 180, 460, 'gold'); await ctx.wait(1500); g(); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 28 */
  const S28 = {
    id: 'S28', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Drag A into line', persist: ['tNon'], cfu: true,
    title: 'Drag *A* till OA and OB lie on a straight line.',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 164 });
      nonCommonTag();
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      if (Math.abs(G.delta(S.get('OA').st.angle, 180)) < 6) await turn(S, 'OA', 164, 500);
      await settle(S, 64, G.norm360(S.get('OA').st.angle) > 175 ? 164 : G.norm360(S.get('OA').st.angle));
      S.get('OC').to({ dim: 0.6 }, 300);
      ['a1', 'a2'].forEach(id => S.get(id).to({ dim: 0.4 }, 300));
      ['OA', 'OB'].forEach(id => S.get(id).to({ width: 7 }, 300));
      ctx.say(this.title).catch(() => { });
      await ctx.wait(300);
      ctx.ready();
      let guide = null, finish;
      const done = ctx.until(r => finish = r);
      const drag = S.drag('OA', {
        constrain: a => G.clamp(a, 90, 205),
        snap: [{ to: 180, tol: 4 }],   // magnetic assistance near the line
        milestones: [],
        onChange: a => {
          ctx.state('INTERACTING');
          const near = Math.abs(a - 180) <= 22;
          if (near && !guide) guide = S.ghostRay(LO, 180, 460, 'gold');
          if (!near && guide) { guide(); guide = null; }
          if (a === 180) finish();
        },
      });
      demoRay(S, 'OA', [150, 164], { step: 500 }).catch(() => { });
      ctx.idle(() => drag.hint());
      await done;
      drag.stop();
      guide && guide();
      Sound.play('snap.lock');
      S.ripple(LO, 'gold', 1.1);
      S.pulseMany(['OA', 'OB'], 700);
      UI.correct();
      await ctx.advance(700);
    },
  };

  /* ===================================================== 29 */
  const S29 = {
    id: 'S29', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'One straight line', holdTitle: true,
    title: 'The outer arms now make one *straight line.*',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 180 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 180);
      await ctx.say(this.title, { cues: {
        // the common arm dims; the two outer arms pulse together as one object
        'outer arms': () => {
          S.get('OC').to({ dim: 0.7 }, 350);
          ['a1', 'a2'].forEach(id => S.get(id).to({ dim: 0.6 }, 350));
          ['OA', 'OB'].forEach(id => S.get(id).to({ width: 7.5 }, 300));
          return S.pulseMany(['OA', 'OB'], 900);
        },
        'straight line': async () => { await lineTrace(S, 'OA', 'OB', { color: 'cyan', dur: 900, hold: 300 }); lineTag(); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 30 */
  const S30 = {
    id: 'S30', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Move the common arm',
    title: 'Move the *common arm* and watch both measures.',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 180, labels: ['auto', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, G.norm360(S.get('OC').st.angle), 180);
      ctx.say(this.title).catch(() => { });
      await ctx.wait(350);
      ctx.ready();
      let travel = 0, last = S.get('OC').st.angle, finish;
      const explored = ctx.until(r => finish = r);
      const drag = S.drag('OC', {
        constrain: a => G.clamp(a, 12, 168),
        milestones: [90],
        onChange: a => { ctx.state('INTERACTING'); travel += Math.abs(a - last); last = a; if (travel > 80) finish(); },
      });
      demoRay(S, 'OC', [84, 50, 64], { step: 650 }).catch(() => { });
      ctx.idle(() => drag.hint());
      await explored;
      ctx.complete();   // the arm stays live: the learner may keep exploring
    },
  };

  /* ===================================================== 31 */
  const S31 = {
    id: 'S31', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'One grows, one shrinks', holdTitle: true,
    title: 'One angle *grows* as the other *shrinks.*',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 180, labels: ['auto', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 180);
      // direction markers ride beside each live measure while the arm turns
      const by = (id, dx) => () => { const p = S.get(id).labelPoint(); return { x: p.x + dx, y: p.y }; };
      await ctx.say(this.title, { cues: {
        grows: async () => {
          tag('up', '▲', { color: 'cyan', size: 'sm', anchor: by('a1', 64) });
          tag('dn', '▼', { color: 'mag', size: 'sm', anchor: by('a2', -68) });
          await turn(S, 'OC', 108, 1800, Ease.inOutCubic);
          P.drop('up'); P.drop('dn');
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 32 */
  const S32 = {
    id: 'S32', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'What stays the same?',
    title: 'What *stays the same* when the common arm moves?',
    async run(ctx, S) {
      lpFig(S, { c: 108, a: 180, labels: ['auto', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, G.norm360(S.get('OC').st.angle), 180);
      const line = ctx.say(this.title);
      await ctx.wait(300);
      await turn(S, 'OC', 42, 1500);
      tag('q', '?', { x: RX, y: 470, color: 'gold', size: 'q' });
      await line;
      // a deliberate pause — the arm stays live so the learner can test ideas
      ctx.ready();
      const drag = S.drag('OC', { constrain: a => G.clamp(a, 12, 168), milestones: [] });
      ctx.cleanups.push(() => drag.stop());
      await ctx.wait(1800);
      ctx.complete();
    },
  };

  /* ===================================================== 33 */
  const sumHTML = () => eq([{ t: '', k: 'x', c: 'mag', cls: 'ghost' }, '+', { t: '', k: 'y', c: 'cyan', cls: 'ghost' }, '=', { t: '180°', k: 't', c: 'gold', cls: 'ghost' }], 'lg');
  function liveSum(S) {
    const x = P.q('lpSum', '[data-k="x"]'), y = P.q('lpSum', '[data-k="y"]');
    const upd = () => { if (!x) return; x.textContent = S.get('a2').measure + '°'; y.textContent = S.get('a1').measure + '°'; };
    upd();
    return upd;
  }
  const S33 = {
    id: 'S33', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Always 180°',
    title: 'The two adjacent angles always add to *180°.*',
    async run(ctx, S) {
      lpFig(S, { c: 42, a: 180, labels: ['auto', 'auto'] });
      P.set('lpSum', { html: sumHTML(), x: RX, y: 470, cls: 'eqrow' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 180);
      const upd = liveSum(S);
      const line = ctx.say(this.title);
      await ctx.wait(300);
      // the two measures travel to one equation; the total locks in
      for (const [k, id] of [['x', 'a2'], ['y', 'a1']]) {
        const t = P.q('lpSum', `[data-k="${k}"]`);
        S.pulse(id, 600);
        await ctx.$(UI.fly(`${S.get(id).measure}°`, S.get(id).labelPoint(), t, { dur: 650, onArrive: () => t.classList.remove('ghost') }));
      }
      toks('lpSum', { t: 'okc' });
      Sound.play('equation.resolve');
      await line;
      // reinforcement: the parts change strongly, the total never moves
      const off = Tween.onFrame(upd); ctx.cleanups.push(off);
      await turn(S, 'OC', 120, 1400);
      await ctx.wait(250);
      await turn(S, 'OC', 35, 1600);
      await ctx.wait(250);
      await turn(S, 'OC', 64, 1000);
      off(); upd();
      ctx.complete();
    },
  };

  /* ===================================================== 34 */
  const S34 = {
    id: 'S34', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Linear pair', holdTitle: true, persist: ['lpSum'],
    title: 'A ray standing on a line forms a *linear pair.*',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 180, labels: ['auto', 'auto'] });
      P.set('lpSum', { html: sumHTML(), x: RX, y: 470, cls: 'eqrow sec' });
      liveSum(S); toks('lpSum', { x: '', y: '', t: 'okc' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 180);
      await ctx.say(this.title, { cues: {
        ray: () => S.trace([LO, S.get('OC').tip(true)], { color: 'gold', dur: 600, hold: 200, width: 7 }),
        line: () => lineTrace(S, 'OA', 'OB', { color: 'cyan', dur: 800, hold: 300 }),
        'linear pair': () => {
          tag('tLP', 'LINEAR PAIR', { x: LO.x - 90, y: 250, color: 'gold', size: 'xl' });
          Sound.play('discover');
          return S.pulseMany(['a1', 'a2'], 800);
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 35 */
  const S35 = {
    id: 'S35', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Linear pair = 180°', holdTitle: true, persist: ['lpSum', 'tLP'],
    title: 'The angles in a linear pair add to *180°.*',
    async run(ctx, S) {
      lpFig(S, { c: 64, a: 180, labels: ['auto', 'auto'] });
      P.set('lpSum', { html: sumHTML(), x: RX, y: 470, cls: 'eqrow' });
      tag('tLP', 'LINEAR PAIR', { x: LO.x - 90, y: 250, color: 'gold', size: 'xl' });
      liveSum(S); toks('lpSum', { x: '', y: '', t: '' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 64, 180);
      let lit;
      await ctx.say(this.title, { cues: {
        // each angle and its term light together …
        angles: () => (lit = (async () => {
          S.get('a1').to({ dim: 0.6 }, 250); S.pulse('a2', 800); toks('lpSum', { x: 'hl' });
          await ctx.wait(800);
          S.get('a1').to({ dim: 0 }, 250); S.get('a2').to({ dim: 0.6 }, 250); S.pulse('a1', 800); toks('lpSum', { x: '', y: 'hl' });
          await ctx.wait(800);
          S.get('a2').to({ dim: 0 }, 250);
        })()),
        // … then the total
        '180°': async () => { await lit; toks('lpSum', { y: '', t: 'okc' }); Sound.play('equation.resolve'); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 36 — check */
  function lpCard(outer) {
    const m = Mini.make();
    const O = { x: 150, y: 195 };
    m.arc(O, 0, 25, 58, 'cyan').arc(O, 25, outer, 78, 'mag');
    m.ray(O, 0, 142, 'cyan', { plain: true }).ray(O, 25, 140, 'gold', { plain: true }).ray(O, outer, 140, 'mag', { plain: true }).v(O);
    if (outer === 180) m.trace([G.at(O, 180, 140), O, G.at(O, 0, 142)]);
    return m.svg(300, 230);
  }
  const OUTER36 = { A: 150, B: 180, C: 100 };
  const S36 = {
    id: 'S36', chapter: 4, topic: 'QUICK CHECK', topicShort: 'Check: linear pair', cfu: true,
    title: 'Which diagram shows a *linear pair?*',
    async run(ctx, S) {
      S.keep([]);
      UI.setFocus(800, 500);
      ctx.state('DEMONSTRATE');
      const cards = await Lab.cardRow(ctx, ['A', 'B', 'C'].map(id => ({ id, svg: lpCard(OUTER36[id]) })), { y: 470, width: 340 });
      await ctx.say(this.title);
      ctx.ready(); ctx.check(false);
      cards.onSelect = () => { cards.cards.forEach(c => { if (!c.classList.contains('locked')) c.querySelector('.mcard-note').innerHTML = ''; }); ctx.enableCheck(true); };
      for (; ;) {
        await ctx.waitCheck();
        const v = cards.value;
        UI.Dock.enableCheck(false);
        ctx.state('EXPLAIN');
        await Lab.conditions(ctx, cards, v, [['ADJACENT', true], ['COMMON ARM', true], ['OUTER ARMS FORM A LINE', v === 'B']]);
        if (v === 'B') break;
        cards.card(v).classList.add('bad');
        await ctx.bad('Adjacent, with a common arm — but do the *outer arms* form one straight line?');
        ctx.state('AWAIT_CHECK');
      }
      cards.lock('B');
      cards.svg('B').classList.add('show-trace'); Sound.play('geometry.draw');
      await ctx.good('Yes — adjacent, and the outer arms form a *straight line.*');
      ctx.complete();
    },
  };

  /* ===================================================== 37 */
  const S37 = {
    id: 'S37', chapter: 4, topic: 'LINEAR PAIR', topicShort: 'Find the missing angle', cfu: true,
    title: 'One angle is 128°; what is the *other angle?*',
    async run(ctx, S) {
      lpFig(S, { c: 52, a: 180, labels: ['?', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 52, 180);
      P.set('miss', { html: eq([{ t: '128°', k: 'k', c: 'mag', cls: 'ghost' }, '+', `<span class="ans">${UI.pickHTML('u')}</span>`, '=', { t: '180°', k: 't', c: 'gold', cls: 'ghost' }], 'lg'), x: LO.x, y: 805, cls: 'eqrow' });
      const line = ctx.say(this.title);
      await ctx.wait(400);
      // known → total → unknown
      const tk = P.q('miss', '[data-k="k"]');
      S.pulse('a2', 600);
      await ctx.$(UI.fly('128°', S.get('a2').labelPoint(), tk, { dur: 650, onArrive: () => tk.classList.remove('ghost') }));
      await ctx.wait(200);
      toks('miss', { t: 'hl' }); Sound.play('equation.snap');
      await lineTrace(S, 'OA', 'OB', { color: 'gold', dur: 700, hold: 150, width: 4 });
      toks('miss', { t: '' });
      S.get('a1').to({ ring: 1 }, 300); S.pulse('a1', 700);
      await line;
      let finish; const solved = ctx.until(r => finish = r);
      const pk = UI.pick(P.q('miss', '.pick'), {
        options: [42, 52, 62], correct: 52, label: 'Missing angle',
        onOpen: () => S.pulse('a1', 700),
        onResult: (ok, v) => {
          if (ok) { finish(); return; }
          UI.incorrect(); S.pulse('a2', 600);
          ctx.sayNow(`Check: 128° + ${v}° = ${128 + v}° — the pair must make *180°.*`, { tone: 'warn' });
        },
      });
      ctx.ready();
      ctx.idle(() => { pk.hint(); S.pulse('a1', 900); });
      await solved;
      S.get('a1').to({ ring: 0 }, 300);
      S.get('a1').st.label = 'auto';
      S.pulse('a1', 800);
      toks('miss', { t: 'okc' });
      await ctx.good('128° + 52° = *180°.*');
      ctx.complete();
    },
  };

  Engine.register([S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37]);
  Lab.lpFig = lpFig; Lab.LO = LO;
})();
