// Debug only. Queries are allocated once per context, never in the render loop.
// Read results only on later frames after AVAILABLE; never wait for the GPU.
export function createRenderTimer(gl, slots, accept, invalidate) {
  let extension, active = -1, cursor = 0, started = 0, lost = false;
  const queries = new Array(slots).fill(null);
  const pending = new Uint8Array(slots), timestamps = new Float64Array(slots);
  const timer = { cpuMs: 0, supported: false, begin, end, contextLost, restore, dispose };
  function restore() {
    lost = false;
    extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    timer.supported = !!extension;
    pending.fill(0); active = -1;
    if (extension) for (let i = 0; i < slots; i++) queries[i] = gl.createQuery();
  }
  function begin(timestamp) {
    active = -1;
    if (extension && !lost) {
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
        // Results spanning a disjoint event are invalid, even if available.
        pending.fill(0);
        invalidate('GPU disjoint event; GPU sample invalid (CPU/frame intervals retained).');
      } else {
        for (let i = 0; i < slots; i++) {
          if (pending[i] && gl.getQueryParameter(queries[i], gl.QUERY_RESULT_AVAILABLE)) {
            accept(timestamps[i], gl.getQueryParameter(queries[i], gl.QUERY_RESULT) / 1e6);
            pending[i] = 0;
          }
        }
        if (!pending[cursor]) {
          active = cursor; timestamps[active] = timestamp;
          gl.beginQuery(extension.TIME_ELAPSED_EXT, queries[active]);
          cursor = (cursor + 1) % slots;
        }
      }
    }
    started = performance.now();
  }
  function end() {
    timer.cpuMs = performance.now() - started;
    if (active !== -1 && !lost) { gl.endQuery(extension.TIME_ELAPSED_EXT); pending[active] = 1; }
    active = -1;
  }
  function contextLost() {
    lost = true; active = -1; pending.fill(0); queries.fill(null);
  }
  function dispose() {
    if (!lost) for (const query of queries) if (query) gl.deleteQuery(query);
    queries.fill(null); pending.fill(0);
  }
  restore();
  return timer;
}
