// KOFULL · escena WebGL: lata 473 mL, estudio de luz, suelo mojado, agua.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const FLAVORS = [
  { key: 'red',    name: 'Frutas Rojas',  ink: '#d10f18', deep: '#3a0306', amb: [209, 15, 24] },
  { key: 'orange', name: 'Mango Passion', ink: '#ec4806', deep: '#3d1103', amb: [236, 72, 6] },
  { key: 'green',  name: 'Lima Limón',    ink: '#70be10', deep: '#122a04', amb: [112, 190, 16] },
  { key: 'blue',   name: 'Blue Berry',    ink: '#083cd2', deep: '#030d33', amb: [8, 60, 210] },
];

// Medidas: 1 unidad = 33 mm (radio de la lata). Etiqueta = 4.18 u de alto.
const LABEL_H = 4.18;
const LABEL_Y0 = -2.28;
export const FLOOR_Y = -2.92;
const U_FRONT = 0.43;                       // centro de la cara del logo en la etiqueta
export const SPIN_FRONT = -Math.PI * 2 * U_FRONT;
export const spinFor = (u) => -Math.PI * 2 * u;
export const labelY = (v) => LABEL_Y0 + LABEL_H * v; // v=0 abajo, 1 arriba

export class Stage {
  constructor(canvas, { lowPower, reducedMotion, onProgress }) {
    this.lowPower = lowPower;
    this.reduced = reducedMotion;
    this.onProgress = onProgress || (() => {});
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    this.userSpin = 0; this.userSpinV = 0; this.dragging = false;
    this.maxDpr = lowPower ? 1.5 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.fpsSamples = [];

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(this.dpr);
    r.setSize(innerWidth, innerHeight, false);
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, 0, 16);
    this.lookAt = new THREE.Vector3();

    this.buildEnvironment();
    this.buildLights();
    this.materialsWithEnv = [];
    this.cans = [];
    this.manager = new THREE.LoadingManager();
    this.manager.onProgress = (_u, loaded, total) => this.onProgress(loaded / total);
    this.texLoader = new THREE.TextureLoader(this.manager);
    this.maxAniso = r.capabilities.getMaxAnisotropy();
  }

  // ---------- Estudio: softboxes verticales + rim rojo, horneado a PMREM ----------
  buildEnvironment() {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(40, 30, 40), new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide }));
    env.add(room);
    const box = (w, h, color, k, pos, rot = [0, 0, 0]) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(...pos); p.rotation.set(...rot); env.add(p);
    };
    box(3, 18, 0xffffff, 7, [-9, 1, 3], [0, Math.PI / 2.4, 0]);   // tira izquierda
    box(1.6, 18, 0xffffff, 5, [9, 1, 2], [0, -Math.PI / 2.4, 0]); // tira derecha
    box(14, 6, 0xffffff, 2.2, [0, 13, 0], [Math.PI / 2, 0, 0]);   // cenital
    box(16, 10, 0xff1a1a, 1.6, [0, 0, -16]);                    // fondo rojo (rim)
    box(4, 4, 0xffffff, 1.2, [3, -3, 14]);                      // relleno frontal bajo
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(env, 0.02).texture;
    pm.dispose();
  }

  buildLights() {
    const s = this.scene;
    this.key = new THREE.DirectionalLight(0xffffff, 2.2);
    this.key.position.set(-5, 7, 8);
    s.add(this.key);
    this.rimL = new THREE.PointLight(0xff1a1a, 40, 0, 0);
    this.rimL.position.set(-4.5, 2.5, -4);
    this.rimR = new THREE.PointLight(0xff1a1a, 40, 0, 0);
    this.rimR.position.set(4.5, 1, -4);
    s.add(this.rimL, this.rimR);
    this.top = new THREE.SpotLight(0xffffff, 0, 0, 0.42, 0.7, 0);
    this.top.position.set(0, 11, 1.5);
    this.top.target.position.set(0, 0, 0);
    s.add(this.top, this.top.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x220405, 0.25);
    s.add(this.hemi);
    this.rimColor = new THREE.Color();
    this.keyColor = new THREE.Color();
  }

  loadTex(url, { srgb = true, repeat = null } = {}) {
    return new Promise((res) => {
      this.texLoader.load(url, (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = this.maxAniso;
        if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
        res(t);
      }, undefined, () => res(null));
    });
  }

  // ---------- Geometría de la lata ----------
  buildCanGeometry() {
    const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const g = {};
    g.label = new THREE.CylinderGeometry(1, 1, LABEL_H, 160, 1, true);
    g.label.translate(0, LABEL_Y0 + LABEL_H / 2, 0);
    // Fondo: domo cóncavo + anillo de apoyo + curva hasta el cuerpo
    g.bottom = lathe([
      [0, -2.37], [0.3, -2.39], [0.55, -2.45], [0.68, -2.52], [0.74, -2.55], [0.8, -2.545],
      [0.86, -2.51], [0.92, -2.44], [0.965, -2.37], [0.99, -2.31], [1.0, LABEL_Y0 - 0.001],
    ]);
    // Cuello, reborde enrollado y tapa con acanaladura
    const yt = LABEL_Y0 + LABEL_H;
    g.neck = lathe([
      [1.0, yt - 0.001], [0.995, yt + 0.07], [0.975, yt + 0.16], [0.94, yt + 0.27], [0.9, yt + 0.37],
      [0.875, yt + 0.43], [0.872, yt + 0.46],
      [0.885, yt + 0.49], [0.892, yt + 0.525], [0.884, yt + 0.55], [0.866, yt + 0.556], [0.852, yt + 0.54],
      [0.846, yt + 0.5], [0.838, yt + 0.44], [0.8, yt + 0.43], [0.775, yt + 0.415], [0.755, yt + 0.43],
      [0.6, yt + 0.44], [0, yt + 0.445],
    ]);
    this.lidY = yt + 0.445;
    // Anilla
    const s = new THREE.Shape();
    const rr = (x, y, w, h, r) => { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); };
    rr(-0.2, -0.46, 0.4, 0.78, 0.18);
    const hole = new THREE.Path(); hole.absellipse(0, -0.2, 0.12, 0.15, 0, Math.PI * 2, false); s.holes.push(hole);
    g.tab = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
    g.rivet = new THREE.CylinderGeometry(0.07, 0.08, 0.04, 24);
    // Abertura grabada (lágrima) en la tapa
    const sc = new THREE.Shape(); sc.absellipse(0, 0.42, 0.26, 0.2, 0, Math.PI * 2, false);
    g.score = new THREE.ShapeGeometry(sc, 32);
    return g;
  }

  async buildCans(labelUrls, dropsUrl) {
    this.geo = this.buildCanGeometry();
    const drops = await this.loadTex(dropsUrl, { srgb: false, repeat: [3.2, 2.2] });
    const dropsNeck = drops && drops.clone(); if (dropsNeck) { dropsNeck.repeat.set(4, 0.8); dropsNeck.needsUpdate = true; }
    this.drops = drops;
    const alu = new THREE.MeshPhysicalMaterial({
      color: 0xdfe1e4, metalness: 1, roughness: 0.2,
      clearcoat: drops ? 1 : 0, clearcoatRoughness: 0.08, clearcoatNormalMap: dropsNeck, clearcoatNormalScale: new THREE.Vector2(0.9, 0.9),
    });
    const aluDark = new THREE.MeshPhysicalMaterial({ color: 0xb9bcc0, metalness: 1, roughness: 0.32 });
    const scoreMat = new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 1, roughness: 0.4, side: THREE.DoubleSide });
    this.materialsWithEnv.push([alu, 1.2], [aluDark, 1], [scoreMat, 1]);

    const labels = await Promise.all(labelUrls.map((u, i) => (i === 0 ? this.loadTex(u) : null)));
    // relleno 1x1 para que el shader no cambie (ni se recompile) al llegar la etiqueta real
    const blank = new THREE.DataTexture(new Uint8Array([236, 236, 236, 255]), 1, 1);
    blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;
    for (let i = 0; i < FLAVORS.length; i++) {
      const labelMat = new THREE.MeshPhysicalMaterial({
        map: labels[i] || blank, color: 0xffffff,
        metalness: 0.18, roughness: 0.34,
        clearcoat: 1, clearcoatRoughness: 0.07,
        clearcoatNormalMap: drops, clearcoatNormalScale: new THREE.Vector2(1.1, 1.1),
        normalMap: drops, normalScale: new THREE.Vector2(0.25, 0.25),
      });
      this.materialsWithEnv.push([labelMat, 1]);
      const outer = new THREE.Group();
      const inner = new THREE.Group();
      outer.add(inner);
      const body = new THREE.Mesh(this.geo.label, labelMat);
      const bottom = new THREE.Mesh(this.geo.bottom, alu);
      const neck = new THREE.Mesh(this.geo.neck, alu);
      const tab = new THREE.Mesh(this.geo.tab, aluDark);
      tab.rotation.x = -Math.PI / 2; tab.position.set(0, this.lidY + 0.03, 0.16);
      const rivet = new THREE.Mesh(this.geo.rivet, aluDark); rivet.position.set(0, this.lidY + 0.02, 0);
      const score = new THREE.Mesh(this.geo.score, scoreMat); score.rotation.x = -Math.PI / 2; score.position.y = this.lidY + 0.004;
      inner.add(body, bottom, neck, tab, rivet, score);
      // Sombra de contacto (solo visible en el suelo)
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.shadowMaterial());
      shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2;
      this.scene.add(shadow);
      outer.visible = i === 0;
      this.scene.add(outer);
      this.cans.push({ outer, inner, labelMat, shadow, loaded: !!labels[i], flavor: FLAVORS[i] });
    }
    this.labelUrls = labelUrls;
    this.buildFloor();
    this.buildWater();
    // precompila todos los programas con todo visible (evita tirones al entrar en cada escena)
    const vis = [];
    this.scene.traverse((o) => { vis.push([o, o.visible]); o.visible = true; });
    this.renderer.compile(this.scene, this.camera);
    vis.forEach(([o, v]) => (o.visible = v));
  }

  // Carga en segundo plano del resto de etiquetas (y 4K si procede)
  async loadRest(urls4k) {
    for (let i = 1; i < this.cans.length; i++) {
      const t = await this.loadTex(this.labelUrls[i]);
      if (t) { this.renderer.initTexture(t); this.cans[i].labelMat.map = t; }
    }
    if (!urls4k) return;
    for (let i = 0; i < this.cans.length; i++) {
      const t = await this.loadTex(urls4k[i]);
      if (t) { this.renderer.initTexture(t); const old = this.cans[i].labelMat.map; this.cans[i].labelMat.map = t; old && old.image && old.image.width > 1 && old.dispose(); }
    }
  }

  shadowMaterial() {
    if (!this._shadowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.35, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      this._shadowTex = new THREE.CanvasTexture(c);
    }
    return new THREE.MeshBasicMaterial({ map: this._shadowTex, transparent: true, depthWrite: false, opacity: 0 });
  }

  // ---------- Suelo mojado con reflejo (escena de gama) ----------
  buildFloor() {
    const geo = new THREE.PlaneGeometry(70, 70);
    if (!this.lowPower) {
      const shader = {
        name: 'KofullFloor',
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tint: { value: new THREE.Color() }, opacity: { value: 0 } },
        vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vUv2;
          #include <common>
          void main(){ vUv = textureMatrix * vec4(position,1.0); vUv2 = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 color; uniform vec3 tint; uniform float opacity; uniform sampler2D tDiffuse; varying vec4 vUv; varying vec2 vUv2;
          void main(){ vec4 b = texture2DProj(tDiffuse, vUv);
            float d = distance(vUv2, vec2(0.5, 0.52));
            float a = smoothstep(0.34, 0.03, d) * opacity;
            vec3 c = tint*0.55 + b.rgb*0.62;
            gl_FragColor = vec4(c, a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      };
      this.floor = new Reflector(geo, {
        shader, color: 0xffffff,
        textureWidth: Math.round(innerWidth * 0.6), textureHeight: Math.round(innerHeight * 0.6),
      });
      this.floor.material.transparent = true;
      this.floor.material.depthWrite = false;
      this.floorU = this.floor.material.uniforms;
    } else {
      const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, map: this.radialTex() });
      this.floor = new THREE.Mesh(geo, m);
      this.floorU = null;
    }
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = FLOOR_Y;
    this.floor.visible = false;
    this.scene.add(this.floor);
  }
  radialTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); const g = x.createRadialGradient(128, 133, 4, 128, 133, 90);
    g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- Recuperación: cáusticas de agua + gotas que caen ----------
  buildWater() {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#7fb2e0') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
        void main(){
          vec2 p = mod(vUv*6.2831*2.2, 6.2831) - 250.0; vec2 i = p; float c = 1.0; float inten = 0.005;
          for (int n = 0; n < 4; n++) { float t = uTime*0.35*(1.0 - (3.5/float(n+1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0/length(vec2(p.x/(sin(i.x+t)/inten), p.y/(cos(i.y+t)/inten))); }
          c /= 4.0; c = 1.17 - pow(c, 1.4); float v = pow(abs(c), 8.0);
          float mask = smoothstep(0.62, 0.05, distance(vUv, vec2(0.5, 0.55)));
          gl_FragColor = vec4(uColor * clamp(v,0.0,1.0) * mask * uOpacity, 1.0);
        }`,
    });
    this.caustic = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), m);
    this.caustic.position.set(0, 1, -9);
    this.caustic.visible = false;
    this.scene.add(this.caustic);

    const N = this.lowPower ? 260 : 600;
    const pos = new Float32Array(N * 3); const speed = new Float32Array(N);
    for (let k = 0; k < N; k++) { pos[k * 3] = (Math.random() - 0.5) * 22; pos[k * 3 + 1] = (Math.random() - 0.5) * 14; pos[k * 3 + 2] = -Math.random() * 8 + 2; speed[k] = 0.3 + Math.random() * 0.9; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dropSpeed = speed;
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(200,225,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.particles = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xbad6f2, opacity: 0 }));
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  // ---------- Poses ----------
  gamaPose(i, d, f) {
    const dd = i - f;
    const mob = this.isMobile;
    let x, z;
    if (dd >= 0) { x = d.gx + dd * (mob ? 3.6 : 3.3); z = -dd * (mob ? 2 : 3.6); }
    else { x = d.gx + dd * 15; z = dd * 1.5; }
    const tilt = -0.36;
    const y = FLOOR_Y + 2.66;
    return { x, y, z, rx: 0.06, rz: tilt, spin: SPIN_FRONT + dd * 1.9, s: 1 };
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.isMobile = w < 820;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.floor && this.floor.getRenderTarget) this.floor.getRenderTarget().setSize(Math.round(w * 0.6), Math.round(h * 0.6));
  }

  setPointer(nx, ny) { this.pointer.x = nx; this.pointer.y = ny; }
  dragBy(dx) { this.userSpin += dx * 0.012; this.userSpinV = dx * 0.012; }

  // baja la resolución si la GPU no llega (solo tras la carga, con la mediana para ignorar tirones)
  adaptQuality(dt) {
    if (this.adaptDone || this.clock.elapsedTime < 6) return;
    this.fpsSamples.push(dt);
    if (this.fpsSamples.length < 120) return;
    const avg = this.fpsSamples.sort((a, b) => a - b)[60];
    this.fpsSamples.length = 0;
    if (avg > 1 / 45 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(innerWidth, innerHeight, false);
    } else this.adaptDone = true;
  }

  // d = estado del timeline (ver scenes.js)
  render(d) {
    if (!this.floor) return 0;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    this.adaptQuality(dt);
    const P = this.pointer;
    const k = 1 - Math.exp(-dt * 5);
    P.sx += (P.x - P.sx) * k; P.sy += (P.y - P.sy) * k;
    if (!this.dragging) {
      this.userSpin += this.userSpinV; this.userSpinV *= 0.92;
    }

    // cámara
    const cam = this.camera;
    cam.fov = d.fov; cam.updateProjectionMatrix();
    cam.position.set(d.camX + P.sx * 0.25 * d.ptr, d.camY - P.sy * 0.18 * d.ptr, d.camZ);
    this.lookAt.set(d.camX * 0.4, d.lookY, 0);
    cam.lookAt(this.lookAt);
    if (d.shake > 0.001 && !this.reduced) {
      cam.position.x += (Math.sin(t * 37) + Math.sin(t * 23.3)) * 0.02 * d.shake;
      cam.position.y += (Math.sin(t * 31.7) + Math.cos(t * 19)) * 0.02 * d.shake;
    }

    // luces
    this.key.intensity = d.key * 2.4;
    this.keyColor.setRGB(d.keyR, d.keyG, d.keyB); this.key.color.copy(this.keyColor);
    this.rimColor.setRGB(d.rimR, d.rimG, d.rimB);
    this.rimL.color.copy(this.rimColor); this.rimR.color.copy(this.rimColor);
    this.rimL.intensity = d.rim * 38; this.rimR.intensity = d.rim * 30;
    this.top.intensity = d.top * 90;
    this.hemi.intensity = 0.25 * d.key + 0.05;
    for (const [m, base] of this.materialsWithEnv) m.envMapIntensity = base * d.env;

    // latas
    const floatY = this.reduced ? 0 : Math.sin(t * 0.9) * 0.06 * d.float;
    const floatR = this.reduced ? 0 : Math.sin(t * 0.6) * 0.02 * d.float;
    const gama = d.gama;
    const solo = Math.round(d.solo);
    const ptrRx = P.sy * 0.12 * d.ptr, ptrRz = -P.sx * 0.08 * d.ptr, ptrSpin = P.sx * 0.35 * d.ptr;
    const useSpin = this.userSpin * d.drag;
    for (let i = 0; i < this.cans.length; i++) {
      const c = this.cans[i];
      const g = this.gamaPose(i, d, d.flavor);
      let p;
      if (i === solo) {
        const s = { x: d.canX, y: d.canY + floatY, z: d.canZ, rx: d.rotX + ptrRx + floatR, rz: d.rotZ + ptrRz, spin: d.spin + ptrSpin + useSpin, s: d.scale };
        p = gama > 0 ? mixPose(s, g, gama) : s;
        c.outer.visible = d.vis > 0.001;
      } else {
        p = { ...g, x: g.x + (1 - gama) * 14 };
        c.outer.visible = gama > 0.002 && d.vis > 0.001;
      }
      c.outer.position.set(p.x, p.y, p.z);
      c.outer.rotation.set(p.rx, 0, p.rz);
      c.inner.rotation.y = p.spin;
      c.outer.scale.setScalar(p.s);
      // sombra de contacto en el suelo
      c.shadow.visible = c.outer.visible && d.floor > 0.01;
      c.shadow.position.set(p.x - 0.75, FLOOR_Y + 0.01, p.z);
      c.shadow.material.opacity = d.floor * 0.9;
    }

    // suelo
    const fl = this.floor;
    fl.visible = d.floor > 0.01 && d.vis > 0.01;
    if (fl.visible) {
      const tint = mixFlavor(d.flavor);
      if (this.floorU) { this.floorU.opacity.value = d.floor; this.floorU.tint.value.setRGB(tint[0] / 255, tint[1] / 255, tint[2] / 255).convertSRGBToLinear(); }
      else { fl.material.opacity = d.floor * 0.8; fl.material.color.setRGB(tint[0] / 255, tint[1] / 255, tint[2] / 255); }
    }
    // agua
    this.caustic.visible = d.water > 0.01;
    this.caustic.material.uniforms.uOpacity.value = d.water;
    this.caustic.material.uniforms.uTime.value = this.reduced ? 3 : t;
    this.particles.visible = d.water > 0.01;
    if (this.particles.visible) {
      this.particles.material.opacity = d.water * 0.85;
      if (!this.reduced) {
        const a = this.particles.geometry.attributes.position.array;
        for (let q = 0; q < this.dropSpeed.length; q++) { a[q * 3 + 1] -= this.dropSpeed[q] * dt * 0.8; if (a[q * 3 + 1] < -7) a[q * 3 + 1] = 7; }
        this.particles.geometry.attributes.position.needsUpdate = true;
      }
    }
    if (d.vis > 0.001) this.renderer.render(this.scene, cam);
    return t;
  }
}

function mixPose(a, b, t) {
  const l = (x, y) => x + (y - x) * t;
  return { x: l(a.x, b.x), y: l(a.y, b.y), z: l(a.z, b.z), rx: l(a.rx, b.rx), rz: l(a.rz, b.rz), spin: l(a.spin, b.spin), s: l(a.s, b.s) };
}
export function mixFlavor(f) {
  const i = Math.max(0, Math.min(FLAVORS.length - 1, Math.floor(f)));
  const j = Math.min(FLAVORS.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, f - i));
  const a = FLAVORS[i].amb, b = FLAVORS[j].amb;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
