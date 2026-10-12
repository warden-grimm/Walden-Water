// Minimal CDP helper for the M1 review (Edge on :9334).
export async function connect(targetId) {
  const list = await (await fetch('http://127.0.0.1:9334/json/list')).json();
  const t = targetId ? list.find(x => x.id === targetId) : list.find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const events = [];
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
    else if (d.method) events.push(d);
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  };
  return { send, ev, events, ws, target: t, close: () => ws.close() };
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function browserSend(method, params = {}) {
  const v = await (await fetch('http://127.0.0.1:9334/json/version')).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  const res = await new Promise((res, rej) => { ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id === 1) d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }); ws.send(JSON.stringify({ id: 1, method, params })); });
  ws.close(); return res;
}
