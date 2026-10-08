import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import AMBER_GLB from '../assets/echoes_perfume_bottle.glb?url';
import CLEAR_OBJ from '../assets/echoes_perfume_3d/ECHOES_perfume_bottle.obj?raw';
import CLEAR_MTL from '../assets/echoes_perfume_3d/ECHOES_perfume_bottle.mtl?raw';

// Tüm modeller aynı ölçüye getirilir: Y-yukarı, yükseklik 2.73, taban y=-1.365,
// ön yüz (etiket) +Z yönünde (kameraya bakar).
export const BOTTLE_H = 2.73;
const crease = (g, deg = 40) => toCreasedNormals(g, THREE.MathUtils.degToRad(deg));

// --- Amber şişe (echoes_perfume_bottle.glb) ---------------------------------
// GLB ölçüleri (Z-yukarı): taban z=0.10, kapak tepesi z=2.83, gövde yarıçapı 0.76.
const AMBER_MID = 1.465;
const AMBER_RADIUS = 0.76;

async function loadAmber(renderer, onProgress) {
  const gltf = await new GLTFLoader().loadAsync(AMBER_GLB, (e) => e.total && onProgress?.(e.loaded / e.total));
  const model = gltf.scene;
  model.rotation.x = -Math.PI / 2;
  model.position.y = -AMBER_MID;

  const meshes = [];
  model.traverse((o) => o.isMesh && meshes.push(o));
  for (const mesh of meshes) {
    const name = mesh.name;
    if (name.startsWith('Label')) {
      mesh.geometry = wrapLabel(mesh.geometry);
      const map = mesh.material.map;
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mesh.material = new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });
      // Etiketin arka yüzü cam içinden görünür: baskısız krem kâğıt.
      mesh.add(new THREE.Mesh(mesh.geometry, new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.8, side: THREE.BackSide })));
      continue;
    }
    // Normal verisi olmayan geometri: keskin kenarları koruyarak normal hesapla.
    mesh.geometry.deleteAttribute('color');
    mesh.geometry = crease(mesh.geometry);

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
      mesh.userData.role = 'glass';
    } else if (name.startsWith('Perfume')) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: '#ab6c2b', // modeldeki sıvı rengi
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        emissive: '#4a2208',
        emissiveIntensity: 0.35,
      });
      mesh.userData.role = 'liquid';
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
  const root = new THREE.Group();
  root.add(model);
  return root;
}

// --- Şeffaf dikdörtgen şişe (echoes_perfume_3d/ECHOES_perfume_bottle.obj + .mtl) ---
// OBJ ölçüleri (Z-yukarı): taban z=0, kapak tepesi z=11.65; etiket +Y yönüne bakıyor.
// Dosyada UV/normal ve nesne grubu yok; materyaller: Glass, Liquid, Metal, Label, Ink.
const CLEAR_TOP = 11.65;

function loadClear() {
  const mtl = new MTLLoader().parse(CLEAR_MTL, '');
  // MTL'deki Kd değerleri sRGB renk olarak yorumlanır.
  const kd = (name) => {
    const [r, g, b] = mtl.materialsInfo[name]?.kd ?? [1, 1, 1];
    return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  };

  const obj = new OBJLoader().parse(CLEAR_OBJ);
  const source = obj.children[0];
  const geo = source.geometry;
  const mats = Array.isArray(source.material) ? source.material : [source.material];

  const pbr = {
    Glass: () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 1,
        thickness: 0.25,
        roughness: 0.04,
        ior: 1.5,
        attenuationColor: kd('Glass'), // MTL: Kd 0.92 0.95 0.98 — hafif soğuk tonlu cam
        attenuationDistance: 2.5,
        specularIntensity: 1,
        envMapIntensity: 1.2,
        // Yarı saydam sıvı camdan sonra çizilir; camın derinlik yazması sıvıyı gizlerdi.
        depthWrite: false,
      });
      return m;
    },
    // MTL: Kd 0.88 0.84 0.70 (uçuk altın), d 0.72 — yarı saydam sıvı.
    Liquid: () =>
      new THREE.MeshPhysicalMaterial({
        color: kd('Liquid'),
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        emissive: kd('Liquid').multiplyScalar(0.12),
        transparent: true,
        opacity: mtl.materialsInfo.Liquid?.d != null ? Number(mtl.materialsInfo.Liquid.d) : 0.72,
        depthWrite: false,
      }),
    Metal: () => new THREE.MeshStandardMaterial({ color: kd('Metal'), metalness: 1, roughness: 0.28 }),
    Label: () => new THREE.MeshStandardMaterial({ color: kd('Label'), roughness: 0.75 }),
    Ink: () => new THREE.MeshStandardMaterial({ color: kd('Ink'), roughness: 0.6 }),
  };

  const model = new THREE.Group();
  for (const group of geo.groups) {
    const name = mats[group.materialIndex].name;
    const part = sliceGroup(geo, group);
    const mesh = new THREE.Mesh(crease(part, 35), (pbr[name] ?? pbr.Label)());
    mesh.name = name;
    if (name === 'Glass') mesh.userData.role = 'glass';
    if (name === 'Liquid') {
      mesh.userData.role = 'liquid';
      mesh.renderOrder = 1; // camdan sonra
    }
    // Modeldeki logo ve "ECHOES" yazısı ayna görüntüsü olarak modellenmiş: etiketin dış
    // yüzünden bakıldığında ters okunuyor ve amblemin açıklığı sola bakıyor. Yalnızca bu
    // katman etiket merkezine (x=0) göre yatay aynalanır; konumu ve boyutu değişmez.
    if (name === 'Ink') mesh.scale.x = -1;
    model.add(mesh);
  }
  model.rotation.x = -Math.PI / 2;
  model.position.y = -CLEAR_TOP / 2;

  const scaled = new THREE.Group();
  scaled.add(model);
  scaled.scale.setScalar(BOTTLE_H / CLEAR_TOP);
  // OBJ'de etiket +Y'ye bakıyor; X döndürmesinden sonra -Z'ye düşer, kameraya çevir.
  scaled.rotation.y = Math.PI;
  const root = new THREE.Group();
  root.add(scaled);
  return root;
}

function sliceGroup(geo, { start, count }) {
  const out = new THREE.BufferGeometry();
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.getAttribute('position');
  out.setAttribute('position', new THREE.BufferAttribute(pos.array.slice(start * 3, (start + count) * 3), 3));
  return out;
}

// --- Kayıt ve renk varyantları --------------------------------------------------

export async function loadModels(renderer, onProgress) {
  const amber = await loadAmber(renderer, onProgress);
  const clear = loadClear();
  return { amber, clear };
}

// Örnek ürünler için aynı şişenin farklı cam/sıvı tonları (geometri paylaşılır).
export function makeVariant(base, { glass, liquid } = {}) {
  if (!glass && !liquid) return base;
  const copy = base.clone(true);
  copy.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.role === 'glass' && glass) {
      o.material = o.material.clone();
      o.material.attenuationColor.set(glass);
    } else if (o.userData.role === 'liquid' && liquid) {
      o.material = o.material.clone();
      o.material.color.set(liquid);
      o.material.emissive.set(liquid).multiplyScalar(0.25);
    }
  });
  return copy;
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
  const radius = AMBER_RADIUS + 0.006;
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
    guv.setXY(i, bilerp(c00.u, c10.u, c01.u, c11.u, tx, tz), bilerp(c00.v, c10.v, c01.v, c11.v, tx, tz));
  }
  geo.computeVertexNormals();
  return geo;
}

function bilerp(a00, a10, a01, a11, tx, tz) {
  return (a00 * (1 - tx) + a10 * tx) * (1 - tz) + (a01 * (1 - tx) + a11 * tx) * tz;
}
