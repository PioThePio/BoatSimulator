import {point} from './rigging.js';
import {mirrorPoint,wallDistance,wallHit,reflectField} from './wave-reflections.js';
export const WAKE_LIFETIME=36;
const LIFETIME=WAKE_LIFETIME;
export function wakeAmplitude(body,speed){
 const S=body.spec,L=S.length,B=S.beam,mass=S.mass??L*B*85,fn=speed/Math.sqrt(9.81*L),plane=body.planing??0;
 const hull=S.jet?.42:S.air?.65:S.hullType==='rib'?.78:S.hullType==='flat'?.85:S.planing===false?1.18:1;
 const size=Math.sqrt(L*B/11.8),weight=(Math.max(250,mass)/1200)**.32,regime=1.25-.45*plane+.30*Math.exp(-(((fn-.42)/.18)**2));
 return Math.min(.44,Math.min(1,(fn/.28)**2)*(.025+.20*speed*speed/(speed*speed+6))*size*weight*hull*regime)*Math.min(1,speed/.9);
}
// Advected snapshots leave diverging wave fronts on the travelled path, including turns.
export function recordHullWake(history,b,current){
 const vx=b.vx-current.x,vy=b.vy-current.y,speed=Math.hypot(vx,vy),ahead=vx*Math.cos(b.a)+vy*Math.sin(b.a);
 const last=history[history.length-1];
 if(speed>.65&&Math.abs(ahead)>speed*.3&&(!last||b.time-last.time>=.20&&Math.hypot(b.x-last.boatX,b.y-last.boatY)>=Math.max(.12,speed*.08))){
  const p=point(b,(ahead>=0?-1:1)*b.spec.length*.49,0),nx=-vy/speed,ny=vx/speed;
  history.push({x:p.x,y:p.y,boatX:b.x,boatY:b.y,nx,ny,time:b.time,currentX:current.x,currentY:current.y,spread:Math.min(4.8,.65+speed*.28),width:b.spec.beam*.45,amplitude:wakeAmplitude(b,speed)});
 }
 while(history.length&&(b.time-history[0].time>LIFETIME||history.length>185))history.shift();
}
export function wakeEdges(sample,time,factor=1){
 const age=Math.max(0,time-sample.time),width=sample.width+sample.spread*age*factor;
 const x=sample.x+sample.currentX*age,y=sample.y+sample.currentY*age;
 return[-1,1].map(side=>({x:x+side*sample.nx*width,y:y+side*sample.ny*width}));
}
export function drawHullWake(ctx,history,time){
 for(const factor of [.72,1])for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time,opacity=Math.min(.8,Math.exp(-age/13)*Math.max(0,1-age/LIFETIME)*(.30+factor*.25)*(.4+b.amplitude*3));
  if(b.time-a.time>.5)continue;
  const from=wakeEdges(a,time,factor),to=wakeEdges(b,time,factor);
  ctx.strokeStyle=`rgba(249,255,245,${opacity})`;ctx.lineWidth=(factor===1?.12:.07)+b.amplitude*.35;
  for(let side=0;side<2;side++){ctx.beginPath();ctx.moveTo(from[side].x,from[side].y);ctx.lineTo(to[side].x,to[side].y);ctx.stroke();}
 }
}
// Sample the SAME propagating V fronts that are drawn. Neighbouring snapshots form
// one crest, so overlapping segments are averaged rather than summed by frame rate.
const wakeCache=new WeakMap(),CELL=20;
function packetAt(descriptor,time,unbounded=false){
 if(!unbounded&&descriptor.packetTime===time)return descriptor.packet;
 const {a,b,factor,side,id}=descriptor,age=time-b.time;if(!unbounded&&(age<.35||age>LIFETIME))return null;
 const from=wakeEdges(a,time,factor)[side],to=wakeEdges(b,time,factor)[side],dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;if(length2<.01)return null;
 const length=Math.sqrt(length2),nx=-dy/length,ny=dx/length;
 const packet={id,a,b,age,p:from,dx,dy,length2,nx,ny,sigma:.65+age*.04,speed:b.spread*factor*(side?1:-1)*(b.nx*nx+b.ny*ny),amplitude:b.amplitude*Math.exp(-age/13)*Math.max(0,1-age/LIFETIME)*(factor===1?1:.55)};
 if(!unbounded){descriptor.packetTime=time;descriptor.packet=packet;}return packet;
}
function preparedWake(history,time){
 const last=history[history.length-1],first=history[0],epoch=Math.floor(time*10),cached=wakeCache.get(history);
 if(cached&&cached.epoch===epoch&&cached.length===history.length&&cached.last===last&&cached.first===first)return cached;
 const start=epoch/10,end=start+.1,grid=new Map(),large=[];let id=0;
 for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time;if(age<.25||age>LIFETIME+.1||b.time-a.time>.55)continue;
  for(const factor of [.72,1])for(let side=0;side<2;side++){
   const descriptor={id:id++,a,b,factor,side},frames=[packetAt(descriptor,start,true),packetAt(descriptor,end,true)].filter(Boolean);if(!frames.length)continue;
   const pad=Math.max(...frames.map(q=>q.sigma))*4+.02,points=frames.flatMap(q=>[{x:q.p.x-q.dx*.1,y:q.p.y-q.dy*.1},{x:q.p.x+q.dx*1.1,y:q.p.y+q.dy*1.1}]);
   const loX=Math.floor((Math.min(...points.map(q=>q.x))-pad)/CELL),hiX=Math.floor((Math.max(...points.map(q=>q.x))+pad)/CELL),loY=Math.floor((Math.min(...points.map(q=>q.y))-pad)/CELL),hiY=Math.floor((Math.max(...points.map(q=>q.y))+pad)/CELL);
   if((hiX-loX+1)*(hiY-loY+1)>4000){large.push(descriptor);continue;}
   for(let ix=loX;ix<=hiX;ix++)for(let iy=loY;iy<=hiY;iy++){const key=ix+','+iy;let bucket=grid.get(key);if(!bucket){bucket=[];grid.set(key,bucket);}bucket.push(descriptor);}
  }
 }
 const result={epoch,length:history.length,last,first,grid,large};wakeCache.set(history,result);return result;
}
// Exact packet equations, indexed by space and prepared once per history/time.
// Broad-phase bounds cover 0.1 s; exact packets are evaluated at physical query time.
// Physics frequency, front propagation, damping and reflected energy are unchanged.
export function sampleHullWake(history,x,y,time,face=null){
 const path=face?(Array.isArray(face)?face:[face]):[],targets=[],out={eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0};let weight=0;
 for(let i=path.length-1;i>=0;i--){const f=path[i];if(wallDistance({x,y},f)<=0)return out;const p=mirrorPoint({x,y},f);targets[i]=p;x=p.x;y=p.y;}
 const prepared=preparedWake(history,time),bucket=prepared.grid.get(Math.floor(x/CELL)+','+Math.floor(y/CELL))??[],packets=prepared.large.length?[...bucket,...prepared.large].sort((a,b)=>a.id-b.id):bucket;
 for(const descriptor of packets){
  const packet=packetAt(descriptor,time);if(!packet)continue;
  const {a,b,age,p,dx,dy,length2,nx,ny,sigma,speed,amplitude}=packet,t=((x-p.x)*dx+(y-p.y)*dy)/length2;if(t<-.1||t>1.1)continue;
  if(path.length){const s=Math.max(0,Math.min(1,t));let source={x:a.x+(b.x-a.x)*s+a.currentX*age,y:a.y+(b.y-a.y)*s+a.currentY*age},valid=true;for(let j=0;j<path.length;j++){if(!wallHit(source,targets[j],path[j])){valid=false;break;}source=mirrorPoint(source,path[j]);}if(!valid)continue;}
  const d=(x-p.x)*nx+(y-p.y)*ny;if(Math.abs(d)>sigma*4)continue;
  const z=d/sigma,g=Math.exp(-.5*z*z),h=amplitude*(1-z*z)*g,slope=amplitude*(z*z*z-3*z)*g/sigma;
  out.eta+=h;out.sx+=slope*nx;out.sy+=slope*ny;out.vx+=h*speed*nx/sigma;out.vy+=h*speed*ny/sigma;out.ax-=slope*speed*speed*nx/sigma;out.ay-=slope*speed*speed*ny/sigma;weight++;
 }
 if(weight>1)for(const key of Object.keys(out))out[key]/=weight;
 let field=out;for(const f of path)field=reflectField(field,f);if(path.length>1)for(const key of Object.keys(field))field[key]*=.20**(path.length-1);return field;
}
export function sampleWakeField(history,x,y,time,faces=[]){
 const wave=sampleHullWake(history,x,y,time);
 if(history.length<2)return wave;
 for(const path of reflectionPaths(faces)){const reflected=sampleHullWake(history,x,y,time,path);for(const key of Object.keys(wave))wave[key]+=reflected[key];}
 return wave;
}
export function reflectionPaths(faces){
 const paths=faces.map(f=>[f]);
 for(const a of faces.slice(0,2))for(const b of faces.slice(0,2))if(a!==b&&a.nx*b.nx+a.ny*b.ny<-.5)paths.push([a,b]);
 return paths;
}
export function drawReflectedWake(ctx,history,time,faces){
 for(const path of reflectionPaths(faces))for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time;if(age<.35||age>LIFETIME||b.time-a.time>.55)continue;
  const from=wakeEdges(a,time),to=wakeEdges(b,time);
  for(let side=0;side<2;side++){
   let sa={x:a.x+a.currentX*age,y:a.y+a.currentY*age},sb={x:b.x+b.currentX*age,y:b.y+b.currentY*age},p=from[side],q=to[side],gain=1,valid=true;
   for(const face of path){if(!wallHit(sa,p,face)||!wallHit(sb,q,face)){valid=false;break;}sa=mirrorPoint(sa,face);sb=mirrorPoint(sb,face);p=mirrorPoint(p,face);q=mirrorPoint(q,face);gain*=face.coefficient;}
   if(!valid)continue;gain*=.20**(path.length-1);
   ctx.strokeStyle=`rgba(241,255,245,${Math.min(.8,gain*Math.exp(-age/13)*(1-age/LIFETIME)*(.5+b.amplitude*2))})`;ctx.lineWidth=.10+b.amplitude*.25;
   ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
  }
 }
}
// Leading-order Stokes transport of the direct wake, separate from reversible
// orbital flow. It is small and directed away from the generating path.
export function sampleWakeTransport(history,x,y,time){
 const prepared=preparedWake(history,time),list=prepared.grid.get(Math.floor(x/CELL)+','+Math.floor(y/CELL))??[];let vx=0,vy=0,weight=0;
 for(const descriptor of [...list,...prepared.large]){const q=packetAt(descriptor,time);if(!q)continue;const t=((x-q.p.x)*q.dx+(y-q.p.y)*q.dy)/q.length2;if(t<-.1||t>1.1)continue;const z=((x-q.p.x)*q.nx+(y-q.p.y)*q.ny)/q.sigma;if(Math.abs(z)>4)continue;const gain=Math.min(.65,3*(q.amplitude/q.sigma)**2*Math.abs(q.speed)*Math.exp(-z*z)),sign=Math.sign(q.speed);vx+=gain*sign*q.nx;vy+=gain*sign*q.ny;weight++;}
 return{x:weight?vx/weight:0,y:weight?vy/weight:0};
}
