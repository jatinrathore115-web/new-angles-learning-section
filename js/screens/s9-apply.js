/* PHASE 9 — FIELD APPLICATION (screens 69–73) and PHASE 10 — MISSION READY (74)
   One given angle unlocks the other three, each through a named relationship
   tied to highlighted regions. Then a converse check that hinges on adjacency,
   and the calibration finale. */
(function () {
  const { crossFig, turnCD, reveal, tag, eq, toks, lineTrace, oppConnector } = Lab;
  const AO = { x: 600, y: 525 }, RX = 1280;
  const IDS = ['O', 'OB', 'OA', 'OC', 'OD', 'a1', 'a2', 'a3', 'a4'];
  const ARCS = ['a1', 'a2', 'a3', 'a4'];
  const Y = { g1: 300, q3: 395, q2: 490, q4: 585 };
  const OPTS = [23, 67, 113];

  function applyFig(S, vals, hi = []) {
    crossFig(S, { c: 67, O: AO, len: [420, 300], vals });
    ARCS.forEach(id => S.get(id).to({ color: hi.includes(id) ? (id === 'a1' || id === 'a3' ? 'gold' : 'cyan') : 'white', fillOp: hi.includes(id) ? 1.4 : 0.45 }, 250));
  }
  const solvedRow = (id, n, v, cls = 'sec') => P.set(id, { html: eq([{ t: `∠${n}`, c: 'gold' }, '=', { t: `${v}°`, c: n === 1 ? 'white' : 'mint' }], 'md'), x: RX, y: Y[id], cls: 'eqrow ' + cls });
  const given = () => P.set('g1', { html: eq([{ t: '∠1', c: 'gold' }, '=', { t: '67°', c: 'white' }], 'md'), x: RX, y: Y.g1, cls: 'eqrow' });

  /** a row with an answer picker; resolves on the correct answer */
  async function ask(ctx, S, id, html, { correct, hint, onOpen }) {
    P.set(id, { html, x: RX, y: Y[id], cls: 'eqrow' });
    let finish; const solved = ctx.until(r => finish = r);
    const pk = UI.pick(P.q(id, '.pick'), {
      options: OPTS, correct, label: 'Answer', onOpen,
      onResult: (ok, v) => { if (ok) finish(); else { UI.incorrect(); ctx.sayNow(hint(v), { tone: 'warn' }); } },
    });
    ctx.ready();
    ctx.idle(() => pk.hint());
    await solved;
  }

  /* ===================================================== 69 */
  const S69 = {
    id: 'S69', chapter: 8, topic: 'APPLY', topicShort: '∠1 = 67°: find ∠3', holdTitle: true, cfu: true,
    title: 'If ∠1 is 67°, what is *∠3?*',
    async run(ctx, S) {
      applyFig(S, ['a1'], ['a1', 'a3']);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 67);
      given();
      await ctx.say(this.title, { cues: {
        '67°': () => { P.cls('g1', 'flash'); return S.pulse('a1', 800); },
        '∠3': () => { P.cls('g1', '', 'flash'); S.get('a3').to({ ring: 1 }, 300); return oppConnector(S, 'a1', 'a3', { hold: 300 }); },
      } });
      await ask(ctx, S, 'q3', eq([{ t: '∠3', c: 'gold' }, '=', `<span class="ans">${UI.pickHTML('x')}</span>`], 'md'), {
        correct: 67,
        hint: v => v === 113 ? '113° is the angle *next to* ∠1. ∠3 sits directly across from it.' : '∠3 sits directly across from ∠1 — opposite angles are *equal.*',
        onOpen: () => oppConnector(S, 'a1', 'a3', { hold: 200 }),
      });
      S.get('a3').to({ ring: 0, val: 'auto', valOp: 1 }, 300);
      S.pulse('a3', 800);
      solvedRow('q3', 3, 67, '');
      await ctx.good('∠3 is opposite ∠1, so *∠3 = 67°.*');
      ctx.complete();
    },
  };

  /* ===================================================== 70 */
  const S70 = {
    id: 'S70', chapter: 8, topic: 'APPLY', topicShort: 'Find ∠2', holdTitle: true, cfu: true, persist: ['g1', 'q3'],
    title: 'What is *∠2* if it forms a linear pair with 67°?',
    async run(ctx, S) {
      applyFig(S, ['a1', 'a3'], ['a1', 'a2']);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 67);
      given(); solvedRow('q3', 3, 67);
      await ctx.say(this.title, { cues: {
        '∠2': () => { S.get('a2').to({ ring: 1 }, 300); return S.pulse('a2', 700); },
        'linear pair': () => lineTrace(S, 'OA', 'OB', { color: 'gold', dur: 900, hold: 200 }),
        '67°': () => S.pulse('a1', 700),
      } });
      await ask(ctx, S, 'q2', eq([{ t: '67°', c: 'gold' }, '+', `<span class="ans">${UI.pickHTML('x')}</span>`, '=', { t: '180°', c: 'white' }], 'md'), {
        correct: 113,
        hint: v => v === 67 ? '67° is ∠1 itself. Together ∠1 and ∠2 must make *180°.*' : `67° + ${v}° = ${67 + v}° — a linear pair makes *180°.*`,
        onOpen: () => S.pulseMany(['a1', 'a2'], 700),
      });
      S.get('a2').to({ ring: 0, val: 'auto', valOp: 1 }, 300);
      S.pulse('a2', 800);
      solvedRow('q2', 2, 113, '');
      await ctx.good('67° + 113° = 180°, so *∠2 = 113°.*');
      ctx.complete();
    },
  };

  /* ===================================================== 71 */
  const S71 = {
    id: 'S71', chapter: 8, topic: 'APPLY', topicShort: 'Find ∠4', holdTitle: true, cfu: true, persist: ['g1', 'q3', 'q2'],
    title: 'What is *∠4* now?',
    async run(ctx, S) {
      applyFig(S, ['a1', 'a2', 'a3'], ['a2', 'a4']);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 70);
      await turnCD(S, 67);
      given(); solvedRow('q3', 3, 67); solvedRow('q2', 2, 113);
      await ctx.say(this.title, { cues: {
        '∠4': () => { S.get('a4').to({ ring: 1 }, 300); return oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 300 }); },
      } });
      await ask(ctx, S, 'q4', eq([{ t: '∠4', c: 'gold' }, '=', `<span class="ans">${UI.pickHTML('x')}</span>`], 'md'), {
        correct: 113,
        hint: v => v === 67 ? '67° belongs to the other opposite pair. ∠4 sits *across* from ∠2.' : '∠4 sits directly across from ∠2 — opposite angles are *equal.*',
        onOpen: () => oppConnector(S, 'a2', 'a4', { color: 'cyan', hold: 200 }),
      });
      S.get('a4').to({ ring: 0, val: 'auto', valOp: 1 }, 300);
      solvedRow('q4', 4, 113, '');
      // the whole crossing at once: 67°, 113°, 67°, 113° — the opposite pattern is visible
      ARCS.forEach(id => S.get(id).to({ color: id === 'a1' || id === 'a3' ? 'gold' : 'cyan', fillOp: 1.2 }, 300));
      UI.correct();
      S.pulseMany(['a1', 'a3'], 700);
      setTimeout(() => S.pulseMany(['a2', 'a4'], 700), 450);
      await ctx.say('∠4 is opposite ∠2, so *∠4 = 113°.*', { tone: 'good' });
      ctx.complete();
    },
  };

  /* ===================================================== 72 & 73 — converse check */
  function pairCard(kind, show = false) {
    const m = Mini.make();
    if (kind === 'A') {   // adjacent: a ray standing on a line
      const O = { x: 190, y: 170 };
      m.hlVertex(O); m.hlRay(O, 64, 120, 'common');
      m.arc(O, 0, 64, 40, 'cyan', { label: '64°', gap: 22 }).arc(O, 64, 180, 54, 'mag', { label: '116°', gap: 26 });
      m.ray(O, 0, 150, 'cyan', { plain: true }).ray(O, 180, 150, 'cyan', { plain: true }).ray(O, 64, 120, 'gold', { plain: true }).v(O);
      m.trace([G.at(O, 180, 150), O, G.at(O, 0, 150)]);
    } else {              // two separate angles that also total 180°
      const Pv = { x: 55, y: 175 }, Q = { x: 225, y: 175 };
      m.hlVertex(Pv); m.hlVertex(Q);
      m.arc(Pv, 0, 80, 38, 'mag', { label: '80°', gap: 22 }).arc(Q, 0, 100, 38, 'cyan', { label: '100°', gap: 24 });
      m.ray(Pv, 0, 120, 'mag', { plain: true }).ray(Pv, 80, 115, 'mag', { plain: true }).v(Pv);
      m.ray(Q, 0, 115, 'cyan', { plain: true }).ray(Q, 100, 115, 'cyan', { plain: true }).v(Q);
    }
    return m.svg(380, 230);
  }
  const pairItems = () => ['A', 'B'].map(id => ({ id, head: id === 'A' ? 'FIRST PAIR' : 'SECOND PAIR', aria: id === 'A' ? 'First pair: a ray standing on a line' : 'Second pair: two separate angles', svg: pairCard(id) }));
  const totalNote = '<div class="mtot">180°</div>';

  const S72 = {
    id: 'S72', chapter: 8, topic: 'CONVERSE CHECK', topicShort: 'Which pair? (converse)', cfu: true,
    title: 'Both pairs total 180°; which pair can use the *converse?*',
    async run(ctx, S) {
      S.keep([]);
      UI.setFocus(800, 500);
      ctx.state('DEMONSTRATE');
      const cards = await Lab.cardRow(ctx, pairItems(), { y: 480, width: 470 });
      ['A', 'B'].forEach(id => cards.note(id, totalNote));
      await ctx.say(this.title);
      ctx.ready(); ctx.check(false);
      cards.onSelect = () => ctx.enableCheck(true);
      for (; ;) {
        await ctx.waitCheck();
        if (cards.value === 'A') break;
        cards.card('B').classList.add('bad');
        cards.svg('B').classList.add('show-vertex');
        await ctx.bad('Look closely at the second pair — do its angles share a *vertex* and an *arm?*');
        ctx.state('AWAIT_CHECK');
      }
      cards.lock('A');
      UI.correct();
      await ctx.advance(700);
    },
  };

  const S73 = {
    id: 'S73', chapter: 8, topic: 'CONVERSE CHECK', topicShort: 'Why only the first pair?',
    title: 'Why does only the first pair meet the *converse conditions?*',
    async run(ctx, S) {
      S.keep([]);
      UI.setFocus(800, 500);
      ctx.state('DEMONSTRATE');
      const cards = await Lab.cardRow(ctx, pairItems(), { y: 480, width: 470 });
      cards.cards.forEach(c => c.classList.add('locked'));
      const line = ctx.say(this.title);
      await ctx.wait(500);
      // Pair A: one vertex, one shared arm → adjacent → its outer arms are a line
      cards.card('A').classList.add('ok');
      cards.svg('A').classList.add('show-vertex', 'show-common');
      await Lab.conditions(ctx, cards, 'A', [['ADJACENT', true], ['TOTAL 180°', true]]);
      cards.svg('A').classList.add('show-trace'); Sound.play('geometry.draw');
      await ctx.wait(500);
      // Pair B: two different vertices — the adjacency condition is missing
      cards.card('B').classList.add('dim');
      cards.svg('B').classList.add('show-vertex');
      await Lab.conditions(ctx, cards, 'B', [['ADJACENT', false], ['TOTAL 180°', true]]);
      await line;
      await ctx.say('Adding to 180° is not enough — the angles must also be *adjacent.*', { tone: 'good' });
      ctx.complete();
    },
  };

  /* ===================================================== 74 */
  const S74 = {
    id: 'S74', chapter: 9, topic: 'MISSION READY', topicShort: 'Calibration ready',
    title: 'The calibration system is ready for the *asteroid mission.*',
    async run(ctx, S) {
      const MO = { x: 800, y: 545 };
      crossFig(S, { c: 62, O: MO, len: [470, 190], labels: false });
      ARCS.forEach(id => S.get(id).to({ op: 0 }, 300));
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, ['O', 'OB', 'OA', 'OC', 'OD'], 90);
      const line = ctx.say(this.title);
      await ctx.wait(400);
      // the crossing settles into a precise perpendicular calibration
      await turnCD(S, 86, 1200);
      S.get('OC').to({ angle: 90 }, 140); await S.get('OD').to({ angle: 270 }, 140);
      Sound.play('snap.lock');
      // the vertex: one restrained energy pulse
      const O = S.get('O');
      O.to({ color: 'gold', size: 2.2, ring: 1 }, 400, Ease.outCubic);
      S.ripple(MO, 'gold', 1.4); setTimeout(() => S.ripple(MO, 'gold', 2.4), 220);
      Sound.play('mission.ready');
      await ctx.wait(500);
      tag('tReady', 'CALIBRATION READY', { x: MO.x, y: 282, color: 'white', size: 'xxl' });
      await line;
      const btn = UI.ov('<button class="btn btn-next big continue">CONTINUE<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>', { x: MO.x, y: 808, center: true });
      UI.inNext(btn);
      ctx.on(btn, 'click', () => Engine.finish());
      ctx.complete();
    },
  };

  Engine.register([S69, S70, S71, S72, S73, S74]);
})();
