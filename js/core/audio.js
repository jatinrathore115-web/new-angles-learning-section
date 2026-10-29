/* Sound manager — a small reusable SFX vocabulary synthesized with WebAudio.
   Every event is throttled so rapid dragging never spams audio. SFX sit
   well below narration volume. */
(function () {
  let ctx = null, master = null, noiseBuf = null;
  let enabled = true;
  const last = {};
  const MIN_GAP = {
    'ui.hover': 90, 'ui.select': 80, 'geometry.point': 120, 'geometry.draw': 140,
    'geometry.rotateMilestone': 140, 'geometry.arc': 120, 'equation.snap': 90,
    'answer.correct': 400, 'answer.incorrect': 400, 'proof.resolve': 600,
    'transition.soft': 300, 'chapter.complete': 800, 'drag.tick': 60,
    'servo': 260, 'snap.lock': 160, 'vertex.pulse': 140, 'discover': 700, 'cancel': 200,
    'equation.resolve': 300, 'mission.ready': 1500,
  };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.42;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function env(g, t, a, peak, dec, sustain = 0.0001) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(sustain, t + a + dec);
  }

  function tone(freq, { type = 'sine', t = 0, a = 0.005, dec = 0.25, vol = 0.2, glide = null, detune = 0 } = {}) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now); o.detune.value = detune;
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, now + a + dec);
    env(g, now, a, vol, dec);
    o.connect(g).connect(master);
    o.start(now); o.stop(now + a + dec + 0.05);
  }

  function noise({ t = 0, dur = 0.3, vol = 0.12, f0 = 800, f1 = 3000, q = 1.2, type = 'bandpass', a = 0.02 } = {}) {
    const now = ctx.currentTime + t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, now); f.frequency.exponentialRampToValueAtTime(f1, now + dur);
    const g = ctx.createGain(); env(g, now, a, vol, dur);
    src.connect(f).connect(g).connect(master);
    src.start(now); src.stop(now + dur + a + 0.05);
  }

  const SOUNDS = {
    'ui.hover': () => tone(1800, { dec: 0.05, vol: 0.025 }),
    'ui.select': () => { tone(880, { dec: 0.08, vol: 0.07, type: 'triangle' }); tone(1320, { t: 0.03, dec: 0.08, vol: 0.04 }); },
    'geometry.point': () => { tone(2093, { dec: 0.35, vol: 0.09 }); tone(3136, { t: 0.01, dec: 0.25, vol: 0.04 }); },
    'geometry.draw': () => { noise({ dur: 0.45, vol: 0.07, f0: 600, f1: 4200, q: 2.2 }); tone(330, { a: 0.02, dec: 0.45, vol: 0.05, glide: 990, type: 'triangle' }); },
    'geometry.arc': () => { noise({ dur: 0.32, vol: 0.05, f0: 2000, f1: 900, q: 3 }); tone(660, { a: 0.03, dec: 0.3, vol: 0.04, glide: 880 }); },
    'geometry.rotateMilestone': () => tone(1567, { dec: 0.07, vol: 0.06, type: 'triangle' }),
    'drag.tick': () => tone(2400, { dec: 0.02, vol: 0.012 }),
    'equation.snap': () => { tone(1200, { dec: 0.04, vol: 0.1, type: 'square' }); tone(600, { t: 0.012, dec: 0.08, vol: 0.06, type: 'triangle' }); },
    'proof.resolve': () => {
      [261.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, { t: i * 0.05, a: 0.02, dec: 1.1, vol: 0.07, type: 'triangle' }));
      tone(1046.5, { t: 0.3, dec: 0.9, vol: 0.05 });
    },
    'transition.soft': () => noise({ dur: 0.5, vol: 0.05, f0: 300, f1: 2400, q: 0.7, a: 0.12 }),
    // quiet servo sweep that lasts as long as the ray turns
    'servo': (o = {}) => {
      const d = Math.max(0.25, Math.min(1.6, (o.dur || 700) / 1000));
      tone(170, { a: 0.06, dec: d, vol: 0.035, glide: o.down ? 120 : 290, type: 'triangle' });
      noise({ dur: d, vol: 0.022, f0: o.down ? 1400 : 500, f1: o.down ? 500 : 1400, q: 4, a: 0.08 });
    },
    // magnetic lock: a low thump under a short bright click
    'snap.lock': () => {
      tone(190, { dec: 0.2, vol: 0.13, glide: 95 });
      tone(1500, { t: 0.005, dec: 0.035, vol: 0.05, type: 'square' });
      noise({ t: 0.004, dur: 0.06, vol: 0.04, f0: 5000, f1: 2500, q: 1, type: 'highpass', a: 0.003 });
    },
    'vertex.pulse': () => tone(520, { a: 0.01, dec: 0.32, vol: 0.06, glide: 1040 }),
    'discover': () => {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, { t: i * 0.065, a: 0.01, dec: 0.55, vol: 0.04, type: 'triangle' }));
      noise({ t: 0.1, dur: 0.6, vol: 0.016, f0: 5000, f1: 9000, q: 0.7, type: 'highpass' });
    },
    'cancel': () => { tone(880, { dec: 0.16, vol: 0.04, glide: 330, type: 'triangle' }); noise({ dur: 0.14, vol: 0.03, f0: 3000, f1: 800, q: 1.5 }); },
    'equation.resolve': () => { tone(659.25, { a: 0.01, dec: 0.45, vol: 0.06 }); tone(987.77, { t: 0.06, a: 0.01, dec: 0.55, vol: 0.05 }); },
    'mission.ready': () => {
      [196, 293.66, 392, 587.33, 783.99, 1174.66].forEach((f, i) => tone(f, { t: i * 0.09, a: 0.03, dec: 1.6, vol: 0.06, type: 'triangle' }));
      tone(98, { a: 0.05, dec: 1.4, vol: 0.09 });
      noise({ t: 0.35, dur: 1.2, vol: 0.02, f0: 4000, f1: 9000, q: 0.6, type: 'highpass' });
    },
    'chapter.complete': () => {
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, { t: i * 0.11, a: 0.02, dec: 1.2, vol: 0.07, type: 'triangle' }));
      noise({ t: 0.5, dur: 1, vol: 0.025, f0: 4000, f1: 9000, q: 0.6, type: 'highpass' });
    },
  };

  /* Answer feedback uses the project's recorded effects (assets/sfx). An audio
     element (not fetch/WebAudio) so it also works when opened from disk.
     start: skips the file's leading silence so the reward lands on the answer. */
  const FILES = {
    'answer.correct': { src: 'assets/sfx/correct.mp3', start: 1.0, vol: 0.5 },
    'answer.incorrect': { src: 'assets/sfx/incorrect.mp3', start: 0.08, vol: 0.6 },
  };
  const fileEls = {};
  let ducked = false;
  const fileEl = name => {
    if (!fileEls[name]) { const a = new Audio(FILES[name].src); a.preload = 'auto'; fileEls[name] = a; }
    return fileEls[name];
  };
  Object.keys(FILES).forEach(fileEl);   // preload

  const Sound = {
    init,
    play(name, opts) {
      if (!enabled) return;
      const now = performance.now();
      if (last[name] && now - last[name] < (MIN_GAP[name] || 80)) return;
      if (FILES[name]) {
        last[name] = now;
        const f = FILES[name], a = fileEl(name);
        try { a.pause(); a.currentTime = f.start; } catch (e) { }
        a.volume = f.vol * (ducked ? 0.6 : 1);
        const p = a.play(); if (p && p.catch) p.catch(() => { });
        return;
      }
      if (!ctx) return;
      last[name] = now;
      try { SOUNDS[name] && SOUNDS[name](opts); } catch (e) { /* audio is non-critical */ }
    },
    /** effects sit under the voice: duck while narration plays, restore after */
    duck(on) {
      ducked = on;
      for (const [name, a] of Object.entries(fileEls)) a.volume = FILES[name].vol * (on ? 0.6 : 1);
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(on ? 0.2 : 0.42, ctx.currentTime, 0.25);
    },
    set enabled(v) { enabled = v; },
    get enabled() { return enabled; },
  };
  window.Sound = Sound;
})();
