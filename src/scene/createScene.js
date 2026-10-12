import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDemoObject } from './objects/createDemoObject.js';

export function createScene(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color('#edf1eb');

  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(4, 3, 6);
  scene.add(camera);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.target.set(0, 0.6, 0);
  controls.update();
  controls.saveState();

  const light = new DirectionalLight('#fff5e5', 3);
  light.position.set(3, 6, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.normalBias = 0.03;
  scene.add(light, new HemisphereLight('#e4f5ff', '#677a62', 2));

  const ground = new Mesh(
    new PlaneGeometry(200, 200),
    new MeshStandardMaterial({ color: '#edf1eb', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  scene.add(ground);

  const demo = createDemoObject();
  scene.add(demo.mesh);

  let motionEnabled = true;
  let previousTime;

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
  }

  function render(time) {
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (motionEnabled) demo.update(delta);
    controls.update(delta);
    renderer.render(scene, camera);
  }

  function syncVisibility() {
    previousTime = undefined;
    renderer.setAnimationLoop(document.hidden ? null : render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncVisibility);
  resize();
  syncVisibility();

  return {
    get motionEnabled() {
      return motionEnabled;
    },
    setMotion(enabled) {
      motionEnabled = enabled;
    },
    resetView() {
      controls.reset();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncVisibility);
      controls.dispose();
      demo.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      light.shadow.dispose();
      renderer.dispose();
    },
  };
}
