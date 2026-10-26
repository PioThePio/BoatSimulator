import {BOLLARDS,environment} from './world.js';
import {sampleWater} from './wave-field.js';
import {hullContactSamples} from './hull-geometry.js';
import {point,impulse,inverseMass,cleat} from './rigging.js';
export function createBuoys(){return BOLLARDS.map((q,index)=>q.kind==='buoy'?{...q,index,homeX:q.x,homeY:q.y,vx:0,vy:0,heave:0,heaveVelocity:0,roll:0,mass:140,loadX:0,loadY:0}:null);}
export function buoyStep(world,e,dt){
 for(const q of world.buoys??[]){
  if(!q)continue;
  if(!['pilawa','nieporet'].includes(q.site)||!q.fieldCache||world.time>=q.fieldAt){q.fieldCache={flow:environment(world.time,e,q.x,q.y),wave:sampleWater(world,q.x,q.y,e)};q.fieldAt=world.time+.05;}
  const {flow,wave}=q.fieldCache;
  const dx=q.x-q.homeX,dy=q.y-q.homeY,ux=flow.current.x-q.vx,uy=flow.current.y-q.vy;
  const k=2500+22000*Math.max(0,Math.hypot(dx,dy)-.15)**2;
  q.vx+=(q.loadX+75*ux*Math.abs(ux)+q.mass*.55*wave.ax-k*dx-1000*q.vx)/q.mass*dt;
  q.vy+=(q.loadY+75*uy*Math.abs(uy)+q.mass*.55*wave.ay-k*dy-1000*q.vy)/q.mass*dt;
  q.x+=q.vx*dt;q.y+=q.vy*dt;
  const distance=Math.hypot(q.x-q.homeX,q.y-q.homeY);if(distance>.55){q.x=q.homeX+(q.x-q.homeX)*.55/distance;q.y=q.homeY+(q.y-q.homeY)*.55/distance;q.vx*=.15;q.vy*=.15;}
  q.heaveVelocity+=(16*(wave.eta-q.heave)-5*q.heaveVelocity)*dt;q.heave+=q.heaveVelocity*dt;
  const tilt=(v)=>Math.max(-.28,Math.min(.28,v));q.heelX=(q.heelX??0)+(tilt(-wave.sx*.65+q.loadX*.00012)-(q.heelX??0))*(1-Math.exp(-dt*3));q.heelY=(q.heelY??0)+(tilt(-wave.sy*.65+q.loadY*.00012)-(q.heelY??0))*(1-Math.exp(-dt*3));
  q.roll=Math.hypot(q.heelX,q.heelY);q.loadX=q.loadY=0;
 }
}
export function buoyContacts(b,dt){
 for(const q of b.buoys??[]){
  if(!q||Math.hypot(q.x-b.x,q.y-b.y)>b.spec.length*.6+1)continue;let best=null;
  for(const sample of hullContactSamples(b.spec)){const p=point(b,sample.x,sample.y),dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),depth=sample.radius+.42-d;if(depth>0&&d>.001&&(!best||depth>best.depth))best={p,n:{x:dx/d,y:dy/d},depth};}
  if(!best)continue;const {p,n,depth}=best,arm={x:p.x-b.x,y:p.y-b.y},v=(b.vx-b.w*arm.y-q.vx)*n.x+(b.vy+b.w*arm.x-q.vy)*n.y,inv=inverseMass(b,n,arm)+1/q.mass;
  const k=12000,damping=1.1*Math.sqrt(k/inv),force=Math.max(0,Math.min(20000,(k*depth-damping*v)/(1+(damping*dt+k*dt*dt)*inv))),j=force*dt;
  impulse(b,n,j,arm);q.vx-=n.x*j/q.mass;q.vy-=n.y*j/q.mass;q.contactAt=b.time;q.contactForce=force;
 }
}
// Anchor homes follow the pier row on load. Preserve each line's actual slack
// and all vessel positions/counters when updating the old staggered buoys.
export function restoreBuoys(saved,defaults,boats){
 const moved=new Map(),out=defaults.map((fresh,i)=>{if(!fresh)return null;const old=saved?.[i];if(!old)return fresh;const dx=fresh.homeX-(old.homeX??fresh.homeX),dy=fresh.homeY-(old.homeY??fresh.homeY),q={...fresh,...old,homeX:fresh.homeX,homeY:fresh.homeY,x:(old.x??fresh.x)+dx,y:(old.y??fresh.y)+dy,fieldCache:null,fieldAt:0};if(Math.hypot(dx,dy)>.0001)moved.set(i,{old,next:q});return q;});
 for(const b of boats)for(const r of b.ropes??[]){const q=moved.get(r.bollard);if(!q)continue;const p=cleat(b,r.end),before=Math.hypot(p.x-q.old.x,p.y-q.old.y),after=Math.hypot(p.x-q.next.x,p.y-q.next.y);r.length=Math.max(.1,Math.min(100,r.length+after-before));r.tension=0;}
 return out;
}
