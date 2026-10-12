import GUI from 'lil-gui';
import { ranges } from '../config.js';
import { createProfiler } from './profiler.js';

export function createDebugPanel({ config, resize, snapshot, renderer }) {
  const gui = new GUI({ title: 'Walden · M1', width: 280 });
  const profiler = createProfiler(config.diagnostics, snapshot);
  for (const [name, values] of Object.entries(config)) {
    if (name === 'diagnostics') continue;
    const folder = gui.addFolder(name).close();
    for (const [key, value] of Object.entries(values)) {
      const controller = typeof value === 'string'
        ? folder.addColor(values, key)
        : typeof value === 'number' ? folder.add(values, key, ...ranges[name][key]) : folder.add(values, key);
      controller.onChange(resize);
    }
  }
  const info = { state: 'idle', frames: 0, medianMs: '', p95Ms: '' };
  const actions = {
    sample: () => profiler.start(),
    loseContext: () => renderer.forceContextLoss(),
    restoreContext: () => renderer.forceContextRestore(),
  };
  const diagnostics = gui.addFolder('Diagnostics').close();
  diagnostics.add(actions, 'sample').name('Sample: 10s warmup + 60s');
  diagnostics.add(actions, 'loseContext').name('Lose graphics context');
  diagnostics.add(actions, 'restoreContext').name('Restore graphics context');
  const outputs = Object.keys(info).map(key => diagnostics.add(info, key).disable());
  const interval = setInterval(() => {
    const status = profiler.status();
    info.state = status.state;
    info.frames = status.count;
    info.medianMs = status.result?.medianMs.toFixed(2) ?? '';
    info.p95Ms = status.result?.p95Ms.toFixed(2) ?? '';
    for (const output of outputs) output.updateDisplay();
  }, config.diagnostics.refreshMs);
  const api = { snapshot, config, apply: resize, sample: actions.sample, sampleStatus: profiler.status,
    loseContext: actions.loseContext, restoreContext: actions.restoreContext, hidePanel: () => gui.hide(), showPanel: () => gui.show() };
  window.__WALDEN_DEBUG__ = api;
  return {
    record: profiler.record, cancel: profiler.cancel,
    dispose() {
      clearInterval(interval);
      gui.destroy();
      if (window.__WALDEN_DEBUG__ === api) delete window.__WALDEN_DEBUG__;
    },
  };
}
