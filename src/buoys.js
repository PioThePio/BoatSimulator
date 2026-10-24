import {BOLLARDS,environment} from './world.js';
import {sampleWater} from './wave-field.js';
export function createBuoys(){return BOLLARDS.map((q,index)=>q.kind==='buoy'?{...q,index,homeX:q.x,homeY:q.y,vx:0,vy:0,heave:0,heaveVelocity:0,roll:0,mass:140,loadX:0,loadY:0}:null);}
export function buoyStep(world,e,dt){
 for(const q of world.buoys??[]){
  if(!q)continue;
  if(q.site!=='pilawa'||!q.fieldCache||world.time>=q.fieldAt){q.fieldCache={flow:environment(world.time,e,q.x,q.y),wave:sampleWater(world,q.x,q.y,e)};q.fieldAt=world.time+.05;}
  const {flow,wave}=q.fieldCache;
  const dx=q.x-q.homeX,dy=q.y-q.homeY,ux=flow.current.x-q.vx,uy=flow.current.y-q.vy;
  q.vx+=(q.loadX+75*ux*Math.abs(ux)+q.mass*.55*wave.ax-2500*dx-1000*q.vx)/q.mass*dt;
  q.vy+=(q.loadY+75*uy*Math.abs(uy)+q.mass*.55*wave.ay-2500*dy-1000*q.vy)/q.mass*dt;
  q.x+=q.vx*dt;q.y+=q.vy*dt;
  const distance=Math.hypot(q.x-q.homeX,q.y-q.homeY);if(distance>.55){q.x=q.homeX+(q.x-q.homeX)*.55/distance;q.y=q.homeY+(q.y-q.homeY)*.55/distance;q.vx*=.15;q.vy*=.15;}
  q.heaveVelocity+=(16*(wave.eta-q.heave)-5*q.heaveVelocity)*dt;q.heave+=q.heaveVelocity*dt;
  q.roll+=(Math.atan(wave.sx+wave.sy)*.65-q.roll)*(1-Math.exp(-dt*3));q.loadX=q.loadY=0;
 }
}
