// Debug settings saved in this browser. Saved values are changes from the
// shipped defaults; they are validated and applied to config before the scene
// is created, so the normal page (without ?debug) uses them too. The same diff
// is offered as a snippet that can be baked into src/config.js for everyone.
import { choices, ranges } from './config.js';

export const SETTINGS_KEY = 'walden.settings.v1';
// Fixed diagnostic protocol, never saved.
const EXCLUDED = new Set(['diagnostics']);
const COLOR = /^#[0-9a-f]{6}$/i;

function storage() {
  try { return window.localStorage; } catch { return null; }
}

// Changed values only, as { group: { key: value } }.
export function settingsDiff(config, defaults) {
  const diff = {};
  for (const [group, values] of Object.entries(defaults)) {
    if (EXCLUDED.has(group)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (config[group]?.[key] !== value) (diff[group] ??= {})[key] = config[group][key];
    }
  }
  return diff;
}

// One saved value if it is still valid for this build, else undefined: known
// group/key, same type, numbers clamped to the GUI range, listed choices only.
function validValue(group, key, value, current) {
  if (typeof value !== typeof current) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const range = ranges[group]?.[key];
    return range ? Math.min(range[1], Math.max(range[0], value)) : value;
  }
  if (typeof value === 'string') {
    const options = choices[group]?.[key];
    if (options) return options.includes(value) ? value : undefined;
    return COLOR.test(value) ? value : undefined;
  }
  return typeof value === 'boolean' ? value : undefined;
}

// Applies saved values to config; returns how many were applied.
export function applySettings(config, saved) {
  let applied = 0;
  if (!saved || typeof saved !== 'object') return applied;
  for (const [group, values] of Object.entries(saved)) {
    if (EXCLUDED.has(group) || !config[group] || !values || typeof values !== 'object') continue;
    for (const [key, value] of Object.entries(values)) {
      if (!(key in config[group])) continue;
      const valid = validValue(group, key, value, config[group][key]);
      if (valid !== undefined) { config[group][key] = valid; applied++; }
    }
  }
  return applied;
}

export function loadSavedSettings(config, store = storage()) {
  try {
    const text = store?.getItem(SETTINGS_KEY);
    return text ? applySettings(config, JSON.parse(text)) : 0;
  } catch { return 0; }
}

// Stores the diff in this browser; returns it with whether storing succeeded.
export function saveSettings(config, defaults, store = storage()) {
  const diff = settingsDiff(config, defaults);
  let stored = false;
  try {
    if (Object.keys(diff).length) store.setItem(SETTINGS_KEY, JSON.stringify(diff));
    else store.removeItem(SETTINGS_KEY);
    stored = true;
  } catch { /* private mode or blocked storage: the snippet still works */ }
  return { diff, stored };
}

// Restores every value to its shipped default and forgets the saved settings.
export function resetSettings(config, defaults, store = storage()) {
  for (const [group, values] of Object.entries(defaults)) {
    if (!EXCLUDED.has(group)) Object.assign(config[group], structuredClone(values));
  }
  try { store?.removeItem(SETTINGS_KEY); } catch { /* nothing saved to forget */ }
}
