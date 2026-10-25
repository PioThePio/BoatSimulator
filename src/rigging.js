import {anchorWinch,windlassPowered} from './anchor-winch.js';
import {mooringPoint,boomInverse,boomLoad} from './marina.js';
import {BOLLARDS,bottomAt,clamp} from './world.js';
import {BASE_CLEATS,localAttachment} from './attachment-points.js';
export function point(b,x,y){const c=Math.cos(b.a),s=Math.sin(b.a);return{x:b.x+c*x-s*y,y:b.y+s*x+c*y};}
export const CLEATS=BASE_CLEATS;
export const cleatLocal=localAttachment;
export function cleat(b,end){const p=cleatLocal(b.spec,end);return point(b,p.x,p.y);}
export function inverseMass(b,n,arm){
 const c=Math.cos(b.a),s=Math.sin(b.a),u=n.x*c+n.y*s,v=-n.x*s+n.y*c;
 const lever=arm.x*n.y-arm.y*n.x;
 const wet=b.wetFraction??1,mx=b.spec.mass+(b.spec.mx-b.spec.mass)*wet,my=b.spec.mass+(b.spec.my-b.spec.mass)*wet;
 return u*u/mx+v*v/my+lever*lever/b.spec.iz;
}
export function impulse(b,n,j,arm){
 const wet=b.wetFraction??1,mx=b.spec.mass+(b.spec.mx-b.spec.mass)*wet,my=b.spec.mass+(b.spec.my-b.spec.mass)*wet;
 const c=Math.cos(b.a),s=Math.sin(b.a),u=(n.x*c+n.y*s)*j/mx,v=(-n.x*s+n.y*c)*j/my;
 b.vx+=c*u-s*v;b.vy+=s*u+c*v;b.w+=(arm.x*n.y-arm.y*n.x)*j/b.spec.iz;
}
export function attachRope(b,end,bollard=null){
 if(b.ropes.some(r=>r.end===end))return{ok:false,message:'Ta knaga ma już cumę.'};
 const p=cleat(b,end);
 if(bollard===null){let best=Infinity;BOLLARDS.forEach((_,i)=>{const q=mooringPoint(b,i),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best){best=d;bollard=i;}});}
 const q=mooringPoint(b,bollard);if(!q)return{ok:false,message:'Wybierz poler na mapie albo z listy.'};
 if(q.trailer&&b.towRig?.postBroken)return{ok:false,message:'Poler PRZ jest wyłamany · nie można założyć cumy.'};
 const d=Math.hypot(p.x-q.x,p.y-q.y);
 if(d>6)return{ok:false,message:`${q.label} jest poza zasięgiem rzutu (6 m od knagi).`};
 b.ropes.push({end,bollard,length:d+.35,targetLength:d+.35,tension:0,control:0,effortTime:0,manualForce:0,blocked:false,rate:0});
 return{ok:true,message:`Cuma ${CLEATS[end]||'rufowa'} → ${q.label.toLowerCase()}.`};
}
export function requestHaul(r,direction){r.control=Math.sign(direction);r.targetLength=r.length;if(!direction){r.manualForce=0;r.effortTime=0;r.rate=0;r.blocked=false;}}
export function solveRopes(b,dt,notify){
 b.maxTension=0;
 const hands=Math.max(1,b.ropes.filter(r=>r.control<0).length);
 b.ropes=b.ropes.filter(r=>{
  const p=cleat(b,r.end),q=mooringPoint(b,r.bollard),dx=q.x-p.x,dy=q.y-p.y,d=Math.max(.001,Math.hypot(dx,dy));
  const n={x:dx/d,y:dy/d},arm={x:p.x-b.x,y:p.y-b.y};
  const separation=(q.vx-b.vx+b.w*arm.y)*n.x+(q.vy-b.vy-b.w*arm.x)*n.y;
  const k=b.spec.lineEA/Math.max(1,r.length),damping=2*.38*Math.sqrt(k/inverseMass(b,n,arm));
  r.rate=0;r.blocked=false;
  r.effortTime=r.control<0?(r.effortTime??0)+dt:0;
  r.manualForce=r.control<0?Math.min(450,120+r.effortTime*110)/hands:0;
  if(r.control<0&&r.length>.45){
   // A held pull builds effort, not an unbounded winch. The knot holds external
   // loads after release; shortening stops on the next physics step.
   const inv=inverseMass(b,n,arm)+boomInverse(b,r.bollard,n),denominator=1+(damping*dt+k*dt*dt)*inv;
   const existing=k*(d-r.length)+(damping+k*dt)*separation;
   const allowance=Math.max(0,(r.manualForce*denominator-existing)/(2*k+damping/dt));
   const rate=Math.min(.28,65/hands/Math.max(1,r.tension));
   const amount=Math.min(rate*dt,r.length-.45,allowance);
   r.length-=amount;r.rate=-amount/dt;r.blocked=amount<.00001;
  }else if(r.control>0){const amount=Math.min(.3*dt,15-r.length);r.length+=amount;r.rate=amount/dt;}
  r.targetLength=r.length;
  const extension=d-r.length;
  const closing=separation-r.rate;
  const inv=inverseMass(b,n,arm)+boomInverse(b,r.bollard,n);
  // Backward-Euler Kelvin-Voigt tension, stable even for short stiff lines.
  const crossing=closing>0?clamp((extension+closing*dt)/(closing*dt),0,1):0;
  r.tension=extension>0||crossing>0?Math.max(0,(k*extension+(damping+k*dt)*closing)/(1+(damping*dt+k*dt*dt)*inv))*(extension>0?1:crossing):0;
  if(r.tension>b.spec.lineBreak){notify(`Cuma pękła: przekroczono ${(b.spec.lineBreak/1000).toFixed(0)} kN.`);return false;}
  impulse(b,n,r.tension*dt,arm);boomLoad(b,r.bollard,-n.x*r.tension,-n.y*r.tension);b.maxTension=Math.max(b.maxTension,r.tension);return true;
 });
}
export function createAnchor(spec){return{mode:'stowed',phase:'locker',vx:0,vy:0,winchRate:0,status:'Na pokładzie',length:0,target:25,reserve:60,chainReserve:spec.chain,mass:spec.anchorMass,x:0,y:0,z:0,set:0,tension:0,horizontal:0,capacity:0,groundLength:0,dragged:0,broken:false,windlassBlocked:false,shape:null};}
// Elastic, layered quasi-static catenary. Bottom segment = chain, top = rope.
// Each suspended segment integrates dx/ds=H/T and dz/ds=V/T, dV/ds=w.
function integrate(H,V,L,w,EA){
 if(L<=0)return{x:0,z:0,V};
 const V1=V+w*L,T0=Math.hypot(H,V),T1=Math.hypot(H,V1);
 return{x:H/w*(Math.asinh(V1/H)-Math.asinh(V/H))+H*L/EA,
  z:(T1-T0)/w+(V+V1)*.5*L/EA,V:V1};
}
function shapeFor(H,height,L,chain){
 const fullChain=Math.min(L,chain),fullRope=Math.max(0,L-fullChain);
 const evaluate=(laid,V0)=>{
  const chainLaid=Math.min(laid,fullChain),ropeLaid=Math.max(0,laid-chainLaid);
  const a=integrate(H,V0,fullChain-chainLaid,12,1.5e7);
  const b=integrate(H,a.V,fullRope-ropeLaid,.08,180000);
  return{x:laid+a.x+b.x,z:a.z+b.z,V:b.V,V0,laid,chainLaid,ropeLaid};
 };
 let result=evaluate(0,0);
 if(result.z>=height){let lo=0,hi=L;for(let i=0;i<19;i++){const mid=(lo+hi)/2,q=evaluate(mid,0);if(q.z>height)lo=mid;else hi=mid;}result=evaluate((lo+hi)/2,0);}
 else{let lo=0,hi=1e7;for(let i=0;i<27;i++){const mid=(lo+hi)/2,q=evaluate(0,mid);if(q.z<height)lo=mid;else hi=mid;}result=evaluate(0,(lo+hi)/2);}
 return {...result,H,tension:Math.hypot(H,result.V),anchorTension:Math.hypot(H,result.V0),angle:Math.atan2(result.V0,H)};
}
export function catenary(horizontal,height,L,chain=8){
 if(L<=0)return{H:0,tension:0,anchorTension:0,laid:0,V:0,V0:0,angle:0};
 height=Math.max(.05,height);horizontal=Math.max(0,horizontal);
 if(L>=height+horizontal){const laid=L-height,chainLaid=Math.min(chain,laid),ropeLaid=Math.max(0,laid-chainLaid),suspendedChain=Math.max(0,Math.min(chain,L)-chainLaid),weight=suspendedChain*12+(height-suspendedChain)*.08;return{H:0,tension:weight,anchorTension:0,laid,V:weight,V0:0,angle:0,chainLaid,ropeLaid};}
 let lo=.001,hi=1e6,result;
 for(let i=0;i<24;i++){const mid=Math.sqrt(lo*hi);result=shapeFor(mid,height,L,chain);if(result.x<horizontal)lo=mid;else hi=mid;}
 return shapeFor(Math.sqrt(lo*hi),height,L,chain);
}
export function anchorProfile(a,b){
 if(a.mode==='stowed'||a.broken)return[];
 const p=cleat(b,'bow'),d=Math.hypot(p.x-a.x,p.y-a.y),h=a.z+.65+b.heave;
 const shape=a.shape??catenary(d,h,Math.max(.01,a.length),a.chainReserve),points=[{x:0,z:0,chain:true}];
 if(shape.H===0)return [{x:0,z:0,chain:true},{x:d,z:0,chain:(shape.laid??0)<=a.chainReserve},{x:d,z:h,chain:a.length<=a.chainReserve}];
 const laid=Math.min(a.length,shape.laid??0),lc=Math.min(a.length,a.chainReserve),lr=Math.max(0,a.length-lc);
 let x=laid,z=0,V=shape.V0??0;
 points.push({x,z,chain:laid<=lc});
 for(const [L,w,EA,isChain]of [[Math.max(0,lc-laid),12,1.5e7,true],[Math.max(0,lr-Math.max(0,laid-lc)),.08,180000,false]]){
  const count=18,ds=L/count;for(let i=0;i<count;i++){const q=integrate(Math.max(.001,shape.H),V,ds,w,EA);x+=q.x;z+=q.z;V=q.V;points.push({x,z,chain:isChain});}
 }
 return points;
}
export function updateAnchor(b,e,dt,notify){
 const a=b.anchor;a.electricalAmps=0;if(a.mode==='stowed'||a.broken)return;const winch=anchorWinch(b.spec),lostPower=!windlassPowered(b);if(lostPower&&['raising','lowering'].includes(a.mode))a.mode='holding';
 const p=cleat(b,'bow'),arm={x:p.x-b.x,y:p.y-b.y},floor=bottomAt(a.x,a.y);
 const deck=.65+b.heave,depth=Math.max(0,floor.depth),height=depth+deck;
 let dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);
 if(!a.phase||a.phase==='locker')a.phase=a.z>=depth-.02?'bottom':'falling';
 a.windlassBlocked=false;a.winchRate=0;
 const oldLength=a.length;
 if(a.mode==='lowering'){
  a.length=Math.min(a.reserve,Math.max(a.length,Math.min(a.target,a.length+winch.down*dt)));
  if(a.length>=a.target)a.mode='holding';
 }
 if(a.mode==='raising'){
  const speed=Math.min(winch.up,winch.power/Math.max(120,a.tension));
  const requested=Math.max(0,a.length-speed*dt);
  if(a.phase==='bottom'){
   const geometry=L=>catenary(d,Math.max(.05,height),Math.max(.01,L),a.chainReserve);
   const current=geometry(a.length);let candidate=geometry(requested),accepted=requested;
   // Never jump a stiff chain past the winch's force limit in one numerical step.
   if(candidate.tension>winch.force){
    if(current.tension>=winch.force){accepted=a.length;candidate=current;}
    else {let lo=requested,hi=a.length;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(geometry(mid).tension>winch.force)lo=mid;else hi=mid;}accepted=hi;candidate=geometry(hi);}
   }
   a.length=accepted;
   // Pullout is tested at the achievable load, before the motor overload can deadlock retrieval.
   const breakout=a.mass*9.81*(1+Math.min(4,floor.holding*.07)*a.set);
   if(candidate.angle>.9&&candidate.V0>breakout){
    a.phase='lifting';a.set=0;a.z=depth-.025;a.vx=b.vx;a.vy=b.vy;
    a.status='Kotwica oderwana od dna';
   }else{
    a.windlassBlocked=oldLength-a.length<.02*dt;
    a.status=a.windlassBlocked?'Odciąż rode: podpłyń nad kotwicę':'Wybieranie rode · podpływanie';
   }
  }else{
   const weight=(a.mass+Math.min(a.length,a.chainReserve)*1.4)*9.81;
   a.windlassBlocked=weight>winch.force;
   if(!a.windlassBlocked)a.length=requested;
  }
 }
 if(a.phase!=='bottom'){
  // A hanging anchor is a damped pendulum, rather than an immovable point under water.
  const h=Math.max(.5,a.z+deck),omega2=9.81/h;
  a.vx=(a.vx??0)+(omega2*dx-1.8*((a.vx??0)-b.vx))*dt;
  a.vy=(a.vy??0)+(omega2*dy-1.8*((a.vy??0)-b.vy))*dt;
  a.x+=a.vx*dt;a.y+=a.vy*dt;
  dx=p.x-a.x;dy=p.y-a.y;d=Math.hypot(dx,dy);
  const maxHorizontal=Math.max(0,a.length*.999);
  if(d>maxHorizontal&&d>0){const excess=d-maxHorizontal;a.x+=dx/d*excess;a.y+=dy/d*excess;d=maxHorizontal;dx=p.x-a.x;dy=p.y-a.y;}
  const maxZ=Math.sqrt(Math.max(0,a.length*a.length-d*d))-deck;
  a.z=Math.min(Math.max(0,bottomAt(a.x,a.y).depth),a.z+1.1*dt,maxZ);
  if(a.z>=Math.max(0,bottomAt(a.x,a.y).depth)-.01&&a.mode!=='raising'){a.phase='bottom';a.z=Math.max(0,bottomAt(a.x,a.y).depth);}
  a.status=a.mode==='raising'?'Podnoszenie kotwicy':a.phase==='bottom'?'Kotwica na dnie':a.mode==='lowering'?'Opuszczanie kotwicy':'Kotwica zawieszona';
 }
 let shape;
 if(a.phase==='bottom'){
  a.z=Math.max(0,bottomAt(a.x,a.y).depth);
  shape=catenary(d,a.z+deck,Math.max(.01,a.length),a.chainReserve);
  if(shape.H>15&&shape.angle<.4)a.set=clamp(a.set+dt*.08,0,1);
  const capacity=a.mass*9.81*floor.holding*(.18+.82*a.set)*Math.max(.06,Math.cos(shape.angle)**3);
  a.capacity=capacity;
  if(shape.anchorTension>capacity&&d>.001){
   const distance=Math.min(1.4,(shape.anchorTension-capacity)/(a.mass*110+900))*dt;
   a.x+=dx/d*distance;a.y+=dy/d*distance;a.dragged+=distance;
   a.status=shape.angle>.7?'Kotwica wyrywana':'Kotwica wlecze';if(shape.angle>.7)a.set=Math.max(0,a.set-dt*.6);
  }else if(a.mode!=='raising')a.status=a.set>.45?'Kotwica trzyma':'Kotwica na dnie';
 }else{
  const weight=(a.mass+Math.min(a.length,a.chainReserve)*1.4)*9.81;
  const H=weight*d/Math.max(.3,a.z+deck);
  shape={H,tension:Math.hypot(H,weight),V:weight,V0:0,laid:0,anchorTension:0,angle:0};a.capacity=0;
 }
 a.shape=shape;a.tension=shape.tension;a.horizontal=shape.H;a.groundLength=shape.laid;
 a.winchRate=(a.length-oldLength)/dt;if(!winch.manual&&Math.abs(a.winchRate)>.001)a.electricalAmps=((a.winchRate>0?winch.power*.16:Math.min(winch.power,a.tension*Math.abs(a.winchRate))+winch.power*.15)/(.7*Math.max(10,b.battery.voltage)));if(lostPower)a.status='Brak zasilania windy · hamulec trzyma';
 if(shape.tension>b.spec.lineBreak*1.5){a.broken=true;a.status='Zerwane rode';a.mode='holding';a.shape=null;a.tension=0;a.horizontal=0;notify('Zerwano linę kotwiczną — kotwica utracona.');return;}
 if(d>.001&&a.length>.05){
  const n={x:-dx/d,y:-dy/d},sep=-((b.vx-b.w*arm.y)*n.x+(b.vy+b.w*arm.x)*n.y);
  const extra=shape.H>1?Math.max(-shape.H,.15*b.spec.mass*sep):0;
  impulse(b,n,clamp(shape.H+extra,0,b.spec.lineBreak*1.5)*dt,arm);
 }
 if(a.mode==='raising'&&a.length<.08&&d<.15){b.anchor=createAnchor(b.spec);notify('Kotwica na pokładzie.');}
}
export function anchorCommand(b,command,target){
 const a=b.anchor,winch=anchorWinch(b.spec);if(command!=='hold'&&!windlassPowered(b))return{ok:false,message:'Włącz zasilanie windy i sprawdź akumulator.'};if(a.broken)return{ok:false,message:'Utracona kotwica. Rozpocznij nową próbę.'};
 if(target!==undefined)a.target=clamp(target,1,a.reserve);
 if(command==='hold'){if(a.mode!=='stowed')a.mode='holding';return{ok:true,message:'Winda zatrzymana; hamulec trzyma rode.'};}
 if(command==='lower'){
  if(a.mode==='stowed'){const p=cleat(b,'bow');a.x=p.x;a.y=p.y;a.z=-.65-b.heave;a.phase='falling';a.vx=b.vx;a.vy=b.vy;}
  a.mode='lowering';return{ok:true,message:`Wydawanie: ${winch.down.toFixed(2)} m/s · ${winch.manual?'ręcznie':'elektrycznie'}.`};
 }
 if(command==='raise'&&a.mode!=='stowed'){a.mode='raising';return{ok:true,message:`Wybieranie do ${winch.up.toFixed(2)} m/s · uciąg ${(winch.force/1000).toFixed(1)} kN.`};}
 return{ok:false,message:'Kotwica jest na pokładzie.'};
}
