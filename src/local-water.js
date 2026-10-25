import {driveWaterState} from './drive-effects.js';
import {point} from './rigging.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Finite spreading turbulent jets. A velocity field drives the existing water
// drag of each floating object; no teleport or arbitrary object impulse.
export function spreadingJet(x,y,origin,direction,thrust,radius,range=18){
 const dx=x-origin.x,dy=y-origin.y,c=Math.cos(direction),s=Math.sin(direction),along=dx*c+dy*s,cross=-dx*s+dy*c;
 if(along<0||along>range||thrust<=0)return{x:0,y:0};
 const width=radius+.16*along,speed=Math.min(8,Math.sqrt(2*thrust/(1000*Math.PI*radius*radius)))*radius/width*Math.exp(-along/(range*.65))*Math.exp(-.5*(cross/width)**2);
 return{x:speed*c,y:speed*s};
}
export function propulsionFlow(boats,x,y){
 let vx=0,vy=0;
 for(const b of boats){if(b.spec.passive||b.spec.air||b.sunken||Math.hypot(x-b.x,y-b.y)>25)continue;
  for(const en of b.engines){const q=driveWaterState(b,en);if(q.magnitude<5)continue;const origin=point(b,q.x,q.y),angle=b.a+q.angle+(q.direction<0?Math.PI:0),j=spreadingJet(x,y,origin,angle,q.magnitude,.13+.0002*en.hp);vx+=j.x;vy+=j.y;}
  if(b.electrics?.master!==false&&b.electrics?.thrusters!==false)for(const [end,sign]of [['bow',1],['stern',-1]]){
   const F=b.thrusters[end+'Force']??0;if(Math.abs(F)<1)continue;
   const origin=point(b,sign*b.spec.length*.38,-Math.sign(F)*b.spec.beam*.52),j=spreadingJet(x,y,origin,b.a-Math.sign(F)*Math.PI/2,Math.abs(F),.14,7);vx+=j.x;vy+=j.y;
  }
 }
 const limit=Math.min(1,8/Math.max(.001,Math.hypot(vx,vy)));return{x:vx*limit,y:vy*limit};
}
