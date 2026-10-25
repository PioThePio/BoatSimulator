import {PREVIOUS_SITES} from './site-migration-data.js';
import {localAttachment} from './attachment-points.js';
// Called only on the already-cloned old save. Numeric bollard indices and all
// accounting/electrical/engine values remain intact across the geographic fix.
export function migrateSiteSave(data,{points,starts,shoreAt,world}){
 if((data.siteGeometryVersion??1)>=2)return new Set();
 const oldPoints=new Map(PREVIOUS_SITES.points.map(p=>[p.index,p])),changed=new Set(oldPoints.keys()),transforms=[];
 for(const b of data.fleet.boats){
  const oldPose={x:b.x,y:b.y,a:b.a};
  const tie=b.ropes.find(r=>changed.has(r.bollard));let dx=0,dy=0,move=false;
  if(tie){const p=oldPoints.get(tie.bollard),q=points[tie.bollard];if(q.site==='euzebia'){const n=shoreAt(q.x,q.y),distance=Math.hypot(b.x-p.x,b.y-p.y),turn=Math.atan2(n.ny,n.nx)-Math.atan2(b.y-p.y,b.x-p.x);dx=q.x+n.nx*distance-b.x;dy=q.y+n.ny*distance-b.y;b.a+=turn;}else{const a=q.legacyRotation??0,c=Math.cos(a),s=Math.sin(a),x=b.x-p.x,y=b.y-p.y;dx=q.x+c*x-s*y-b.x;dy=q.y+s*x+c*y-b.y;b.a+=a;}move=true;}
  else{const e=PREVIOUS_SITES.euzebia,p=PREVIOUS_SITES.pilawa.bounds;if(Math.hypot((b.x-e.x)/e.rx,(b.y-e.y)/e.ry)<2.4){dx=starts.euzebia.x-PREVIOUS_SITES.euzebia.x+e.rx+35;dy=starts.euzebia.y-e.y;move=true;}else if(b.x>p.left-40&&b.x<p.right+40&&b.y>p.top-40&&b.y<p.bottom+40){dx=starts.pilawa.x-PREVIOUS_SITES.pilawa.start.x;dy=starts.pilawa.y-PREVIOUS_SITES.pilawa.start.y;move=true;}}
  if(!move)continue;b.x+=dx;b.y+=dy;
  if(shoreAt(b.x,b.y).land){const destination=tie&&points[tie.bollard].site==='euzebia'?starts.euzebia:starts.nieporet??starts.pilawa;dx+=destination.x-b.x;dy+=destination.y-b.y;b.x=destination.x;b.y=destination.y;}
  if(b.anchor?.mode!=='stowed'){b.anchor.x+=dx;b.anchor.y+=dy;}
  for(const q of b.trail??[])if(Math.hypot(q.x-(b.x-dx),q.y-(b.y-dy))<250){q.x+=dx;q.y+=dy;}
  transforms.push({before:oldPose,after:{x:b.x,y:b.y,a:b.a}});if(b.id===data.fleet.activeId)for(const key of['manualCenter','centerReference']){const p=data.ui?.[key];if(p&&Math.hypot(p.x-oldPose.x,p.y-oldPose.y)<250){p.x+=dx;p.y+=dy;}}
  b.wake=[];b.brakingWaves=[];b.vx=b.vy=b.w=0;
  for(const r of b.ropes)if(changed.has(r.bollard)){const p=localAttachment(b.spec,r.end),c=Math.cos(b.a),s=Math.sin(b.a),q=points[r.bollard],distance=Math.hypot(b.x+c*p.x-s*p.y-q.x,b.y+s*p.x+c*p.y-q.y);r.length=Math.min(100,Math.max(.1,distance+.15));r.tension=0;}
 }
 for(const o of data.fleet.rescue?.objects??[]){if(o.recovered)continue;const t=transforms.find(q=>Math.hypot(o.x-q.before.x,o.y-q.before.y)<80);if(t){const a=t.after.a-t.before.a,c=Math.cos(a),s=Math.sin(a),dx=o.x-t.before.x,dy=o.y-t.before.y;o.x=t.after.x+c*dx-s*dy;o.y=t.after.y+s*dx+c*dy;o.a+=a;}}
 if(data.world){const fresh=new Map(world.traffic.filter(q=>q.site==='pilawa').map(q=>[q.id,q]));data.world.traffic=data.world.traffic.map(q=>fresh.get(q.id)??q);data.world.buoys=data.world.buoys.map((q,i)=>changed.has(i)?world.buoys[i]:q);}
 data.siteGeometryVersion=2;return new Set(data.fleet.boats.filter(b=>transforms.some(t=>t.after.x===b.x&&t.after.y===b.y)).map(b=>b.id));
}
