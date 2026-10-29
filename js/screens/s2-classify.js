/* PHASE 2 — ANGLE CLASSIFICATION (screens 6–12)
   One angle system: the same arm OB keeps turning, and the arc opens with it.
   The classification and measure sit in a fixed readout to the right; they
   arrive only after the motion has stopped. */
(function () {
  const { angleFig, reveal, turn, snapTo, tag } = Lab;
  const RX = 1300;   // readout column, clear of arm OA (ends near x 1120)

  function readout(name, val) {
    tag('tyName', name, { x: RX, y: 420, color: 'gold', size: 'xl' });
    tag('tyVal', val, { x: RX, y: 492, color: 'white', size: 'val' });
  }

  /** generic type screen. The arm starts turning when the narrator says "angle",
      the measure appears only once the motion has stopped, and the type name
      lands on the word that names it (def.cue). */
  function typeScreen(def) {
    return Object.assign({
      chapter: 1, topic: 'ANGLE TYPES', holdTitle: true,
      async run(ctx, S) {
        angleFig(S, { b: def.from, o: def.o });
        const OB = S.get('OB');
        ctx.state('DEMONSTRATE');
        await reveal(ctx, S, ['O', 'OA', 'OB', 'ang']);
        P.drop('tyName'); P.drop('tyVal');
        let moved;
        await ctx.say(this.title, { cues: {
          angle: () => (moved = (async () => {
            await def.motion(ctx, S, OB);
            await ctx.wait(200);
            tag('tyVal', `${def.to}°`, { x: RX, y: 492, color: 'white', size: 'val' });
            Sound.play('equation.snap');
          })()),
          [def.cue]: async () => {
            await moved;
            await ctx.wait(250);
            readout(def.name, `${def.to}°`);
            Sound.play('equation.resolve');
            return S.pulse('ang', 700);
          },
        } });
        def.after && await def.after(ctx, S);
        ctx.complete();
      },
    }, def);
  }

  const S06 = typeScreen({
    id: 'S06', topicShort: 'Acute', from: 55, to: 48, name: 'ACUTE', cue: 'acute',
    title: 'An angle smaller than 90° is *acute.*',
    async motion(ctx, S) {
      if (Math.abs(G.delta(S.get('OB').st.angle, 48)) < 3) { await turn(S, 'OB', 70, 500); }
      await turn(S, 'OB', 48, 800);
    },
  });

  const S07 = typeScreen({
    id: 'S07', topicShort: 'Right', from: 48, to: 90, name: 'RIGHT', cue: 'right angle',
    title: 'An angle of 90° is a *right angle.*',
    async motion(ctx, S) {
      if (Math.abs(G.delta(S.get('OB').st.angle, 90)) < 1) await turn(S, 'OB', 60, 500);
      await snapTo(S, 'OB', 90, 900);
      // perpendicular: a brief guide along OB's line, square corner from the arc
      S.trace([S.pt('O'), S.get('OB').tip(true)], { color: 'gold', dur: 500, hold: 250, width: 4 });
    },
  });

  let ghosts = [];
  const clearGhosts = () => { ghosts.forEach(g => g()); ghosts = []; };

  const S08 = typeScreen({
    id: 'S08', topicShort: 'Obtuse', from: 90, to: 125, name: 'OBTUSE', cue: 'obtuse',
    title: 'An angle between 90° and 180° is *obtuse.*',
    async motion(ctx, S) {
      if (Math.abs(G.delta(S.get('OB').st.angle, 125)) < 1) await turn(S, 'OB', 95, 500);
      const O = S.pt('O');
      // the two boundaries the motion passes between: 90° behind, 180° ahead
      ghosts.push(S.ghostRay(O, 90, 300), S.ghostRay(O, 180, 330));
      await turn(S, 'OB', 125, 1000);
    },
    async after(ctx) { await ctx.wait(300); clearGhosts(); },
  });

  const S09 = typeScreen({
    id: 'S09', topicShort: 'Straight', from: 125, to: 180, name: 'STRAIGHT', cue: 'straight',
    title: 'An angle of 180° is *straight.*',
    async motion(ctx, S) {
      if (Math.abs(G.delta(S.get('OB').st.angle, 180)) < 1) await turn(S, 'OB', 150, 500);
      await snapTo(S, 'OB', 180, 950);
      // the two arms are now one straight line
      Lab.lineTrace(S, 'OB', 'OA', { color: 'gold', dur: 700, hold: 200, width: 4 });
    },
  });

  const S10 = typeScreen({
    id: 'S10', topicShort: 'Reflex', from: 180, to: 235, name: 'REFLEX', cue: 'reflex', o: { x: 600, y: 488 },
    title: 'An angle between 180° and 360° is *reflex.*',
    async motion(ctx, S) {
      if (Math.abs(G.delta(S.get('OB').st.angle, 235)) < 1) await turn(S, 'OB', 180, 500);
      const O = S.pt('O');
      // the straight angle stays as a dashed reference: the arc is visibly longer than it
      ghosts.push(S.ghostRay(O, 180, 330, 'gold'));
      S.get('ang').to({ fillOp: 1.1 }, 300);
      await turn(S, 'OB', 235, 1300);
    },
    async after(ctx) { await ctx.wait(300); clearGhosts(); },
  });

  /* ===================================================== 11 & 12 — quick checks */
  function angleCard(deg, zone) {
    const m = Mini.make();
    // reflex checks need room below the vertex for the 180°–360° zone
    const O = zone[0] === 180 ? { x: 150, y: 112 } : { x: deg > 100 ? 175 : 100, y: 190 };
    m.zone(O, zone[0], zone[1], 96, zone[2]);
    m.arc(O, 0, deg, 52, 'gold');
    m.ray(O, 0, 140, 'cyan', { plain: true }).ray(O, deg, zone[0] === 180 ? 112 : 132, 'mag', { plain: true }).v(O);
    return m.svg(300, 230);
  }
  function checkScreen(def) {
    return {
      id: def.id, chapter: 1, topic: 'QUICK CHECK', topicShort: def.short, cfu: true, title: def.title,
      async run(ctx, S) {
        S.keep([]);
        UI.setFocus(800, 500);
        ctx.state('DEMONSTRATE');
        const cards = await Lab.cardRow(ctx, def.cards.map(c => ({ id: c.id, head: `<em>${c.deg}°</em>`, svg: angleCard(c.deg, def.zone) })), { y: 500, width: 330 });
        await ctx.say(this.title);
        ctx.ready(); ctx.check(false);
        cards.onSelect = () => ctx.enableCheck(true);
        ctx.idle(() => cards.cards.forEach((c, i) => setTimeout(() => c.animate([{ transform: 'none' }, { transform: 'translateY(-6px)' }, { transform: 'none' }], { duration: 500 }), i * 120)));
        for (; ;) {
          await ctx.waitCheck();
          const v = cards.value;
          if (v === def.correct) break;
          // show the valid range on the chosen diagram instead of a cross
          cards.card(v).classList.add('bad');
          cards.svg(v).classList.add('show-zone');
          await ctx.bad(def.hint[v]);
          ctx.state('AWAIT_CHECK');
        }
        cards.lock(def.correct);
        cards.cards.forEach(c => c.querySelector('svg').classList.remove('show-zone'));
        cards.svg(def.correct).classList.add('show-zone');
        await ctx.good(def.good);
        ctx.complete();
      },
    };
  }

  const S11 = checkScreen({
    id: 'S11', short: 'Check: obtuse', title: 'Which angle is *obtuse?*',
    cards: [{ id: 'A', deg: 45 }, { id: 'B', deg: 125 }, { id: 'C', deg: 220 }], correct: 'B',
    zone: [90, 180, '90°–180°'],
    hint: { A: '45° is less than 90°. Obtuse lies *between 90° and 180°.*', C: '220° is more than 180°. Obtuse lies *between 90° and 180°.*' },
    good: '125° is more than 90° and less than 180° — *obtuse.*',
  });
  const S12 = checkScreen({
    id: 'S12', short: 'Check: reflex', title: 'Which angle is *reflex?*',
    cards: [{ id: 'A', deg: 95 }, { id: 'B', deg: 180 }, { id: 'C', deg: 230 }], correct: 'C',
    zone: [180, 360, '180°–360°'],
    hint: { A: '95° is less than 180°. Reflex is *more than a straight angle.*', B: '180° is exactly *straight.* Reflex is more than 180°.' },
    good: '230° is between 180° and 360° — *reflex.*',
  });

  Engine.register([S06, S07, S08, S09, S10, S11, S12]);
})();
