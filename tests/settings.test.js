import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { applySettings, loadSavedSettings, resetSettings, saveSettings, settingsDiff, SETTINGS_KEY } from '../src/settings.js';

function memoryStore() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), removeItem: key => items.delete(key), items };
}

test('save stores only changed values and a fresh page loads them', () => {
  const defaults = structuredClone(config), edited = structuredClone(config), store = memoryStore();
  edited.pool.reflectivity = 1.4; edited.shaft.view = 'depth'; edited.mist.color = '#aabbcc'; edited.camera.drift = false;
  edited.diagnostics.sampleSeconds = 5; // never saved
  const { diff, stored } = saveSettings(edited, defaults, store);
  assert.ok(stored);
  assert.deepEqual(diff, { camera: { drift: false }, shaft: { view: 'depth' }, pool: { reflectivity: 1.4 }, mist: { color: '#aabbcc' } });
  const page = structuredClone(defaults);
  assert.equal(loadSavedSettings(page, store), 4);
  assert.deepEqual(settingsDiff(page, defaults), diff);
});

test('saved values are validated against this build', () => {
  const page = structuredClone(config);
  const applied = applySettings(page, {
    pool: { reflectivity: 99, view: 'nope', color: 'red', unknownKey: 1, gloss: '50' },
    shaft: { intensity: -1, enabled: 'yes' }, nope: { x: 1 }, diagnostics: { sampleSeconds: 1 },
  });
  assert.equal(applied, 2);
  assert.equal(page.pool.reflectivity, 4); // clamped to the GUI range
  assert.equal(page.shaft.intensity, 0);
  assert.equal(page.pool.view, config.pool.view);
  assert.equal(page.pool.color, config.pool.color);
  assert.equal(page.diagnostics.sampleSeconds, config.diagnostics.sampleSeconds);
  const store = memoryStore(); store.setItem(SETTINGS_KEY, '{not json');
  assert.equal(loadSavedSettings(structuredClone(config), store), 0);
});

test('reset restores defaults and forgets the saved settings; saving defaults clears storage', () => {
  const defaults = structuredClone(config), edited = structuredClone(config), store = memoryStore();
  edited.pool.reflectivity = 2.2; edited.bursts.rim = 3;
  saveSettings(edited, defaults, store);
  resetSettings(edited, defaults, store);
  assert.deepEqual(settingsDiff(edited, defaults), {});
  assert.equal(store.items.size, 0);
  saveSettings(edited, defaults, store);
  assert.equal(store.items.size, 0);
  // Blocked storage still returns the snippet.
  edited.pool.reflectivity = 1;
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(saveSettings(edited, defaults, blocked), { diff: { pool: { reflectivity: 1 } }, stored: false });
});
