// Numerical oracle from v24; test-only, excluded from the application bundle.
import {mirrorPoint,wallDistance,wallHit,reflectField} from '../src/wave-reflections.js';
import {wakeEdges,WAKE_LIFETIME as LIFETIME} from '../src/wake.js';
export function referenceHullWake(history,x,y,time,face=null){
 const path=face?(Array.isArray(face)?face:[face]):[],targets=[];
 const out={eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0};let weight=0;
 for(let i=path.length-1;i>=0;i--){const f=path[i];if(wallDistance({x,y},f)<=0)return out;const p=mirrorPoint({x,y},f);targets[i]=p;x=p.x;y=p.y;}
 for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time;
  if(age<.35||age>LIFETIME||b.time-a.time>.55)continue;
  for(const factor of [.72,1]){
   const from=wakeEdges(a,time,factor),to=wakeEdges(b,time,factor);
   for(let side=0;side<2;side++){
    const p=from[side],q=to[side],dx=q.x-p.x,dy=q.y-p.y,length2=dx*dx+dy*dy;
    if(length2<.01)continue;
    const t=((x-p.x)*dx+(y-p.y)*dy)/length2;
    if(t<-.1||t>1.1)continue;
    if(path.length){const s=Math.max(0,Math.min(1,t));let source={x:a.x+(b.x-a.x)*s+a.currentX*age,y:a.y+(b.y-a.y)*s+a.currentY*age},valid=true;for(let j=0;j<path.length;j++){if(!wallHit(source,targets[j],path[j])){valid=false;break;}source=mirrorPoint(source,path[j]);}if(!valid)continue;}
    const length=Math.sqrt(length2),nx=-dy/length,ny=dx/length,d=(x-p.x)*nx+(y-p.y)*ny;
    const sigma=.65+age*.04;
    if(Math.abs(d)>sigma*4)continue;
    const z=d/sigma,decay=Math.exp(-age/13)*Math.max(0,1-age/LIFETIME);
    const amplitude=b.amplitude*decay*(factor===1?1:.55),g=Math.exp(-.5*z*z);
    const h=amplitude*(1-z*z)*g,slope=amplitude*(z*z*z-3*z)*g/sigma;
    // Translation of a smooth zero-mean wave packet gives vertical encounter and
    // orbital flow; finite width prevents a discontinuous impulse at its crest.
    const direction=(side?1:-1)*(b.nx*nx+b.ny*ny),speed=b.spread*factor*direction;
    out.eta+=h;out.sx+=slope*nx;out.sy+=slope*ny;
    out.vx+=h*speed*nx/sigma;out.vy+=h*speed*ny/sigma;
    out.ax-=slope*speed*speed*nx/sigma;out.ay-=slope*speed*speed*ny/sigma;weight++;
   }
  }
 }
 if(weight>1)for(const key of Object.keys(out))out[key]/=weight;
 let field=out;for(const f of path)field=reflectField(field,f);if(path.length>1)for(const key of Object.keys(field))field[key]*=.20**(path.length-1);return field;
}
