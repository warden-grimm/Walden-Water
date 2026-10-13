// M8 r1 blocker retest (reviewer's reproduction, port 5174): saved settings survive an HMR of main.js; Save keeps both values; Reset restores defaults.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const out = {};
const st = () => c.ev("localStorage.getItem('walden.settings.v1')");
const cfg = () => c.ev("({shaft:__WALDEN_DEBUG__.config.shaft.intensity, refl:__WALDEN_DEBUG__.config.pool.reflectivity, saved:__WALDEN_DEBUG__.snapshot().savedSettings})");
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(3000);
  await c.ev('void __WALDEN_DEBUG__.resetSettings()'); await sleep(300);
  out.defaults = await cfg();
  await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.config.shaft.intensity=0.2;d.apply();})()");
  await c.ev('void __WALDEN_DEBUG__.saveSettings()'); await sleep(500);
  out.afterSave1 = await st();
  await writeFile('src/main.js', await readFile('src/main.js'));
  await sleep(4000);
  out.afterHmr = await cfg();
  await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.config.pool.reflectivity=1.4;d.apply();})()");
  await c.ev('void __WALDEN_DEBUG__.saveSettings()'); await sleep(500);
  out.afterSave2 = await st();
  await c.ev('void __WALDEN_DEBUG__.resetSettings()'); await sleep(300);
  out.afterReset = { stored: await st(), ...(await cfg()) };
  // Fresh load to confirm cleanup.
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await sleep(3000);
  await c.ev('void __WALDEN_DEBUG__.resetSettings()'); await sleep(300);
  out.cleanup = { stored: await st(), ...(await cfg()) };
  await writeFile(new URL('./hmr-settings.json', import.meta.url), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  const ok = out.afterSave2 === JSON.stringify({ shaft: { intensity: 0.2 }, pool: { reflectivity: 1.4 } }) && out.afterReset.stored === null && out.afterReset.shaft === out.defaults.shaft && out.afterReset.refl === out.defaults.refl;
  console.log('pass:', ok); if (!ok) process.exitCode = 1;
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
