import {PREVIOUS_NIEPORET as old} from './nieporet-migration-data.js';
import {localAttachment} from './attachment-points.js';
import {hullContactSamples} from './hull-geometry.js';
import {circleSolidHit} from './solid-geometry.js';
function clearOldPose(b,{solids,bottomAt}){
 const c=Math.cos(b.a),s=Math.sin(b.a),samples=hullContactSamples(b.spec),clear=(x,y)=>samples.every(p=>{const q={x:x+c*p.x-s*p.y,y:y+s*p.x+c*p.y};return bottomAt(q.x,q.y).depth>b.spec.draft+.05&&!solids.some(d=>circleSolidHit(q,p.radius+.08,d));});
 if(clear(b.x,b.y))return;const start={x:b.x,y:b.y};
 for(const radius of[.5,1,1.5,2,2.5,3,4,5,6,8,10,12])for(let i=0;i<24;i++){const a=i*Math.PI/12,x=start.x+Math.cos(a)*radius,y=start.y+Math.sin(a)*radius;if(clear(x,y)){b.x=x;b.y=y;return;}}
}
// Operates on restoreSession's cloned data only. Accounting, power, engine keys,
// fuel and logbook data are preserved; old fixed-point identities stay stable.
export function migrateNieporetSave(data,{points,starts,shoreAt,world,solids,bottomAt,skip=new Set()}){
 if((data.siteGeometryVersion??1)>=3)return;
 const previous=new Map(old.points.map(p=>[p.index,p])),changed=new Set(previous.keys());
 const fuel=points.find(p=>p.id==='PIL-F--2'),previousFuel=old.points.find(p=>p.id==='PIL-F--2');
 for(const b of data.fleet.boats){const before={x:b.x,y:b.y},tie=b.ropes.find(r=>changed.has(r.bollard));let dx=0,dy=0,move=skip.has(b.id);
  if(!skip.has(b.id)){
  if(tie){const p=previous.get(tie.bollard),q=points[tie.bollard],a=q.legacy2Rotation??0,c=Math.cos(a),s=Math.sin(a),x=b.x-p.x,y=b.y-p.y;dx=q.x+c*x-s*y-b.x;dy=q.y+s*x+c*y-b.y;b.a+=a;move=true;}
  else{const p=old.bounds;if(b.x>p.left-40&&b.x<p.right+40&&b.y>p.top-40&&b.y<p.bottom+40){dx=fuel.x-previousFuel.x;dy=fuel.y-previousFuel.y;move=true;}else if(b.y>1770&&Math.abs(b.x-old.oldCanal.x)<50&&shoreAt(b.x,b.y).land){dx=starts.zeranski.x-b.x;dy=starts.zeranski.y-b.y;move=true;}}
  }
  if(!move)continue;b.x+=dx;b.y+=dy;const predicted={x:b.x,y:b.y};clearOldPose(b,{solids,bottomAt});dx+=b.x-predicted.x;dy+=b.y-predicted.y;
  if(shoreAt(b.x,b.y).land){const destination=tie&&points[tie.bollard].site==='wodnik'?starts.zeranski:starts.nieporet;dx+=destination.x-b.x;dy+=destination.y-b.y;b.x=destination.x;b.y=destination.y;}
  if(b.anchor&&b.anchor.mode!=='stowed'){b.anchor.x+=dx;b.anchor.y+=dy;}
  for(const q of b.trail??[])if(Math.hypot(q.x-before.x,q.y-before.y)<350){q.x+=dx;q.y+=dy;}
  for(const q of data.fleet.rescue?.objects??[])if(!q.recovered&&Math.hypot(q.x-before.x,q.y-before.y)<80){q.x+=dx;q.y+=dy;}
  if(b.id===data.fleet.activeId)for(const key of['manualCenter','centerReference']){const p=data.ui?.[key];if(p&&Math.hypot(p.x-before.x,p.y-before.y)<250){p.x+=dx;p.y+=dy;}}
  b.vx=b.vy=b.w=0;b.wake=[];b.brakingWaves=[];
  for(const r of b.ropes)if(changed.has(r.bollard)){const p=localAttachment(b.spec,r.end),c=Math.cos(b.a),s=Math.sin(b.a),q=points[r.bollard];r.length=Math.min(100,Math.max(.1,Math.hypot(b.x+c*p.x-s*p.y-q.x,b.y+s*p.x+c*p.y-q.y)+.15));r.tension=0;}
 }
 if(data.world){const fresh=new Map(world.traffic.filter(q=>['pilawa','nieporet'].includes(q.site)).map(q=>[q.id,q]));data.world.traffic=data.world.traffic.map(q=>fresh.get(q.id)??q);data.world.buoys=data.world.buoys.map((q,i)=>changed.has(i)?world.buoys[i]:q);}
 data.siteGeometryVersion=3;
}
