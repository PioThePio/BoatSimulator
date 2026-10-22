import {clamp} from './world.js';
import {bodyPoint,bodyLocal,kick} from './tow-geometry.js';
import {inverseMass,impulse} from './rigging.js';

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function winchPost(r){return bodyPoint(r.trailer,r.trailer.offset+r.boatLength*.59+.35);}
export function bowEye(b){return bodyPoint(b,b.spec.length*.43);}
export function createWinch(S){return{attached:false,length:0,control:0,tension:0,rate:0,capacity:clamp(S.mass*9.81*.65,5000,40000),power:800+80*S.length,broken:false};}
export function connectWinch(r,b){
 const w=r.winch;if(w.attached){w.attached=false;w.control=w.tension=w.rate=0;return{ok:true,message:'Lina wciągarki odpięta'};}
 if(r.postBroken)return{ok:false,message:'Uszkodzony wspornik wciągarki · zresetuj zestaw.'};
 const p=bowEye(b),q=winchPost(r),local=bodyLocal(r.trailer,b),distance=Math.hypot(q.x-p.x,q.y-p.y);
 if(distance>8||Math.abs(local.y)>b.spec.beam||Math.abs(wrap(b.a-r.trailer.a))>.6)return{ok:false,message:'Wprowadź dziób w oś prowadnic, do 8 m od wciągarki.'};
 w.attached=true;w.broken=false;w.length=distance+.025;w.control=w.tension=w.rate=0;
 return{ok:true,message:'Lina wciągarki na uchu dziobowym · przytrzymaj Wciągaj'};
}
export function winchStep(r,b,dt){
 const w=r.winch;w.rate=0;if(!w.attached||r.secured){w.tension=0;return;}
 if(r.postBroken){w.attached=false;return;}
 const p=bowEye(b),q=winchPost(r),dx=q.x-p.x,dy=q.y-p.y,d=Math.max(.01,Math.hypot(dx,dy)),n={x:dx/d,y:dy/d},arm={x:p.x-b.x,y:p.y-b.y},rx=q.x-r.trailer.x,ry=q.y-r.trailer.y;
 const separation=(q.vx-p.vx)*n.x+(q.vy-p.vy)*n.y,lever=rx*n.y-ry*n.x;
 const inv=inverseMass(b,n,arm)+1/r.trailer.mass+lever*lever/r.trailer.iz,k=450000/Math.max(1,w.length),damping=1.4*Math.sqrt(k/inv),den=1+(damping*dt+k*dt*dt)*inv;
 if(w.control<0&&w.tension<w.capacity){
  const rate=Math.min(.16,w.power/Math.max(100,w.tension)),allowed=Math.max(0,(w.capacity*den-k*(d-w.length)-(damping+k*dt)*separation)/(2*k+damping/dt));
  const amount=Math.min(rate*dt,allowed,Math.max(0,w.length-.3));w.length-=amount;w.rate=-amount/dt;
 }else if(w.control>0){w.rate=Math.min(.3,(15-w.length)/dt);w.length+=w.rate*dt;}
 const extension=d-w.length,closing=separation-w.rate;
 w.tension=extension>0?Math.max(0,(k*extension+(damping+k*dt)*closing)/den):0;
 if(w.tension>w.capacity*1.8){w.attached=false;w.broken=true;w.control=0;b.events.unshift({time:b.time,message:'Zerwana lina wciągarki · przeciążenie'});b.events.splice(12);return;}
 impulse(b,n,w.tension*dt,arm);kick(r.trailer,-n.x*w.tension*dt,-n.y*w.tension*dt,rx,ry);
}
export function loadingScoreStep(r,b,dt){
 const t=r.trailer,p=bodyLocal(t,b),target=bodyPoint(t,p.x,p.y),u=(b.vx-target.vx)*Math.cos(t.a)+(b.vy-target.vy)*Math.sin(t.a),speed=Math.hypot(b.vx-target.vx,b.vy-target.vy),q=r.loadingScore;
 const near=Math.abs(p.y)<b.spec.beam*1.1&&p.x>t.offset-b.spec.length*1.4&&p.x<t.offset+b.spec.length*.5;
 if(q.complete&&!r.boatLoaded&&(!near||p.x<t.offset-b.spec.length*.65)){q.previous=q.quality;q.complete=false;q.active=false;}
 if(!q.active&&!q.complete&&!r.boatLoaded&&near&&(u>.03||r.winch.control<0))Object.assign(q,{active:true,angleSum:0,offsetSum:0,samples:0,startDamage:b.damage});
 if(!q.active)return;
 if(!near){q.active=false;q.aborted=true;return;}
 const angle=Math.abs(wrap(b.a-t.a)),axis=100*clamp(1-angle/(25*Math.PI/180),0,1),track=100*clamp(1-Math.abs(p.y)/(b.spec.beam*.5),0,1);
 const weight=Math.max(0,speed-.005)*dt;
 q.angleSum+=axis*weight;q.offsetSum+=track*weight;q.samples+=weight;
 q.axis=q.samples>0?q.angleSum/q.samples:axis;q.track=q.samples>0?q.offsetSum/q.samples:track;
 q.stop=100*clamp(1-Math.abs(p.x-t.offset)/.8,0,1)*clamp(1-speed/.5,0,1);
 q.offset=p.y;q.angle=angle;q.distance=p.x-t.offset;
 q.quality=Math.round(clamp(.35*q.axis+.35*q.track+.30*q.stop-2*Math.max(0,b.damage-q.startDamage),0,100));
 q.best=Math.max(q.best,q.quality);
 if(r.secured&&r.boatLoaded){q.complete=true;q.active=false;}
}
