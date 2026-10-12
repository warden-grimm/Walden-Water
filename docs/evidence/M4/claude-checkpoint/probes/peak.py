import json, sys
from PIL import Image
d = json.load(open(sys.argv[1]))
for r in d['results']:
    im = Image.open(r['file']).convert('RGB'); s = im.width / r['w']
    cx, cy = r['x'] * s, r['y'] * s; R = int(60 * s)
    best = (-1, 0, 0); px = im.load()
    for y in range(max(0, int(cy - R)), min(im.height, int(cy + R))):
        for x in range(max(0, int(cx - R)), min(im.width, int(cx + R))):
            g = px[x, y][1]
            if g > best[0]: best = (g, x, y)
    g, bx, by = best
    # centroid of near-max pixels
    pts = [(x, y) for y in range(max(0, by - R), min(im.height, by + R)) for x in range(max(0, bx - R), min(im.width, bx + R)) if px[x, y][1] >= g - 2]
    mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
    print(f"{r['label']:9} ({r['x']:4},{r['y']:4}) valid={r['valid']!s:5} G={g:3} peak offset css dx={(mx-cx)/s:+6.2f} dy={(my-cy)/s:+6.2f} n={len(pts)}")
