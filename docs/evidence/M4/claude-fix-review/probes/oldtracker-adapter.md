Reproduction of the "new tests prove the bug" check (scratch dir removed after run):
1. git archive HEAD src tests package.json into scratch/oldtracker; junction node_modules to the review checkout.
2. git show 458f0bd:src/interaction/PointerTracker.js > src/interaction/OldTracker.js
3. Replace src/interaction/PointerTracker.js with an adapter that converts the r2 timestamp (ms) API into the r1 delta (s) API:
   t.update = (camera, ts) => { d = last===null ? 0 : (ts-last)/1000; last = ts; update(camera, d); }
4. node --test tests/touch.test.js -> 3 pass, 2 fail:
   - event-time velocity...: AssertionError "slow swipe must not saturate on a fast display"
   - rapid re-press...: TypeError reading 'held' (re-press dropped)
