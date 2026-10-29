/* Boot: scaling, ambient background, start. */
(function () {
  const stage = document.getElementById('stage');

  // proportional 16:9 scaling of the whole experience. The visual viewport is the
  // truth on phones (browser bars, pinch, on-screen keyboard); small scales lift the
  // finest text a step (#stage.small)
  function fit() {
    const vv = window.visualViewport;
    if (vv && vv.scale > 1.01) return;   // the learner is pinch-zooming: hold the fit, don't fight it
    const w = vv ? vv.width : window.innerWidth, h = vv ? vv.height : window.innerHeight;
    const s = Math.min(w / 1600, h / 900);
    stage.style.setProperty('--s', s);
    stage.classList.toggle('small', s < 0.6);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  fit();
  document.getElementById('bPortrait').addEventListener('click', () => document.body.classList.add('portrait-ok'));

  // a few slow floating luminance motes (very subtle)
  const motes = document.getElementById('bgMotes');
  for (let i = 0; i < 8; i++) {
    const m = document.createElement('i');
    m.style.left = (80 + Math.random() * 1440) + 'px';
    m.style.top = (300 + Math.random() * 560) + 'px';
    m.style.animationDuration = (9 + Math.random() * 10) + 's';
    m.style.animationDelay = (-Math.random() * 15) + 's';
    motes.appendChild(m);
  }

  const scene = new Scene(document.getElementById('geo'));
  window.scene = scene;
  Engine.init(scene);

  // ?s=N jumps straight to a screen (QA / teacher use); &novo disables voice
  const q = new URLSearchParams(location.search);
  if (q.has('novo')) Voice.enabled = false;

  const start = document.getElementById('start');

  // start screen: a few motes drift up through the art, and the art follows the pointer slightly
  const sm = document.getElementById('startMotes');
  for (let i = 0; i < 18; i++) {
    const m = document.createElement('i');
    m.style.left = (4 + Math.random() * 92) + '%';
    m.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(0) + 'px');
    m.style.animationDuration = (7 + Math.random() * 7).toFixed(1) + 's';
    m.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's';
    const s = 2 + Math.random() * 3; m.style.width = m.style.height = s.toFixed(1) + 'px';
    sm.appendChild(m);
  }
  stage.addEventListener('pointermove', e => {
    if (start.classList.contains('gone')) return;
    const r = stage.getBoundingClientRect();
    start.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    start.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });

  document.getElementById('bStart').addEventListener('click', () => {
    Sound.init();
    Voice.unlock();          // inside the Begin gesture, so tablets allow narration later
    Voice.prefetch();        // clips download in lesson order while the first line plays
    start.classList.add('gone');
    setTimeout(() => start.classList.remove('done'), 900);
    Engine.go(0, 1);
  });

  if (q.has('s')) {
    start.classList.add('gone');
    Engine.go(Math.max(0, Math.min(Engine.screens.length - 1, (+q.get('s') || 1) - 1)), 1);
  }
})();
