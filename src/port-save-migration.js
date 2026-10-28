import {localAttachment} from './attachment-points.js';
// One-time, cloned-save migration. Existing numeric attachment identities,
// electrical states and accounting counters remain unchanged.
export function migrateMainPort(data,points){
 if(data.mainPortVersion===1)return;
 const moved=new Map([16,22,28,34,38].map(y=>[points.findIndex(p=>p.id==='SER'+y),{x:132,y}]));
 for(const b of data.fleet.boats){const serviceTie=b.ropes.some(r=>moved.has(r.bollard));if(!serviceTie)continue;
  const distances=new Map(b.ropes.filter(r=>moved.has(r.bollard)).map(r=>{const p=moved.get(r.bollard),q=localAttachment(b.spec,r.end),c=Math.cos(b.a),s=Math.sin(b.a);return[r,Math.hypot(b.x+c*q.x-s*q.y-p.x,b.y+s*q.x+c*q.y-p.y)];}));
  if(b.x>110&&b.x<148&&b.y>5&&b.y<50&&!data.rig?.boatLoaded){b.x+=73;b.y-=8;for(const key of['centerReference','manualCenter']){const p=data.ui?.[key];if(p&&b.id===data.fleet.activeId){p.x+=73;p.y-=8;}}if(b.anchor?.mode!=='stowed'){b.anchor.x+=73;b.anchor.y-=6;}b.wake=[];b.brakingWaves=[];}
  for(const[r,before]of distances){const p=points[r.bollard],q=localAttachment(b.spec,r.end),c=Math.cos(b.a),s=Math.sin(b.a),after=Math.hypot(b.x+c*q.x-s*q.y-p.x,b.y+s*q.x+c*q.y-p.y);r.length=Math.max(.1,Math.min(100,after+Math.max(.1,r.length-before)));r.tension=0;}
 }
 data.mainPortVersion=1;
}
