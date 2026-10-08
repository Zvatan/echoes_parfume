import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { POSE_KEYS, CAMERA } from './states.js';

const MODEL_URL = '/models/echoes_perfume_bottle.glb';

// GLB ölçüleri (Z-yukarı): taban z=0.10, kapak tepesi z=2.83, gövde yarıçapı 0.76.
const BOTTLE_MID = 1.465;
const BODY_RADIUS = 0.76;

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
    this.root.add(this.shadow);
    // Koyu sahnede stüdyo arka ışığı: cam bunu süzerek amber parlar.
    this.glow = createBacklight();
    this.scene.add(this.glow);

    this.pose = null; // anlık (sönümlenmiş) poz
    this.target = null; // kaydırmadan gelen hedef poz
    this.offset = { rx: 0, ry: 0, y: 0, s: 0 }; // giriş animasyonu + imleç + sürükleme
    this.size = { w: 0, h: 0 };
    this.active = true;
    this.needsRender = true;
    this.clock = new THREE.Clock();
  }

  async load(onProgress) {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL, (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    });
    const model = gltf.scene;
    // Z-yukarı modeli Y-yukarıya çevir; etiket +Z'ye (kameraya) bakar.
    model.rotation.x = -Math.PI / 2;
    model.position.y = -BOTTLE_MID;
    this.applyMaterials(model);
    this.spin.add(model);
    this.shadow.position.y = 0.1 - BOTTLE_MID - 0.005;
    this.renderer.compile(this.scene, this.camera);
  }

  applyMaterials(model) {
    const meshes = [];
    model.traverse((o) => o.isMesh && meshes.push(o));

    for (const mesh of meshes) {
      const name = mesh.name;
      if (name.startsWith('Label')) {
        mesh.geometry = wrapLabel(mesh.geometry);
        const map = mesh.material.map;
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        mesh.material = new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });
        // Etiketin arka yüzü cam içinden görünür: baskısız krem kâğıt.
        const back = new THREE.Mesh(mesh.geometry, new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.8, side: THREE.BackSide }));
        mesh.add(back);
        continue;
      }

      // Normal verisi olmayan geometri: keskin kenarları koruyarak normal hesapla.
      mesh.geometry.deleteAttribute('color');
      mesh.geometry = toCreasedNormals(mesh.geometry, THREE.MathUtils.degToRad(40));

      if (name.startsWith('Bottle')) {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          transmission: 1,
          thickness: 0.6,
          roughness: 0.03,
          ior: 1.5,
          attenuationColor: '#be9158', // modeldeki gövde rengi
          attenuationDistance: 0.32,
          specularIntensity: 1,
          envMapIntensity: 1.1,
        });
      } else if (name.startsWith('Perfume')) {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: '#ab6c2b', // modeldeki sıvı rengi
          roughness: 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          emissive: '#4a2208',
          emissiveIntensity: 0.35,
        });
        // Sıvı, camın iç yüzeyine değmesin.
        mesh.scale.set(0.985, 0.985, 1);
      } else if (name.startsWith('Collar')) {
        mesh.material = new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.22 });
      } else if (name.startsWith('Cap')) {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: '#161615',
          roughness: 0.62,
          clearcoat: 0.12,
          clearcoatRoughness: 0.6,
          envMapIntensity: 0.7,
        });
        // Kapak ile boyun camı aynı yarıçapta (0.32) üst üste biniyor; titreşimi önlemek için
        // kapak radyal olarak çok az genişletildi.
        mesh.scale.set(1.015, 1.015, 1);
      }
    }
  }

  setTarget(pose) {
    const t = this.target;
    if (t && POSE_KEYS.every((k) => Math.abs(t[k] - pose[k]) < 1e-5)) return;
    this.target = pose;
    if (!this.pose) this.pose = { ...pose };
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
    if (w === this.size.w && h === this.size.h) return;
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

  // Belirli bir pozdan kare dışı bir görüntü üretir (parça rafı ve kart görselleri için).
  snapshot(pose, { size = 320, dark = false } = {}) {
    const prevOffset = { ...this.offset };
    Object.assign(this.offset, { rx: 0, ry: 0, y: 0, s: 0 });

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
    this.size = { w: 0, h: 0 };
    this.resize();
    return url;
  }

  dispose() {
    this.renderer.dispose();
  }
}

// Modeldeki düz etiket, silindirik gövdenin kenarlarında camın dışına taşıyor.
// Aynı UV'leri koruyarak etiketi gövde yüzeyine sarıyoruz (doku ve logo değişmez).
function wrapLabel(flat) {
  const pos = flat.getAttribute('position');
  const uv = flat.getAttribute('uv');
  const pts = [];
  for (let i = 0; i < pos.count; i++) {
    pts.push({ x: pos.getX(i), z: pos.getZ(i), u: uv.getX(i), v: uv.getY(i) });
  }
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z));
  const maxZ = Math.max(...pts.map((p) => p.z));
  const corner = (cx, cz) => pts.reduce((a, b) => (Math.hypot(b.x - cx, b.z - cz) < Math.hypot(a.x - cx, a.z - cz) ? b : a));
  const c00 = corner(minX, minZ);
  const c10 = corner(maxX, minZ);
  const c01 = corner(minX, maxZ);
  const c11 = corner(maxX, maxZ);

  const side = Math.sign(pos.getY(0)) || -1; // etiket düzlemi y=-0.715 → -Y yönüne bakıyor
  const radius = BODY_RADIUS + 0.006;
  const width = maxX - minX;
  const geo = new THREE.PlaneGeometry(width, maxZ - minZ, 48, 1);
  const gp = geo.getAttribute('position');
  const guv = geo.getAttribute('uv');

  for (let i = 0; i < gp.count; i++) {
    const tx = (gp.getX(i) + width / 2) / width;
    const tz = gp.getY(i) / (maxZ - minZ) + 0.5;
    // Yay uzunluğu = düz etiketteki x mesafesi; model uzayında gövde ekseni Z, etiket yüzü yönü.
    const angle = gp.getX(i) / radius;
    gp.setXYZ(i, radius * Math.sin(angle), side * radius * Math.cos(angle), minZ + tz * (maxZ - minZ));
    const u = bilerp(c00.u, c10.u, c01.u, c11.u, tx, tz);
    const v = bilerp(c00.v, c10.v, c01.v, c11.v, tx, tz);
    guv.setXY(i, u, v);
  }
  geo.computeVertexNormals();
  return geo;
}

function bilerp(a00, a10, a01, a11, tx, tz) {
  return (a00 * (1 - tx) + a10 * tx) * (1 - tz) + (a01 * (1 - tx) + a11 * tx) * tz;
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
