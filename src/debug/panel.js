import GUI from 'lil-gui';
import { ranges, choices, rebuildControls } from '../config.js';
import { createProfiler } from './profiler.js';
import { createRenderTimer } from './renderTimer.js';

export function createDebugPanel({ config, resize, snapshot, renderer, resetTouch, inspectTouch }) {
  const gui = new GUI({ title: 'Walden · M5', width: 280 });
  const profiler = createProfiler(config.diagnostics, snapshot);
  const timer = createRenderTimer(renderer.getContext(), config.diagnostics.querySlots, profiler.recordGpu, profiler.invalidateGpu);
  for (const [name, values] of Object.entries(config)) {
    if (name === 'diagnostics') continue;
    const folder = gui.addFolder(name).close();
    for (const [key, value] of Object.entries(values)) {
      const options = choices[name]?.[key];
      const controller = options ? folder.add(values, key, options) : typeof value === 'string'
        ? folder.addColor(values, key)
        : typeof value === 'number' ? folder.add(values, key, ...ranges[name][key]) : folder.add(values, key);
      if (rebuildControls[name]?.has(key)) controller.name(`${key} (rebuild)`).onFinishChange(resize);
      else controller.onChange(resize);
    }
  }
  const info = { state: 'idle', frames: 0, medianMs: '', p95Ms: '', gpuMs: '', cpuMs: '' };
  const actions = {
    sample: () => profiler.start(),
    loseContext: () => renderer.forceContextLoss(),
    restoreContext: () => renderer.forceContextRestore(),
    resetTouch,
  };
  const diagnostics = gui.addFolder('Diagnostics').close();
  diagnostics.add(actions, 'sample').name('Sample: 10s warmup + 60s');
  diagnostics.add(actions, 'loseContext').name('Lose graphics context');
  diagnostics.add(actions, 'restoreContext').name('Restore graphics context');
  diagnostics.add(actions, 'resetTouch').name('Reset touch field');
  const outputs = Object.keys(info).map(key => diagnostics.add(info, key).disable());
  const interval = setInterval(() => {
    const status = profiler.status();
    info.state = status.state;
    info.frames = status.count;
    info.medianMs = status.result?.medianMs.toFixed(2) ?? '';
    info.p95Ms = status.result?.p95Ms.toFixed(2) ?? '';
    info.gpuMs = status.result?.renderCost.gpu?.medianMs.toFixed(3) ?? (status.result?.renderCost.gpuInvalid ? 'invalid (disjoint)' : timer.supported ? '' : 'unavailable');
    info.cpuMs = status.result?.renderCost.cpuSubmit?.medianMs.toFixed(3) ?? '';
    for (const output of outputs) output.updateDisplay();
  }, config.diagnostics.refreshMs);
  const api = { snapshot, config, apply: resize, sample: actions.sample, sampleStatus: profiler.status,
    loseContext: actions.loseContext, restoreContext: actions.restoreContext, resetTouch, inspectTouch, hidePanel: () => gui.hide(), showPanel: () => gui.show() };
  window.__WALDEN_DEBUG__ = api;
  return {
    begin: timer.begin, end: timer.end,
    contextLost: timer.contextLost, contextRestored: timer.restore,
    record: (timestamp, delta) => profiler.record(timestamp, delta, timer.cpuMs), cancel: profiler.cancel,
    dispose() {
      timer.dispose();
      clearInterval(interval);
      gui.destroy();
      if (window.__WALDEN_DEBUG__ === api) delete window.__WALDEN_DEBUG__;
    },
  };
}
