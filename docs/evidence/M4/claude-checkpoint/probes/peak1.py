import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); px = im.load(); cx, cy = int(sys.argv[2]), int(sys.argv[3]); R = 60
best = max(((px[x, y][1], x, y) for y in range(cy-R, cy+R) for x in range(cx-R, cx+R)))
g = best[0]; pts = [(x, y) for y in range(cy-R, cy+R) for x in range(cx-R, cx+R) if px[x, y][1] >= g-2]
print('G', g, 'dx %.2f dy %.2f' % (sum(p[0] for p in pts)/len(pts)-cx, sum(p[1] for p in pts)/len(pts)-cy))
