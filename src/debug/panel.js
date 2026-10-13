import GUI from 'lil-gui';
import { ranges, choices, rebuildControls } from '../config.js';
import { createProfiler } from './profiler.js';
import { createRenderTimer } from './renderTimer.js';

export function createDebugPanel({ config, resize, snapshot, renderer, resetTouch, inspectTouch, settings }) {
  const gui = new GUI({ title: 'Walden · M8', width: 280 });
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
  // Save/reset: the normal page in this browser uses saved settings; the snippet
  // can be pasted to the builder to make them the shipped defaults.
  let snippet = null;
  function closeSnippet() { snippet?.remove(); snippet = null; }
  function showSnippet(text, stored, copied) {
    closeSnippet();
    snippet = document.createElement('div');
    snippet.className = 'settings-snippet';
    const message = document.createElement('p');
    message.textContent = `${stored ? 'Saved in this browser: the normal page here now uses these settings.' : 'Could not save in this browser (storage blocked).'} `
      + `${copied ? 'Copied to the clipboard.' : 'Copy the text below.'} Send it to make these the defaults for everyone.`;
    const area = document.createElement('textarea');
    area.readOnly = true; area.value = text; area.rows = Math.min(16, text.split('\n').length + 1);
    const close = document.createElement('button');
    close.textContent = 'Close'; close.onclick = closeSnippet;
    snippet.append(message, area, close);
    document.body.append(snippet);
    area.select();
  }
  const saving = {
    save: async () => {
      const { diff, stored } = settings.save();
      const text = JSON.stringify(diff, null, 2);
      let copied = false;
      // Copy only from a real click; without user activation the browser would prompt or block.
      if (navigator.userActivation?.isActive !== false) {
        try { await navigator.clipboard.writeText(text); copied = true; } catch { /* clipboard blocked: the text stays selectable */ }
      }
      showSnippet(text, stored, copied);
    },
    reset: () => {
      settings.reset();
      closeSnippet();
      resize();
      for (const controller of gui.controllersRecursive()) controller.updateDisplay();
    },
  };
  gui.add(saving, 'save').name('Save settings (this browser + copy)');
  gui.add(saving, 'reset').name('Reset to defaults');
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
  const api = { snapshot, config, apply: resize, saveSettings: saving.save, resetSettings: saving.reset, sample: actions.sample, sampleStatus: profiler.status,
    loseContext: actions.loseContext, restoreContext: actions.restoreContext, resetTouch, inspectTouch, hidePanel: () => gui.hide(), showPanel: () => gui.show() };
  window.__WALDEN_DEBUG__ = api;
  return {
    begin: timer.begin, end: timer.end,
    contextLost: timer.contextLost, contextRestored: timer.restore,
    record: (timestamp, delta) => profiler.record(timestamp, delta, timer.cpuMs), cancel: profiler.cancel,
    dispose() {
      timer.dispose();
      clearInterval(interval);
      closeSnippet();
      gui.destroy();
      if (window.__WALDEN_DEBUG__ === api) delete window.__WALDEN_DEBUG__;
    },
  };
}
