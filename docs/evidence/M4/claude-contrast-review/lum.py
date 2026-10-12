import sys, json
from PIL import Image, ImageStat, ImageChops
d=sys.argv[1]+'/out/'
def L(im,box):
    return round(ImageStat.Stat(im.crop(box).convert('L')).mean[0],2)
def stats(prefix,regions):
    r={}
    for lab in ['before','after']:
        im=Image.open(d+f'{prefix}-{lab}.png').convert('RGB')
        g=im.convert('L'); px=g.getdata(); n=len(px)
        r[lab]={k:L(im,b) for k,b in regions.items()}
        r[lab]['pct>=240']=round(100*sum(1 for p in px if p>=240)/n,3)
        r[lab]['max']=max(px)
    b=Image.open(d+f'{prefix}-before.png').convert('RGB'); a=Image.open(d+f'{prefix}-after.png').convert('RGB')
    diff=ImageChops.difference(a,b).convert('L'); r['maxAbsDiff']=max(diff.getdata()); r['meanAbsDiff']=round(ImageStat.Stat(diff).mean[0],2)
    return r
out={
 '390x844 auto':stats('390x844-auto',{'beamWater':(200,450,560,850),'lowerOffBeamWater':(200,1050,560,1350),'rockLeftOutside':(0,300,90,1000),'rockBelow':(100,1450,700,1650)}),
 '844x390 byte':stats('844x390-byte',{'beamWater':(720,100,960,330),'lowerOffBeamWater':(720,480,960,620),'rockOutside':(100,100,600,700),'rockRightOutside':(1100,100,1600,700)}),
}
print(json.dumps(out,indent=1))
