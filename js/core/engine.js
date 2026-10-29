/* Screen runner + state machine.
   Each screen is a data object { id, chapter, topic, title, cfu, run(ctx, S) };
   title is the screen's first narration line.
   ctx guards every await: when the learner leaves a screen, its timeline aborts
   cleanly and can never touch the next screen. */
(function () {
  const ABORT = Symbol('abort');
  const STATES = ['ENTER', 'INTRO', 'DEMONSTRATE', 'READY', 'INTERACTING', 'AWAIT_CHECK', 'CORRECT', 'INCORRECT', 'EXPLAIN', 'COMPLETE', 'EXIT'];
  const LIVE = new Set(['READY', 'INTERACTING', 'AWAIT_CHECK', 'INCORRECT', 'COMPLETE']);

  // mission phases: a quiet contextual motif, never extra teaching text
  const CHAPTERS = [
    { k: 'PHASE 01', t: 'FOUNDATION CALIBRATION' },
    { k: 'PHASE 02', t: 'ANGLE CLASSIFICATION' },
    { k: 'PHASE 03', t: 'RELATIONSHIP ANALYSIS' },
    { k: 'PHASE 04', t: 'ADJACENCY SCAN' },
    { k: 'PHASE 05', t: 'LINEAR PAIR CALIBRATION' },
    { k: 'PHASE 06', t: 'CONVERSE TEST' },
    { k: 'PHASE 07', t: 'INTERSECTION ANALYSIS' },
    { k: 'PHASE 08', t: 'PROOF SEQUENCE' },
    { k: 'PHASE 09', t: 'FIELD APPLICATION' },
    { k: 'PHASE 10', t: 'MISSION READY' },
  ];

  const stage = document.getElementById('stage');
  let lastInput = performance.now();
  stage.addEventListener('pointerdown', () => { lastInput = performance.now(); }, true);
  stage.addEventListener('keydown', () => { lastInput = performance.now(); }, true);

  class Ctx {
    constructor(engine, screen) {
      this.engine = engine; this.screen = screen; this.S = engine.scene;
      this.alive = true; this.cleanups = []; this._check = null; this._state = 'ENTER';
      this.data = {};
    }
    /** guard a promise: throws ABORT if the screen was left meanwhile */
    $(p) { return Promise.resolve(p).then(v => { if (!this.alive) throw ABORT; return v; }); }
    wait(ms) { return this.$(Tween.sleep(ms)); }
    beat() { return this.wait(MOTION.beat); }

    state(s) {
      if (!STATES.includes(s)) throw new Error('bad state ' + s);
      this._state = s;
      stage.dataset.state = s;
      this.S.enabled = LIVE.has(s);
    }
    get st() { return this._state; }

    /** narration line synced with VO; resolves when the voice and its cues finish.
        opts.cues = { 'word': fn, 'two rays': fn, 'arm#2': fn } — each fn runs the
        moment the narrator reaches that word (multi-word phrases match in order,
        '#n' picks the n-th occurrence), so the narration drives the geometry. */
    async say(text, opts = {}) {
      if (!this.alive) throw ABORT;
      const sc = UI.narrate(text, { tone: opts.tone || '' });
      const cues = this.cues(sc, opts.cues);
      await this.$(sc.promise);
      await this.$(cues);
      await this.wait(opts.after ?? 160);
    }
    /** run each cue when the line's clock (the voice itself) reaches its word */
    cues(sc, cues) {
      if (!cues || !sc) return Promise.resolve();
      const jobs = [];
      for (const [k, fn] of Object.entries(cues)) {
        const [phrase, n] = k.split('#'), nth = +n || 1;
        const parts = phrase.toLowerCase().split(/\s+/);
        let idx = -1, count = 0;
        for (let i = 0; i <= sc.times.length - parts.length; i++) {
          if (parts.every((p, j) => sc.times[i + j].key === p) && ++count === nth) { idx = i; break; }
        }
        if (idx < 0) { console.warn(`[${this.screen.id}] cue "${k}" not in line`); continue; }
        const at = sc.times[idx].t;
        jobs.push(new Promise(res => {
          let off = null;
          const fire = () => {
            off && off(); off = null;
            if (!this.alive) return res();
            Promise.resolve().then(fn).catch(() => { }).then(res);
          };
          if (sc.clock() >= at) fire();
          else off = Tween.onFrame(() => { if (!this.alive || sc.clock() >= at) fire(); });
          this.cleanups.push(() => { off && off(); off = null; res(); });
        }));
      }
      return Promise.all(jobs);
    }
    /** narrate and run an animation in sync: the animation starts `delay` ms
        into the line, and the beat ends when both have finished */
    async sayDo(text, fn, delay = 250, opts = {}) {
      const p = this.say(text, opts);
      await this.wait(delay);
      await this.$(fn());
      await p;
    }
    /** say without waiting for it to finish */
    sayNow(text, opts = {}) { this.say(text, opts).catch(() => { }); }

    /** correct / incorrect feedback: sound + one explanatory sentence */
    async good(text, opts = {}) {
      this.state('CORRECT');
      UI.correct();
      await this.say(text, Object.assign({ tone: 'good' }, opts));
    }
    async bad(text, opts = {}) {
      this.state('INCORRECT');
      UI.incorrect();
      await this.say(text, Object.assign({ tone: 'warn' }, opts));
    }

    ready() { this.state('READY'); }

    /** Check button lifecycle */
    check(enabled = false) { UI.Dock.setCheck(true, enabled); }
    enableCheck(v = true) { UI.Dock.enableCheck(v); if (v && this._state === 'READY') this.state('AWAIT_CHECK'); }
    waitCheck() {
      // a CHECK pressed while the previous hint was still being spoken is answered now
      if (this._checkQueued) { this._checkQueued = false; return this.$(Promise.resolve()); }
      return this.$(new Promise(res => { this._check = () => { this._check = null; res(); }; }));
    }

    /** completes the screen: Next unlocks and gently pulses */
    complete() {
      this.state('COMPLETE');
      UI.Dock.setCheck(false);
      this.engine.markDone(this.screen.id);
      UI.Dock.setNext(true, true);
    }

    /** a correct prediction flows straight into the screen that explains it */
    async advance(ms = 650) {
      this.complete();
      await this.wait(ms);
      this.engine.next();
    }

    /** subtle idle hint (never changes the problem) */
    idle(fn, ms = 10000) {
      const t = setInterval(() => {
        if (!this.alive) return;
        if (!['READY', 'INTERACTING', 'AWAIT_CHECK', 'INCORRECT'].includes(this._state)) return;
        if (performance.now() - lastInput > ms) { lastInput = performance.now(); fn(); }
      }, 1000);
      this.cleanups.push(() => clearInterval(t));
    }
    on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); this.cleanups.push(() => el.removeEventListener(ev, fn, opt)); }
    /** resolve when predicate(event detail) passes; used for taps */
    until(register) { return this.$(new Promise(res => register(res))); }

    abort() {
      this.alive = false;
      this.state('EXIT');
      this.cleanups.forEach(f => { try { f(); } catch (e) { } });
      this.cleanups = [];
      Voice.stop();
    }
  }

  const Engine = {
    screens: [],
    idx: -1,
    ctx: null,
    nav: 0,
    done: new Set(),
    CHAPTERS,
    ABORT,

    register(list) { this.screens.push(...list); },

    init(scene) {
      this.scene = scene;
      UI.Dock.check.addEventListener('click', () => {
        const ctx = this.ctx;
        if (!ctx) return;
        Sound.play('ui.select');
        if (ctx._check) ctx._check();
        // pressed while a wrong-answer hint is still being spoken: keep the press and
        // answer it as soon as the hint ends (the new feedback line cuts the hint short)
        else if (ctx.st === 'INCORRECT') { ctx._checkQueued = true; Voice.stop(false); }
      });
      UI.Dock.next.addEventListener('click', () => this.next());
      UI.Dock.back.addEventListener('click', () => this.go(this.idx - 1, -1));
      document.getElementById('bReplay').addEventListener('click', () => this.replay());
      this.buildMap();
    },

    /** replay the narration line on screen: words and voice start again together
        (one audio element, so a replay simply restarts it — voices never overlap) */
    replay() {
      if (!UI.currentLine()) return;
      Sound.play('ui.select');
      UI.replayLine();
    },

    markDone(id) { this.done.add(id); this.refreshMap(); },

    next() {
      if (this.idx >= this.screens.length - 1) { this.finish(); return; }
      this.go(this.idx + 1, 1);
    },

    async go(i, dir = 1) {
      if (i < 0 || i >= this.screens.length) return;
      const prevScreen = this.screens[this.idx];
      if (this.ctx) this.ctx.abort();
      const token = ++this.nav;
      const scr = this.screens[i];
      this.idx = i;
      stage.dataset.state = 'ENTER';
      this.scene.enabled = false;
      this.scene.clearInteractions();
      UI.clearLine();
      UI.closePicks();
      UI.fadeOverlay(260);
      UI.Panel.off();
      UI.Dock.setCheck(false);
      UI.Dock.setNext(this.done.has(scr.id), false);
      UI.Dock.back.disabled = i === 0;
      Sound.play('transition.soft');
      this.progress(i);
      stage.classList.toggle('quiet', !!scr.quiet);

      // carried items stay; the rest of the persistent layer fades as the screen begins
      P.keep(scr.persist || []);
      const chapterChanged = !prevScreen || prevScreen.chapter !== scr.chapter;
      if (chapterChanged && dir > 0) {
        const ch = CHAPTERS[scr.chapter];
        UI.clearLine();
        await UI.chapter(ch.k, ch.t);
      }
      if (token !== this.nav) return;

      const ctx = new Ctx(this, scr);
      this.ctx = ctx;
      ctx.state('INTRO');
      // the title is the screen's first narration line: it starts speaking as the figure
      // builds, and the screen's own say(title) joins the same clip instead of restarting it
      // holdTitle: the title is a move-a-ray instruction, said by the screen itself once
      // the figure is ready, so the words and the ray demo start together
      if (!scr.holdTitle) ctx.sayNow(scr.title);
      try {
        await scr.run(ctx, this.scene);
      } catch (e) {
        if (e !== ABORT) console.error(`[${scr.id}]`, e);
      }
    },

    progress(i) {
      const scr = this.screens[i];
      document.getElementById('pNum').textContent = String(i + 1).padStart(2, '0');
      document.getElementById('pTot').textContent = this.screens.length;
      document.getElementById('pTopic').textContent = scr.topic;
      document.getElementById('pBar').style.width = ((i + 1) / this.screens.length * 100) + '%';
      this.refreshMap();
    },

    /** end of the lesson: back to the start art with a 'lesson complete' ribbon; Start plays again */
    finish() {
      if (this.ctx) this.ctx.abort();
      const st = document.getElementById('start');
      st.classList.add('done');
      st.classList.remove('gone');
      document.getElementById('bStart').setAttribute('aria-label', 'Start the lesson again');
      P.keep([]);
      this.scene.clear(400);
    },

    buildMap() {
      const grid = document.getElementById('mapGrid');
      const map = document.getElementById('map');
      grid.innerHTML = CHAPTERS.map((c, ci) => `<div class="map-col"><h4>${c.t}</h4>${this.screens.map((s, i) => s.chapter === ci ? `<button data-i="${i}" title="${Voice.plain(s.title || '').replace(/"/g, '&quot;')}"><b>${String(i + 1).padStart(2, '0')}</b>${s.topicShort || s.topic}</button>` : '').join('')}</div>`).join('');
      grid.addEventListener('click', e => {
        const b = e.target.closest('button[data-i]');
        if (!b) return;
        map.hidden = true;
        this.go(+b.dataset.i, 1);
      });
      document.getElementById('progress').addEventListener('click', () => { map.hidden = false; this.refreshMap(); });
      document.getElementById('mapClose').addEventListener('click', () => map.hidden = true);
    },
    refreshMap() {
      document.querySelectorAll('#mapGrid button[data-i]').forEach(b => {
        const s = this.screens[+b.dataset.i];
        b.classList.toggle('done', this.done.has(s.id));
        b.classList.toggle('cur', +b.dataset.i === this.idx);
      });
    },
  };

  window.Engine = Engine;
})();
