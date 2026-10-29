/* PHASE 1 — FOUNDATION CALIBRATION (screens 1–5)
   Point → segment → ray → line, a matching check, then one ray turning
   away from another to form an angle. The ray OA built here is carried,
   unbroken, into every angle screen that follows. */
(function () {
  const { reveal, turn, tag } = Lab;

  /* shared angle figure (screens 3–10): fixed arm OA, turning arm OB */
  // hero angle: ~520 px base arm, 330 px turning arm. The vertex sits at y 580 so a
  // 90° arm clears the narration; reflex screens lift it (camera focus) to keep the arm on stage.
  const AO = { x: 600, y: 605 };
  function angleFig(S, { b = null, arc = true, o = AO } = {}) {
    const keep = ['O', 'OA'];
    S.vertex('O', { ...o, label: 'O', labelAngle: null, size: 1.3, ring: 0, dim: 0, color: 'cyan' });
    S.ray('OA', { from: 'O', angle: 0, len: 520, color: 'cyan', label: 'A', labelOp: 1, dim: 0, width: 6 });
    if (b !== null) {
      keep.push('OB');
      const fresh = !S.has('OB');
      S.ray('OB', { from: 'O', len: 330, color: 'mag', label: 'B', labelOp: 1, dim: 0, width: 6, ...(fresh ? { angle: b } : {}) });
    }
    if (arc && b !== null) {
      keep.push('ang');
      S.arc('ang', { at: 'O', from: 'OA', to: 'OB', r: 118, color: 'gold', label: '', labelOp: 0, minor: false, fillOp: 0.7, dim: 0, ring: 0, sub: '', rightMark: true });
    }
    S.keep(keep);
    UI.setFocus(o.x + 160, o.y - 90);
  }
  Lab.angleFig = angleFig;
  Lab.AO = AO;

  /* ===================================================== 1 */
  const S01 = {
    id: 'S01', chapter: 0, topic: 'GEOMETRY OBJECTS', topicShort: 'Point, segment, ray, line',
    title: 'Geometry starts with a few simple *objects.*',
    async run(ctx, S) {
      S.keep([]);
      const y = 470;
      UI.setFocus(800, y);
      ctx.state('DEMONSTRATE');
      await ctx.say(this.title);

      // each object is built on the word that names it
      // 1. a single point materialises
      S.vertex('P', { x: 800, y, label: '', size: 2.2 });
      await ctx.say('A *point* marks an exact position.', { cues: {
        point: () => S.show('P'),
        position: () => { Sound.play('vertex.pulse'); S.ripple(S.pt('P'), 'white', 0.8); return S.pulse('P', 700); },
      } });

      // 2. the point duplicates: two endpoints, and a segment grows between them
      S.vertex('Q', { x: 800, y, label: '', size: 2.2 });
      S.seg('M', { x1: 470, y1: y, x2: 1130, y2: y, color: 'white', width: 7 });
      let split;
      await ctx.say('Two endpoints make a *line segment.*', { cues: {
        'two endpoints': () => (split = (async () => {
          S.show('Q');
          S.get('P').to({ x: 470, size: 1.6 }, 700, Ease.inOutCubic);
          await S.get('Q').to({ x: 1130, size: 1.6 }, 700, Ease.inOutCubic);
        })()),
        'line segment': async () => { await split; await S.show('M', { dur: 650 }); },
      } });

      // 3. one endpoint lets go and becomes an arrow: a ray
      await ctx.say('A *ray* starts at one point and goes on in one direction.', { cues: {
        ray: () => { S.hide('Q', 260); S.pulse('M', 600); },
        'one point': () => { S.get('P').to({ ring: 1 }, 200); return S.pulse('P', 700); },
        'one direction': async () => {
          S.get('P').to({ ring: 0 }, 300);
          Sound.play('geometry.draw');
          await S.get('M').to({ x2: 1390, arrow2: 1 }, 800, Ease.outCubic);
        },
      } });

      // 4. the other side extends too: a line
      await ctx.say('A *line* goes on in both directions.', { cues: {
        line: () => S.hide('P', 260),
        'both directions': async () => {
          Sound.play('geometry.draw');
          await S.get('M').to({ x1: 210, arrow1: 1 }, 800, Ease.outCubic);
        },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 2 */
  const COLS = [290, 610, 930, 1250], DY = 390, SY = 545, TY = 715;
  const ITEMS = {
    pt: { name: 'Point', obj: 'PT' },
    seg: { name: 'Line segment', obj: 'SEG' },
    ray: { name: 'Ray', obj: 'OA' },
    line: { name: 'Line', obj: 'M' },
  };
  const ORDER = ['pt', 'seg', 'ray', 'line'];   // drawings, left → right
  const TRAY = ['ray', 'pt', 'line', 'seg'];    // name chips (storyboard order)
  const FEEDBACK = {
    pt: 'A *point* has no length — it only marks a position.',
    seg: 'A *line segment* stops at two endpoints.',
    ray: 'A *ray* has exactly one endpoint and one arrow.',
    line: 'A *line* has no endpoints — it goes on both ways.',
  };

  const S02 = {
    id: 'S02', chapter: 0, topic: 'GEOMETRY OBJECTS', topicShort: 'Match: names & drawings', cfu: true,
    title: 'Match each name to its *drawing.*',
    async run(ctx, S) {
      UI.setFocus(800, 470);
      // the line from screen 1 glides into the last column; the others materialise beside it
      S.keep(['M', 'SEG', 'O', 'OA', 'PT']);
      S.seg('M', { x1: COLS[3] - 135, y1: DY, x2: COLS[3] + 135, y2: DY, color: 'white', width: 6.5, arrow1: 1, arrow2: 1, dot1: 0, dot2: 0 });
      S.vertex('PT', { x: COLS[0], y: DY, label: '', size: 2 });
      S.seg('SEG', { x1: COLS[1] - 130, y1: DY, x2: COLS[1] + 130, y2: DY, dot1: 1, dot2: 1, color: 'white', width: 6.5 });
      S.vertex('O', { x: COLS[2] - 130, y: DY, label: '', size: 1.4, ring: 0, dim: 0 });
      S.ray('OA', { from: 'O', angle: 0, len: 262, color: 'cyan', label: '', labelOp: 0, dim: 0, width: 6.5 });
      ctx.state('DEMONSTRATE');
      await ctx.wait(300);
      await reveal(ctx, S, ['M', 'PT', 'SEG', 'O', 'OA'], 140);

      const slots = ORDER.map((k, i) => UI.ov('<div class="dslot">?</div>', { x: COLS[i], y: SY }));
      const homes = TRAY.map((k, i) => ({ x: 410 + i * 260, y: TY }));
      const cards = TRAY.map((k, i) => { const e = UI.ov(`<div class="dlabel hidden0" role="button" tabindex="0" aria-label="${ITEMS[k].name}">${ITEMS[k].name}</div>`, homes[i]); e.dataset.k = k; e.dataset.i = i; return e; });
      for (const c of cards) { c.classList.remove('hidden0'); Sound.play('ui.hover'); await ctx.wait(100); }
      ctx.ready();

      let placed = 0, finish;
      const allDone = ctx.until(r => finish = r);
      const slotAt = p => slots.findIndex((s, j) => !s.classList.contains('done') && Math.abs(p.x - COLS[j]) < 150 && Math.abs(p.y - SY) < 95);
      const glowAt = k => k === 'ray' ? S.pt('O') : k === 'pt' ? S.pt('PT') : { x: COLS[ORDER.indexOf(k)], y: DY };
      const home = card => { const i = +card.dataset.i; card.style.left = homes[i].x + 'px'; card.style.top = homes[i].y + 'px'; };
      const place = (card, j) => {
        const k = card.dataset.k;
        card.style.left = COLS[j] + 'px'; card.style.top = SY + 'px';
        card.style.width = card.offsetWidth + 'px'; card.style.height = card.offsetHeight + 'px';
        void card.offsetWidth;
        card.classList.add('placed'); card.setAttribute('tabindex', '-1');
        card.style.width = ''; card.style.height = '';
        slots[j].classList.add('done');
        if (placed < 3) UI.correct({ small: true });   // the fourth match gets the full celebration below
        // the drawing answers: a short glow on exactly the feature that names it
        S.pulse(ITEMS[k].obj, 800);
        if (k === 'ray') S.pulse('O', 800);
        S.ripple(glowAt(k), 'mint', 0.7);
        if (++placed === 4) finish();
        else ctx.sayNow(FEEDBACK[k], { tone: 'good' });
      };
      const wrong = (card, j) => {
        home(card);
        UI.incorrect();
        const k = ORDER[j];
        S.pulse(ITEMS[k].obj, 700);
        ctx.sayNow(FEEDBACK[k], { tone: 'warn' });   // what that drawing actually shows
      };
      // drag a name onto a drawing — or tap/Enter a name, then tap/Enter a drawing's slot
      // (touch and keyboard); either way the same check runs, nothing is placed for free
      let picked = null;
      const pickCard = card => {
        picked = card === picked ? null : card;
        cards.forEach(c => c.classList.toggle('sel', c === picked));
        slots.forEach(s => s.classList.toggle('ready', !!picked && !s.classList.contains('done')));
        if (picked) Sound.play('ui.select');
      };
      const drop = (card, j) => {
        pickCard(null);
        if (ORDER[j] === card.dataset.k) place(card, j); else wrong(card, j);
      };
      slots.forEach((slot, j) => {
        slot.setAttribute('role', 'button'); slot.setAttribute('tabindex', '0');
        slot.setAttribute('aria-label', `Drawing ${j + 1}: place the chosen name here`);
        const go = () => { if (S.enabled && picked && !slot.classList.contains('done')) drop(picked, j); };
        ctx.on(slot, 'click', go);
        ctx.on(slot, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      cards.forEach(card => {
        let drag = false, off = null, from = null, moved = false;
        ctx.on(card, 'pointerdown', ev => {
          if (!S.enabled || card.classList.contains('placed')) return;
          drag = true; moved = false; card.setPointerCapture(ev.pointerId); card.classList.add('drag');
          const p = UI.toStage(ev); from = p; off = { x: parseFloat(card.style.left) - p.x, y: parseFloat(card.style.top) - p.y };
        });
        ctx.on(card, 'pointermove', ev => {
          if (!drag) return;
          const p = UI.toStage(ev), q = { x: p.x + off.x, y: p.y + off.y };
          if (!moved && Math.hypot(p.x - from.x, p.y - from.y) < 10) return;   // a tap, not a drag (yet)
          if (!moved) { moved = true; Sound.play('ui.select'); pickCard(null); }
          card.style.left = q.x + 'px'; card.style.top = q.y + 'px';
          const j = slotAt(q); slots.forEach((s, n) => s.classList.toggle('over', n === j));
        });
        const up = () => {
          if (!drag) return;
          drag = false; card.classList.remove('drag');
          slots.forEach(s => s.classList.remove('over'));
          if (!moved) { pickCard(card); return; }
          const j = slotAt({ x: parseFloat(card.style.left), y: parseFloat(card.style.top) });
          if (j < 0) { home(card); return; }
          drop(card, j);
        };
        ctx.on(card, 'pointerup', up); ctx.on(card, 'pointercancel', up);
        ctx.on(card, 'keydown', e => {
          if ((e.key !== 'Enter' && e.key !== ' ') || card.classList.contains('placed') || !S.enabled) return;
          e.preventDefault();
          pickCard(card);
          if (picked) slots.find(s => !s.classList.contains('done'))?.focus();
        });
      });
      ctx.idle(() => { const c = cards.find(c => !c.classList.contains('placed')); if (c) c.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(-50%,-60%)' }, { transform: 'translate(-50%,-50%)' }], { duration: 700, easing: 'ease-in-out' }); });

      await allDone;
      ctx.state('CORRECT');
      UI.correct();
      await ctx.say('All matched — *endpoints* and *arrows* tell them apart.', { tone: 'good' });
      ctx.complete();
    },
  };

  /* ===================================================== 3 */
  const S03 = {
    id: 'S03', chapter: 0, topic: 'FORMING AN ANGLE', topicShort: 'Two rays from O', holdTitle: true,
    title: 'Two rays begin at the same point *O.*',
    async run(ctx, S) {
      // the matched ray is carried here and becomes the angle's fixed arm; a second ray
      // OB starts at the same point and, for now, lies along OA (screen 4 turns it open)
      angleFig(S, { b: 0, arc: false });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, ['O', 'OA']);
      if (S.get('OB').st.prog > 0.99 && Math.abs(G.delta(S.get('OB').st.angle, 0)) > 0.5) await turn(S, 'OB', 0, 500);   // BACK from screen 4
      await ctx.say(this.title, { cues: {
        'two rays': () => { S.show('OB', { dur: 550 }); Sound.play('geometry.draw'); return S.pulseMany(['OA', 'OB'], 700); },
        // the shared starting point is the one thing to notice
        'point o': async () => {
          Sound.play('vertex.pulse');
          S.get('O').to({ ring: 1, color: 'gold' }, 250);
          S.ripple(S.pt('O'), 'gold', 0.8);
          await S.pulse('O', 900);
        },
      } });
      S.get('O').to({ ring: 0, color: 'cyan' }, 400);
      ctx.complete();
    },
  };

  /* ===================================================== 4 */
  const S04 = {
    id: 'S04', chapter: 0, topic: 'FORMING AN ANGLE', topicShort: 'One ray turns', holdTitle: true,
    title: 'When one ray turns, the two rays form an *angle.*',
    async run(ctx, S) {
      angleFig(S, { b: 0 });
      const OB = S.get('OB');
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, ['O', 'OA']);
      if (OB.st.prog > 0.99) await turn(S, 'OB', 0, 500);   // replay from a closed angle
      // a second ray grows out of O along OA ("one ray"), turns away ("turns"),
      // both arms glow ("two rays"), and the opening is named ("angle")
      let grown, turned;
      await ctx.say(this.title, { cues: {
        'one ray': () => (grown = S.show('OB', { dur: 550 })),
        turns: async () => {
          await grown;
          S.get('ang').to({ prog: 1 }, 0);
          S.get('ang').st.op = 1;
          await (turned = turn(S, 'OB', 55, 1300, Ease.inOutCubic));
        },
        'two rays': async () => { await turned; return S.pulseMany(['OA', 'OB'], 700); },
        angle: async () => { await turned; S.get('ang').to({ fillOp: 1.4 }, 300); Sound.play('geometry.arc'); return S.pulse('ang', 800); },
      } });
      ctx.complete();
    },
  };

  /* ===================================================== 5 */
  const S05 = {
    id: 'S05', chapter: 0, topic: 'FORMING AN ANGLE', topicShort: 'Vertex and arms', holdTitle: true,
    title: 'O is called the *vertex*, and OA and OB are the *arms.*',
    async run(ctx, S) {
      angleFig(S, { b: 55 });
      ctx.state('DEMONSTRATE');
      await reveal(ctx, S, ['O', 'OA', 'OB', 'ang']);
      if (Math.abs(G.delta(S.get('OB').st.angle, 55)) > 0.5) await turn(S, 'OB', 55, 600);
      const O = () => S.pt('O');
      await ctx.say(this.title, { cues: {
        // VERTEX: the shared point lights; its name appears right beside it
        vertex: () => {
          Sound.play('vertex.pulse');
          S.get('O').to({ ring: 1, color: 'gold' }, 250);
          tag('tVertex', 'VERTEX', { color: 'gold', anchor: () => ({ x: O().x - 30, y: O().y + 78 }) });
          return S.pulse('O', 900);
        },
        // ARMS: each ray is traced outward from O as it is named
        oa: () => { S.get('O').to({ ring: 0 }, 300); return S.trace([O(), S.get('OA').tip(true)], { color: 'cyan', dur: 600, hold: 250 }); },
        ob: () => S.trace([O(), S.get('OB').tip(true)], { color: 'mag', dur: 600, hold: 250 }),
        arms: () => {
          tag('tArmA', 'ARM', { color: 'cyan', anchor: () => { const p = G.at(O(), 0, 330); return { x: p.x, y: p.y + 42 }; } });
          tag('tArmB', 'ARM', { color: 'mag', anchor: () => { const p = G.at(O(), 55, 220); return { x: p.x - 78, y: p.y }; } });
          S.pulseMany(['OA', 'OB'], 700);
        },
      } });
      ctx.complete();
    },
  };

  Engine.register([S01, S02, S03, S04, S05]);
})();
