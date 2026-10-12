# Temporal band frequency at fixed points (expected flowFrequency*flowSpeed = 4.0 / 4.6 Hz) and band spacing upper vs lower.
import sys, json, cv2, numpy as np
from PIL import Image
out={}
for s in ['1','1.15']:
    cap=cv2.VideoCapture(f'out/bands-{s}.webm'); fr=[]; ts=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        ts.append(cap.get(cv2.CAP_PROP_POS_MSEC)/1000); fr.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(float))
    H,W=fr[0].shape; r={}
    for name,yf in [('upper',.3),('middle',.5),('lower',.68)]:
        sig=np.array([g[int(yf*H)-2:int(yf*H)+3, int(.3*W)-2:int(.3*W)+3].mean() for g in fr]); sig-=sig.mean()
        cross=[ts[i] for i in range(1,len(sig)) if sig[i-1]<0<=sig[i]]   # rising crossings = cycles
        r[name]=round((len(cross)-1)/(cross[-1]-cross[0]),3) if len(cross)>2 else None
    r['frames']=len(fr); r['duration']=round(ts[-1]-ts[0],2); out[s]=r
out['ratio']={k:round(out['1.15'][k]/out['1'][k],3) for k in ['upper','middle','lower']}
# Band spacing along the curtain column in the still: count crossings per 100 px.
g=np.asarray(Image.open('out/bands-1.15.png').convert('L'),float); H,W=g.shape; col=g[:, int(.3*W)]
def per100(y0,y1):
    s=col[y0:y1]-col[y0:y1].mean(); return round(100*sum(1 for i in range(1,len(s)) if s[i-1]<0<=s[i])/(y1-y0),2)
out['bandsPer100px']={'upper(0.25-0.40H)':per100(int(.25*H),int(.40*H)),'lower(0.55-0.70H)':per100(int(.55*H),int(.70*H))}
print(json.dumps(out,indent=1))
