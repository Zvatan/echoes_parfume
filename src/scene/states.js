// Şişenin sahnedeki pozları. Her poz ekran oranından hesaplanır, böylece
// şişe her ekranda metinle çakışmadan aynı kompozisyonda durur.
//
// x, y   : dünya konumu        s      : ölçek
// rx/ry/rz: dönüş (radyan)     shadow : temas gölgesi opaklığı
// t      : sahne teması (0 açık, 1 koyu)

export const CAMERA = { fov: 30, z: 9 };

export const POSE_KEYS =['x', 'y', 's', 'rx', 'ry', 'rz', 'shadow', 't'];

const BOTTLE_H = 2.73;
const BOTTLE_W = 1.52;
const TAU = Math.PI * 2;

// Kadraj odakları: şişenin merkezine göre yerel yükseklik (Y-yukarı).
export const FOCUS = { whole: 0, turn: 0.1, cap: 1.135, collar: 0.825, label: -0.28 };

export function lerpPose(a, b, k) {
  const out = {};
  for (const key of POSE_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

export function buildStates({ width, height, fov, cameraZ }) {
  const aspect = width / height;
  const visH = 2 * cameraZ * Math.tan((fov * Math.PI) / 360);
  const visW = visH * aspect;
  const wide = aspect >= 1.1 && width >= 860;

  const wx = (f) => (f - 0.5) * visW; // ekran oranı (soldan) → dünya x
  const wy = (f) => (0.5 - f) * visH; // ekran oranı (üstten) → dünya y
  const fit = (fh, fw = 1) => Math.min((fh * visH) / BOTTLE_H, (fw * visW) / BOTTLE_W);
  const base = { x: 0, y: 0, s: 1, rx: 0, ry: 0, rz: 0, shadow: 1, t: 0 };
  const pose = (p) => ({ ...base, ...p });

  // Odak noktası ekranda (xf, yf) konumuna gelecek şekilde ölçeklenmiş yakın plan.
  const focus = (local, s, xf, yf, rot) => pose({ x: wx(xf), y: wy(yf) - local * s, s, t: 1, shadow: 0.5, ...rot });

  if (wide) {
    const hs = fit(0.6);
    const as = fit(0.64);
    const anatomy = {
      whole: pose({ x: wx(0.63), y: wy(0.53), s: as, ry: 0, t: 1, shadow: 0.6 }),
      turn: pose({ x: wx(0.63), y: wy(0.53), s: as * 1.05, rx: 0.1, ry: Math.PI, t: 1, shadow: 0.6 }),
      cap: focus(FOCUS.cap, as * 2.7, 0.63, 0.5, { rx: 0.2, ry: TAU - 0.45 }),
      collar: focus(FOCUS.collar, as * 3.3, 0.63, 0.5, { rx: 0.08, ry: TAU + 0.35 }),
      label: focus(FOCUS.label, as * 1.9, 0.63, 0.5, { ry: TAU }),
    };
    return withOutro(visH, {
      wide,
      visH,
      hero: pose({ x: wx(0.65), y: wy(0.6), s: hs, rx: 0.06, ry: -0.42, rz: 0.03 }),
      storyA: pose({ x: wx(0.7), y: wy(0.56), s: fit(0.62), ry: 0.6, rz: 0.05 }),
      storyB: pose({ x: wx(0.7), y: wy(0.53), s: fit(0.62), ry: -0.6, rz: -0.04 }),
      anatomy,
      exit: { ...anatomy.label, y: anatomy.label.y + visH * 1.2 },
      outro: pose({ x: wx(0.5), y: wy(0.62), s: fit(0.4), rx: 0.04, ry: -0.42 }),
    });
  }

  const as = fit(0.42, 0.62);
  const anatomy = {
    whole: pose({ x: 0, y: wy(0.4), s: as, t: 1, shadow: 0.6 }),
    turn: pose({ x: 0, y: wy(0.4), s: as, rx: 0.1, ry: Math.PI, t: 1, shadow: 0.6 }),
    // Dar ekranda etiket altyazının arkasına düşmesin diye yakın planlarda yana döner.
    cap: focus(FOCUS.cap, as * 1.9, 0.5, 0.34, { rx: 0.2, ry: TAU - 1.7 }),
    collar: focus(FOCUS.collar, as * 2.2, 0.5, 0.34, { rx: 0.08, ry: TAU - 1.3 }),
    label: focus(FOCUS.label, as * 1.45, 0.5, 0.36, { ry: TAU }),
  };
  return withOutro(visH, {
    wide,
    visH,
    hero: pose({ x: 0, y: wy(0.56), s: fit(0.36, 0.6), rx: 0.06, ry: -0.42, rz: 0.03 }),
    storyA: pose({ x: 0, y: wy(0.3), s: fit(0.3, 0.5), ry: 0.6, rz: -0.05 }),
    storyB: pose({ x: 0, y: wy(0.28), s: fit(0.3, 0.5), ry: -0.6, rz: 0.04 }),
    anatomy,
    exit: { ...anatomy.label, y: anatomy.label.y + visH * 1.2 },
    outro: pose({ x: 0, y: wy(0.58), s: fit(0.36, 0.6), rx: 0.04, ry: -0.42 }),
  });
}

// Döngü bölümünde şişe sayfayla birlikte girer ve çıkar (bir ekran = visH).
function withOutro(visH, states) {
  const { outro } = states;
  states.outroIn = { ...outro, y: outro.y - visH, ry: outro.ry - 1.4 };
  states.outroOut = { ...outro, y: outro.y + visH };
  return states;
}

// Parça rafı küçük görselleri için kare kadrajlar (görüş alanı = 1:1).
export function snapshotPoses({ fov, cameraZ }) {
  const visH = 2 * cameraZ * Math.tan((fov * Math.PI) / 360);
  const s0 = (0.84 * visH) / BOTTLE_H;
  const shot = (local, s, rot = {}) => ({ x: 0, y: -local * s, s, rx: 0, ry: 0, rz: 0, shadow: 0.8, t: 0, ...rot });
  return {
    whole: shot(0, s0, { ry: -0.42, rx: 0.06 }),
    turn: shot(0.25, s0 * 1.6, { ry: 1.6 }),
    cap: shot(FOCUS.cap - 0.05, s0 * 3.4, { ry: -0.4, rx: 0.25 }),
    collar: shot(FOCUS.collar, s0 * 4.4, { ry: 0.3, rx: 0.1 }),
    label: shot(FOCUS.label, s0 * 2.2, { ry: 0 }),
  };
}
