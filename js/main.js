// KOFULL · orquestación: scroll → un solo timeline (3D + texto) → render.
import { Stage, FLAVORS, mixFlavor } from './stage.js';
import { initialState, keyframes, INGREDIENT_V, FORMULA_STEP } from './scenes.js';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const isMobile = () => innerWidth < 820;
const lowPower = isMobile() || coarse || (navigator.hardwareConcurrency || 8) <= 4;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const body = document.body;
let data = initialState();
let tl = null;
let stage = null;
let lenis = null;
let sceneEls = $$('[data-scene]');
let tops = {};
let maxScroll = 1;
let introDone = false;

// ---------------- Loader ----------------
const loader = { el: $('.loader'), bar: $('.loader__bar i'), pct: $('.loader__pct'), p: 0, shown: 0 };
const setLoad = (p) => { loader.p = Math.max(loader.p, p); };
const loaderTick = () => {
  loader.shown = lerp(loader.shown, loader.p, 0.12);
  loader.bar.style.transform = `scaleX(${loader.shown})`;
  loader.pct.textContent = String(Math.round(loader.shown * 100)).padStart(2, '0');
  if (!loader.done) requestAnimationFrame(loaderTick);
};
requestAnimationFrame(loaderTick);

// ---------------- WebGL ----------------
async function initStage() {
  const canvas = $('#stage');
  try {
    const test = document.createElement('canvas').getContext('webgl2');
    if (!test) throw new Error('sin webgl2');
    stage = new Stage(canvas, { lowPower, reducedMotion: reduced, onProgress: (p) => setLoad(0.15 + p * 0.8) });
    stage.resize();
    const res = lowPower ? '2k' : '2k';
    await stage.buildCans(FLAVORS.map((f) => `assets/tex/label-${f.key}-${res}.webp`), 'assets/tex/drops-normal.webp');
    return true;
  } catch (e) {
    console.warn('KOFULL: WebGL no disponible, modo estático.', e);
    html.classList.add('no-webgl');
    $('.nogl').hidden = false;
    stage = null;
    return false;
  }
}

// ---------------- Medidas y timeline maestro ----------------
function measure() {
  tops = {};
  for (const el of sceneEls) tops[el.dataset.scene] = el.getBoundingClientRect().top + scrollY;
  maxScroll = Math.max(1, html.scrollHeight - innerHeight);
}

function mobilize(st, m) {
  if (!isMobile()) return st;
  const o = { ...st };
  if ('canX' in o) o.canX = 0;
  if ('camZ' in o) o.camZ = o.camZ * 1.24;
  if (m) Object.assign(o, m);
  return o;
}

// Revelados de texto: todos se colocan en el mismo timeline que la cámara
const splits = [];
function prepareText() {
  splits.forEach((s) => s.revert && s.revert());
  splits.length = 0;
  for (const el of $$('[data-r]')) {
    const type = el.dataset.r;
    let targets = [el];
    if (!reduced && (type === 'chars' || type === 'lines' || type === 'up')) {
      const s = new SplitText(el, { type: type === 'chars' ? 'lines,words,chars' : 'lines', mask: 'lines', linesClass: 'split-line', wordsClass: 'split-word' });
      splits.push(s);
      targets = type === 'chars' ? s.chars : s.lines;
    }
    el._t = targets;
    el._type = reduced ? 'fade' : type;
  }
}

const rangeOf = (el, attr) => {
  const own = el.dataset[attr];
  if (own) return own;
  const host = el.closest(`[data-${attr}]`);
  return host ? host.dataset[attr] : null;
};

function addText(t, vh) {
  for (const el of $$('[data-r]')) {
    const scene = el.closest('[data-scene]');
    if (!scene) continue;
    const top = tops[scene.dataset.scene];
    const pinEnd = (parseFloat(getComputedStyle(scene).getPropertyValue('--h')) || 200) - 100;
    const at = (v) => clamp((top + v * vh) / maxScroll, 0, 1);
    const inR = rangeOf(el, 'in') || '4,24';
    const outR = rangeOf(el, 'out') || `${pinEnd - 34},${pinEnd - 6}`;
    const targets = el._t;
    const fade = el._type === 'fade';
    const hidden = fade ? { autoAlpha: 0, y: 18 } : { yPercent: 130 };
    const shown = fade ? { autoAlpha: 1, y: 0 } : { yPercent: 0 };
    const gone = fade ? { autoAlpha: 0, y: -12 } : { yPercent: -130 };
    const stag = (d) => (targets.length > 1 ? { amount: d * 0.45 } : 0);
    if (inR !== 'intro') {
      const [a, b] = inR.split(',').map(Number);
      const s = at(a), d = Math.max(0.0005, at(b) - s);
      t.fromTo(targets, hidden, { ...shown, duration: d * (targets.length > 1 ? 0.55 : 1), stagger: stag(d), ease: 'power3.out', immediateRender: true }, s);
    }
    if (outR !== 'none') {
      const [a, b] = outR.split(',').map(Number);
      const s = at(a), d = Math.max(0.0005, at(b) - s);
      t.fromTo(targets, shown, { ...gone, duration: d * (targets.length > 1 ? 0.6 : 1), stagger: stag(d * 0.6), ease: 'power2.in', immediateRender: false }, s);
    }
  }
}

function buildTimeline() {
  const prog = tl ? tl.progress() : 0;
  if (tl) tl.kill();
  measure();
  const vh = innerHeight / 100; // px por 1vh
  data = initialState();
  if (isMobile()) Object.assign(data, { canX: 0, camZ: data.camZ * 1.24, gx: 0 });
  tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  for (const k of keyframes()) {
    const top = tops[k.scene];
    if (top === undefined) continue;
    const a = clamp((top + k.a * vh) / maxScroll, 0, 1);
    const b = clamp((top + k.b * vh) / maxScroll, 0, 1);
    tl.to(data, { ...mobilize(k.st, k.m), duration: Math.max(0.00005, b - a), ease: k.ease }, a);
  }
  addText(tl, vh);
  tl.set({}, {}, 1);
  tl.progress(1, true).progress(0, true);
  if (!introDone) hideIntro();
  tl.progress(prog);
}

// ---------------- Intro (tras el loader) ----------------
const introEls = () => $$('[data-in="intro"]');
function hideIntro() {
  for (const el of introEls()) gsap.set(el._t, el._type === 'fade' ? { autoAlpha: 0, y: 18 } : { yPercent: 130 });
}
function playIntro() {
  const t = gsap.timeline({ onComplete: () => { introDone = true; lenis && lenis.start(); body.classList.remove('is-loading'); } });
  t.to('[data-hide-on-load]', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.2);
  introEls().forEach((el, i) => {
    const v = el._type === 'fade' ? { autoAlpha: 1, y: 0 } : { yPercent: 0 };
    t.to(el._t, { ...v, duration: reduced ? 0.4 : 1.1, ease: 'expo.out', stagger: 0.03 }, 0.15 + i * 0.09);
  });
  if (stage) {
    const from = { k: 0 };
    t.fromTo(from, { k: 0 }, { k: 1, duration: 1.8, ease: 'power3.out', onUpdate: () => (introK = from.k) }, 0);
  }
}
let introK = reduced ? 1 : 0;

// ---------------- HUD / estado de escena ----------------
const hud = { clock: $('.hud__clock'), scene: $('.hud__scene'), bar: $('.progress i'), last: '' };
const dots = $$('.flavor__dots i');
const ingredients = $$('.formula__list li');
let current = { scene: 'hero', round: -1, flavor: -1, ingredient: -1, flash: 0 };

function sceneAt(y) {
  let best = sceneEls[0];
  for (const el of sceneEls) if (tops[el.dataset.scene] - innerHeight * 0.5 <= y) best = el;
  return best;
}

function updateUI(y, p) {
  setStyle(hud.bar, 'transform', `scaleX(${p.toFixed(4)})`);
  const secs = Math.round(300 * (1 - p));
  setText(hud.clock, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
  const el = sceneAt(y);
  const name = el.dataset.scene;
  if (name !== current.scene) {
    const idx = sceneEls.indexOf(el) + 1;
    hud.scene.textContent = `${String(idx).padStart(2, '0')} — ${el.dataset.label}`;
    current.scene = name;
  }
  const vh = innerHeight;
  // rounds: campana en cada cambio
  if (tops.rounds !== undefined) {
    const r = (y - tops.rounds) / vh;
    const round = r < -0.5 || r > 470 / 100 ? -1 : clamp(Math.floor((r * 100 + 4) / 92), 0, 4);
    if (round !== current.round) current.round = round;
  }
  // fórmula: ingrediente activo sincronizado con la cámara
  if (tops.formula !== undefined) {
    const r = ((y - tops.formula) / vh) * 100;
    let k = 0;
    for (let i = 1; i < INGREDIENT_V.length; i++) if (r >= FORMULA_STEP.start + FORMULA_STEP.every * (i - 1) + FORMULA_STEP.move * 0.5) k = i;
    if (k !== current.ingredient) { ingredients.forEach((li, i) => li.classList.toggle('is-active', i === k)); current.ingredient = k; }
  }
  // gama
  const f = Math.round(data.flavor);
  if (f !== current.flavor) { dots.forEach((d, i) => d.classList.toggle('is-on', i === f)); current.flavor = f; }
}

// ---------------- Render loop ----------------
const derived = {};
const ambientEl = $('.ambient'), flashEl = $('.flash');
const styleCache = new WeakMap();
// escribe en el DOM solo si el valor cambia (evita recálculos de estilo en cada frame)
function setStyle(el, prop, val) {
  let c = styleCache.get(el);
  if (!c) styleCache.set(el, (c = {}));
  if (c[prop] === val) return;
  c[prop] = val;
  el.style.setProperty(prop, val);
}
function setText(el, val) { if (el._v !== val) { el._v = val; el.textContent = val; } }
function frame() {
  const y = scrollY;
  const p = clamp(y / maxScroll, 0, 1);
  if (tl) tl.progress(p);

  // luz ambiente del fondo (se tiñe con el sabor en la gama)
  const fc = mixFlavor(data.flavor);
  const g = data.gama;
  const ar = lerp(data.ambR, fc[0], g), ag = lerp(data.ambG, fc[1], g), ab = lerp(data.ambB, fc[2], g);
  setStyle(ambientEl, '--amb', `${ar | 0}, ${ag | 0}, ${ab | 0}`);
  setStyle(ambientEl, '--amb-a', (data.ambA * (0.35 + 0.65 * introK)).toFixed(3));
  setStyle(flashEl, 'opacity', data.flash.toFixed(3));

  if (stage) {
    Object.assign(derived, data);
    if (isMobile()) { derived.camY += data.my; derived.lookY += data.my; }
    if (g > 0) {
      derived.rimR = lerp(data.rimR, fc[0] / 255, g * 0.8); derived.rimG = lerp(data.rimG, fc[1] / 255, g * 0.8); derived.rimB = lerp(data.rimB, fc[2] / 255, g * 0.8);
    }
    // entrada: la luz sube desde cero tras el loader
    derived.key *= introK; derived.rim *= introK; derived.env *= 0.2 + 0.8 * introK;
    derived.camZ += (1 - introK) * 3;
    setStyle(stage.canvas, 'opacity', data.vis.toFixed(3));
    stage.render(derived);
  }
  updateUI(y, p);
}

// ---------------- Interacción ----------------
function initPointer() {
  // cursor nativo de marca (lo mueve el sistema: nunca se retrasa aunque el 3D vaya cargado)
  if (!coarse) body.classList.add('has-cursor');
  let down = false, lastX = 0, canDrag = false;
  addEventListener('pointermove', (e) => {
    stage && stage.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    const drag = data.drag > 0.5 && data.vis > 0.5 && introDone;
    if (drag !== canDrag) { canDrag = drag; body.classList.toggle('can-drag', canDrag); }
    if (down && stage) { stage.dragBy(e.clientX - lastX); lastX = e.clientX; }
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .shop, .cart, input') || data.drag < 0.5 || !stage) return;
    down = true; stage.dragging = true; lastX = e.clientX;
  });
  const up = () => { down = false; if (stage) stage.dragging = false; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

function initNav() {
  for (const a of $$('a[href^="#"]')) {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  }
}

// ---------------- Bolsa ----------------
function initCart() {
  const cart = $('.cart'), list = $('.cart__list'), count = $('.cart-count'), totalEl = $('.cart__total b');
  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';
  let items = [];
  try { items = JSON.parse(localStorage.getItem('kofull-cart') || '[]'); } catch { items = []; }
  const save = () => { try { localStorage.setItem('kofull-cart', JSON.stringify(items)); } catch {} };
  const products = Object.fromEntries($$('.product').map((p) => [p.dataset.id, { name: p.querySelector('.product__name span').textContent, img: p.querySelector('img').getAttribute('src') }]));
  let lastFocus = null;
  const render = () => {
    list.innerHTML = '';
    let total = 0, n = 0;
    items.forEach((it, i) => {
      total += it.price * it.qty; n += it.qty;
      const li = document.createElement('li');
      li.innerHTML = `<img src="${products[it.id].img}" alt=""><div><h3>KOFULL ${products[it.id].name}</h3><p>${it.fmt} · ${fmt(it.price)}</p></div>
        <div class="cart__qty"><button type="button" aria-label="Quitar una unidad" data-q="-1" data-i="${i}">−</button><span>${it.qty}</span><button type="button" aria-label="Añadir una unidad" data-q="1" data-i="${i}">+</button></div>`;
      list.appendChild(li);
    });
    count.textContent = n;
    totalEl.textContent = fmt(total);
    cart.classList.toggle('has-items', n > 0);
    save();
  };
  const open = () => { lastFocus = document.activeElement; cart.classList.add('is-open'); cart.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); $('.cart__close').focus(); };
  const close = () => { cart.classList.remove('is-open', 'is-co', 'is-done'); cart.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); lastFocus && lastFocus.focus(); };

  // Pasarela decorativa: no hay backend ni se guardan datos; al terminar se vacía el formulario.
  const form = $('.checkout'), done = $('.co-done'), payBtn = $('.co-pay'), err = $('.co-error');
  const total = () => items.reduce((a, it) => a + it.price * it.qty, 0);
  let method = 'card';
  $('.cart__checkout').addEventListener('click', () => {
    if (!items.length) return;
    $('.co-total').textContent = fmt(total());
    payBtn.textContent = `Pagar ${fmt(total())}`;
    cart.classList.add('is-co');
    setTimeout(() => $('input', form).focus(), 400);
  });
  $('.co-back').addEventListener('click', () => { cart.classList.remove('is-co'); $('.cart__close').focus(); });
  $$('.co-methods button', form).forEach((b) => b.addEventListener('click', () => {
    method = b.dataset.m;
    $$('.co-methods button', form).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    $$('.co-pane', form).forEach((p) => (p.hidden = p.dataset.pane !== method));
   
  }));
  // formato de tarjeta y caducidad mientras se escribe
  const [cardNum, cardExp] = $$('[data-pane="card"] input', form);
  cardNum.addEventListener('input', () => { cardNum.value = cardNum.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
  cardExp.addEventListener('input', () => { const v = cardExp.value.replace(/\D/g, '').slice(0, 4); cardExp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
  form.addEventListener('input', (e) => { if (e.target.classList.contains('is-invalid') && e.target.value.trim()) e.target.classList.remove('is-invalid'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('input[required]', form).filter((i) => !i.closest('[hidden]'));
    let ok = true;
    fields.forEach((i) => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)) || (i === cardNum && cardNum.value.replace(/\s/g, '').length < 13);
      i.classList.toggle('is-invalid', bad); if (bad) ok = false;
    });
    err.hidden = ok;
    if (!ok) { fields.find((i) => i.classList.contains('is-invalid')).focus(); return; }
    payBtn.classList.add('is-busy'); payBtn.textContent = 'Procesando';
    setTimeout(() => {
      form.reset(); $$('input', form).forEach((i) => i.classList.remove('is-invalid'));
      $('.co-num', done).textContent = `Pedido KF-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      payBtn.classList.remove('is-busy');
      items = []; render();
      cart.classList.add('is-done'); done.hidden = false;
      $('.co-close', done).focus();
    }, 1400);
  });
  $('.co-close', done).addEventListener('click', close);
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const it = items[+b.dataset.i]; it.qty += +b.dataset.q;
    if (it.qty <= 0) items.splice(+b.dataset.i, 1);
    render();
  });
  $$('[data-close]', cart).forEach((b) => b.addEventListener('click', close));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && cart.classList.contains('is-open')) close(); });
  $$('.product').forEach((p) => {
    const opts = $$('.product__opts button', p), price = $('.product__price span', p), buy = $('.btn--buy', p);
    opts.forEach((o) => o.addEventListener('click', () => {
      opts.forEach((x) => x.setAttribute('aria-checked', String(x === o)));
      price.textContent = fmt(parseFloat(o.dataset.price));
     
    }));
    buy.addEventListener('click', () => {
      const sel = opts.find((o) => o.getAttribute('aria-checked') === 'true');
      const price = parseFloat(sel.dataset.price), f = sel.dataset.fmt;
      const ex = items.find((x) => x.id === p.dataset.id && x.fmt === f);
      ex ? ex.qty++ : items.push({ id: p.dataset.id, fmt: f, price, qty: 1 });
      render();
      buy.classList.add('is-added'); buy.textContent = 'Añadido';
      setTimeout(() => { buy.classList.remove('is-added'); buy.textContent = 'Comprar'; open(); }, 550);
    });
  });
  $('.btn--shop').addEventListener('click', (e) => { if (items.length) { e.preventDefault(); e.stopImmediatePropagation(); open(); } }, true);
  render();
}

// ---------------- Arranque ----------------
async function boot() {
  const t0 = performance.now();
  setLoad(0.05);
  if (!reduced) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 1.45, touchMultiplier: 1.9 });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
  }
  gsap.ticker.add((time) => { lenis && lenis.raf(time * 1000); frame(); });
  gsap.ticker.lagSmoothing(0);

  const [ok] = await Promise.all([initStage(), document.fonts.ready]);
  setLoad(1);
  prepareText();
  buildTimeline();
  initPointer();
  initNav();
  initCart();

  const wait = Math.max(0, 500 - (performance.now() - t0));
  setTimeout(() => {
    loader.done = true;
    gsap.to(loader.el, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', onComplete: () => loader.el.remove() });
    playIntro();
    if (!lenis) { introDone = true; body.classList.remove('is-loading'); }
    // los otros tres sabores se cargan solo al acercarse a la gama (no compiten con la entrada)
    if (ok) {
      let started = false;
      const check = () => {
        if (started || scrollY < (tops.formula || 0)) return;
        started = true; removeEventListener('scroll', check);
        stage.loadRest();
      };
      addEventListener('scroll', check, { passive: true });
      check();
    }
  }, wait);

  let lastW = innerWidth, lastH = innerHeight, rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const wChanged = innerWidth !== lastW;
      const hBig = Math.abs(innerHeight - lastH) > lastH * 0.15;
      stage && stage.resize();
      if (wChanged || hBig) { lastW = innerWidth; lastH = innerHeight; prepareText(); buildTimeline(); if (introDone) introEls().forEach((el) => gsap.set(el._t, el._type === 'fade' ? { autoAlpha: 1, y: 0 } : { yPercent: 0 })); }
    }, 180);
  });
}

window.__kofull = { get data() { return data; }, get tl() { return tl; }, get tops() { return tops; }, get max() { return maxScroll; }, get lenis() { return lenis; } };
boot();
