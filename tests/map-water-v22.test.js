import {solidPoint} from '../src/solid-geometry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope} from '../src/physics.js';
import {CRAFTS,engineState,updateEngine} from '../src/craft.js';
import {WORLD_DISTANCE_SCALE,fromAtlas,compressWorld,REMOTE_HARBORS} from '../src/zegrze.js';
import {WORLD,DOCKS,BOLLARDS,BUILDINGS,BRIDGES,YBOOMS,MAP_STARTS,MAP_POIS,SERVICE_STATION,FUEL_STATION,FUEL_FENDERS,SHOALS,BEACHES,shoreAt,bottomAt,ISLANDS,reflectionFacesNear} from '../src/world.js';
import {worldScale,operationalTimeScale,logicalDistance} from '../src/operations.js';
import {createAtlas,atlasProjection,zoomAtlas,panAtlas} from '../src/map-controls.js';
import {driveWaterState,engineSteering} from '../src/drive-effects.js';
import {propSurfaceIntensity,coolingWaterIntensity} from '../src/render.js';
import {bilgeStep,deckIngressRate} from '../src/bilge.js';
import {systemsStep} from '../src/systems.js';
import {wakeAmplitude,recordHullWake,sampleHullWake,sampleWakeField,reflectionPaths,WAKE_LIFETIME} from '../src/wake.js';
import {sampleWorldWake,registerWakeSource} from '../src/wave-field.js';
import {trafficStep} from '../src/traffic.js';
import {boomStep,mooringPoint,boomPoint} from '../src/marina.js';
import {fenderGeometry} from '../src/fender-geometry.js';
import {hullHalfBeam} from '../src/hull-geometry.js';
import {beginFenderStep,fenderContact} from '../src/fenders.js';
import {contacts} from '../src/contacts.js';
import {point} from '../src/rigging.js';
const dt=1/120,close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const run=(b,t,e={})=>{for(let i=0;i<t*120;i++)step(b,e,dt);};
function passage(y=0){const h=[],b=createBoat('lake',{profile:'cabin'});for(let i=0;i<41;i++){Object.assign(b,{x:5+i*2.4,y,a:0,vx:12,vy:0,time:i*.2});recordHullWake(h,b,{x:0,y:0});}return h;}

test('world is exactly 50% ORIGINAL geography with operational factor 2, unchanged dimensions and no compounded scaling',()=>{
 close(WORLD_DISTANCE_SCALE,.5);close(worldScale,.5);close(operationalTimeScale,2);close(logicalDistance(500),1000);
 close(WORLD.right-WORLD.left,1280*1000/75*.5);close(WORLD.bottom-WORLD.top,1042*1000/75*.5);
 for(const [x,y]of [[0,0],[1280,1042],[834,741]])assert.deepEqual(fromAtlas(x,y),compressWorld({x:(x-610)*1000/75,y:(y-739)*1000/75}));
 assert.deepEqual([DOCKS[0].w,DOCKS[0].h],[23,2.8]);assert.deepEqual([SERVICE_STATION.slip.w,SERVICE_STATION.slip.h],[7,44]);assert.equal(YBOOMS[0].length,10);assert.equal(YBOOMS[0].width,.25);assert.equal(BRIDGES[0].width,17);
});
test('every remote pier reaches land and water; the four legacy piers now join real beach/island shore',()=>{
 for(let i=13;i<21;i++){const d=DOCKS[i],samples=Array.from({length:21},(_,j)=>shoreAt(d.x+d.w*j/20,d.y+d.h*j/20).distance);assert.ok(Math.min(...samples)<=0,REMOTE_HARBORS[i-13].name);assert.ok(Math.max(...samples)>10);}
 for(const indices of [[6,7],[8,9]]){const d=indices.map(i=>DOCKS[i]);assert.ok(d.some(q=>[[q.x,q.y],[q.x+q.w,q.y+q.h]].some(([x,y])=>shoreAt(x,y).distance<0)));assert.ok(d.some(q=>bottomAt(q.x+q.w/2,q.y+q.h/2).depth>.5));}
 assert.equal(DOCKS[6].site,'beach');assert.equal(DOCKS[8].site,'island');
});
test('main port access and service finger touch land; slip crosses the real wet/dry line; fuel stays on its own pier',()=>{
 for(const d of DOCKS.filter(q=>q.access)){const a=d.pose?solidPoint(d,-d.pose.length/2,0):{x:d.x,y:d.y},b=d.pose?solidPoint(d,d.pose.length/2,0):{x:d.x+d.w/2,y:d.y+d.h};assert.ok(shoreAt(a.x,a.y).land,d.id);assert.ok(!shoreAt(b.x,b.y).land,d.id);}
 const s=SERVICE_STATION.slip;assert.ok(bottomAt(s.x+s.w/2,s.y).depth<0);assert.ok(bottomAt(s.x+s.w/2,s.y+s.h).depth>2);
 assert.ok(DOCKS.some(d=>d.service&&d.site==='technical')&&!DOCKS.some(d=>d.service&&d.x===130.5));
 assert.ok(DOCKS.some(d=>Math.abs(d.x+d.w-FUEL_STATION.x)<1e-8&&d.y<FUEL_STATION.y&&d.y+d.h>FUEL_STATION.y));
 for(const f of FUEL_FENDERS)close(f.x,FUEL_STATION.x);
});
test('all fixed bollards are on their piers, floating fingers, trailer or anchored buoys; trees and all building corners stay on land',()=>{
 for(const q of BOLLARDS){if(q.kind==='tree'){assert.ok(shoreAt(q.x,q.y).distance<-1.3,q.id);continue;}if(q.kind==='buoy'){assert.ok(bottomAt(q.x,q.y).depth>.5,q.id);assert.ok(shoreAt(q.x,q.y).distance>.55,q.id);continue;}if(q.shoreMooring){assert.ok(Math.abs(shoreAt(q.x,q.y).distance)<.3,q.id);continue;}if(q.trailer||q.boom!==undefined)continue;
  assert.ok(DOCKS.some(d=>q.x>=d.x-.05&&q.x<=d.x+d.w+.05&&q.y>=d.y-.05&&q.y<=d.y+d.h+.05),q.id);}
 for(const d of BUILDINGS)for(const [dx,dy]of [[0,0],[d.w,0],[0,d.h],[d.w,d.h]])assert.ok(shoreAt(d.x+dx,d.y+dy).land,JSON.stringify(d));
 for(const q of YBOOMS)assert.ok(DOCKS.some(d=>q.x1>=d.x&&q.x1<=d.x+d.w&&q.y1>=d.y&&q.y1<=d.y+d.h));
});
test('bridge spans cross water, their piers stay in water and Zegrze bridge no longer crosses the headland',()=>{
 for(const b of BRIDGES){if(b.dam)continue;assert.ok(shoreAt((b.a.x+b.b.x)/2,(b.a.y+b.b.y)/2).distance>0,b.id);for(const t of b.piers)assert.ok(shoreAt(b.a.x+(b.b.x-b.a.x)*t,b.a.y+(b.b.y-b.a.y)*t).distance>0,b.id);}
 for(let i=1;i<10;i++){const q=BRIDGES[0],t=i/10;assert.ok(!shoreAt(q.a.x+(q.b.x-q.a.x)*t,q.a.y+(q.b.y-q.a.y)*t).land);}
});
test('water starts clear structures; beach retains shallow sand/tree exercise and lake has no orphan pier',()=>{
 for(const [id,p]of Object.entries(MAP_STARTS)){assert.ok(bottomAt(p.x,p.y).depth>(id==='beach'?.3:1.5),id);for(const d of DOCKS)assert.ok(!(p.x>d.x&&p.x<d.x+d.w&&p.y>d.y&&p.y<d.y+d.h),id);}
 const b=createBoat('lake');assert.ok(bottomAt(b.x,b.y).depth>2);for(const d of DOCKS)if(d.site&&d.site!=='technical')assert.ok(Math.hypot(d.x-b.x,d.y-b.y)>500);
 for(const shoal of SHOALS){assert.ok(shoreAt(shoal.x,shoal.y).distance>0);assert.ok(bottomAt(shoal.x,shoal.y).depth<5);}
 for(const beach of BEACHES)assert.ok(Math.abs(shoreAt(beach.x,beach.y).distance)<1);
 assert.ok(MAP_POIS.every(p=>p.x>=WORLD.left&&p.x<=WORLD.right&&p.y>=WORLD.top&&p.y<=WORLD.bottom));
});
test('atlas pan uses screen metres, cursor zoom preserves the anchor, fit restores exact whole-water view',()=>{
 const a=createAtlas(),w=1100,h=650,p=atlasProjection(a,w,h),old={...a.camera};panAtlas(a,30,-20,w,h);close(a.camera.x,old.x-30/p.scale);close(a.camera.y,old.y+20/p.scale);
 const x=300,y=200,before=atlasProjection(a,w,h),world={x:a.camera.x+(x-w/2)/before.scale,y:a.camera.y+(y-h/2)/before.scale};zoomAtlas(a,3,x,y,w,h);const after=atlasProjection(a,w,h);close(a.camera.x+(x-w/2)/after.scale,world.x);close(a.camera.y+(y-h/2)/after.scale,world.y);
 zoomAtlas(a,1e8,w/2,h/2,w,h);assert.equal(a.zoom,500);assert.deepEqual(createAtlas(),{camera:old,zoom:1});
});
for(const propulsion of ['outboard','zdrive'])test(`${propulsion}: creep/medium/full flow is derived from actual thrust, and per-engine vector steers physics and wash`,()=>{
 const b=createBoat('lake',{propulsion,powers:[150]}),en=b.engines[0],flows=[];for(const command of [.08,.5,1]){for(let i=0;i<1200;i++)updateEngine(en,command,0,dt,0,{immersion:1,intake:1});flows.push(driveWaterState(b,en));}
 assert.ok(flows[0].length>.6);assert.ok(flows[1].length>flows[0].length*2);assert.ok(flows[2].length>flows[1].length);assert.ok(flows[2].width>flows[0].width);assert.ok(flows[2].opacity>flows[0].opacity);
 b.actualSteer=b.spec.maxSteer;engineSteering(b,en,dt);close(driveWaterState(b,en).angle,-b.spec.maxSteer);
});
for(const propulsion of ['outboard','zdrive'])test(`${propulsion}: twins support equal/different thrust and independent physical angles, with correctly assigned cooling outlets`,()=>{
 const b=createBoat('lake',{profile:'cabin',propulsion,engineCount:2,powers:[150,150]});b.linked=false;b.throttle=1;b.throttle2=.3;b.engines[0].steerTarget=.6;b.engines[1].steerTarget=-.4;run(b,3);
 const [l,r]=b.engines.map((en,i)=>driveWaterState(b,en,i));assert.ok(l.magnitude>r.magnitude*2);assert.ok(l.angle<0&&r.angle>0);close(l.angle,-b.engines[0].forceSteer);close(r.angle,-b.engines[1].forceSteer);assert.ok(l.coolingY<0&&r.coolingY>0);assert.ok(Math.abs(b.w)>.005);
 b.engines[0].steerTarget=b.engines[1].steerTarget=0;b.throttle2=1;run(b,5);close(b.engines[0].steerAngle,b.engines[1].steerAngle);assert.ok(driveWaterState(b,b.engines[1]).magnitude>0);
});
test('shaft wash stays axial regardless of rudder; jet follows nozzle; airboat never has underwater wash or cooling discharge',()=>{
 for(const [profile,propulsion]of [['cabin','inboard'],['pwc','jet'],['swamp','air']]){const b=createBoat('lake',{profile,propulsion}),en=b.engines[0];b.actualSteer=.4;en.thrust=2000;en.n=.7;en.gear=1;en.cooling=1;const q=driveWaterState(b,en);close(q.angle,propulsion==='inboard'?0:-.4);if(propulsion==='air'){assert.equal(q.magnitude,0);assert.equal(coolingWaterIntensity(b,en),0);}}
});
test('surge and reverse braking foam are temporary; ventilation increases RPM but reduces real flow, and regrip produces a short recovering pulse',()=>{
 const b=createBoat('lake'),en=b.engines[0];let burst=0;for(let i=0;i<1200;i++){updateEngine(en,1,0,dt,0,{immersion:1,intake:1});burst=Math.max(burst,propSurfaceIntensity(b,en));}assert.ok(burst>.3);assert.ok(propSurfaceIntensity(b,en)<.02);const normal={rpm:en.rpm,force:en.thrust};
 en.trim=en.trimTarget=.6;for(let i=0;i<240;i++)updateEngine(en,1,8,dt,0,{immersion:.55,intake:.5});assert.ok(en.rpm>normal.rpm);assert.ok(en.thrust<normal.force*.6);assert.ok(propSurfaceIntensity(b,en)>.3);
 en.trim=en.trimTarget=.1;let recovery=0;for(let i=0;i<600;i++){updateEngine(en,1,2,dt,0,{immersion:1,intake:1});recovery=Math.max(recovery,en.regrip??0);}assert.ok(recovery>.05);assert.ok(en.propGrip>.99);assert.ok((en.regrip??0)<.01);
 for(let i=0;i<300;i++)updateEngine(en,-1,8,dt,0,{immersion:1,intake:1});assert.ok(propSurfaceIntensity(b,en)>.3);en.key='off';assert.equal(propSurfaceIntensity(b,en),0);
});
test('normal sailing has no deck ingress; aggressive turn/heel/sidewave admits small real water separately from a leak',()=>{
 const b=createBoat('lake'),q=b.bilge;q.auto=false;b.telemetry.surge=8;assert.equal(deckIngressRate(b),0);bilgeStep(b,1);assert.equal(q.litres,0);
 b.w=.45;b.roll=.25;b.encounter={eta:0,crossSlope:.2};for(let i=0;i<600;i++)bilgeStep(b,.1);assert.ok(q.litres>.1&&q.litres<2.4);assert.equal(q.leakInflow,0);assert.ok(q.deckInflow>0);close(q.deckTotal,q.litres);const mass=b.spec.mass;systemsStep(b,dt);assert.ok(b.spec.mass>mass);
 b.w=b.roll=0;b.encounter={eta:0,crossSlope:0};bilgeStep(b,1);assert.equal(q.deckInflow,0);b.damage=40;bilgeStep(b,1);assert.ok(q.leakInflow>0);close(q.inflow,q.leakInflow+q.deckInflow);
 b.towRig={boatLoaded:true};assert.equal(deckIngressRate(b),0);
});
test('physical wake depends on speed, mass, size, hull and planing state; generator accepts arbitrary vessel sources',()=>{
 const small=createBoat('lake',{profile:'tender'}),heavy=createBoat('lake',{profile:'cabin'});assert.ok(wakeAmplitude(small,1)<wakeAmplitude(small,7)*.25);assert.ok(wakeAmplitude(heavy,7)>wakeAmplitude(small,7));const a=wakeAmplitude(heavy,6);heavy.planing=1;assert.ok(wakeAmplitude(heavy,6)<a);const h=passage(),world=createBoat('lake');registerWakeSource(world,'future-source',h);assert.equal(world.wake.length,0);let signal=0;for(let t=1;t<20;t+=.1)signal=Math.max(signal,Math.abs(sampleWorldWake(world,50,20,t,[]).eta));assert.ok(signal>.001);
});
test('wake arrives after propagation, then moves and rotates moored boats, changes line tensions and dies without freezing hulls',()=>{
 const b=createBoat('lake');b.wake=passage(33);const q=b.traffic[0],initial={x:q.x,y:q.y,a:q.a};let pre=0,heave=0,yaw=0,motion=0,tension=0,compression=0;
 for(let i=0;i<36*120;i++){b.time=i*dt;trafficStep(b,{traffic:true},dt);boomStep(b,{},dt);if(b.time<1)pre=Math.max(pre,Math.abs(q.heave));heave=Math.max(heave,Math.abs(q.heave));yaw=Math.max(yaw,Math.abs(q.a-initial.a));motion=Math.max(motion,Math.hypot(q.x-initial.x,q.y-initial.y));tension=Math.max(tension,...q.ropes.map(r=>r.tension));compression=Math.max(compression,...Object.values(q.fenderContacts).map(f=>f.compression),0);}
 assert.equal(pre,0);assert.ok(heave>.02);assert.ok(yaw>.002);assert.ok(motion>.01);assert.ok(tension>10);assert.ok(Math.abs(q.heave)<heave*.5);
});
test('buoys and Y-booms are tethered physical bodies: weather, delayed wake and reflected wake move them while hinges/anchors hold',()=>{
 for(const kind of ['weather','wake','reflection']){const b=createBoat('lake'),bi=BOLLARDS.findIndex(q=>q.kind==='buoy');if(kind!=='weather')b.wake=passage(kind==='reflection'?4:33);const initial=mooringPoint(b,bi),hinge={x:b.booms[0].x1,y:b.booms[0].y1};let heave=0,bob=0,swing=0,shift=0;
  for(let i=0;i<25*120;i++){b.time=i*dt;boomStep(b,kind==='weather'?{waveHeight:.3,waveDirection:30}:{},dt);const p=mooringPoint(b,bi);bob=Math.max(bob,Math.abs(b.buoys[bi].heave));shift=Math.max(shift,Math.hypot(p.x-initial.x,p.y-initial.y));heave=Math.max(heave,Math.abs(b.booms[0].heave));swing=Math.max(swing,Math.abs(b.booms[0].a-Math.PI/2));}
  assert.ok(bob>.001,kind+' buoy');assert.ok(heave>.001,kind+' boom');assert.ok(shift>.001&&shift<=.551,kind+' anchor');assert.ok(swing>0&&swing<=.12,kind+' hinge');assert.deepEqual({x:b.booms[0].x1,y:b.booms[0].y1},hinge);
 }
});
test('reflected wave is weaker, reverses orbital direction, needs travel time and has at most two rapidly attenuated bounces',()=>{
 const h=passage(),face={a:{x:-20,y:10},b:{x:150,y:10},nx:0,ny:-1,coefficient:.6};let peak=0;
 for(let t=0;t<25;t+=.05){const r=sampleHullWake(h,50,4,t,face),direct=sampleHullWake(h,50,16,t);close(r.eta,direct.eta*.6);close(r.vy,-direct.vy*.6);if(t<2)assert.equal(r.eta,0);peak=Math.max(peak,Math.abs(r.eta));}assert.ok(peak>.001);
 const other={a:{x:-20,y:-20},b:{x:150,y:-20},nx:0,ny:1,coefficient:.6},paths=reflectionPaths([face,other]);assert.equal(paths.length,4);assert.ok(paths.every(p=>p.length<=2));for(const p of paths.filter(p=>p.length===2)){const gain=p.reduce((v,f)=>v*f.coefficient,1)*.2;assert.ok(gain<.08);}
 assert.deepEqual(sampleWakeField(h,50,4,WAKE_LIFETIME+20,[face,other]),{eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0});
});
for(const profile of Object.keys(CRAFTS))test(`${profile}: all six fenders clear actual tapered hull on both sides and rotate with its SI outline`,()=>{
 const b=createBoat('lake',{profile}),S=b.spec;for(const g of fenderGeometry(S)){const inward={x:g.x-g.nx*g.radius,y:g.y-g.ny*g.radius};assert.ok(Math.abs(inward.y)>hullHalfBeam(S,inward.x),g.id);assert.equal(Math.sign(g.y),g.side);b.a=.9;const p=point(b,g.x,g.y),dx=p.x-b.x,dy=p.y-b.y;close(dx*Math.cos(b.a)+dy*Math.sin(b.a),g.x);close(-dx*Math.sin(b.a)+dy*Math.cos(b.a),g.y);}
});
for(const side of [-1,1])for(const part of ['Stern','Mid','Bow'])test(`${side<0?'port':'starboard'} ${part}: first gentle contact is a compliant fender, with no hull damage and no hard positional snap`,()=>{
 const b=createBoat('lake');b.a=0;const g=fenderGeometry(b.spec).find(g=>g.side===side&&g.id.endsWith(part));b.vy=side*.15;const old={x:b.x,y:b.y};const normal={x:-g.nx,y:-g.ny};
 beginFenderStep(b);const contact=fenderContact(b,g,{n:normal,depth:.02,target:'test-pier'},dt);assert.ok(contact.force>0);assert.equal(b.damage,0);assert.equal(b.dockDamage,0);assert.equal(b.lastImpact?.fender,g.id);assert.equal(b.lastImpact?.protectedContact,true);assert.deepEqual({x:b.x,y:b.y},old);assert.equal(contact.bottomed,false);
 const first=contact.force;b.vx=b.vy=b.w=0;beginFenderStep(b);const soft=fenderContact(b,g,{n:normal,depth:.02},dt);beginFenderStep(b);const hard=fenderContact(b,g,{n:normal,depth:.10},dt);assert.ok(hard.force>soft.force);assert.ok(first>soft.force);
});
test('parallel docking compresses fenders before hull, slides along them, and a hard strike still damages only residual hull energy',()=>{
 const b=createBoat('berth');Object.assign(b,{x:21.3,y:22,a:-Math.PI/2,vx:-.15,vy:-.15});let compression=0;for(let i=0;i<600;i++){step(b,{},dt);compression=Math.max(compression,...Object.values(b.fenderContacts).map(f=>f.compression),0);}assert.ok(compression>.005);assert.equal(b.damage,0);assert.ok(b.y<21.8);assert.ok(b.x>20.9);
 const hard=createBoat('berth');Object.assign(hard,{x:21.4,y:22,a:-Math.PI/2,vx:-3});run(hard,1);assert.ok(hard.damage>0&&hard.damage<100);assert.ok(hard.impacts.some(q=>q.protectedContact&&q.damage===0));assert.ok(hard.impacts.some(q=>!q.protectedContact&&q.damage>0));
});
test('mooring pressure, wind and arriving wake work between ropes and fenders instead of freezing or damaging the hull',()=>{
 const b=createBoat('berth');Object.assign(b,{x:21.16,y:22,a:-Math.PI/2});b.wake=passage(33);assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='P2')).ok);assert.ok(attachRope(b,'portStern',BOLLARDS.findIndex(q=>q.id==='P3')).ok);let comp=0,force=0,tension=0;for(let i=0;i<1200;i++){step(b,{windSpeed:4,windDirection:270,currentSpeed:.04,currentDirection:270},dt);comp=Math.max(comp,...Object.values(b.fenderContacts).map(q=>q.compression),0);force=Math.max(force,...Object.values(b.fenderContacts).map(q=>q.force),0);tension=Math.max(tension,...b.ropes.map(r=>r.tension),0);}assert.ok(comp>.001&&force>10);assert.ok(tension>10);assert.equal(b.damage,0);
});


test('delayed wake alone presses a moored hull into its fenders, tensions lines and then releases without hull damage',()=>{
 const peaks=[];
 for(const withWake of [false,true]){
  const b=createBoat('berth');Object.assign(b,{x:21.19,y:22,a:-Math.PI/2});
  assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='P2')).ok);assert.ok(attachRope(b,'portStern',BOLLARDS.findIndex(q=>q.id==='P3')).ok);
  if(withWake)b.wake=passage(33);let pre=0,compression=0,tension=0;
  for(let i=0;i<2400;i++){step(b,{},dt);const c=Math.max(0,...Object.values(b.fenderContacts).map(q=>q.compression));if(i<120)pre=Math.max(pre,c);compression=Math.max(compression,c);tension=Math.max(tension,...b.ropes.map(r=>r.tension));}
  assert.equal(pre,0);assert.equal(b.damage,0);peaks.push({compression,tension});
 }
 assert.equal(peaks[0].compression,0);assert.equal(peaks[0].tension,0);assert.ok(peaks[1].compression>.002);assert.ok(peaks[1].tension>10);
});

test('an external wake source produces exactly the same reflected hull/engine/traffic response as a player source',()=>{
 for(const time of [4,6,8,10,12]){
  const a=createBoat('lake');Object.assign(a,{x:40,y:18,time});a.wake=passage(33);const b=structuredClone(a);b.wake=[];registerWakeSource(b,'external',structuredClone(a.wake));
  step(a,{traffic:true},dt);step(b,{traffic:true},dt);
  for(const key of ['x','y','vx','vy','w','heave','roll','pitch','wakeEncounter'])assert.equal(a[key],b[key],key+' at '+time);
  assert.deepEqual(a.traffic,b.traffic);assert.deepEqual(a.engines,b.engines);
 }
});
