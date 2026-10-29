/* Persistent HTML layer — tags, readouts and equations that carry from one
   screen to the next (shared-element continuity).
   Items are addressed by id. Setting an id that already exists moves and
   restyles it in place (CSS transitions do the motion); new markup crossfades.
   Each screen declares the ids it inherits (screen.persist); everything else
   fades out as the screen is entered, so BACK and map jumps rebuild the same
   state deterministically. An item may follow the geometry with anchor(). */
(function () {
  const layer = document.getElementById('persist');
  const items = new Map();

  function place(it) {
    const p = it.anchor ? it.anchor() : it;
    it.el.style.left = p.x + 'px'; it.el.style.top = p.y + 'px';
  }
  Tween.onFrame(() => { for (const it of items.values()) if (it.anchor) place(it); });

  const P = {
    /** create or update an item: { html, x, y, cls, anchor } */
    set(id, { html, x = 800, y = 450, cls = '', anchor = null } = {}) {
      let it = items.get(id);
      if (it && html != null && it.html !== html) { P.drop(id, 260); it = null; }
      const fresh = !it;
      if (fresh) {
        const el = document.createElement('div');
        el.dataset.id = id;
        el.innerHTML = html;
        layer.appendChild(el);
        it = { id, el, html };
        items.set(id, it);
      }
      it.x = x; it.y = y; it.anchor = anchor; it.cls = cls;
      if (fresh) {
        it.el.className = 'pi ' + cls + (anchor ? ' anch' : '');
        place(it);
        requestAnimationFrame(() => requestAnimationFrame(() => { if (items.get(id) === it) it.el.classList.add('in'); }));
      } else {
        it.el.className = 'pi in ' + cls + (anchor ? ' anch' : '');
        place(it);
      }
      return it.el;
    },
    el: id => items.get(id)?.el || null,
    has: id => items.has(id),
    q: (id, sel) => items.get(id)?.el.querySelector(sel) || null,
    qa: (id, sel) => [...(items.get(id)?.el.querySelectorAll(sel) || [])],
    /** add/remove element-level classes without resetting the item */
    cls(id, add = '', remove = '') {
      const it = items.get(id); if (!it) return;
      remove.split(' ').filter(Boolean).forEach(c => it.el.classList.remove(c));
      add.split(' ').filter(Boolean).forEach(c => it.el.classList.add(c));
    },
    drop(id, dur = 300) {
      const it = items.get(id); if (!it) return;
      items.delete(id);
      it.el.classList.remove('in'); it.el.classList.add('out');
      setTimeout(() => it.el.remove(), dur);
    },
    /** keep only these ids */
    keep(ids = []) { const k = new Set(ids); for (const id of [...items.keys()]) if (!k.has(id)) P.drop(id); },
  };
  window.P = P;
})();
