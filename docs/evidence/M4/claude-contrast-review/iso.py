import sys, json
from PIL import Image, ImageChops, ImageStat
d=sys.argv[1]+'/out/'
def G(n): return Image.open(d+n).convert('L')
def pct(im,box,p):
    v=sorted(im.crop(box).get_flattened_data()); return v[int(p*(len(v)-1))]
R={'390x844':{'beam':(200,450,560,850),'lower':(200,1050,560,1350),'rockOut':(0,300,90,1000)},
   '844x390':{'beam':(720,100,960,330),'lower':(720,480,960,620),'rockOut':(100,100,600,700)}}
res={}
for v,regs in R.items():
    for lab in ['before','after']:
        wv=G(f'iso-{v}-{lab}-water.png'); ro=G(f'iso-{v}-{lab}-rockonly.png')
        delta=ImageChops.subtract(wv,ro)  # water added light (clamped >=0)
        e={}
        for k,b in regs.items():
            e[k]={'composite':round(ImageStat.Stat(wv.crop(b)).mean[0],2),'rockOnly':round(ImageStat.Stat(ro.crop(b)).mean[0],2),
                  'waterAdded':round(ImageStat.Stat(delta.crop(b)).mean[0],2),'p95':pct(wv,b,.95),'p50':pct(wv,b,.5)}
        res[f'{v} {lab}']=e
print(json.dumps(res,indent=1))
