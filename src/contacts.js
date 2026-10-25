import {circleSolidHit as rectHit} from './solid-geometry.js';
import {nearbySolids} from './solid-index.js';
import {SOLIDS,DOCKS,clamp} from './world.js';
import {point,inverseMass,impulse} from './rigging.js';
import {recordImpact} from './impacts.js';
import {hullContactSamples} from './hull-geometry.js';
import {fenderGeometry,fenderContact} from './fenders.js';
import {fenderContactShape} from './fender-geometry.js';
import {boomPoint} from './marina.js';
const notify=b=>message=>{if(!b.events)return;b.events.unshift({time:b.time,message});b.events.splice(12);};
const dockSolids=new Set(DOCKS);
export function contacts(b,dt,indices=null){
 if(b.fenders)for(const g of fenderGeometry(b.spec)){const p=point(b,g.x,g.y),extent=g.length/2+g.radius,candidates=indices??nearbySolids(SOLIDS,p.x,p.y,extent+.001);for(const k of candidates){const rect=SOLIDS[k];if(!dockSolids.has(rect)&&!rect.fender||p.x+extent<rect.x||p.x-extent>rect.x+rect.w||p.y+extent<rect.y||p.y-extent>rect.y+rect.h)continue;let best=null;for(const sample of fenderContactShape(g)){const hit=rectHit(point(b,sample.x,sample.y),g.radius,rect);if(hit&&(!best||hit.depth>best.depth))best={...hit,sample};}if(best)fenderContact(b,best.sample,{...best,target:rect.id??'solid-'+k},dt,notify(b));}}
 for(let iteration=0;iteration<3;iteration++)for(const sample of hullContactSamples(b.spec)){
  const p=point(b,sample.x,sample.y),radius=sample.radius,candidates=indices??nearbySolids(SOLIDS,p.x,p.y,radius+.001);
  for(const k of candidates){
   const rect=SOLIDS[k],hit=rectHit(p,radius,rect);if(!hit)continue;const {n,depth}=hit,arm={x:p.x-b.x-n.x*radius,y:p.y-b.y-n.y*radius};
   const vn=(b.vx-b.w*arm.y)*n.x+(b.vy+b.w*arm.x)*n.y,effective=1/inverseMass(b,n,arm),dock=dockSolids.has(rect)||!!rect.fender;
   if(vn<0){impulse(b,n,-1.015*vn*effective,arm);recordImpact(b,{arm,speed:-vn,effective,protectedContact:!!rect.fender,target:rect.id??'solid-'+k,dock},notify(b));}
   b.x+=n.x*depth*.8;b.y+=n.y*depth*.8;
  }
 }
}
export function boomContacts(b,dt,world=b){
 const bound=b.spec.length*.5+b.spec.beam*.5+1;
 for(const q of world.booms){
  if(Math.abs(b.x-q.x1)>q.length+bound||Math.abs(b.y-q.y1)>q.length+bound)continue;
  const end=boomPoint(q),dx=end.x-q.x1,dy=end.y-q.y1;
  const hitFor=sample=>{const p=point(b,sample.x,sample.y),t=clamp(((p.x-q.x1)*dx+(p.y-q.y1)*dy)/(q.length*q.length),0,1),near=boomPoint(q,t),rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),depth=sample.radius+q.width/2-d;if(depth<=0||d<1e-6)return null;return{p,near,n:{x:rx/d,y:ry/d},depth};};
  if(b.fenders)for(const g of fenderGeometry(b.spec)){let hit=null;for(const sample of fenderContactShape(g)){const h=hitFor(sample);if(h&&(!hit||h.depth>hit.depth))hit={...h,sample};}if(!hit)continue;const {near}=hit,arm={x:near.x-q.x1,y:near.y-q.y1},otherInverse=n=>(arm.x*n.y-arm.y*n.x)**2/q.inertia,react=(n,j)=>{q.w+=(arm.x*n.y-arm.y*n.x)*j/q.inertia;};fenderContact(b,hit.sample,{...hit,otherVelocity:{x:near.vx,y:near.vy},otherInverse,react,target:'Y-'+q.id},dt,notify(b));}
  for(const sample of hullContactSamples(b.spec)){
   const hit=hitFor(sample);if(!hit)continue;const {p,near,n,depth}=hit,radius=sample.radius,arm={x:p.x-b.x-n.x*radius,y:p.y-b.y-n.y*radius},lever=(near.x-q.x1)*n.y-(near.y-q.y1)*n.x;
   const vn=(b.vx-b.w*arm.y-near.vx)*n.x+(b.vy+b.w*arm.x-near.vy)*n.y;
   if(vn<0){const effective=1/(inverseMass(b,n,arm)+lever*lever/q.inertia),j=-vn*effective;impulse(b,n,j,arm);q.w-=lever*j/q.inertia;recordImpact(b,{arm,speed:-vn,effective,target:'Y-'+q.id},notify(b));}
   b.x+=n.x*depth*.65;b.y+=n.y*depth*.65;
  }
 }
}
