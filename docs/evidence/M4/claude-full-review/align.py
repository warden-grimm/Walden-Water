import json, sys, numpy as np
from PIL import Image
d = sys.argv[1]; R = json.load(open(d + '/results.json'))
for s in R['steps']:
    if not s['name'].startswith('align'): continue
    im = np.asarray(Image.open(f"{d}/{s['name']}.png").convert('L')).astype(float)
    dpr = 2; cx, cy = s['touchX'] * dpr, s['touchY'] * dpr; r = 40
    y0, x0 = int(cy - r), int(cx - r); roi = im[y0:y0 + 2 * r, x0:x0 + 2 * r]
    m = roi.max(); mask = roi >= m - 2
    ys, xs = np.nonzero(mask)
    px, py = (xs.mean() + x0) / dpr, (ys.mean() + y0) / dpr
    print(s['name'], 'count', s['count'], 'peak', m, 'err css px', round(px - s['touchX'], 3), round(py - s['touchY'], 3), 'n', mask.sum())
