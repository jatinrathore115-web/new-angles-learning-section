/* HTML UI layer: narration line, panel, choices, equations,
   token transfer, dock and chapter transitions. */
(function () {
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const overlay = $('overlay');

  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /** element rect in stage coordinates (stage is CSS-scaled) */
  function rectOf(el) {
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const k = s.width / 1600;
    const x = (r.left - s.left) / k, y = (r.top - s.top) / k, w = r.width / k, hh = r.height / k;
    return { x, y, w, h: hh, cx: x + w / 2, cy: y + hh / 2 };
  }

  /* ---------------------------------------------------- narration line
     The single primary text element of every screen. It carries the
     narrator's current step, the task prompt and feedback. *word* marks
     a highlighted keyword. */
  /** words of a line, keeping *emphasis*: [{ w, em, key }] (key: lower-case, no trailing punctuation) */
  function wordsOf(src) {
    const out = [];
    src.split(/(\*[^*]+\*)/).filter(Boolean).forEach(part => {
      const em = /^\*.*\*$/.test(part);
      (em ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean).forEach(w => out.push({ w, em, key: w.toLowerCase().replace(/[.,;:?!’'"—]+$/g, '').replace(/^['"‘]+/, '') }));
    });
    return out;
  }
  function headingHTML(src) { return wordsOf(src).map(o => o.em ? `<em>${o.w}</em>` : o.w).join(' '); }

  /* Word-by-word narration. Each word rises in when the narrator reaches it:
     with a recorded clip the pace comes from the clip length (character-weighted),
     without one a calm narrator pace is used. line() returns the schedule so the
     screen can fire geometry cues on the exact words that name them. */
  const lineEl = $('heading');
  let lineTok = 0, lineKey = '', sched = null;
  function line(text, { tone = '', dur = null } = {}) {
    const key = tone + '|' + text;
    if (key === lineKey && sched) return sched;
    lineKey = key;
    const tok = ++lineTok;
    const words = wordsOf(text);
    const lead = lineEl.innerHTML ? 200 : 0;               // the previous line lifts away first
    const chars = words.reduce((n, o) => n + o.w.length + 1, 0) || 1;
    const perChar = dur ? Math.max(14, (dur - 0.35) * 1000 / chars) : 0;
    let at = dur ? 140 : 60;
    const times = words.map(o => {
      const t = at;
      at += dur ? (o.w.length + 1) * perChar : 150 + (/[,;:—]$/.test(o.w) ? 160 : /[.?!]$/.test(o.w) ? 220 : 0);
      return { key: o.key, t };
    });
    sched = { start: performance.now() + lead * Tween.TS, lead, times, end: at, text, tone };
    current = { text, tone };
    stopFollow();
    const show = () => {
      if (tok !== lineTok) return;
      const badge = tone === 'good' ? '<i class="tb good"></i>' : tone === 'warn' ? '<i class="tb warn"></i>' : '';
      const n = text.replace(/\*/g, '').length;
      lineEl.className = 'heading ' + tone + (n > 70 ? ' xlong' : n > 46 ? ' long' : '');
      lineEl.innerHTML = `<span class="ln">${badge}${words.map((o, i) => `<span class="w" style="transition-delay:${Math.round(times[i].t * Tween.TS)}ms">${o.em ? `<em>${o.w}</em>` : o.w}</span>`).join(' ')}</span>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (tok === lineTok) lineEl.classList.add('in'); }));
      // the word being spoken right now carries a soft highlight (the reader's place-keeper)
      const ws = [...lineEl.querySelectorAll('.w')];
      times.forEach((t, i) => follow.push(setTimeout(() => {
        if (tok !== lineTok) return;
        ws.forEach((w, j) => w.classList.toggle('cur', j === i));
      }, t.t * Tween.TS)));
      follow.push(setTimeout(() => { if (tok === lineTok) ws.forEach(w => w.classList.remove('cur')); }, (at + 260) * Tween.TS));
    };
    if (lead) { lineEl.classList.remove('in'); lineEl.classList.add('out'); setTimeout(show, lead * Tween.TS); }
    else show();
    return sched;
  }
  let follow = [], current = null;
  function stopFollow() { follow.forEach(clearTimeout); follow = []; }
  function clearLine() { stopFollow(); lineTok++; lineKey = ''; sched = null; current = null; lineEl.classList.remove('in'); lineEl.classList.add('out'); }
  /** the line on screen now (for replay) */
  function currentLine() { return current; }
  /** show the current line again from its first word (replay) */
  function restartLine(dur) { if (!current) return null; const c = current; lineKey = ''; return line(c.text, { tone: c.tone, dur }); }

  const panel = $('panel'), panelBody = $('panelBody');

  /* ------------------------------------------------------------- panel */
  const Panel = {
    el: panel, body: panelBody,
    set(html) {
      panelBody.innerHTML = html;
      panel.classList.add('on');
      return panelBody;
    },
    async reveal(sel = '.rv', gap = 110) {
      const items = [...panelBody.querySelectorAll(sel)];
      for (const it of items) { it.classList.add('in'); await Tween.sleep(gap); }
    },
    off() { panel.classList.remove('on'); },
    isOn() { return panel.classList.contains('on'); },
    q: s => panelBody.querySelector(s),
    qa: s => [...panelBody.querySelectorAll(s)],
  };

  /* ----------------------------------------------------------- choices */
  function choices(container, options, { onChange } = {}) {
    const wrap = h('<div class="choices" role="radiogroup"></div>');
    container.appendChild(wrap);
    let sel = null;
    const btns = options.map(o => {
      const b = h(`<button class="choice" role="radio" aria-checked="false" data-id="${o.id}">${o.html}</button>`);
      b.addEventListener('click', () => {
        if (b.classList.contains('locked')) return;
        btns.forEach(x => { x.classList.remove('sel', 'bad'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('sel'); b.setAttribute('aria-checked', 'true');
        sel = o.id; Sound.play('ui.select');
        onChange && onChange(sel);
      });
      b.addEventListener('pointerenter', () => Sound.play('ui.hover'));
      wrap.appendChild(b);
      return b;
    });
    return {
      el: wrap,
      get value() { return sel; },
      async show(gap = 120) { for (const b of btns) { b.classList.add('in'); await Tween.sleep(gap); } },
      mark(id, cls) { const b = btns.find(x => x.dataset.id === id); if (b) { b.classList.remove('bad'); void b.offsetWidth; b.classList.add(cls); } },
      lock(correctId) { btns.forEach(b => { b.classList.add('locked'); if (b.dataset.id !== correctId) b.classList.add('faded'); else b.classList.add('ok'); }); },
      clear() { btns.forEach(b => b.classList.remove('bad')); },
    };
  }

  /* --------------------------------------------------------- overlay */
  function ov(html, { x, y, center = false, cls = '' } = {}) {
    const e = h(html);
    if (cls) e.classList.add(...cls.split(' '));
    e.style.left = x + 'px'; e.style.top = y + 'px';
    if (center) e.classList.add('center');
    overlay.appendChild(e);
    return e;
  }
  function clearOverlay() { [...overlay.children].forEach(c => c.remove()); }
  async function fadeOverlay(dur = 300) {
    const items = [...overlay.children];
    items.forEach(c => { c.style.transition = `opacity ${dur}ms`; c.style.opacity = 0; });
    await Tween.sleep(dur);
    items.forEach(c => c.remove());
  }
  const inNext = el => requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));

  /* ---------------------------------------------- EQUATION TRANSFER */
  /** a measure token lifts from a stage point and snaps into a target element */
  function fly(text, from, toEl, { dur = 750, onArrive, cls = '' } = {}) {
    const t = h(`<div class="flytok ${cls}">${text}</div>`);
    overlay.appendChild(t);
    t.style.left = from.x + 'px'; t.style.top = from.y + 'px';
    const to = rectOf(toEl);
    return Tween.animate(dur, (k) => {
      const x = G.lerp(from.x, to.cx, k), y = G.lerp(from.y, to.cy, k) - Math.sin(k * Math.PI) * 70;
      t.style.left = x + 'px'; t.style.top = y + 'px';
      t.style.transform = `translate(-50%,-50%) scale(${1 + Math.sin(k * Math.PI) * 0.12})`;
    }, Ease.inOutCubic).then(() => {
      Sound.play('equation.snap');
      t.remove();
      onArrive && onArrive();
    });
  }

  /* ---------------------------------------------------------- dropdown
     Answer picker: a trigger in the equation + a menu of three options
     floated on the stage (so panels never clip it). Choosing gives instant
     feedback; a wrong option is crossed out so the next try is informed. */
  const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let openPick = null;
  function pickHTML(key = '') {
    return `<button type="button" class="pick" data-pick="${key}" aria-haspopup="listbox" aria-expanded="false"><span class="pick-val">?</span><span class="pick-ic">${CHEV}</span></button>`;
  }
  /** opts: { options:[n,n,n], correct, unit:'°', label, onResult(ok, v), onOpen() } */
  function pick(trigger, opts) {
    const unit = opts.unit ?? '°';
    const val = trigger.querySelector('.pick-val'), ic = trigger.querySelector('.pick-ic');
    const wrong = new Set();
    let menu = null, ok = false, revert = null;
    trigger.setAttribute('aria-label', `${opts.label || 'Choose an answer'}: not answered`);

    const position = () => {
      const r = rectOf(trigger);
      menu.style.width = Math.max(r.w + 40, 190) + 'px';
      const below = r.y + r.h + 14 + menu.offsetHeight < 856;
      // no room below: open as a slim row above, so it never hides the figure being worked on
      if (!below) { menu.classList.add('row'); menu.style.width = 'auto'; }
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      const x = G.clamp(r.cx - mw / 2, 36, 1564 - mw);
      menu.style.left = x + 'px';
      menu.style.top = (below ? r.y + r.h + 14 : r.y - 14 - mh) + 'px';
      menu.classList.toggle('up', !below);
      menu.style.setProperty('--caret', (r.cx - x) + 'px');
    };
    const close = (focusBack = false) => {
      if (!menu) return;
      const m = menu; menu = null; openPick = null;
      m.classList.remove('in'); m.classList.add('out');
      setTimeout(() => m.remove(), 170);
      trigger.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false');
      if (focusBack) trigger.focus();
    };
    const choose = v => {
      close();
      clearTimeout(revert);
      val.textContent = v + unit;
      trigger.classList.remove('bad');
      if (v === opts.correct) {
        ok = true;
        trigger.classList.add('ok'); trigger.disabled = true; ic.innerHTML = TICK;
        trigger.setAttribute('aria-label', `${opts.label || 'Answer'}: ${v}${unit}, correct`);
        correct();
      } else {
        wrong.add(v);
        void trigger.offsetWidth; trigger.classList.add('bad');
        trigger.setAttribute('aria-label', `${opts.label || 'Answer'}: ${v}${unit} is not correct, try again`);
        revert = setTimeout(() => { if (!ok) { val.textContent = '?'; trigger.classList.remove('bad'); } }, 1400);
      }
      opts.onResult && opts.onResult(v === opts.correct, v);
    };
    const open = () => {
      if (ok || trigger.disabled) return;
      if (openPick && openPick !== api) openPick.close();
      if (menu) { close(); return; }
      menu = h(`<div class="pmenu" role="listbox" aria-label="${opts.label || 'Options'}">${opts.options.map((v, i) =>
        `<button type="button" class="popt ${wrong.has(v) ? 'wrong' : ''}" role="option" data-v="${v}" ${wrong.has(v) ? 'aria-disabled="true" tabindex="-1"' : ''} style="--d:${i * 45}ms"><i>${wrong.has(v) ? '✕' : ''}</i><b>${v}${unit}</b></button>`).join('')}</div>`);
      stage.appendChild(menu);
      position();
      openPick = api;
      trigger.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => menu && menu.classList.add('in'));
      Sound.play('ui.select');
      const items = [...menu.querySelectorAll('.popt:not(.wrong)')];
      menu.addEventListener('click', e => { const b = e.target.closest('.popt'); if (b && !b.classList.contains('wrong')) choose(+b.dataset.v); });
      menu.addEventListener('pointerover', e => { if (e.target.closest('.popt:not(.wrong)')) Sound.play('ui.hover'); });
      menu.addEventListener('keydown', e => {
        const i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(true); }
      });
      setTimeout(() => items[0] && items[0].focus({ preventScroll: true }), 30);
      opts.onOpen && opts.onOpen();
    };
    trigger.addEventListener('click', open);
    trigger.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } });
    const api = { el: trigger, get ok() { return ok; }, open, close, choose, hint() { trigger.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-in-out' }); } };
    trigger.__pick = api;
    return api;
  }
  function closePicks() { if (openPick) openPick.close(); }
  // tap anywhere else closes the open menu
  document.addEventListener('pointerdown', e => {
    if (openPick && !e.target.closest('.pmenu') && e.target.closest('.pick') !== openPick.el) openPick.close();
  }, true);

  /* ---------------------------------------------------------- dock */
  const bCheck = $('bCheck'), bNext = $('bNext'), bBack = $('bBack');
  const Dock = {
    check: bCheck, next: bNext, back: bBack,
    setCheck(visible, enabled = false) { bCheck.classList.toggle('hidden', !visible); bCheck.disabled = !enabled; },
    enableCheck(v) { bCheck.disabled = !v; },
    setNext(enabled, pulse = false) { bNext.disabled = !enabled; bNext.classList.toggle('pulse', !!pulse && enabled); },
  };

  /* --------------------------------------------- chapter / challenge */
  async function chapter(k, t) {
    const c = $('chapter');
    $('chapterK').textContent = k; $('chapterT').textContent = t;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    Sound.play('transition.soft');
    await Tween.sleep(1150);
  }

  /* ------------------------------------------------- answer feedback
     One place for right/wrong feedback so every screen behaves the same:
     correct  → assets/sfx/correct.mp3 + the angle rain;
     incorrect → assets/sfx/incorrect.mp3 only (the geometry gives the clue,
     the narration line gives the hint). Passive screens never call these. */

  /* ANGLE RAIN — small colourful angle glyphs fall from above the frame.
     The layer sits *behind* the geometry, equations, narration and controls,
     so it can never cover them; most pieces fall in the side lanes. Transform/
     opacity only, cached glyph markup, everything is removed within ~2 s. */
  const fall = h('<div class="fall" aria-hidden="true"></div>');
  stage.appendChild(fall);
  const RAIN_COLORS = ['#35E7FF', '#FF48D7', '#FFD84A', '#A66CFF', '#38F2B2'];
  const RAIN_KINDS = [35, 60, 90, 125, 180];
  const GLYPHS = {};
  function glyph(deg, color) {
    const k = deg + color;
    if (GLYPHS[k]) return GLYPHS[k];
    const O = { x: deg === 180 ? 28 : 6, y: 30 }, L = 24, p = G.at(O, deg, L);
    const mark = deg === 90
      ? `<path d="M${O.x + 8} ${O.y} V${O.y - 8} H${O.x}" fill="none" stroke="${color}" stroke-width="2.4"/>`
      : `<path d="${G.arcPath(O, 10, 0, deg, true)}" fill="${color}" fill-opacity=".3" stroke="${color}" stroke-width="2.2"/>`;
    return (GLYPHS[k] = `<svg viewBox="0 0 ${deg === 180 ? 56 : 36} 36"><g stroke-linecap="round">${mark}
      <line x1="${O.x}" y1="${O.y}" x2="${O.x + L}" y2="${O.y}" stroke="${color}" stroke-width="4.2"/>
      <line x1="${O.x}" y1="${O.y}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${color}" stroke-width="4.2"/>
      <circle cx="${O.x}" cy="${O.y}" r="2.8" fill="#fff"/></g></svg>`);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  let lastRain = 0;
  function rain({ small = false } = {}) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const now = performance.now();
    if (now - lastRain < 900) return;
    lastRain = now;
    const n = small ? 30 : 46;
    const frag = document.createDocumentFragment();
    let longest = 0;
    for (let i = 0; i < n; i++) {
      // 80 % in the side lanes, the rest anywhere (still behind the figure)
      const side = Math.random() < 0.72;
      const x = side ? (i % 2 ? rnd(2, 27) : rnd(73, 98)) : rnd(28, 72);
      const size = rnd(24, 42), dur = rnd(1.2, 1.65), delay = rnd(0, 0.3);
      const r0 = Math.round(rnd(0, 360)), spin = (Math.random() < 0.5 ? -1 : 1) * rnd(90, 260);
      const el = document.createElement('i');
      el.className = 'fa';
      el.style.cssText = `left:${x.toFixed(1)}%;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;--op:${rnd(0.75, 1).toFixed(2)};--r0:${r0}deg;--r1:${r0 + spin}deg;--sway:${rnd(-50, 50).toFixed(0)}px;animation-duration:${dur.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s`;
      el.innerHTML = glyph(RAIN_KINDS[i % RAIN_KINDS.length], RAIN_COLORS[(i * 7 + (Math.random() * 5 | 0)) % RAIN_COLORS.length]);
      frag.appendChild(el);
      longest = Math.max(longest, dur + delay);
    }
    const batch = [...frag.children];
    fall.appendChild(frag);
    setTimeout(() => batch.forEach(el => el.remove()), longest * 1000 + 100);
  }
  function correct(opts) { Sound.play('answer.correct'); rain(opts); }
  function incorrect() { Sound.play('answer.incorrect'); }

  function toStage(evt) {
    const s = stage.getBoundingClientRect(), k = s.width / 1600;
    return { x: (evt.clientX - s.left) / k, y: (evt.clientY - s.top) / k };
  }

  function setFocus(x, y) { const f = $('bgFocus'); f.style.left = (x - 380) + 'px'; f.style.top = (y - 380) + 'px'; }

  window.UI = { h, rectOf, toStage, line, clearLine, currentLine, restartLine, correct, incorrect, rain, wordsOf, Panel, choices, ov, clearOverlay, fadeOverlay, inNext, fly, pickHTML, pick, closePicks, Dock, chapter, setFocus, headingHTML };
})();
