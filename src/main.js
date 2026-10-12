import './styles.css';
import { createScene } from './scene/createScene.js';

const canvas = document.querySelector('#scene');
const toolbar = document.querySelector('#scene-controls');
const errorMessage = document.querySelector('#scene-error');
const motionButton = document.querySelector('#toggle-motion');
const resetButton = document.querySelector('#reset-view');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let experience;

function setMotion(enabled) {
  experience.setMotion(enabled);
  motionButton.textContent = enabled ? 'Pause motion' : 'Resume motion';
}

function toggleMotion() {
  setMotion(!experience.motionEnabled);
}

function syncMotionPreference() {
  setMotion(!reducedMotion.matches);
}

function resetView() {
  experience.resetView();
}

try {
  experience = createScene(canvas);
  syncMotionPreference();
  motionButton.addEventListener('click', toggleMotion);
  resetButton.addEventListener('click', resetView);
  reducedMotion.addEventListener('change', syncMotionPreference);
  toolbar.hidden = false;
} catch (error) {
  console.error('Unable to initialize the Three.js scene.', error);
  canvas.hidden = true;
  errorMessage.hidden = false;
}

// Release GPU resources and event listeners before Vite replaces this module.
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    motionButton.removeEventListener('click', toggleMotion);
    resetButton.removeEventListener('click', resetView);
    reducedMotion.removeEventListener('change', syncMotionPreference);
    experience?.dispose();
    toolbar.hidden = true;
    errorMessage.hidden = true;
    canvas.hidden = false;
  });
}
