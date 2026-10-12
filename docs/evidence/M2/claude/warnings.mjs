// Attribute WebGL console warnings to lifecycle phases. Usage: node warnings.mjs <port> <configPath>
import { connect, sleep } from './cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const [port, cfgPath, label] = process.argv.slice(2);
const c = await connect();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const count = () => c.events.filter(e => e.method === 'Log.entryAdded' && ['warning', 'error'].includes(e.params.entry.level) || e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['warn', 'error'].includes(e.params.type))).length;
const phases = {};
await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` }); await sleep(2000);
phases.load = count();
for (let i = 0; i < 3; i++) { await c.ev('__WALDEN_DEBUG__.loseContext()'); await sleep(500); await c.ev('__WALDEN_DEBUG__.restoreContext()'); await sleep(1000); }
phases.afterContext = count();
const original = await readFile(cfgPath);
try { await writeFile(cfgPath, Buffer.concat([original, Buffer.from('\n// review HMR probe\n')])); await sleep(1500); } finally { await writeFile(cfgPath, original); await sleep(1500); }
phases.afterHmrWithPriorRestore = count();
await c.send('Page.reload'); await sleep(2000);
const base = count();
try { await writeFile(cfgPath, Buffer.concat([original, Buffer.from('\n// review HMR probe 2\n')])); await sleep(1500); } finally { await writeFile(cfgPath, original); await sleep(1500); }
phases.hmrWithoutRestoreDelta = count() - base;
const sample = c.events.filter(e => e.method === 'Log.entryAdded').slice(0, 2).map(e => e.params.entry.text);
const restoredOk = await c.ev('({frames:__WALDEN_DEBUG__.snapshot().frames, running:__WALDEN_DEBUG__.snapshot().running})');
const result = { label, phases, sample, restoredOk };
await writeFile(new URL(`warnings-${label}.json`, import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
c.close();
