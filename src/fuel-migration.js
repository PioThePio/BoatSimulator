import {fuelFrame} from './fuel-geometry.js';
import {localAttachment} from './attachment-points.js';

export function migrateFuelBerth(data,station,oldCenter,points){
 if(data.fuelBerthVersion===1)return;
 const f=fuelFrame(station),angle=Math.atan2(f.ty,f.tx)-Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
 for(const b of data.fleet.boats){
  if(!b.ropes.some(r=>points[r.bollard]?.fuel===station.id))continue;
  const x=b.x-oldCenter.x,y=b.y-oldCenter.y;
  b.x=station.x+c*x-s*y;b.y=station.y+s*x+c*y;b.a+=angle;b.vx=b.vy=b.w=0;
  if(b.anchor?.mode!=='stowed'&&b.anchor){const x=b.anchor.x-oldCenter.x,y=b.anchor.y-oldCenter.y;b.anchor.x=station.x+c*x-s*y;b.anchor.y=station.y+s*x+c*y;}
  if(b.id===data.fleet.activeId)for(const key of['manualCenter','centerReference']){const p=data.ui?.[key];if(p&&Math.hypot(p.x-oldCenter.x,p.y-oldCenter.y)<30){const x=p.x-oldCenter.x,y=p.y-oldCenter.y;p.x=station.x+c*x-s*y;p.y=station.y+s*x+c*y;}}
  for(const r of b.ropes){const p=localAttachment(b.spec,r.end),q=points[r.bollard],ca=Math.cos(b.a),sa=Math.sin(b.a);r.length=Math.hypot(b.x+ca*p.x-sa*p.y-q.x,b.y+sa*p.x+ca*p.y-q.y)+.15;r.tension=0;}
  b.wake=[];b.brakingWaves=[];
 }
 data.fuelBerthVersion=1;
}
