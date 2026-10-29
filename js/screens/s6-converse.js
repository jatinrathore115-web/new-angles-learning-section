/* PHASE 6 — CONVERSE TEST (screens 38–41)
   Earlier: straight line ⟹ 180°. Now the direction flips: 180° ⟹ ?
   The learner makes ADJACENT angles total 180° and discovers the line.
   Adjacency stays visible as a condition throughout. */
(function () {
  const { lpFig, LO, reveal, turn, tag, eq, toks, lineTrace, demoRay } = Lab;
  const RX = 1330;
  const IDS = ['O', 'OB', 'OC', 'OA', 'a1', 'a2'];

  async function settle(S, c, a) {
    const jobs = [];
    if (Math.abs(G.delta(S.get('OC').st.angle, c)) > 0.5) jobs.push(turn(S, 'OC', c, 800));
    if (Math.abs(G.delta(S.get('OA').st.angle, a)) > 0.5) jobs.push(turn(S, 'OA', a, 800));
    await Promise.all(jobs);
  }

  /* ===================================================== 38 */
  const S38 = {
    id: 'S38', chapter: 5, topic: 'CONVERSE', topicShort: 'Reverse the relationship',
    title: 'Now *reverse* the relationship.',
    async run(ctx, S) {
      lpFig(S, { lenC: 300, c: 85, a: 180 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 85, 180);
      // the relationship as it was learned: LINE ⟹ 180°
      P.set('rev', { html: '<div class="rev"><span class="rv-a">STRAIGHT LINE</span><span class="rv-op">⟹</span><span class="rv-b">180°</span></div>', x: RX, y: 470 });
      const line = ctx.say(this.title);
      await ctx.wait(900);
      // the two ends trade places — the reasoning now runs the other way
      const el = P.el('rev'), a = el.querySelector('.rv-a'), b = el.querySelector('.rv-b');
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), k = UI.rectOf(a).w / ra.width;
      const dx = (rb.left + rb.width / 2 - (ra.left + ra.width / 2)) * k;
      Sound.play('servo', { dur: 700 });
      a.animate([{ transform: 'none' }, { transform: `translate(${dx}px, -26px)`, opacity: .5 }, { transform: `translateX(${dx}px)`, opacity: 0 }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' });
      await ctx.$(b.animate([{ transform: 'none' }, { transform: `translate(${-dx}px, 26px)` }, { transform: `translateX(${-dx}px)` }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' }).finished);
      el.innerHTML = '<div class="rev"><span class="rv-b">180°</span><span class="rv-op">⟹</span><span class="rv-q">?</span></div>';
      Sound.play('equation.snap');
      // and the geometry lets go of its line: OA swings off, the common arm moves
      await ctx.wait(300);
      await turn(S, 'OA', 165, 800);
      await line;
      ctx.complete();
    },
  };

  /* ===================================================== 39 */
  const cvHTML = () => eq([{ t: '', k: 'x', c: 'mag' }, '+', { t: '', k: 'y', c: 'cyan' }, '=', { t: '', k: 't', c: 'white' }], 'lg');
  function liveCv(S) {
    const x = P.q('cv', '[data-k="x"]'), y = P.q('cv', '[data-k="y"]'), t = P.q('cv', '[data-k="t"]');
    return () => {
      const m2 = S.get('a2').measure, m1 = S.get('a1').measure;
      x.textContent = m2 + '°'; y.textContent = m1 + '°'; t.textContent = (m1 + m2) + '°';
      return m1 + m2;
    };
  }
  const S39 = {
    id: 'S39', chapter: 5, topic: 'CONVERSE', topicShort: 'Make the total 180°', cfu: true,
    title: 'Make the adjacent angles add to *180°.*',
    async run(ctx, S) {
      lpFig(S, { lenC: 300, c: 85, a: 165, labels: ['auto', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      if (Math.abs(G.delta(S.get('OA').st.angle, 180)) < 6) await turn(S, 'OA', 165, 500);
      await settle(S, 85, G.norm360(S.get('OA').st.angle));
      tag('tTarget', 'TARGET 180°', { x: RX, y: 392, color: 'gold' });
      P.set('cv', { html: cvHTML(), x: RX, y: 470, cls: 'eqrow' });
      const upd = liveCv(S);
      upd();
      ctx.say(this.title).catch(() => { });
      await ctx.wait(300);
      ctx.ready();
      let guide = null, finish;
      const reached = ctx.until(r => finish = r);
      const drag = S.drag('OA', {
        constrain: a => G.clamp(a, 105, 215),
        snap: [{ to: 180, tol: 3 }],
        milestones: [],
        onChange: () => {
          ctx.state('INTERACTING');
          const t = upd();
          const near = Math.abs(t - 180) <= 15;
          toks('cv', { t: near && t !== 180 ? 'hl' : '' });
          if (t === 180) finish();
        },
      });
      demoRay(S, 'OA', [150, 165], { step: 500, onUpdate: upd }).catch(() => { });
      ctx.idle(() => drag.hint());
      await reached;
      drag.stop();
      guide && guide();
      upd();
      toks('cv', { t: 'okc' });
      Sound.play('snap.lock');
      S.ripple(LO, 'gold', 1.1);
      UI.correct();
      await ctx.advance(800);
    },
  };

  /* ===================================================== 40 */
  const S40 = {
    id: 'S40', chapter: 5, topic: 'CONVERSE', topicShort: 'The outer arms', persist: ['cv', 'tTarget'],
    title: 'What happens to their *non-common arms?*',
    async run(ctx, S) {
      lpFig(S, { lenC: 300, c: 85, a: 180, labels: ['auto', 'auto'] });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 85, 180);
      tag('tTarget', 'TARGET 180°', { x: RX, y: 392, color: 'gold', cls: 'sec' });
      P.set('cv', { html: cvHTML(), x: RX, y: 470, cls: 'eqrow' });
      liveCv(S)(); toks('cv', { t: 'okc' });
      const line = ctx.say(this.title);
      await ctx.wait(600);
      S.get('OC').to({ dim: 0.65 }, 300);
      ['a1', 'a2'].forEach(id => S.get(id).to({ dim: 0.5 }, 300));
      ['OA', 'OB'].forEach(id => S.get(id).to({ width: 8 }, 300));
      S.pulseMany(['OA', 'OB'], 900);
      await line;
      // the answer is seen, then named
      await lineTrace(S, 'OA', 'OB', { color: 'cyan', dur: 900, hold: 300 });
      tag('tLine', 'STRAIGHT LINE', { x: LO.x, y: LO.y + 96, color: 'cyan', size: 'lg' });
      Sound.play('discover');
      await ctx.wait(500);
      ctx.complete();
    },
  };

  /* ===================================================== 41 */
  const S41 = {
    id: 'S41', chapter: 5, topic: 'CONVERSE', topicShort: 'Converse rule', holdTitle: true, persist: ['tLine'],
    title: 'If adjacent angles add to 180°, their non-common arms form a *line.*',
    async run(ctx, S) {
      lpFig(S, { lenC: 300, c: 85, a: 180, labels: ['auto', 'auto'] });
      tag('tLine', 'STRAIGHT LINE', { x: LO.x, y: LO.y + 96, color: 'cyan', size: 'lg' });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, IDS, 80);
      await settle(S, 85, 180);
      P.set('rule', {
        html: `<div class="rule"><div class="rc" data-r="1">ADJACENT</div><div class="rop" data-r="2">+</div><div class="rc" data-r="3">TOTAL 180°</div><div class="rop" data-r="4">⟹</div><div class="rc res" data-r="5">NON-COMMON ARMS<br>FORM A LINE</div></div>`,
        x: RX + 30, y: 440,
      });
      const on = r => P.q('rule', `[data-r="${r}"]`).classList.add('on');
      await ctx.say(this.title, { cues: {
        // both conditions are shown on the figure as they are named
        adjacent: async () => {
          on(1); Sound.play('equation.snap');
          S.get('O').to({ ring: 1, color: 'gold' }, 250); S.pulse('OC', 700);
          await S.pulse('O', 700);
          S.get('O').to({ ring: 0, color: 'cyan' }, 300);
        },
        '180°': () => { on(2); on(3); Sound.play('equation.snap'); return S.pulseMany(['a1', 'a2'], 800); },
        'non-common arms': () => S.pulseMany(['OA', 'OB'], 700),
        line: () => { on(4); on(5); Sound.play('equation.resolve'); return lineTrace(S, 'OA', 'OB', { color: 'mint', dur: 800, hold: 300 }); },
      } });
      ctx.complete();
    },
  };

  Engine.register([S38, S39, S40, S41]);
})();
