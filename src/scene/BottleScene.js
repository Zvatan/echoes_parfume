import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { POSE_KEYS, CAMERA } from './states.js';
import { loadModels, makeVariant, BOTTLE_H } from './models.js';

const LIGHT_BG = new THREE.Color('#f5f5f7');
const DARK_BG = new THREE.Color('#0b0b0b');

export class BottleScene {
  constructor(canvas, { lowPower = false, reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.lowPower = lowPower;
    this.reducedMotion = reducedMotion;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Cam (transmission) geçişi en pahalı adım; zayıf cihazlarda yarım çözünürlük.
    this.renderer.transmissionResolutionScale = lowPower ? 0.5 : 1;

    this.scene = new THREE.Scene();
    this.scene.background = LIGHT_BG.clone();

    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 50);
    this.camera.position.set(0, 0, CAMERA.z);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.9;
    pmrem.dispose();

    const key = new THREE.DirectionalLight('#fff4e6', 2.2);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight('#ffd9a8', 3);
    rim.position.set(-5, 3, -4);
    this.scene.add(key, rim);

    // root: konum + ölçek (gölge de buna bağlı); spin: yalnızca dönüş.
    this.root = new THREE.Group();
    this.spin = new THREE.Group();
    this.root.add(this.spin);
    this.scene.add(this.root);
    this.shadow = createContactShadow();
    this.shadow.position.y = -BOTTLE_H / 2 - 0.005;
    this.root.add(this.shadow);
    // Koyu sahnede stüdyo arka ışığı: cam bunu süzerek parlar.
    this.glow = createBacklight();
    this.scene.add(this.glow);

    this.models = null; // { amber, clear }
    this.variants = new Map();
    this.current = null;

    this.pose = null; // anlık (sönümlenmiş) poz
    this.target = null; // kaydırmadan gelen hedef poz
    this.offset = { rx: 0, ry: 0, y: 0, s: 0 }; // giriş animasyonu + imleç + sürükleme
    this.size = { w: 0, h: 0 };
    this.active = true;
    this.needsRender = true;
    this.clock = new THREE.Clock();
  }

  async load(onProgress) {
    this.models = await loadModels(this.renderer, onProgress);
    // Tüm modellerin gölgelendiricilerini önceden derle (ilk geçişte takılma olmasın).
    this.spin.add(this.models.amber, this.models.clear);
    this.renderer.compile(this.scene, this.camera);
    this.setModel({ model: 'amber' });
  }

  // visual: { model: 'amber' | 'clear', glass?, liquid? } (bkz. src/data/products.js)
  resolve(visual) {
    const key = `${visual.model}|${visual.glass ?? ''}|${visual.liquid ?? ''}`;
    if (!this.variants.has(key)) this.variants.set(key, makeVariant(this.models[visual.model], visual));
    return this.variants.get(key);
  }

  setModel(visual) {
    const next = this.resolve(visual);
    if (next === this.current && next.parent === this.spin && this.spin.children.length === 1) return;
    this.spin.clear();
    this.spin.add(next);
    this.current = next;
    this.needsRender = true;
  }

  // snap: sönümleme olmadan doğrudan uygula (ör. sayfayla birlikte kayan ürün görseli).
  setTarget(pose, { snap = false } = {}) {
    const t = this.target;
    if (t && POSE_KEYS.every((k) => Math.abs(t[k] - pose[k]) < 1e-5)) return;
    this.target = pose;
    if (!this.pose || snap) this.pose = { ...pose };
    this.needsRender = true;
  }

  // Yeni bir sayfaya geçerken sönümlemeyi atla (şişe önceki konumdan kaymasın).
  jumpTo(pose) {
    this.target = pose;
    this.pose = { ...pose };
    this.needsRender = true;
  }

  setActive(active) {
    if (active !== this.active) {
      this.active = active;
      this.needsRender = true;
    }
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h || (w === this.size.w && h === this.size.h)) return;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  applyPose(p) {
    this.root.position.set(p.x, p.y + this.offset.y, 0);
    this.root.scale.setScalar(Math.max(0.001, p.s + this.offset.s));
    this.spin.rotation.set(p.rx + this.offset.rx, p.ry + this.offset.ry, p.rz);
    this.shadow.material.opacity = p.shadow * (1 - p.t * 0.6);
    this.glow.position.set(p.x, THREE.MathUtils.clamp(p.y, -0.6, 0.6), -3.2);
    this.glow.material.color.setScalar(p.t);
    this.glow.visible = p.t > 0.01;
    this.scene.background.copy(LIGHT_BG).lerp(DARK_BG, p.t);
  }

  // Her karede çağrılır; hareket bittiğinde çizimi atlar.
  tick(offsetMoving = false) {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (!this.target || !this.active) return;

    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
    let moving = offsetMoving || this.needsRender;
    for (const key of POSE_KEYS) {
      const d = this.target[key] - this.pose[key];
      if (Math.abs(d) > 1e-4) {
        this.pose[key] += d * k;
        moving = true;
      } else {
        this.pose[key] = this.target[key];
      }
    }
    if (!moving) return;

    this.applyPose(this.pose);
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  }

  // Belirli bir poz ve modelden kare dışı bir görüntü üretir (küçük görseller, ürün kartları).
  snapshot(pose, { size = 320, dark = false, visual = null } = {}) {
    const prevOffset = { ...this.offset };
    const prevModel = this.current;
    Object.assign(this.offset, { rx: 0, ry: 0, y: 0, s: 0 });
    if (visual) {
      this.spin.clear();
      this.spin.add(this.resolve(visual));
    }

    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.applyPose({ ...pose, t: dark ? 1 : 0 });
    this.renderer.render(this.scene, this.camera);

    const out = document.createElement('canvas');
    out.width = out.height = size;
    out.getContext('2d').drawImage(this.canvas, 0, 0, size, size);
    const url = out.toDataURL('image/webp', 0.9);

    Object.assign(this.offset, prevOffset);
    if (visual) {
      this.spin.clear();
      if (prevModel) this.spin.add(prevModel);
    }
    this.size = { w: 0, h: 0 };
    this.resize();
    if (this.pose) this.applyPose(this.pose);
    this.needsRender = true;
    return url;
  }

  dispose() {
    this.renderer.dispose();
  }
}

function createBacklight() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgb(230,160,92)');
  grad.addColorStop(0.3, 'rgb(150,86,34)');
  grad.addColorStop(0.65, 'rgb(40,20,6)');
  grad.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Toplamalı karışım + opak liste: Three.js transmission geçişi yalnızca opak
  // nesneleri örnekler; böylece cam bu ışığı içinden gösterebilir.
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.MeshBasicMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  mesh.visible = false;
  return mesh;
}

function createContactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(40,24,8,0.55)');
  grad.addColorStop(0.45, 'rgba(40,24,8,0.22)');
  grad.addColorStop(1, 'rgba(40,24,8,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
