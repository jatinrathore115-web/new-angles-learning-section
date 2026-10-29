/* GeometryStage — persistent SVG scene.
   Objects are addressed by id and "ensured": asking for an object that already
   exists morphs it to its new state (geometry carry), otherwise it is created
   hidden and later revealed with show(). All measures are derived from the
   actual ray directions every frame, so diagrams can never lie. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const COL = {
    cyan: { core: '#35E7FF', glow: '#00CFFF', fill: 'rgba(53,231,255,.18)' },
    blue: { core: '#5aaeff', glow: '#2f7bff', fill: 'rgba(47,123,255,.22)' },
    gold: { core: '#FFD84A', glow: '#FFB800', fill: 'rgba(255,216,74,.20)' },
    mag: { core: '#FF48D7', glow: '#FF1FCB', fill: 'rgba(255,72,215,.22)' },
    violet: { core: '#A66CFF', glow: '#8A4DFF', fill: 'rgba(166,108,255,.24)' },
    mint: { core: '#38F2B2', glow: '#10D995', fill: 'rgba(56,242,178,.20)' },
    orange: { core: '#ffb347', glow: '#ff8a00', fill: 'rgba(255,154,31,.24)' },
    coral: { core: '#FF667A', glow: '#FF3D57', fill: 'rgba(255,102,122,.24)' },
    white: { core: '#F5F8FF', glow: '#8FD8FF', fill: 'rgba(245,248,255,.12)' },
    dim: { core: '#7088B8', glow: '#3A5AA0', fill: 'rgba(156,182,216,.10)' },
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // set attribute only when it changed (render runs every frame)
  function A(e, k, v) {
    const c = e.__c || (e.__c = {});
    if (c[k] === v) return;
    c[k] = v; e.setAttribute(k, v);
  }
  function T(e, s) { if (e.__t !== s) { e.__t = s; e.textContent = s; } }
  const f2 = n => (Math.round(n * 100) / 100).toString();
  const C = c => COL[c] || COL.cyan;

  /* ---------------------------------------------------------------- base */
  class Obj {
    constructor(scene, id, type, defaults, props) {
      this.scene = scene; this.id = id; this.type = type;
      this.st = Object.assign({ op: 1, hl: 0, hov: 0 }, defaults, props);
      this.els = [];
    }
    mk(layer, tag, attrs) { const e = el(tag, attrs, this.scene.L[layer]); this.els.push(e); return e; }
    /** set props: numbers tween (dur>0), everything else is immediate */
    to(props, dur = MOTION.concept, ease = Ease.inOutCubic) {
      const nums = {};
      for (const k in props) {
        if (typeof props[k] === 'number' && typeof this.st[k] === 'number' && dur > 0) nums[k] = props[k];
        else { this.st[k] = props[k]; if (this.st.__tw) delete this.st.__tw[k]; }
      }
      return Tween.tween(this.st, nums, dur, ease, { angle: ['angle'] });
    }
    destroy() { this.els.forEach(e => e.remove()); this.els = []; this.dead = true; if (this.hitEl) this.hitEl = null; }
  }

  /* -------------------------------------------------------------- vertex */
  class Vertex extends Obj {
    constructor(scene, id, props) {
      super(scene, id, 'vertex', { x: 0, y: 0, op: 0, label: '', labelOp: 1, labelAngle: null, labelDist: 34, color: 'cyan', size: 1.2, ring: 0, dim: 0 }, props);
      this.halo = this.mk('vtx', 'circle', { fill: 'none' });
      this.ringEl = this.mk('fxb', 'circle', { fill: 'none', 'stroke-width': 2.5, 'stroke-dasharray': '6 8' });
      this.core = this.mk('vtx', 'circle', { fill: '#fff' });
      this.lbl = this.mk('lbl', 'text', { class: 'lbl-pt', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      this._la = 225;
    }
    render() {
      const s = this.st, c = C(s.color);
      const k = 1 + s.hl * 0.9 + s.hov * 0.3;
      const op = s.op * (1 - s.dim * 0.55);
      A(this.halo, 'cx', f2(s.x)); A(this.halo, 'cy', f2(s.y));
      A(this.halo, 'r', f2(13 * k * s.size));
      A(this.halo, 'stroke', c.glow); A(this.halo, 'stroke-width', f2(3 + s.hl * 3));
      A(this.halo, 'opacity', f2(op * (0.45 + s.hl * 0.5)));
      A(this.core, 'cx', f2(s.x)); A(this.core, 'cy', f2(s.y));
      A(this.core, 'r', f2(6.5 * (1 + s.hl * 0.35) * s.size)); A(this.core, 'opacity', f2(op));
      A(this.core, 'fill', s.color === 'gold' ? '#ffe23a' : '#fff');
      A(this.ringEl, 'cx', f2(s.x)); A(this.ringEl, 'cy', f2(s.y)); A(this.ringEl, 'r', '30');
      A(this.ringEl, 'stroke', '#ffd426'); A(this.ringEl, 'opacity', f2(s.ring * s.op));
      A(this.ringEl, 'stroke-dashoffset', f2((performance.now() / 40) % 14));
      // collision-aware label: sits in the widest gap between incident rays
      let target = s.labelAngle;
      if (target == null) target = this.scene.widestGap(this.id, s);
      this._la = this._la + G.delta(this._la, target) * 0.18;
      const p = G.at(s, this._la, s.labelDist);
      A(this.lbl, 'x', f2(p.x)); A(this.lbl, 'y', f2(p.y));
      T(this.lbl, s.label || '');
      A(this.lbl, 'opacity', f2(op * s.labelOp));
      if (this.hitEl) { A(this.hitEl, 'cx', f2(s.x)); A(this.hitEl, 'cy', f2(s.y)); }
    }
  }

  /* ----------------------------------------------------------------- ray */
  class Ray extends Obj {
    constructor(scene, id, props) {
      super(scene, id, 'ray', {
        from: 'O', angle: 0, len: 300, prog: 0, color: 'cyan', label: '', labelOp: 0, arrow: 1,
        width: 5.5, dim: 0, handle: 0, handleAt: 0.82, hs: 0, dash: 0, base: 0,
      }, props);
      this.glow = this.mk('rayg', 'line', { 'stroke-linecap': 'round' });
      this.core = this.mk('ray', 'line', { 'stroke-linecap': 'round' });
      this.arr = this.mk('ray', 'path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      this.tracer = this.mk('fxf', 'circle', { r: 7, fill: '#fff' });
      this.lbl = this.mk('lbl', 'text', { class: 'lbl-pt', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    }
    origin() { return this.scene.pt(this.st.from); }
    tip(full) { const s = this.st; return G.at(this.origin(), s.angle, s.base + (s.len - s.base) * (full ? 1 : s.prog)); }
    render() {
      const s = this.st, c = C(s.color), O = this.origin();
      const start = G.at(O, s.angle, s.base);
      const tip = this.tip();
      const vis = s.op * (1 - s.dim * 0.7) * (s.prog > 0.001 ? 1 : 0);
      const w = s.width * (1 + s.hl * 0.6 + s.hov * 0.25);
      for (const e of [this.glow, this.core]) {
        A(e, 'x1', f2(start.x)); A(e, 'y1', f2(start.y)); A(e, 'x2', f2(tip.x)); A(e, 'y2', f2(tip.y));
      }
      A(this.core, 'stroke', c.core); A(this.core, 'stroke-width', f2(w)); A(this.core, 'opacity', f2(vis));
      A(this.core, 'stroke-dasharray', s.dash ? '10 12' : 'none');
      A(this.glow, 'stroke', c.glow); A(this.glow, 'stroke-width', f2(12 + s.hl * 12)); A(this.glow, 'opacity', f2(vis * (0.14 + s.hl * 0.26)));
      const af = s.arrow * G.clamp((s.prog - 0.9) / 0.1, 0, 1);
      if (af > 0) {
        const p1 = G.at(tip, s.angle + 152, 23), p2 = G.at(tip, s.angle - 152, 23);
        A(this.arr, 'd', `M${f2(p1.x)} ${f2(p1.y)} L${f2(tip.x)} ${f2(tip.y)} L${f2(p2.x)} ${f2(p2.y)}`);
      }
      A(this.arr, 'stroke', c.core); A(this.arr, 'stroke-width', f2(w)); A(this.arr, 'opacity', f2(vis * af));
      const tr = s.prog > 0.01 && s.prog < 0.99 ? 1 : 0;
      A(this.tracer, 'cx', f2(tip.x)); A(this.tracer, 'cy', f2(tip.y)); A(this.tracer, 'opacity', f2(tr * s.op));
      A(this.tracer, 'style', `filter: drop-shadow(0 0 8px ${c.glow})`);
      const lp = G.at(O, s.angle, s.len * s.prog + 34);
      A(this.lbl, 'x', f2(lp.x)); A(this.lbl, 'y', f2(lp.y)); T(this.lbl, s.label || '');
      A(this.lbl, 'opacity', f2(s.op * s.labelOp * (s.prog > 0.95 ? 1 : 0)));
      if (this.hitEl) {
        const full = this.tip(true), a = G.at(O, s.angle, Math.max(s.base, 20));
        A(this.hitEl, 'x1', f2(a.x)); A(this.hitEl, 'y1', f2(a.y)); A(this.hitEl, 'x2', f2(full.x)); A(this.hitEl, 'y2', f2(full.y));
      }
      if (this.hg) {
        const hp = G.at(O, s.angle, s.len * s.handleAt);
        A(this.hg, 'transform', `translate(${f2(hp.x)} ${f2(hp.y)})`);
        A(this.hg, 'opacity', f2(s.handle * s.op));
        A(this.hRing, 'r', f2(14 + s.hs * 5)); A(this.hFill, 'r', f2(8 + s.hs * 3));
        A(this.hHalo, 'r', f2(24 + s.hs * 8)); A(this.hHalo, 'opacity', f2(0.18 + s.hs * 0.22 + s.hl * 0.5));
        A(this.hHit, 'pointer-events', s.handle > 0.5 ? 'all' : 'none');
      }
    }
    ensureHandle() {
      if (this.hg) return;
      this.hg = this.mk('hdl', 'g', {});
      this.hHalo = el('circle', { fill: '#ffb000' }, this.hg);
      this.hRing = el('circle', { fill: 'none', stroke: '#ff8a1f', 'stroke-width': 4, class: 'handle-ring' }, this.hg);
      this.hFill = el('circle', { fill: '#ffd426' }, this.hg);
      this.hHit = el('circle', { r: 34, class: 'hit handle-hit', tabindex: 0, role: 'slider', 'aria-label': `Rotate ray ${this.id}` }, this.hg);
      this.hFocus = el('circle', { r: 30, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '4 5', class: 'handle-focus' }, this.hg);
    }
  }

  /* ------------------------------------------------------------- segment */
  class Segment extends Obj {
    constructor(scene, id, props) {
      super(scene, id, 'segment', { x1: 0, y1: 0, x2: 100, y2: 0, prog: 0, color: 'cyan', dot1: 0, dot2: 0, arrow1: 0, arrow2: 0, width: 5.5 }, props);
      this.glow = this.mk('rayg', 'line', { 'stroke-linecap': 'round' });
      this.core = this.mk('ray', 'line', { 'stroke-linecap': 'round' });
      this.a1 = this.mk('ray', 'path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      this.a2 = this.mk('ray', 'path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      this.d1h = this.mk('vtx', 'circle', { fill: 'none', 'stroke-width': 3 });
      this.d1 = this.mk('vtx', 'circle', { fill: '#fff', r: 6.5 });
      this.d2h = this.mk('vtx', 'circle', { fill: 'none', 'stroke-width': 3 });
      this.d2 = this.mk('vtx', 'circle', { fill: '#fff', r: 6.5 });
      this.tracer = this.mk('fxf', 'circle', { r: 7, fill: '#fff' });
    }
    render() {
      const s = this.st, c = C(s.color);
      const p1 = { x: s.x1, y: s.y1 }, full = { x: s.x2, y: s.y2 };
      const p2 = { x: G.lerp(s.x1, s.x2, s.prog), y: G.lerp(s.y1, s.y2, s.prog) };
      const vis = s.op * (s.prog > 0.001 ? 1 : 0);
      const w = s.width * (1 + s.hl * 0.6);
      for (const e of [this.glow, this.core]) { A(e, 'x1', f2(p1.x)); A(e, 'y1', f2(p1.y)); A(e, 'x2', f2(p2.x)); A(e, 'y2', f2(p2.y)); }
      A(this.core, 'stroke', c.core); A(this.core, 'stroke-width', f2(w)); A(this.core, 'opacity', f2(vis));
      A(this.glow, 'stroke', c.glow); A(this.glow, 'stroke-width', f2(16 + s.hl * 12)); A(this.glow, 'opacity', f2(vis * (0.2 + s.hl * 0.25)));
      const ang = G.angleOf(p1, full);
      const chev = (tip, a) => { const q1 = G.at(tip, a + 152, 19), q2 = G.at(tip, a - 152, 19); return `M${f2(q1.x)} ${f2(q1.y)} L${f2(tip.x)} ${f2(tip.y)} L${f2(q2.x)} ${f2(q2.y)}`; };
      A(this.a2, 'd', chev(full, ang)); A(this.a1, 'd', chev(p1, ang + 180));
      for (const [e, v] of [[this.a1, s.arrow1], [this.a2, s.arrow2 * (s.prog > 0.97 ? 1 : 0)]]) {
        A(e, 'stroke', c.core); A(e, 'stroke-width', f2(w)); A(e, 'opacity', f2(s.op * v));
      }
      const dot = (d, h, p, v) => {
        A(d, 'cx', f2(p.x)); A(d, 'cy', f2(p.y)); A(d, 'opacity', f2(s.op * v));
        A(h, 'cx', f2(p.x)); A(h, 'cy', f2(p.y)); A(h, 'r', f2(13 * (1 + s.hl * .6))); A(h, 'stroke', c.glow); A(h, 'opacity', f2(s.op * v * .5));
      };
      dot(this.d1, this.d1h, p1, s.dot1); dot(this.d2, this.d2h, full, s.dot2 * (s.prog > 0.97 ? 1 : 0));
      const tr = s.prog > 0.01 && s.prog < 0.99 ? 1 : 0;
      A(this.tracer, 'cx', f2(p2.x)); A(this.tracer, 'cy', f2(p2.y)); A(this.tracer, 'opacity', f2(tr * s.op));
    }
  }

  /* ----------------------------------------------------------- angle arc */
  class Arc extends Obj {
    constructor(scene, id, props) {
      super(scene, id, 'arc', {
        at: 'O', from: 0, to: 90, r: 70, prog: 0, color: 'mag', label: 'auto', labelOp: 0, labelGap: 40,
        minor: false, rightMark: true, fillOp: 1, sub: '', subColor: '#ffd426', ring: 0, labelColor: '#fff', dim: 0,
        val: '', valOp: 0, valGap: 44, valColor: '#fff',
      }, props);
      this.fill = this.mk('arcf', 'path', {});
      this.vl = this.mk('lbl', 'text', { class: 'lbl-val', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      this.glow = this.mk('arcs', 'path', { fill: 'none', 'stroke-linecap': 'round' });
      this.core = this.mk('arcs', 'path', { fill: 'none', 'stroke-linecap': 'round' });
      this.ringEl = this.mk('arcs', 'path', { fill: 'none', 'stroke-width': 3, 'stroke-dasharray': '7 9', 'stroke-linecap': 'round' });
      this.lbl = this.mk('lbl', 'text', { class: 'lbl-ms', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      this.badge = this.mk('lbl', 'g', {});
      this.bRect = el('rect', { rx: 8, height: 26 }, this.badge);
      this.bText = el('text', { class: 'lbl-badge', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, this.badge);
    }
    /** start direction and ccw sweep, derived from the live rays */
    geom() {
      const s = this.st;
      let a0 = this.scene.dirOf(s.from), a1 = this.scene.dirOf(s.to);
      let sw = G.ccw(a0, a1);
      if (s.minor && sw > 180) { const t = a0; a0 = a1; a1 = t; sw = 360 - sw; }
      return { a0, sw };
    }
    get value() { return this.geom().sw; }
    get measure() { return Math.round(this.geom().sw); }
    labelPoint() {
      const s = this.st, { a0, sw } = this.geom();
      let gap = s.labelGap; if (sw < 40) gap += (40 - sw) * 1.4;
      return G.at(this.scene.pt(s.at), a0 + sw / 2, s.r + gap);
    }
    innerPoint(k = 0.62) { const s = this.st, { a0, sw } = this.geom(); return G.at(this.scene.pt(s.at), a0 + sw / 2, s.r * k); }
    render() {
      const s = this.st, c = C(s.color), O = this.scene.pt(s.at);
      const { a0, sw } = this.geom();
      const d = sw * s.prog;
      const vis = s.op * (1 - s.dim * 0.7) * (s.prog > 0.001 ? 1 : 0);
      const isRight = s.rightMark && Math.abs(sw - 90) < 0.01 && s.prog > 0.98;
      let dPath, fPath;
      if (isRight) {
        const m = Math.max(24, s.r * 0.42);
        const p1 = G.at(O, a0, m), p3 = G.at(O, a0 + 90, m), p2 = G.at(p1, a0 + 90, m);
        dPath = `M${f2(p1.x)} ${f2(p1.y)} L${f2(p2.x)} ${f2(p2.y)} L${f2(p3.x)} ${f2(p3.y)}`;
        fPath = `M${f2(O.x)} ${f2(O.y)} L${f2(p1.x)} ${f2(p1.y)} L${f2(p2.x)} ${f2(p2.y)} L${f2(p3.x)} ${f2(p3.y)} Z`;
      } else {
        dPath = G.arcPath(O, s.r, a0, d, false);
        fPath = G.arcPath(O, s.r, a0, d, true);
      }
      A(this.core, 'd', dPath || 'M0 0'); A(this.glow, 'd', dPath || 'M0 0'); A(this.fill, 'd', fPath || 'M0 0');
      A(this.core, 'stroke', c.core); A(this.core, 'stroke-width', f2(3.5 + s.hl * 3 + s.hov * 1.5)); A(this.core, 'opacity', f2(vis));
      A(this.glow, 'stroke', c.glow); A(this.glow, 'stroke-width', f2(10 + s.hl * 10)); A(this.glow, 'opacity', f2(vis * (0.16 + s.hl * 0.3)));
      A(this.fill, 'fill', c.fill); A(this.fill, 'opacity', f2(vis * s.fillOp * (1 + s.hl * 1.2 + s.hov * 0.6)));
      // focus ring (dashed concentric arc)
      A(this.ringEl, 'd', G.arcPath(O, s.r + 16, a0, sw, false) || 'M0 0');
      A(this.ringEl, 'stroke', '#ffd426'); A(this.ringEl, 'opacity', f2(s.ring * s.op));
      A(this.ringEl, 'stroke-dashoffset', f2(-(performance.now() / 30) % 16));
      // measure label on the bisector, outside the arc
      const lp = this.labelPoint();
      const txt = s.label === 'auto' ? `${Math.round(sw)}°` : (s.label || '');
      const lop = s.op * s.labelOp * G.clamp((s.prog - 0.55) / 0.45, 0, 1);
      A(this.lbl, 'x', f2(lp.x)); A(this.lbl, 'y', f2(lp.y)); T(this.lbl, txt);
      // colour as an inline style: the label classes set a CSS fill that would override the attribute
      A(this.lbl, 'opacity', f2(lop * (1 - s.dim * 0.5))); A(this.lbl, 'style', `fill:${s.labelColor}`);
      A(this.lbl, 'class', s.label === 'auto' || /°/.test(txt) ? 'lbl-ms' : 'lbl-num');
      // classification badge
      if (s.sub) {
        const w = s.sub.length * 11.5 + 22;
        A(this.badge, 'transform', `translate(${f2(lp.x)} ${f2(lp.y + 34)})`);
        A(this.bRect, 'x', f2(-w / 2)); A(this.bRect, 'y', '-13'); A(this.bRect, 'width', f2(w));
        A(this.bRect, 'fill', 'rgba(5,16,60,.85)'); A(this.bRect, 'stroke', s.subColor); A(this.bRect, 'stroke-width', '1.5');
        A(this.bText, 'fill', s.subColor); T(this.bText, s.sub);
      }
      A(this.badge, 'opacity', f2(s.sub ? lop : 0));
      // second label: the live measure, further out on the same bisector
      if (s.val) {
        const vp = G.at(O, a0 + sw / 2, s.r + s.labelGap + s.valGap + (sw < 40 ? (40 - sw) * 1.4 : 0));
        A(this.vl, 'x', f2(vp.x)); A(this.vl, 'y', f2(vp.y));
        T(this.vl, s.val === 'auto' ? `${Math.round(sw)}°` : s.val);
        A(this.vl, 'fill', s.valColor);
      }
      A(this.vl, 'opacity', f2(s.val ? s.op * s.valOp * (1 - s.dim * 0.6) * (s.prog > 0.5 ? 1 : 0) : 0));
      if (this.hitEl) A(this.hitEl, 'd', G.arcPath(O, Math.max(s.r * 2.1, 120), a0, sw, true) || 'M0 0');
    }
  }

  /* ------------------------------------------------------------- scene */
  class Scene {
    constructor(svg) {
      this.svg = svg;
      this.objs = new Map();
      this.fx = new Set();
      this.drags = new Map();
      this.enabled = false;
      this.L = {};
      const defs = el('defs', {}, svg);
      for (const n of ['fxb', 'arcf', 'arcs', 'rayg', 'ray', 'fxf', 'vtx', 'lbl', 'hit', 'hdl']) this.L[n] = el('g', { 'data-layer': n }, svg);
      this.L.hit.setAttribute('class', 'hits');
      Tween.onFrame(() => this.render());
    }

    /* lookup helpers */
    get(id) { return this.objs.get(id); }
    has(id) { const o = this.objs.get(id); return !!o && !o.removing; }
    pt(ref) {
      if (typeof ref === 'string') { const v = this.objs.get(ref); return v ? { x: v.st.x, y: v.st.y } : { x: 0, y: 0 }; }
      return ref;
    }
    /** direction of a ray id, or a raw number */
    dirOf(ref) {
      if (typeof ref === 'number') return ref;
      if (typeof ref === 'function') return ref();
      const o = this.objs.get(ref);
      return o ? o.st.angle : 0;
    }
    widestGap(vid, vst) {
      const angs = [];
      for (const o of this.objs.values()) {
        if (o.type === 'ray' && o.st.from === vid && o.st.prog > 0.2 && o.st.op > 0.2) angs.push(G.norm360(o.st.angle));
      }
      if (!angs.length) return 225;
      if (angs.length === 1) return angs[0] + 180 + 30;
      // gaps covered by a visible angle arc are avoided, so the vertex label
      // never collides with an arc or its measure
      const arcs = [];
      for (const o of this.objs.values()) if (o.type === 'arc' && o.st.at === vid && o.st.prog > 0.2 && o.st.op > 0.2) arcs.push(o.geom());
      const covered = m => arcs.some(g => G.ccw(g.a0, m) < g.sw);
      angs.sort((a, b) => a - b);
      let best = -1, at = 0;
      for (let i = 0; i < angs.length; i++) {
        const a = angs[i], b = i === angs.length - 1 ? angs[0] + 360 : angs[i + 1];
        const mid = a + (b - a) / 2;
        const score = (b - a) - (covered(mid) ? 1000 : 0);
        if (score > best || best === -1) { best = score; at = mid; }
      }
      return at;
    }

    /* ensure-style constructors */
    _ensure(Cls, type, id, props) {
      let o = this.objs.get(id);
      if (o && o.type === type && !o.removing) {
        o.isNew = false;
        o.to(props, props.instant ? 0 : MOTION.concept);
        return o;
      }
      if (o) o.destroy();
      o = new Cls(this, id, props); o.isNew = true;
      this.objs.set(id, o);
      return o;
    }
    vertex(id, p) { return this._ensure(Vertex, 'vertex', id, p); }
    ray(id, p) { return this._ensure(Ray, 'ray', id, p); }
    seg(id, p) { return this._ensure(Segment, 'segment', id, p); }
    arc(id, p) { return this._ensure(Arc, 'arc', id, p); }

    /** reveal with the DRAW / ARC REVEAL motion vocabulary */
    async show(id, opt = {}) {
      const o = typeof id === 'string' ? this.objs.get(id) : id;
      if (!o) return;
      if (o.st.op < 1 && o.type !== 'vertex') o.to({ op: 1 }, MOTION.fast);
      if (o.type === 'vertex') {
        if (o.st.op >= 0.99) return;
        Sound.play('geometry.point');
        o.to({ op: 1 }, MOTION.fast, Ease.outCubic);
        this.pulse(o, 520);
        this.ripple(o.st, 'cyan', 0.6);
        return Tween.sleep(opt.wait ?? 260);
      }
      if (o.type === 'ray') {
        if (o.st.prog < 0.999) {
          const v = this.objs.get(o.st.from);
          if (v) this.pulse(v, 420);
          Sound.play('geometry.draw');
          await o.to({ prog: 1 }, opt.dur || MOTION.ray, Ease.outCubic);
        }
        if (o.st.labelOp < 1 && o.st.label) o.to({ labelOp: 1 }, MOTION.fast);
        return;
      }
      if (o.type === 'segment') {
        if (o.st.prog < 0.999) { Sound.play('geometry.draw'); await o.to({ prog: 1 }, opt.dur || MOTION.ray, Ease.outCubic); }
        return;
      }
      if (o.type === 'arc') {
        if (o.st.prog < 0.999) { Sound.play('geometry.arc'); o.to({ labelOp: 1 }, MOTION.fast); await o.to({ prog: 1 }, opt.dur || MOTION.arc, Ease.outCubic); }
        else if (o.st.labelOp < 1) await o.to({ labelOp: 1 }, MOTION.fast);
      }
    }
    async showAll(ids, gap = 120) { for (const id of ids) { this.show(id); await Tween.sleep(gap); } await Tween.sleep(MOTION.ray - gap); }

    hide(id, dur = MOTION.fast) { const o = typeof id === 'string' ? this.objs.get(id) : id; return o ? o.to({ op: 0 }, dur) : Promise.resolve(); }

    /** keep only these ids; everything else fades out and is removed */
    keep(ids, dur = 380) {
      const keepSet = new Set(ids);
      for (const [id, o] of this.objs) {
        if (keepSet.has(id) || o.removing) continue;
        o.removing = true;
        o.to({ op: 0 }, dur).then(() => { if (o.removing) { o.destroy(); if (this.objs.get(id) === o) this.objs.delete(id); } });
      }
      this.clearFx();
      this.clearInteractions();
    }
    clear(dur = 300) { this.keep([], dur); }

    pulse(id, dur = 650) {
      const o = typeof id === 'string' ? this.objs.get(id) : id;
      if (!o) return Promise.resolve();
      return Tween.animate(dur, (e, t) => { o.st.hl = Math.sin(t * Math.PI); }, Ease.linear);
    }
    async pulseMany(ids, dur = 650) { await Promise.all(ids.map(i => this.pulse(i, dur))); }

    render() { for (const o of this.objs.values()) if (!o.dead) o.render(); for (const f of this.fx) f.render && f.render(); }

    /* ------------------------------------------------- effects (fx) */
    ripple(p, color = 'cyan', strength = 1) {
      const c = C(color);
      const e = el('circle', { cx: p.x, cy: p.y, r: 8, fill: 'none', stroke: c.glow, 'stroke-width': 3 }, this.L.fxb);
      const f = { e }; this.fx.add(f);
      Tween.animate(800, (k) => { e.setAttribute('r', 8 + k * 70 * strength); e.setAttribute('opacity', (1 - k) * 0.7); }, Ease.outCubic)
        .then(() => { e.remove(); this.fx.delete(f); });
    }
    burst(p, color = 'mint') {
      const c = C(color);
      this.ripple(p, color, 1.3);
      const parts = [];
      for (let i = 0; i < 10; i++) {
        const a = i * 36 + Math.random() * 20;
        parts.push({ a, d: 40 + Math.random() * 40, e: el('circle', { r: 2.5, fill: c.core }, this.L.fxf) });
      }
      const f = {}; this.fx.add(f);
      Tween.animate(700, k => {
        for (const q of parts) { const pp = G.at(p, q.a, 14 + k * q.d); q.e.setAttribute('cx', pp.x); q.e.setAttribute('cy', pp.y); q.e.setAttribute('opacity', 1 - k); }
      }, Ease.outCubic).then(() => { parts.forEach(q => q.e.remove()); this.fx.delete(f); });
    }
    /** light trace along a polyline. mode 'draw' reveals a glowing path, 'streak' sends a pulse */
    trace(points, { color = 'white', dur = 900, width = 7, hold = 600, mode = 'draw', dotted = false } = {}) {
      const c = C(color);
      const d = points.map((p, i) => `${i ? 'L' : 'M'}${f2(p.x)} ${f2(p.y)}`).join(' ');
      const L = G.polyLen(points);
      const g = el('g', {}, this.L.fxf);
      const glow = el('path', { d, fill: 'none', stroke: c.glow, 'stroke-width': width * 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .35 }, g);
      const core = el('path', { d, fill: 'none', stroke: c.core, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      const f = { g }; this.fx.add(f);
      const seg = mode === 'streak' ? L * 0.28 : L;
      for (const p of [glow, core]) { p.setAttribute('stroke-dasharray', dotted ? '1 14' : `${seg} ${L + seg}`); p.setAttribute('stroke-dashoffset', dotted ? 0 : seg); }
      if (dotted) core.setAttribute('stroke-width', width * 1.4);
      return Tween.animate(dur, k => {
        if (dotted) { g.setAttribute('opacity', Math.min(1, k * 3)); const off = -k * 60; core.setAttribute('stroke-dashoffset', off); glow.setAttribute('opacity', 0); }
        else { const off = mode === 'streak' ? seg - k * (L + seg) : seg * (1 - k); glow.setAttribute('stroke-dashoffset', off); core.setAttribute('stroke-dashoffset', off); }
      }, Ease.inOutCubic).then(() => Tween.sleep(hold)).then(() =>
        Tween.animate(400, k => g.setAttribute('opacity', 1 - k))).then(() => { g.remove(); this.fx.delete(f); });
    }
    /** dashed reference ray (non-interactive hint geometry) */
    ghostRay(O, angle, len, color = 'white') {
      const c = C(color), p = G.at(O, angle, len);
      const e = el('line', { x1: O.x, y1: O.y, x2: p.x, y2: p.y, stroke: c.core, 'stroke-width': 2.5, 'stroke-dasharray': '6 10', 'stroke-linecap': 'round', opacity: 0 }, this.L.fxb);
      const f = { e }; this.fx.add(f);
      Tween.animate(400, k => e.setAttribute('opacity', k * 0.55));
      return () => { Tween.animate(300, k => e.setAttribute('opacity', (1 - k) * 0.55)).then(() => { e.remove(); this.fx.delete(f); }); };
    }
    clearFx() { for (const f of this.fx) { (f.e || f.g) && (f.e || f.g).remove(); } this.fx.clear(); }

    /* ------------------------------------------------- interaction */
    toStage(evt) {
      const p = this.svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
      return p.matrixTransform(this.svg.getScreenCTM().inverse());
    }

    /** ROTATE: make a ray draggable around its vertex.
        opts: constrain(a)→a, snap:[{to,tol}], linked:[{id,offset}], onChange(a), onStart, onEnd */
    drag(rayId, opts = {}) {
      const r = this.objs.get(rayId);
      r.ensureHandle();
      r.to({ handle: 1 }, MOTION.fast);
      const milestones = opts.milestones || [30, 45, 60, 90, 120, 180, 270];
      let dragging = false;
      const apply = (raw) => {
        const prev = r.st.angle;
        let a = Math.round(raw);
        for (const s of opts.snap || []) if (Math.abs(a - s.to) <= s.tol) a = s.to;
        if (opts.constrain) a = opts.constrain(a, prev);
        a = Math.round(a);
        if (a === prev) return;
        const lo = Math.min(prev, a), hi = Math.max(prev, a);
        for (const m of milestones) {
          const mm = opts.milestoneOf ? opts.milestoneOf(m) : m;
          if (mm > lo && mm <= hi || (mm >= lo && mm < hi)) { Sound.play('geometry.rotateMilestone'); break; }
        }
        if (r.st.__tw) delete r.st.__tw.angle;
        r.userMovedAt = performance.now();   // lets a running show-me demo yield to the learner
        r.st.angle = a;
        for (const l of opts.linked || []) { const o = this.objs.get(l.id); if (o) { if (o.st.__tw) delete o.st.__tw.angle; o.st.angle = a + l.offset; } }
        r.hHit.setAttribute('aria-valuenow', Math.round(opts.valueOf ? opts.valueOf(a) : a));
        opts.onChange && opts.onChange(a);
      };
      const down = e => {
        if (!this.enabled) return;
        e.preventDefault(); dragging = true;
        r.hHit.setPointerCapture(e.pointerId);
        r.to({ hs: 1 }, MOTION.micro, Ease.outCubic);
        Sound.play('ui.select');
        opts.onStart && opts.onStart();
      };
      const move = e => {
        if (!dragging) return;
        const p = this.toStage(e), O = r.origin();
        if (G.dist(O, p) < 8) return;
        const raw = G.angleOf(O, p);
        apply(r.st.angle + G.delta(r.st.angle, raw));
      };
      const up = e => {
        if (!dragging) return;
        dragging = false;
        r.to({ hs: 0 }, MOTION.normal, Ease.outBack);
        opts.onEnd && opts.onEnd(r.st.angle);
      };
      const key = e => {
        if (!this.enabled) return;
        const step = e.shiftKey ? 5 : 1;
        let d = 0;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') d = step;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') d = -step;
        if (opts.keyInvert) d = -d;
        if (!d) return;
        e.preventDefault();
        apply(r.st.angle + d);
        opts.onEnd && opts.onEnd(r.st.angle);
      };
      r.hHit.addEventListener('pointerdown', down);
      r.hHit.addEventListener('pointermove', move);
      r.hHit.addEventListener('pointerup', up);
      r.hHit.addEventListener('pointercancel', up);
      r.hHit.addEventListener('keydown', key);
      const ctl = {
        ray: r,
        set(a) { apply(a); },
        stop: (hideHandle = true) => {
          r.hHit.removeEventListener('pointerdown', down);
          r.hHit.removeEventListener('pointermove', move);
          r.hHit.removeEventListener('pointerup', up);
          r.hHit.removeEventListener('pointercancel', up);
          r.hHit.removeEventListener('keydown', key);
          if (hideHandle && !r.dead) r.to({ handle: 0, hs: 0 }, MOTION.fast);
          this.drags.delete(rayId);
        },
        hint: () => this.pulse(r, 900),
      };
      this.drags.set(rayId, ctl);
      return ctl;
    }

    /** EXTEND: drag a handle outward along a ray's direction to grow it */
    extend(rayId, opts = {}) {
      const r = this.objs.get(rayId);
      r.ensureHandle();
      const min = opts.min ?? 0.2, doneAt = opts.done ?? 0.9;
      r.st.handleAt = r.st.prog;
      r.to({ handle: 1 }, MOTION.fast);
      let dragging = false, finished = false;
      const setProg = p => {
        if (r.st.__tw) delete r.st.__tw.prog;
        r.st.prog = G.clamp(p, min, 1); r.st.handleAt = r.st.prog;
        opts.onChange && opts.onChange(r.st.prog);
        if (!finished && r.st.prog >= doneAt) { finished = true; ctl.stop(false); opts.onDone && opts.onDone(); }
      };
      const down = e => { if (!this.enabled) return; e.preventDefault(); dragging = true; r.hHit.setPointerCapture(e.pointerId); r.to({ hs: 1 }, MOTION.micro); Sound.play('ui.select'); };
      const move = e => {
        if (!dragging) return;
        const p = this.toStage(e), O = r.origin(), d = G.dir(r.st.angle);
        setProg(((p.x - O.x) * d.x + (p.y - O.y) * d.y) / r.st.len);
      };
      const up = () => { dragging = false; r.to({ hs: 0 }, MOTION.normal, Ease.outBack); };
      const key = e => {
        if (!this.enabled) return;
        if (['ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setProg(r.st.prog + (/Down|Left/.test(e.key) ? 0.06 : -0.06)); }
      };
      r.hHit.addEventListener('pointerdown', down);
      r.hHit.addEventListener('pointermove', move);
      r.hHit.addEventListener('pointerup', up);
      r.hHit.addEventListener('keydown', key);
      const ctl = {
        stop: (hide = true) => {
          r.hHit.removeEventListener('pointerdown', down); r.hHit.removeEventListener('pointermove', move);
          r.hHit.removeEventListener('pointerup', up); r.hHit.removeEventListener('keydown', key);
          r.to({ handle: 0, hs: 0 }, MOTION.fast);
          this.drags.delete(rayId);
        },
        hint: () => this.pulse(r, 900),
      };
      this.drags.set(rayId, ctl);
      return ctl;
    }

    /** make a vertex / ray / arc tappable */
    tap(id, handler) {
      const o = this.objs.get(id);
      if (!o) return () => { };
      if (o.hitEl) o.hitEl.remove();
      let h;
      if (o.type === 'vertex') h = el('circle', { r: 30, class: 'hit' }, this.L.hit);
      else if (o.type === 'ray') h = el('line', { class: 'hit-line' }, this.L.hit);
      else h = el('path', { class: 'hit' }, this.L.hit);
      if (o.type === 'vertex') this.L.hit.appendChild(h); // vertices above arms
      h.setAttribute('tabindex', 0);
      h.setAttribute('role', 'button');
      h.setAttribute('aria-label', `Select ${id}`);
      o.hitEl = h; o.els.push(h);
      const enter = () => { if (this.enabled) { o.to({ hov: 1 }, MOTION.micro); Sound.play('ui.hover'); } };
      const leave = () => o.to({ hov: 0 }, MOTION.micro);
      const click = e => { if (!this.enabled) return; e.stopPropagation(); handler(o); };
      const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(e); } };
      h.addEventListener('pointerenter', enter); h.addEventListener('pointerleave', leave);
      h.addEventListener('click', click); h.addEventListener('keydown', key);
      if (o.type === 'vertex') { this.L.hit.appendChild(h); }
      return () => { h.remove(); if (o.hitEl === h) o.hitEl = null; o.to({ hov: 0 }, MOTION.micro); };
    }

    clearInteractions() {
      for (const d of [...this.drags.values()]) d.stop();
      for (const o of this.objs.values()) { if (o.hitEl) { o.hitEl.remove(); o.hitEl = null; o.st.hov = 0; } }
    }
  }

  Scene.COL = COL;
  window.Scene = Scene;
})();
