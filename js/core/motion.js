/* Central motion system: timing constants, easing and a tiny tween engine. */
(function () {
  const MOTION = {
    micro: 180,
    fast: 300,
    arc: 400,
    normal: 500,
    ray: 560,
    concept: 700,
    chapter: 1000,
    beat: 220, // gap between conceptual narration beats
  };

  // global time scale (QA only: ?speed=4 runs every timeline 4× faster)
  const TS = 1 / (+(new URLSearchParams(location.search).get('speed')) || 1);

  const Ease = {
    linear: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    pulse: t => Math.sin(t * Math.PI), // 0 → 1 → 0
  };

  /* Tween numeric props of a plain object. A newer tween on the same prop
     replaces the older one, so geometry never fights itself. */
  const active = new Set();
  let running = false;
  const listeners = new Set();

  function frame(now) {
    for (const tw of [...active]) tw.step(now);
    for (const fn of listeners) fn(now);
    requestAnimationFrame(frame);
  }
  if (!running) { running = true; requestAnimationFrame(frame); }

  function tween(target, props, dur = MOTION.normal, ease = Ease.inOutCubic, opts = {}) {
    dur *= TS;
    return new Promise(resolve => {
      const keys = Object.keys(props).filter(k => typeof props[k] === 'number');
      if (!target.__tw) target.__tw = {};
      const from = {}, to = {};
      for (const k of keys) {
        from[k] = typeof target[k] === 'number' ? target[k] : 0;
        to[k] = props[k];
        if (opts.angle && opts.angle.includes(k)) to[k] = from[k] + G.delta(from[k], to[k]);
      }
      const tw = { id: Symbol(), start: performance.now() + (opts.delay || 0) };
      for (const k of keys) target.__tw[k] = tw.id;
      if (dur <= 0) { for (const k of keys) target[k] = to[k]; resolve(); return; }
      tw.step = now => {
        let t = (now - tw.start) / dur;
        if (t < 0) return;
        if (t > 1) t = 1;
        const e = ease(t);
        let alive = false;
        for (const k of keys) {
          if (target.__tw[k] !== tw.id) continue;
          alive = true;
          target[k] = from[k] + (to[k] - from[k]) * e;
        }
        if (!alive || t >= 1) { active.delete(tw); resolve(); }
      };
      active.add(tw);
    });
  }

  /** Animate a value through fn(v) — for one-off effects. */
  function animate(dur, fn, ease = Ease.inOutCubic) {
    dur *= TS;
    return new Promise(res => {
      const start = performance.now();
      const tw = {
        step(now) {
          // rAF timestamps can precede `start` by a frame — clamp to [0, 1]
          let t = Math.max(0, Math.min(1, (now - start) / dur));
          fn(ease(t), t);
          if (t >= 1) { active.delete(tw); res(); }
        }
      };
      active.add(tw);
    });
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms * TS));
  const onFrame = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  window.MOTION = MOTION;
  window.Ease = Ease;
  window.Tween = { tween, animate, sleep, onFrame, TS };
})();
