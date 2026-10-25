import test from 'node:test';
import assert from 'node:assert/strict';
import {NIEPORET_REFERENCE as reference} from '../src/nieporet-reference.js';
import {SURVEY_SCALE} from '../src/nieporet-geography.js';
import {projectNieporet,nieporetToGeo,fromGeo,WORLD_DISTANCE_SCALE} from '../src/zegrze.js';
import {LAKE,COAST_PATCHES,NIEPORET,PILAWA,BOLLARDS,DOCKS,SOLIDS,TRAFFIC,BRIDGES,BRIDGE_SOLIDS,MAP_STARTS,FUEL_STATIONS,shoreAt,bottomAt,reflectionFacesNear} from '../src/world.js';
import {createBoat,step} from '../src/physics.js';
import {createFleet} from '../src/fleet.js';
import {resolveFleetSpawn} from '../src/fleet-spawns.js';
import {point,cleat} from '../src/rigging.js';
import {hullContactSamples} from '../src/hull-geometry.js';
import {circleSolidHit,solidPoint,orientedFaces} from '../src/solid-geometry.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {PREVIOUS_NIEPORET} from '../src/nieporet-migration-data.js';
import {createTraffic,trafficStep} from '../src/traffic.js';
import {nearbySolids} from '../src/solid-index.js';
import {contacts} from '../src/contacts.js';
import {beginFenderStep} from '../src/fenders.js';
const calm={traffic:true,windSpeed:0,currentSpeed:0,waveHeight:0},dt=1/120;
const close=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} vs ${b}`);
const poseGeo=([lon,lat])=>projectNieporet([lon,lat]);
function clearHull(b){for(const s of hullContactSamples(b.spec)){const p=point(b,s.x,s.y);assert.ok(bottomAt(p.x,p.y).depth>b.spec.draft+.08,`${b.spec.name} bottom at ${p.x},${p.y}`);assert.ok(!SOLIDS.some(d=>circleSolidHit(p,s.radius,d)),`${b.spec.name} solid at ${p.x},${p.y}`);}}
function canReach(start,goal,box,radius=2.2){
 const cell=1.5,W=Math.ceil((box.right-box.left)/cell)+1,H=Math.ceil((box.bottom-box.top)/cell)+1,key=(x,y)=>y*W+x,toCell=p=>[Math.round((p.x-box.left)/cell),Math.round((p.y-box.top)/cell)],a=toCell(start),z=toCell(goal),queue=[a],seen=new Set([key(...a)]);
 for(let n=0;n<queue.length;n++){const[x,y]=queue[n];if(Math.hypot(x-z[0],y-z[1])<2)return true;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const i=x+dx,j=y+dy,k=key(i,j);if(i<0||i>=W||j<0||j>=H||seen.has(k))continue;seen.add(k);const p={x:box.left+i*cell,y:box.top+j*cell};if(shoreAt(p.x,p.y).distance<=radius||bottomAt(p.x,p.y).depth<1.1||SOLIDS.some(d=>circleSolidHit(p,radius,d))||TRAFFIC.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<radius+q.length*.5+.2))continue;queue.push([i,j]);}}
 return false;
}
test('100 m reference calibration uses one isotropic SI survey without changing global scale or time',()=>{
 close(SURVEY_SCALE.metresPerPixel*SURVEY_SCALE.referenceBarPixels,100);assert.equal(WORLD_DISTANCE_SCALE,.5);
 const a=projectNieporet(reference.anchor),b=projectNieporet([reference.anchor[0],reference.anchor[1]+100/(6371008.8*Math.PI/180)]);close(Math.hypot(b.x-a.x,b.y-a.y),100);
 const old=fromGeo(reference.anchor[1],reference.anchor[0]);close(a.x,old.x);close(a.y,old.y);
 for(const c of [reference.roadBridge[0],reference.railBridge[1],reference.eastCoast[12]]){const p=projectNieporet(c),g=nieporetToGeo(p.x,p.y);close(g.longitude,c[0]);close(g.latitude,c[1]);}
});
test('one simple shoreline replaces the old coast patch and canal; it has no crossing edges or zero-length segments',()=>{
 assert.equal(COAST_PATCHES.length,0);const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<LAKE.length;i++){const a=LAKE[i],b=LAKE[(i+1)%LAKE.length];assert.ok(Math.hypot(b.x-a.x,b.y-a.y)>.001);for(let j=i+2;j<LAKE.length;j++){if(i===0&&j===LAKE.length-1)continue;const c=LAKE[j],d=LAKE[(j+1)%LAKE.length];assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7),`crossing ${i}/${j}`);}}
});
test('mapped bank vertices and both shields are shared by visible terrain and exact shore-distance queries',()=>{
 for(const coordinates of [...reference.eastCoast.slice(1,180),...reference.features['974972779'].slice(1,9)]){const p=projectNieporet(coordinates);close(shoreAt(p.x,p.y).distance,0,.001);assert.ok(LAKE.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<.001));}
 const p=projectNieporet([21.0432515,52.4391446]),s=shoreAt(p.x,p.y);for(const offset of[-1,2,5]){const q=shoreAt(p.x+s.nx*offset,p.y+s.ny*offset);assert.ok(Number.isFinite(q.distance));}
 assert.ok(shoreAt(...Object.values(projectNieporet([21.038,52.435]))).land,'the common peninsula must stay dry');
});
test('road and railway are distinct source-aligned overhead spans with assumed clearance and no invented wet piers',()=>{
 const road=BRIDGES.find(q=>q.id==='nieporet'),rail=BRIDGES.find(q=>q.id==='nieporet-rail');assert.ok(rail.a.y>road.a.y+180);
 for(const [b,coords]of[[road,reference.roadBridge],[rail,reference.railBridge]]){const a=projectNieporet(coords[0]),z=projectNieporet(coords[1]);close(b.a.x,a.x);close(b.b.y,z.y);assert.equal(b.clearanceAssumed,true);assert.deepEqual(b.piers,[]);const p={x:(a.x+z.x)/2,y:(a.y+z.y)/2};assert.ok(bottomAt(p.x,p.y).depth>2);assert.ok(!BRIDGE_SOLIDS.some(d=>circleSolidHit(p,2,d)));assert.equal(b.abutments.length,2);}
});
test('the canal remains navigable from open water through both bridges, rather than an underwater bridge wall',()=>{
 const points=[[21.03427,52.433],[21.03423,52.43242],[21.0347,52.4313],[21.03508,52.43043],[21.0353,52.4299]].map(poseGeo);
 for(let i=0;i<points.length-1;i++){const a=points[i],z=points[i+1],N=Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)/1.5);for(let j=0;j<=N;j++){const p={x:a.x+(z.x-a.x)*j/N,y:a.y+(z.y-a.y)*j/N};assert.ok(shoreAt(p.x,p.y).distance>4);assert.ok(bottomAt(p.x,p.y).depth>2);assert.ok(!SOLIDS.some(d=>circleSolidHit(p,2.2,d)));}}
 for(const bridge of BRIDGES.filter(q=>q.site==='nieporet')){const b=createBoat('zeranski');Object.assign(b,{x:(bridge.a.x+bridge.b.x)/2,y:(bridge.a.y+bridge.b.y)/2-1,a:Math.PI/2,vx:0,vy:1.1,throttle:0});for(let i=0;i<240;i++)step(b,calm,dt,{sharedStep:false});assert.equal(b.damage,0);assert.equal(b.grounded,false);}
});
test('Pilawa is a separate narrow northern basin; source piers stay on its eastern side and its south is closed',()=>{
 assert.ok(PILAWA.y<NIEPORET.y-150);assert.ok(PILAWA.x>NIEPORET.x);assert.equal(PILAWA.fuel,undefined);
 assert.ok(PILAWA.docks.some(q=>q.id==='pilawa-cross-main'));assert.equal(PILAWA.docks.filter(q=>q.id.startsWith('pilawa-cross-')).length,4);
 const south=projectNieporet([21.04365,52.4376]);assert.ok(shoreAt(south.x,south.y).land);assert.ok(bottomAt(PILAWA.start.x,PILAWA.start.y).depth>1.5);
 const box={left:PILAWA.bounds.left-15,right:PILAWA.bounds.right+15,top:PILAWA.bounds.top-15,bottom:PILAWA.bounds.bottom+15};assert.ok(canReach(PILAWA.start,PILAWA.route.at(-1),box));
});
test('the larger basin has six western piers, the long eastern pier, berth fingers and a clear fuel route',()=>{
 assert.equal(NIEPORET.docks.filter(q=>!q.access&&q.id.startsWith('nieporet-pier-')).length,6);const east=NIEPORET.docks.find(q=>q.id==='nieporet-east-main');assert.ok(east.pose.length>65&&east.pose.length<80);assert.ok(NIEPORET.docks.filter(q=>q.finger).length>=70);
 for(const d of NIEPORET.docks.filter(q=>q.finger)){assert.ok(d.pose.width<=.5);assert.ok(NIEPORET.docks.some(p=>p!==d&&circleSolidHit(solidPoint(d,-d.pose.length/2,0),.1,p)));}
 const box={left:NIEPORET.bounds.left-20,right:NIEPORET.bounds.right+20,top:NIEPORET.bounds.top-20,bottom:NIEPORET.bounds.bottom+20};assert.ok(canReach(NIEPORET.start,{x:NIEPORET.fuel.x+6,y:NIEPORET.fuel.y},box,2.2));
});
test('the sole local water-fuel station is at the red-circle position in the western larger basin, not Pilawa or the road ORLEN',()=>{
 assert.equal(FUEL_STATIONS.filter(q=>q.id==='pilawa-fuel').length,1);const f=NIEPORET.fuel,p=projectNieporet([21.0412369,52.4358481]);assert.ok(Math.hypot(f.pumpX-p.x,f.pumpY-p.y)<2);assert.match(f.name,/Nieporęt/);assert.ok(f.y>PILAWA.bounds.bottom);assert.ok(bottomAt(f.x+2,f.y).depth>1.5);
});
test('all supported profiles start clear of terrain and structures in the three rebuilt locations',()=>{
 for(const site of['pilawa','nieporet','zeranski'])for(const profile of['tender','flat','rib','runabout','cabin','cruiser','racing','pwc','swamp'])clearHull(createBoat(site,{profile,coldStart:true}));
});
test('each port offers real moored Fleet starts for powered boats and a barge with traffic present',()=>{
 for(const location of['pilawa','nieporet'])for(const kind of['runabout','cabin','cruiser','racing','barge']){const r=resolveFleetSpawn(createFleet(createBoat('lake')),kind,location,{moored:true});assert.ok(r.ok,location+' '+kind+': '+r.message);assert.ok(r.ties.length);assert.ok(r.ties.every(q=>BOLLARDS[q.bollard].site===location));}
});
test('parked hulls in both basins float clear of actual piers and fingers, with short lines to physical points',()=>{
 const traffic=createTraffic().filter(q=>['pilawa','nieporet'].includes(q.site));assert.equal(traffic.length,22);assert.equal(new Set(traffic.map(q=>q.type)).size,3);
 for(const b of traffic){clearHull(b);assert.ok(b.ropes.length>=2);for(const r of b.ropes){const p=cleat(b,r.end),q=BOLLARDS[r.bollard];assert.ok(q);close(r.length,Math.hypot(p.x-q.x,p.y-q.y)+.12);assert.ok(r.length<13);}}
});
test('both port names retain the existing 20 Hz field cache while ropes and contacts integrate each physical step',()=>{
 for(const site of['pilawa','nieporet']){const b=createBoat(site),q=b.traffic.find(q=>q.site===site);b.traffic=[q];let previous,changes=0;for(let i=0;i<10;i++){b.time=(i+1)*dt;trafficStep(b,calm,dt);if(q.fieldCache!==previous){changes++;previous=q.fieldCache;}assert.ok(q.ropes.every(r=>Number.isFinite(r.tension)));}assert.equal(changes,2);close(q.time,10*dt);}
});
test('static broad-phase indexing preserves the exact previous candidate set and contact order across both ports and cell boundaries',()=>{
 for(let i=0;i<500;i++){const x=220+(i*37%360),y=620+(i*53%560),radius=1+(i%12),linear=SOLIDS.flatMap((d,k)=>Math.hypot(Math.max(d.x-x,0,x-d.x-d.w),Math.max(d.y-y,0,y-d.y-d.h))<radius?[k]:[]);assert.deepEqual(nearbySolids(SOLIDS,x,y,radius),linear);}
});
test('indexed collision lookup produces exactly the same impulses, positions, fender compression and damage as scanning every solid',()=>{
 for(const d of[DOCKS[1],...NIEPORET.docks.filter(d=>d.sourceWay&&!d.access).slice(0,3),PILAWA.docks[0]])for(const side of[-1,1]){
  const a=createBoat('lake'),pose=d.pose??{a:0,length:d.w,width:d.h};Object.assign(a,solidPoint(d,0,side*(pose.width/2+a.spec.beam/2-.12)),{a:pose.a,vx:Math.sin(pose.a)*side*.4,vy:-Math.cos(pose.a)*side*.4});const b=structuredClone(a);
  for(let i=0;i<3;i++){beginFenderStep(a);beginFenderStep(b);contacts(a,dt);contacts(b,dt,SOLIDS.map((_,i)=>i));for(const k of['x','y','vx','vy','w','damage','dockDamage','fenderContacts'])assert.deepEqual(a[k],b[k],d.id+' '+k);}
 }
});
test('bounded reflection selection returns exactly the former full-sort faces, distances and order among dense berth fingers',()=>{
 const all=DOCKS.flatMap((d,i)=>d.pose?orientedFaces(d,'dock-'+i):[['L',{x:d.x,y:d.y},{x:d.x,y:d.y+d.h},-1,0],['R',{x:d.x+d.w,y:d.y},{x:d.x+d.w,y:d.y+d.h},1,0],['T',{x:d.x,y:d.y},{x:d.x+d.w,y:d.y},0,-1],['B',{x:d.x,y:d.y+d.h},{x:d.x+d.w,y:d.y+d.h},0,1]].map(([side,a,b,nx,ny])=>({id:'dock'+i+side,a,b,nx,ny,dx:b.x-a.x,dy:b.y-a.y,length2:(b.x-a.x)**2+(b.y-a.y)**2}))).map((f,order)=>({...f,order}));
 for(let j=0;j<200;j++){const x=250+j*37%340,y=680+j*53%500,expected=all.flatMap(f=>{const u=Math.max(0,Math.min(1,((x-f.a.x)*f.dx+(y-f.a.y)*f.dy)/f.length2)),distance=Math.hypot(x-f.a.x-u*f.dx,y-f.a.y-u*f.dy);return distance<70&&(x-f.a.x)*f.nx+(y-f.a.y)*f.ny>.001?[{...f,distance}]:[];}).sort((a,b)=>a.distance-b.distance||a.order-b.order).slice(0,4);assert.deepEqual(reflectionFacesNear(x,y).filter(f=>f.id!=='shore').map(f=>[f.id,f.distance]),expected.map(f=>[f.id,f.distance]));}
});
test('an actual runabout enters Pilawa and reaches its middle basin without grounding or collision damage',()=>{
 const b=createBoat('pilawa'),path=PILAWA.route.slice(1);let target=0,arrived=false;
 for(let i=0;i<200*120;i++){const p=path[target],dx=p.x-b.x,dy=p.y-b.y;if(Math.hypot(dx,dy)<3){if(target===path.length-1){arrived=true;break;}target++;}const e=Math.atan2(Math.sin(Math.atan2(dy,dx)-b.a),Math.cos(Math.atan2(dy,dx)-b.a));b.steer=Math.max(-b.spec.maxSteer,Math.min(b.spec.maxSteer,e*1.6));b.throttle=Math.hypot(b.vx,b.vy)>1.1?.08:.28;step(b,calm,dt,{sharedStep:false});assert.equal(b.damage,0);assert.equal(b.grounded,false);}assert.ok(arrived);
});
test('a previous-generation local save relocates its actual mooring without changing hours, fuel, battery, keys or logs',()=>{
 const old=PREVIOUS_NIEPORET.points.find(q=>q.id==='PIL-1-3-1'),b=createBoat('lake',{coldStart:true}),f=createFleet(b);Object.assign(b,{x:old.x+5,y:old.y+3,a:0});b.ropes=[{end:'bow',bollard:old.index,length:6,tension:120}];b.battery.soc=.37;b.engines[0].operatingHours=13;b.engines[0].key='ignition';b.operations.distance=2345;b.time=f.time=240;const raw=snapshotSession({fleet:f,env:calm});raw.siteGeometryVersion=2;const r=restoreSession(raw);assert.ok(r.ok,r.message);const q=r.session.fleet.boats[0];assert.equal(q.ropes[0].bollard,old.index);assert.equal(q.engines[0].operatingHours,13);assert.equal(q.battery.soc,.37);assert.equal(q.engines[0].key,'ignition');assert.equal(q.fuel.litres,b.fuel.litres);assert.equal(q.operations.distance,2345);assert.equal(q.time,240);assert.ok(!shoreAt(q.x,q.y).land);assert.ok(restoreSession(snapshotSession(r.session)).ok);
});
test('a save in the removed fictional canal restores to safe water without resetting progress',()=>{
 const b=createBoat('lake',{coldStart:true}),f=createFleet(b);Object.assign(b,PREVIOUS_NIEPORET.oldCanal);b.engines[0].operatingHours=2;const raw=snapshotSession({fleet:f,env:calm});raw.siteGeometryVersion=2;const r=restoreSession(raw);assert.ok(r.ok,r.message);const q=r.session.fleet.boats[0];assert.ok(bottomAt(q.x,q.y).depth>1.5);assert.equal(q.engines[0].operatingHours,2);close(q.x,MAP_STARTS.zeranski.x);
});
