# Vertical streak shift per second inside the curtain (phase correlation of consecutive decoded frames).
import sys, json, cv2, numpy as np
def speed(path, box):
    cap=cv2.VideoCapture(path); frames=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32))
    fps=cap.get(cv2.CAP_PROP_FPS); H,W=frames[0].shape
    x0,y0,x1,y1=[int(v) for v in (box[0]*W,box[1]*H,box[2]*W,box[3]*H)]
    win=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F); dys=[]
    for a,b in zip(frames[5:-1],frames[6:]):
        if np.abs(a-b).mean()<1e-3: continue   # duplicated frame
        (dx,dy),r=cv2.phaseCorrelate(a[y0:y1,x0:x1],b[y0:y1,x0:x1],win)
        if r>0.05: dys.append(dy)
    return dict(frames=len(frames),size=[W,H],moving=len(dys),medianDyPerFrame=round(float(np.median(dys)),3),downwardShare=round(float(np.mean(np.array(dys)>0)),2))
boxes={'390x844':{'upper':(.18,.25,.42,.45),'lower':(.18,.55,.42,.72)},'844x390':{'upper':(.42,.2,.56,.45),'lower':(.42,.55,.56,.75)}}
res={}
for d in sys.argv[1:]:
    for v,bx in boxes.items():
        for lab in ['before','after']:
            for k,b in bx.items(): res[f'{d[-14:]}|{v}|{lab}|{k}']=speed(f'{d}/{v}-{lab}.webm',b)
print(json.dumps(res,indent=0))
