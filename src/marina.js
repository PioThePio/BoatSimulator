import {sampleWater} from './wave-field.js';
import {buoyStep} from './buoys.js';
import {YBOOMS,BOLLARDS,clamp,environment} from './world.js';
import {trailerPost} from './towing.js';
export function createBooms(){return YBOOMS.map(q=>({...q,a:q.a,w:0,inertia:6200,heave:0,heaveVelocity:0,roll:0,load:0}));}
export function boomPoint(q,fraction=1){const arm=q.length*fraction;return{x:q.x1+Math.cos(q.a)*arm,y:q.y1+Math.sin(q.a)*arm,vx:-q.w*Math.sin(q.a)*arm,vy:q.w*Math.cos(q.a)*arm};}
export function mooringPoint(b,index){const p=BOLLARDS[index];if(!p)return null;if(p.trailer&&(b.towRig||b.worldRig))return{...p,...trailerPost(b.towRig??b.worldRig)};if(p.kind==='buoy'&&b.buoys?.[index])return{...p,...b.buoys[index]};if(p.boom===undefined||!b.booms)return{...p,vx:0,vy:0};return{...p,...boomPoint(b.booms[p.boom],p.fraction)};}
export function boomInverse(b,index,n){const p=BOLLARDS[index];if(p?.kind==='buoy'&&b.buoys?.[index])return 1/b.buoys[index].mass;if(p?.trailer&&(b.towRig||b.worldRig)){const rig=b.towRig??b.worldRig,q=rig.trailer,arm=trailerPost(rig),lever=(arm.x-q.x)*n.y-(arm.y-q.y)*n.x;return 1/(q.mass+(rig.attached?rig.car.mass:0))+lever*lever/q.iz;}if(p?.boom===undefined||!b.booms)return 0;const q=b.booms[p.boom],arm=boomPoint(q,p.fraction),lever=(arm.x-q.x1)*n.y-(arm.y-q.y1)*n.x;return lever*lever/q.inertia;}
export function boomLoad(b,index,fx,fy){const p=BOLLARDS[index];if(p?.kind==='buoy'&&b.buoys?.[index]){b.buoys[index].loadX+=fx;b.buoys[index].loadY+=fy;return;}if(p?.trailer&&(b.towRig||b.worldRig)){const r=b.towRig??b.worldRig,q=trailerPost(r);r.ropeForce.x+=fx;r.ropeForce.y+=fy;r.ropeForce.torque+=(q.x-r.trailer.x)*fy-(q.y-r.trailer.y)*fx;return;}if(p?.boom===undefined||!b.booms)return;const q=b.booms[p.boom],arm=boomPoint(q,p.fraction);q.load+=(arm.x-q.x1)*fy-(arm.y-q.y1)*fx;}
export function boomStep(b,e,dt){
 for(const q of b.booms){
  const p=boomPoint(q,.5),flow=environment(b.time,e,p.x,p.y),wave=sampleWater(b,p.x,p.y,e);
  const sideways=-(flow.current.x+wave.vx*.3)*Math.sin(q.a)+(flow.current.y+wave.vy*.3)*Math.cos(q.a),angle=q.a-YBOOMS[q.id].a;
  // Hinge + restrained submerged end; rotation is forced by water, lines and contact.
  const torque=.5*1000*q.length*.13*sideways*Math.abs(sideways)*q.length*.5+q.length*15*(-wave.ax*Math.sin(q.a)+wave.ay*Math.cos(q.a));
  const spring=16000*angle+200000*angle**3,damping=11000*q.w+60000*q.w*Math.abs(q.w);
  q.w+=(q.load+torque-spring-damping)/q.inertia*dt;q.a+=q.w*dt;
  const relative=q.a-YBOOMS[q.id].a;if(Math.abs(relative)>.12){q.a=YBOOMS[q.id].a+clamp(relative,-.12,.12);q.w*=.15;}
  q.heaveVelocity+=(16*(wave.eta*.65-q.heave)-5*q.heaveVelocity)*dt;q.heave+=q.heaveVelocity*dt;q.roll+=(Math.atan(-wave.sx*Math.sin(q.a)+wave.sy*Math.cos(q.a))*.5-q.roll)*(1-Math.exp(-dt*3));q.load=0;
 }
 buoyStep(b,e,dt);
}
