import {point} from './rigging.js';
const LIFETIME=28;
// Advected snapshots leave diverging wave fronts on the travelled path, including turns.
export function recordHullWake(history,b,current){
 const vx=b.vx-current.x,vy=b.vy-current.y,speed=Math.hypot(vx,vy),ahead=vx*Math.cos(b.a)+vy*Math.sin(b.a);
 const last=history[history.length-1];
 if(ahead>2&&(!last||b.time-last.time>=.18&&Math.hypot(b.x-last.boatX,b.y-last.boatY)>=Math.max(.5,speed*.10))){
  const p=point(b,-b.spec.length*.49,0),nx=-vy/speed,ny=vx/speed;
  history.push({x:p.x,y:p.y,boatX:b.x,boatY:b.y,nx,ny,time:b.time,currentX:current.x,currentY:current.y,spread:Math.min(4.5,speed*.25),width:b.spec.beam*.45,amplitude:Math.min(.24,.015+.001*speed*speed)*Math.min(1.3,b.spec.beam/2)});
 }
 while(history.length&&(b.time-history[0].time>LIFETIME||history.length>155))history.shift();
}
export function wakeEdges(sample,time,factor=1){
 const age=Math.max(0,time-sample.time),width=sample.width+sample.spread*age*factor;
 const x=sample.x+sample.currentX*age,y=sample.y+sample.currentY*age;
 return[-1,1].map(side=>({x:x+side*sample.nx*width,y:y+side*sample.ny*width}));
}
export function drawHullWake(ctx,history,time){
 for(const factor of [.72,1])for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time,opacity=Math.exp(-age/10)*Math.max(0,1-age/LIFETIME)*(.30+factor*.25);
  if(b.time-a.time>.5)continue;
  const from=wakeEdges(a,time,factor),to=wakeEdges(b,time,factor);
  ctx.strokeStyle=`rgba(249,255,245,${opacity})`;ctx.lineWidth=factor===1?.16:.09;
  for(let side=0;side<2;side++){ctx.beginPath();ctx.moveTo(from[side].x,from[side].y);ctx.lineTo(to[side].x,to[side].y);ctx.stroke();}
 }
}
// Sample the SAME propagating V fronts that are drawn. Neighbouring snapshots form
// one crest, so overlapping segments are averaged rather than summed by frame rate.
export function sampleHullWake(history,x,y,time){
 const out={eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0};let weight=0;
 for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time;
  if(age<1||age>LIFETIME||b.time-a.time>.55)continue;
  for(const factor of [.72,1]){
   const from=wakeEdges(a,time,factor),to=wakeEdges(b,time,factor);
   for(let side=0;side<2;side++){
    const p=from[side],q=to[side],dx=q.x-p.x,dy=q.y-p.y,length2=dx*dx+dy*dy;
    if(length2<.01)continue;
    const t=((x-p.x)*dx+(y-p.y)*dy)/length2;
    if(t<-.1||t>1.1)continue;
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
 return out;
}
