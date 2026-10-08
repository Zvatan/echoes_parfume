import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildStates, lerpPose, CAMERA } from '../scene/states.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const easeInOut = (v) => smooth(0, 1, v);
const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);

// Sayfa akışı:  hero → hikâye (sabit) → ürün (sabit, koyu) → koku profili → döngü
// Her bölüm bir ScrollTrigger'dır; şişenin hedef pozu, ilerlemesi > 0 olan
// en son bölümden hesaplanır. Böylece geri kaydırmada da hep aynı sonuç çıkar.
export function initChoreography({ scene, ui, reducedMotion, scrollTo }) {
  const steps = ui.anatomySteps; // ['whole', 'turn', 'cap', 'collar', 'label']
  const storyCount = ui.storyCount;
  const vh = () => window.innerHeight;
  let states = null;

  const hero = ScrollTrigger.create({ trigger: '.hero', start: 'top top', endTrigger: '.story', end: 'top top' });
  const story = ScrollTrigger.create({
    trigger: '.story',
    start: 'top top',
    end: () => `+=${vh() * storyCount * 0.75}`,
    pin: true,
  });
  const toAnatomy = ScrollTrigger.create({ trigger: '.anatomy', start: 'top bottom', end: 'top top' });
  const anatomy = ScrollTrigger.create({
    trigger: '.anatomy',
    start: 'top top',
    end: () => `+=${vh() * (steps.length - 1) * 0.9}`,
    pin: true,
  });
  const exit = ScrollTrigger.create({ trigger: '.profile', start: 'top bottom', end: 'top top' });
  const outro = ScrollTrigger.create({ trigger: '.outro', start: 'top bottom', end: 'top top' });
  const leave = ScrollTrigger.create({ trigger: '.outro', start: 'top top', end: 'bottom top' });
  const covered = ScrollTrigger.create({ trigger: '.profile', start: 'top top', endTrigger: '.outro', end: 'top bottom' });

  const rebuild = () => {
    const w = scene ? scene.size.w || window.innerWidth : window.innerWidth;
    const h = scene ? scene.size.h || window.innerHeight : window.innerHeight;
    states = buildStates({ width: w, height: h, fov: CAMERA.fov, cameraZ: CAMERA.z });
  };
  ScrollTrigger.addEventListener('refreshInit', () => scene?.resize());
  ScrollTrigger.addEventListener('refresh', rebuild);
  rebuild();

  function anatomyPose(p) {
    const f = p * (steps.length - 1);
    const i = Math.min(Math.floor(f), steps.length - 2);
    const local = f - i;
    // Her adımın başında ve sonunda kısa bir bekleme: kadraj okunabilsin.
    const k = reducedMotion ? (local < 0.5 ? 0 : 1) : smooth(0.18, 0.82, local);
    return {
      pose: lerpPose(states.anatomy[steps[i]], states.anatomy[steps[i + 1]], k),
      step: Math.round(i + k),
    };
  }

  let lastStory = -1;
  let lastStep = -1;
  let lastTheme = -1;

  function evaluate() {
    let pose;
    let step = 0;
    let heroWeight = 0;

    if (leave.progress > 0) {
      pose = lerpPose(states.outro, states.outroOut, leave.progress);
      step = steps.length - 1;
    } else if (outro.progress > 0) {
      // Konum sayfayla doğrusal (yapışık), dönüş yumuşak biter.
      pose = lerpPose(states.outroIn, states.outro, outro.progress);
      pose.ry = states.outroIn.ry + (states.outro.ry - states.outroIn.ry) * easeOut(outro.progress);
      step = steps.length - 1;
    } else if (exit.progress > 0) {
      pose = lerpPose(states.anatomy.label, states.exit, exit.progress);
      // Koyu zemin, açık bölüm ekranı neredeyse tamamen örtene kadar korunur.
      pose.t = 1 - smooth(0.9, 1, exit.progress);
      step = steps.length - 1;
    } else if (anatomy.progress > 0) {
      ({ pose, step } = anatomyPose(anatomy.progress));
    } else if (toAnatomy.progress > 0) {
      pose = lerpPose(states.storyB, states.anatomy.whole, easeInOut(toAnatomy.progress));
      // Arka plan, hikâye metni ekrandan çıkarken koyulaşır.
      pose.t = smooth(0.4, 0.9, toAnatomy.progress);
    } else if (story.progress > 0) {
      pose = lerpPose(states.storyA, states.storyB, easeInOut(story.progress));
    } else {
      pose = lerpPose(states.hero, states.storyA, easeInOut(hero.progress));
      heroWeight = 1 - smooth(0, 0.35, hero.progress);
    }

    const chapter = Math.min(storyCount - 1, Math.floor(story.progress * storyCount));
    if (chapter !== lastStory) ui.setChapter((lastStory = chapter));
    if (step !== lastStep) ui.setStep((lastStep = step));

    const theme = Math.round(pose.t * 100) / 100;
    if (theme !== lastTheme) {
      lastTheme = theme;
      document.documentElement.style.setProperty('--theme', theme);
      document.documentElement.dataset.theme = theme > 0.5 ? 'dark' : 'light';
    }

    if (scene) {
      scene.setActive(!covered.isActive);
      scene.setTarget(pose);
    }
    return { heroWeight, inAnatomy: anatomy.isActive };
  }

  function goToStep(i) {
    const y = anatomy.start + (i / (steps.length - 1)) * (anatomy.end - anatomy.start);
    scrollTo(y);
  }

  return { evaluate, goToStep, rebuild };
}
