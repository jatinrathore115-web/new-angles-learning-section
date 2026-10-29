/* PHASE 4 — ADJACENCY SCAN (screens 19–26)
   The definition is built in stages: two separate angles → the candidate
   shared vertex and arm light up → the two diagrams physically move together
   (shared-element motion, nothing is respawned) → vertex, arm and separate
   interiors are confirmed one at a time → only then the name. */
(function () {
  const { reveal, turn, tag } = Lab;
  // larger figures: separate angles on the left/right, merged figure centred and tall
  const L0 = { x: 300, y: 600 }, R0 = { x: 990, y: 585 }, M0 = { x: 720, y: 660 };
  const IDS = ['O', 'OA', 'OC', 'aL', 'O2', 'OB', 'OD', 'aR'];

  /** stage: 'apart' (two angles) · 'cand' (candidate arm highlighted) · 'merged' */
  function adjFig(S, stage) {
    S.keep(IDS);
    const merged = stage === 'merged', cand = stage !== 'apart';
    const armC = cand ? 'gold' : 'mag', armD = cand ? 'gold' : 'cyan';
    S.vertex('O', { ...(merged ? M0 : L0), label: 'O', labelAngle: merged ? 250 : null, size: 1.3, ring: 0, dim: 0, color: 'cyan' });
    S.ray('OC', { from: 'O', angle: merged ? 43 : 0, len: merged ? 400 : 300, color: armC, label: 'C', labelOp: 1, dim: 0, width: 6 });
    S.ray('OA', { from: 'O', angle: merged ? 100 : 57, len: merged ? 365 : 300, color: 'mag', label: 'A', labelOp: 1, dim: 0, width: 6 });
    S.arc('aL', { at: 'O', from: 'OC', to: 'OA', r: 132, color: 'mag', label: '', dim: 0, fillOp: 0.8, ring: 0 });
    S.vertex('O2', { ...(merged ? M0 : R0), label: 'O', labelAngle: null, labelOp: merged ? 0 : 1, size: 1.3, ring: 0, dim: 0, ...(merged ? { op: 0 } : S.has('O2') ? { op: 1 } : {}) });
    S.ray('OB', { from: 'O2', angle: 0, len: merged ? 460 : 330, color: 'cyan', label: 'B', labelOp: 1, dim: 0, width: 6 });
    S.ray('OD', { from: 'O2', angle: 43, len: merged ? 400 : 330, color: armD, label: merged ? '' : cand ? 'C' : 'D', labelOp: 1, dim: 0, width: 6 });
    S.arc('aR', { at: 'O2', from: 'OB', to: 'OD', r: 104, color: 'cyan', label: '', dim: 0, fillOp: 0.8, ring: 0 });
    UI.setFocus(merged ? M0.x : 680, merged ? M0.y - 180 : 460);
  }
  const showIds = merged => merged ? IDS.filter(i => i !== 'O2') : IDS;
  function dimAll(S, v, except = []) { IDS.forEach(id => !except.includes(id) && S.has(id) && S.get(id).to({ dim: v }, 350)); }
  const pulseVertex = (S, ids) => { Sound.play('vertex.pulse'); ids.forEach(v => { S.get(v).to({ ring: 1, color: 'gold' }, 250); S.ripple(S.pt(v), 'gold', 0.8); }); return S.pulseMany(ids, 900); };
  const traceOC = S => S.trace([S.pt('O'), S.get('OC').tip(true)], { color: 'gold', dur: 650, hold: 250, width: 8 });
  const fillInteriors = async (ctx, S) => { S.get('aR').to({ dim: 0, fillOp: 2.6 }, 400); await ctx.wait(420); await S.get('aL').to({ dim: 0, fillOp: 2.6 }, 400); };

  /* ===================================================== 19 */
  const S19 = {
    id: 'S19', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Two angles', holdTitle: true,
    title: 'Let’s look at these *two angles.*',
    async run(ctx, S) {
      adjFig(S, 'apart');
      ctx.state('DEMONSTRATE');
      // each angle is constructed in turn: vertex, arms, then its arc
      await ctx.say(this.title, { cues: { look: () => reveal(ctx, S, IDS, 110), 'two angles': () => S.pulseMany(['aL', 'aR'], 800) } });
      ctx.complete();
    },
  };

  /* ===================================================== 20 */
  const S20 = {
    id: 'S20', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Same vertex? Common arm?', holdTitle: true,
    title: 'What if they had the same *vertex* and a common *arm?*',
    async run(ctx, S) {
      adjFig(S, 'apart');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 60);
      await ctx.say(this.title, { cues: {
        // both vertices answer "same vertex?"
        vertex: async () => { await pulseVertex(S, ['O', 'O2']); ['O', 'O2'].forEach(v => S.get(v).to({ ring: 0, color: 'cyan' }, 300)); },
        // the two candidate arms turn the same gold: one arm, in two places
        arm: () => { adjFig(S, 'cand'); Sound.play('equation.snap'); return S.pulseMany(['OC', 'OD'], 900); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 21 */
  const S21 = {
    id: 'S21', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Bring them together', holdTitle: true,
    title: 'Let’s *find out.*',
    async run(ctx, S) {
      adjFig(S, 'cand');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 60);
      await ctx.say(this.title, { cues: { find: async () => {
        // the two drawings move together: vertices converge on O, the gold arms align
        Sound.play('servo', { dur: 1300 });
        S.get('O').to(M0, 1300, Ease.inOutCubic);
        S.get('O2').to(M0, 1300, Ease.inOutCubic);
        S.get('OC').to({ angle: 43, len: 400 }, 1300, Ease.inOutCubic);
        S.get('OA').to({ angle: 100, len: 365 }, 1300, Ease.inOutCubic);
        S.get('OB').to({ len: 460 }, 1300, Ease.inOutCubic);
        await S.get('OD').to({ len: 400 }, 1300, Ease.inOutCubic);
        Sound.play('snap.lock');
        S.ripple(M0, 'gold', 1);
        adjFig(S, 'merged');
      } } });
      ctx.complete();
    },
  };

  /* ===================================================== 22 */
  const S22 = {
    id: 'S22', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Common vertex', holdTitle: true,
    title: 'The two angles share *vertex O.*',
    async run(ctx, S) {
      adjFig(S, 'merged');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, showIds(true), 60);
      await ctx.say(this.title, { cues: {
        'two angles': () => S.pulseMany(['aL', 'aR'], 600),
        'vertex o': () => { dimAll(S, 0.75, ['O']); return pulseVertex(S, ['O']); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 23 */
  const S23 = {
    id: 'S23', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Common arm, no overlap', holdTitle: true,
    title: 'They also share *arm OC* without overlapping.',
    async run(ctx, S) {
      adjFig(S, 'merged');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, showIds(true), 60);
      dimAll(S, 0.75, ['OC', 'OD']);
      await ctx.say(this.title, { cues: {
        // focus moves from O to OC, traced outward from the vertex
        'arm oc': async () => { await traceOC(S); S.get('OC').to({ width: 9 }, 300); },
        // the two interiors fill on either side of OC — they never cover each other
        overlapping: () => fillInteriors(ctx, S),
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 24 */
  const S24 = {
    id: 'S24', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Adjacent angles', holdTitle: true,
    title: 'These are *adjacent angles.*',
    async run(ctx, S) {
      adjFig(S, 'merged');
      S.get('OC').to({ width: 8 }, 300);
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, showIds(true), 60);
      await ctx.say(this.title, { cues: { 'adjacent angles': () => {
        S.pulseMany(['aL', 'aR'], 800);
        tag('tAdj', 'ADJACENT ANGLES', { x: M0.x, y: M0.y + 112, color: 'gold', size: 'xl' });
        Sound.play('discover');
      } } });
      ctx.complete();
    },
  };

  /* ===================================================== 25 */
  const S25 = {
    id: 'S25', chapter: 3, topic: 'ADJACENT ANGLES', topicShort: 'Definition', persist: ['tAdj'], holdTitle: true,
    title: 'Two angles which share a common arm and vertex without any overlap are called *adjacent angles.*',
    async run(ctx, S) {
      adjFig(S, 'merged');
      S.get('OC').to({ width: 8 }, 300);
      tag('tAdj', 'ADJACENT ANGLES', { x: M0.x, y: M0.y + 112, color: 'gold', size: 'xl' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, showIds(true), 60);
      // the geometry stays still; each condition lights as it is named
      await ctx.say(this.title, { cues: {
        'common arm': () => traceOC(S),
        vertex: async () => { await pulseVertex(S, ['O']); S.get('O').to({ ring: 0, color: 'cyan' }, 300); },
        overlap: () => fillInteriors(ctx, S),
        'adjacent angles': () => S.pulseMany(['aL', 'aR'], 700),
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 26 — check */
  function adjCard(kind) {
    const m = Mini.make();
    if (kind === 'A') {        // common vertex, common arm, no overlap
      const O = { x: 140, y: 205 };
      m.arc(O, 0, 50, 62, 'cyan').arc(O, 50, 118, 80, 'gold');
      m.ray(O, 0, 150, 'white').ray(O, 50, 165, 'white').ray(O, 118, 160, 'white').v(O);
    } else if (kind === 'B') { // common vertex only
      const O = { x: 150, y: 205 };
      m.arc(O, 0, 32, 68, 'cyan').arc(O, 100, 145, 68, 'gold');
      m.ray(O, 0, 145, 'white').ray(O, 32, 150, 'white').ray(O, 100, 165, 'white').ray(O, 145, 140, 'white').v(O);
    } else {                   // common vertex and arm, but one angle covers the other
      const O = { x: 75, y: 205 };
      m.arc(O, 0, 85, 92, 'cyan').arc(O, 0, 40, 58, 'gold');
      m.ray(O, 0, 205, 'white').ray(O, 40, 190, 'white').ray(O, 85, 165, 'white').v(O);
    }
    return m.svg(300, 230);
  }
  const COND26 = {
    A: [['COMMON VERTEX', true], ['COMMON ARM', true], ['NO OVERLAP', true]],
    B: [['COMMON VERTEX', true], ['COMMON ARM', false], ['NO OVERLAP', true]],
    C: [['COMMON VERTEX', true], ['COMMON ARM', true], ['NO OVERLAP', false]],
  };
  const S26 = {
    id: 'S26', chapter: 3, topic: 'QUICK CHECK', topicShort: 'Check: adjacent', cfu: true,
    title: 'Which of these pairs are *adjacent angles?*',
    async run(ctx, S) {
      S.keep([]);
      UI.setFocus(800, 500);
      ctx.state('DEMONSTRATE');
      const cards = await Lab.cardRow(ctx, ['A', 'B', 'C'].map(id => ({ id, svg: adjCard(id) })), { y: 470, width: 340 });
      await ctx.say(this.title);
      ctx.ready(); ctx.check(false);
      cards.onSelect = id => { cards.cards.forEach(c => { if (!c.classList.contains('locked')) c.querySelector('.mcard-note').innerHTML = ''; }); ctx.enableCheck(true); };
      ctx.idle(() => cards.cards.forEach((c, i) => setTimeout(() => c.animate([{ transform: 'none' }, { transform: 'translateY(-6px)' }, { transform: 'none' }], { duration: 500 }), i * 120)));
      for (; ;) {
        await ctx.waitCheck();
        const v = cards.value;
        UI.Dock.enableCheck(false);
        ctx.state('EXPLAIN');
        // the selected drawing is tested condition by condition
        await Lab.conditions(ctx, cards, v, COND26[v]);
        if (v === 'A') break;
        cards.card(v).classList.add('bad');
        await ctx.bad(v === 'B' ? 'They share a vertex — but no arm. Check whether the two angles share *both* a vertex and an arm.' : 'They share a vertex and an arm — but one angle *covers* the other.');
        ctx.state('AWAIT_CHECK');
      }
      cards.lock('A');
      await ctx.good('Yes — one vertex, one shared arm, *no overlap.*');
      ctx.complete();
    },
  };

  Engine.register([S19, S20, S21, S22, S23, S24, S25, S26]);
})();
