import {YBOOMS,BOLLARDS,clamp,environment,waveAt} from './world.js';
import {trailerPost} from './towing.js';
export function createBooms(){return YBOOMS.map(q=>({...q,a:q.a,w:0,inertia:6200,heave:0,load:0}));}
export function boomPoint(q,fraction=1){const arm=q.length*fraction;return{x:q.x1+Math.cos(q.a)*arm,y:q.y1+Math.sin(q.a)*arm,vx:-q.w*Math.sin(q.a)*arm,vy:q.w*Math.cos(q.a)*arm};}
export function mooringPoint(b,index){const p=BOLLARDS[index];if(!p)return null;if(p.trailer&&b.towRig)return{...p,...trailerPost(b.towRig)};if(p.boom===undefined||!b.booms)return{...p,vx:0,vy:0};return{...p,...boomPoint(b.booms[p.boom],p.fraction)};}
export function boomInverse(b,index,n){const p=BOLLARDS[index];if(p?.trailer&&b.towRig){const q=b.towRig.trailer,arm=trailerPost(b.towRig),lever=(arm.x-q.x)*n.y-(arm.y-q.y)*n.x;return 1/(q.mass+(b.towRig.attached?b.towRig.car.mass:0))+lever*lever/q.iz;}if(p?.boom===undefined||!b.booms)return 0;const q=b.booms[p.boom],arm=boomPoint(q,p.fraction),lever=(arm.x-q.x1)*n.y-(arm.y-q.y1)*n.x;return lever*lever/q.inertia;}
export function boomLoad(b,index,fx,fy){const p=BOLLARDS[index];if(p?.trailer&&b.towRig){const r=b.towRig,q=trailerPost(r);r.ropeForce.x+=fx;r.ropeForce.y+=fy;r.ropeForce.torque+=(q.x-r.trailer.x)*fy-(q.y-r.trailer.y)*fx;return;}if(p?.boom===undefined||!b.booms)return;const q=b.booms[p.boom],arm=boomPoint(q,p.fraction);q.load+=(arm.x-q.x1)*fy-(arm.y-q.y1)*fx;}
export function boomStep(b,e,dt){
 for(const q of b.booms){
  const p=boomPoint(q,.5),flow=environment(b.time,e,p.x,p.y),wave=waveAt(p.x,p.y,b.time,e);
  const sideways=-flow.current.x*Math.sin(q.a)+flow.current.y*Math.cos(q.a),angle=q.a-YBOOMS[q.id].a;
  // Hinge + restrained submerged end; rotation is forced by water, lines and contact.
  const torque=.5*1000*q.length*.13*sideways*Math.abs(sideways)*q.length*.5;
  const spring=16000*angle+200000*angle**3,damping=11000*q.w+60000*q.w*Math.abs(q.w);
  q.w+=(q.load+torque-spring-damping)/q.inertia*dt;q.a+=q.w*dt;
  const relative=q.a-YBOOMS[q.id].a;if(Math.abs(relative)>.12){q.a=YBOOMS[q.id].a+clamp(relative,-.12,.12);q.w*=.15;}
  q.heave+=(wave.eta-q.heave)*(1-Math.exp(-dt*3));q.load=0;
 }
}
