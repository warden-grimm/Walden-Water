import sys, json
from PIL import Image, ImageStat, ImageChops
d=sys.argv[1]
def L(im,b): return round(ImageStat.Stat(im.crop(b).convert('L')).mean[0],2)
def stats(prefix,regions):
    r={}
    for lab in ['before','after']:
        im=Image.open(f'{d}/{prefix}-{lab}.png').convert('RGB'); g=list(im.convert('L').getdata())
        r[lab]={k:L(im,b) for k,b in regions.items()}; r[lab]['pct>=240']=round(100*sum(p>=240 for p in g)/len(g),3); r[lab]['max']=max(g)
    a=Image.open(f'{d}/{prefix}-after.png').convert('RGB'); b=Image.open(f'{d}/{prefix}-before.png').convert('RGB')
    r['meanAbsDiff']=round(ImageStat.Stat(ImageChops.difference(a,b).convert('L')).mean[0],2)
    for k in regions:
        if k.startswith('beam') or k.startswith('lower'): pass
    r['beam-minus-rock']={lab:round(r[lab][list(regions)[0]]-r[lab][list(regions)[2]],2) for lab in ['before','after']}
    return r
print(json.dumps({
 '390x844':stats('390x844',{'beamWater':(200,450,560,850),'lowerOffBeamWater':(200,1050,560,1350),'rockLeftOutside':(0,300,90,1000),'rockBelow':(100,1450,700,1650)}),
 '844x390':stats('844x390',{'beamWater':(720,100,960,330),'lowerOffBeamWater':(720,480,960,620),'rockOutside':(100,100,600,700),'rockRightOutside':(1100,100,1600,700)})},indent=1))
