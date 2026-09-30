// KOFULL · coreografía. Un único estado `data` que el scroll recorre.
// Posiciones en vh relativas al top de cada <section data-scene>.
import { SPIN_FRONT, spinFor, labelY } from './stage.js';

const TAU = Math.PI * 2;
const RED = [1, 0.05, 0.06], ICE = [0.5, 0.74, 1], SODIUM = [1, 0.52, 0.16];
const WHITE = [1, 1, 1], COLD = [0.78, 0.88, 1], WARM = [1, 0.84, 0.66];
const col = (p, c) => ({ [p + 'R']: c[0], [p + 'G']: c[1], [p + 'B']: c[2] });

export const INGREDIENT_V = [0.80, 0.70, 0.615, 0.53, 0.44, 0.345, 0.265];
export const FORMULA_STEP = { start: 30, every: 40, move: 20 };
export const FLAVOR_STEPS = [[60, 110], [150, 200], [240, 290]];

export function initialState() {
  return {
    camX: 0, camY: 0, camZ: 16, fov: 30, lookY: 0,
    canX: 2.3, canY: -0.15, canZ: 0, rotX: 0.12, rotZ: -0.36, spin: SPIN_FRONT, scale: 1,
    key: 1, ...col('key', WHITE), rim: 1, ...col('rim', RED), top: 0, env: 1,
    float: 1, ptr: 1, drag: 1, shake: 0,
    gama: 0, flavor: 0, solo: 0, gx: 2.3, floor: 0, water: 0, vis: 1, flash: 0,
    ambR: 209, ambG: 15, ambB: 24, ambA: 0.34,
    my: 1.5, // desplazamiento vertical de cámara en móvil
  };
}

// Cada paso: [escena, desde(vh), hasta(vh), estado parcial, ease, overridesMóvil]
export function keyframes() {
  const S = [];
  const T = (scene, a, b, st, ease = 'power2.inOut', m) => S.push({ scene, a, b, st, ease, m });

  // 01 · HERO — la lata gira hasta el luchador y se acerca
  T('hero', 8, 150, { spin: SPIN_FRONT - 1.25, canX: 1.1, camZ: 12.8, rotZ: -0.18, rotX: 0.04, ptr: 0.6, ambA: 0.22 }, 'none', { my: 1.1 });

  // 02 · CAMPANA — acercamiento hasta atravesar la etiqueta
  T('campana', -100, 20, { canX: 3.1, canY: -0.6, camZ: 10.5, rotZ: 0.12, rotX: 0, spin: SPIN_FRONT - TAU, drag: 0, ptr: 0.3, float: 0.3, key: 1.1, rim: 0.7, ambA: 0.12 }, 'power1.inOut', { my: 2.6 });
  T('campana', 30, 150, { canX: 0, camZ: 3.3, fov: 26, canY: 0.55, rotZ: 0.02, spin: SPIN_FRONT - TAU - 0.55, rim: 0.3, ptr: 0 }, 'power2.in', { my: 0 });
  T('campana', 150, 172, { flash: 1, camZ: 2.1 }, 'power2.in');
  // corte (oculto por el flash): la lata reaparece de pie bajo luz cenital
  T('campana', 172, 173, { canY: -0.3, rotZ: 0, rotX: 0.06, spin: SPIN_FRONT - TAU * 2 + 0.6, camZ: 6, fov: 30, key: 0.25, top: 1, rim: 0.6, env: 0.6, ambA: 0.06 }, 'none');
  T('campana', 176, 240, { flash: 0 }, 'power2.out');

  // 03 · VOLVER
  T('volver', -84, 30, { canX: 2.9, camZ: 15, canY: -0.45, spin: SPIN_FRONT - TAU * 2, float: 1, ptr: 0.5 }, 'power3.out', { my: 1.2 });

  // 04 · ROUNDS (5 × 92vh)
  T('rounds', -100, 0, { canX: 2.7, canY: -0.4, camZ: 16.5, rotZ: 0.2, rotX: 0.1, spin: SPIN_FRONT - TAU * 2 - 0.5, key: 1, top: 0, rim: 1, env: 1, ptr: 0.7, ambA: 0.18 }, 'power2.inOut', { my: 3.6, canX: 1.5, camZ: 26 });
  T('rounds', 92, 124, { shake: 1, rim: 1.7, key: 0.65, rotZ: -0.26, spin: SPIN_FRONT - TAU * 2 - 1.4, canX: 2.4, camZ: 14.6, ambA: 0.34 }, 'power2.inOut', { canX: 1.5, camZ: 26 });
  T('rounds', 184, 216, { shake: 0, rim: 1, ...col('rim', ICE), key: 0.55, ...col('key', COLD), rotZ: 0.05, canX: 2.7, top: 0.35, ambR: 60, ambG: 110, ambB: 170, ambA: 0.2 }, 'power2.inOut', { canX: 1.5 });
  T('rounds', 276, 308, { canX: 2.3, camZ: 12.2, spin: spinFor(0.87) - TAU * 3, rotZ: 0, rotX: 0, ...col('rim', RED), rim: 1, key: 1.1, ...col('key', WHITE), top: 0, ambR: 209, ambG: 15, ambB: 24, ambA: 0.18 }, 'power2.inOut', { canX: 1.5, camZ: 26 });
  T('rounds', 368, 400, { canX: 2.7, camZ: 16, rotZ: -0.36, rotX: 0.12, spin: SPIN_FRONT - TAU * 4, key: 1, rim: 1.2 }, 'power2.inOut', { canX: 1.5, camZ: 26 });

  // 05 · FÓRMULA — macro que baja por la columna de ingredientes de la etiqueta
  T('formula', -100, 0, { canX: -2.25, canY: -labelY(INGREDIENT_V[0]), camZ: 7.2, fov: 28, rotZ: 0, rotX: 0, spin: spinFor(0.118) - TAU * 4, key: 1.2, rim: 0.45, top: 0, env: 1.1, ptr: 0.2, float: 0.25, ambA: 0.07 }, 'power2.inOut', { my: -1.25, camZ: 11.5 });
  for (let k = 1; k < INGREDIENT_V.length; k++) {
    const a = FORMULA_STEP.start + FORMULA_STEP.every * (k - 1);
    T('formula', a, a + FORMULA_STEP.move, { canY: -labelY(INGREDIENT_V[k]) }, 'power2.inOut');
  }

  // 06 · MANIFIESTO — contraluz, casi silueta
  T('manifiesto', -100, 0, { canX: 0, canY: -0.3, camZ: 14, fov: 30, rotZ: 0.28, rotX: 0.1, spin: SPIN_FRONT - TAU * 4, key: 0, rim: 0.75, top: 0.08, env: 0.06, ptr: 0.3, float: 1, ambA: 0.1 }, 'power2.inOut', { my: 0.4 });
  T('manifiesto', 0, 300, { spin: SPIN_FRONT - TAU * 4 - Math.PI, rotZ: -0.24 }, 'none');
  T('manifiesto', 286, 340, { key: 0.9, env: 0.9, rim: 1.1 }, 'power2.out');

  // 07 · RECUPERACIÓN — tempo lento, agua
  T('recuperacion', -100, 10, { canX: -2.6, canY: 0, camZ: 15, rotZ: 0.1, rotX: 0.05, spin: SPIN_FRONT - TAU * 4 - 0.4, key: 0.45, ...col('key', COLD), rim: 0.9, ...col('rim', ICE), top: 0.3, env: 0.8, water: 1, ambR: 50, ambG: 100, ambB: 160, ambA: 0.2 }, 'sine.inOut', { my: 2.4 });
  T('recuperacion', 10, 240, { spin: SPIN_FRONT - TAU * 4 - 1.7, canY: 0.3, rotZ: -0.05 }, 'sine.inOut');

  // 08 · GAMA — suelo mojado, las cuatro latas en fila
  T('gama', -100, 0, { gama: 1, flavor: 0, floor: 1, water: 0, spin: SPIN_FRONT - TAU * 3, camZ: 15, camY: 0.9, lookY: -0.45, fov: 30, key: 1.15, ...col('key', WHITE), rim: 1.1, ...col('rim', RED), top: 0, env: 1, ptr: 0.4, float: 0, ambR: 209, ambG: 15, ambB: 24, ambA: 0.5 }, 'power2.inOut', { my: 1.9 });
  FLAVOR_STEPS.forEach(([a, b], i) => T('gama', a, b, { flavor: i + 1 }, 'power2.inOut'));

  // 09 · VALENCIA — la última lata (Blue Berry) bajo luz de farola de sodio
  T('valencia', -101, -100, { solo: 3 }, 'none');
  T('valencia', -100, 0, { gama: 0, floor: 0, canX: 2.6, canY: -0.2, canZ: 0, camZ: 15, camY: 0, lookY: 0, rotZ: -0.12, rotX: 0.05, spin: SPIN_FRONT - 1.35, key: 0.85, ...col('key', WARM), rim: 1.3, ...col('rim', SODIUM), env: 0.8, float: 1, ptr: 0.6, ambR: 230, ambG: 110, ambB: 36, ambA: 0.2 }, 'power2.inOut', { my: 1.6 });

  // 10 · TIENDA — el canvas se apaga, se prepara el plano final
  T('tienda', -70, -5, { vis: 0 }, 'power1.in');
  T('tienda', 0, 1, { solo: 0, flavor: 0, spin: SPIN_FRONT + 0.8, canX: 0, canY: -0.25, rotZ: -0.3, rotX: 0.12, camZ: 16, key: 0.2, ...col('key', WHITE), rim: 0.6, ...col('rim', RED), top: 0, env: 0.5, ambR: 209, ambG: 15, ambB: 24, ambA: 0 }, 'none');

  // 11 · FINAL
  T('final', -80, 0, { vis: 1, canY: -1.25, camZ: 20, spin: SPIN_FRONT, key: 0.9, rim: 1.25, top: 0.45, env: 1, ptr: 1, drag: 1, float: 1, ambA: 0.3 }, 'power2.out', { my: 0.55 });
  return S;
}
