import sys, json
import numpy as np
from PIL import Image
d = sys.argv[1]
r = json.load(open(f'{d}/result.json'))
D = r['D']
for s in r['swipes']:
    a = np.asarray(Image.open(f"{d}/{s['name']}-before.png").convert('L'), dtype=float)
    b = np.asarray(Image.open(f"{d}/{s['name']}-300ms.png").convert('L'), dtype=float)
    diff = np.clip(b - a, 0, None); diff[diff < 4] = 0
    ys, xs = np.nonzero(diff); w = diff[ys, xs]
    mx = (s['x0'] + s['x1']) / 2 * D; my = (s['y0'] + s['y1']) / 2 * D
    if w.sum() == 0: print(s['name'], 'no signal'); continue
    cx = (xs * w).sum() / w.sum(); cy = (ys * w).sum() / w.sum()
    print(f"{s['name']:6s} pixels={len(xs):6d} energy={w.sum():9.0f} centroid offset from swipe mid (css px): dx={(cx-mx)/D:+7.1f} dy={(cy-my)/D:+7.1f}  max diff={diff.max():.0f}")
