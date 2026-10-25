import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {specification,engineKey,updateEngine,engineState} from '../src/craft.js';
import {createFleet,addFleetBoat,removeFleetBoat,fleetStep} from '../src/fleet.js';
import {connectBoatPoints} from '../src/marine-tow.js';
import {windSurface,windSound} from '../src/wind-response.js';
import {soundParameters} from '../src/sound.js';
import {turboParameters} from '../src/racing.js';
import {createLogbook,captureLogbook,readLogbook,writeLogbook,LOGBOOK_KEY,setLogbookEnabled} from '../src/logbook.js';
import {voyageEvent} from '../src/voyage-events.js';
import {recordImpact} from '../src/impacts.js';
import {NAV_MARKS,EUZEBIA,BOLLARDS,REEDS,shoreAt,bottomAt,reedDensityAt} from '../src/world.js';
import {NAV_HAZARDS,routeMarks,hazardBottom,markPose} from '../src/navigation-marks.js';
import {euzebiaSlope} from '../src/island-approach.js';
import {propellerContact,groundContact} from '../src/ground.js';
import {applyFloodShort,immersionReadings,bilgeTrimAngle} from '../src/flood-systems.js';
import {systemsStep} from '../src/systems.js';
import {setMainPower,electricalStep} from '../src/electrical.js';
import {snapshotSession,restoreSession,SAVE_KEY} from '../src/session-save.js';
import {requestRepair,serviceStep} from '../src/service.js';
import {attachRope} from '../src/rigging.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0},fresh=()=>createFleet(createBoat('lake',{coldStart:true}));
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
test('wind surface is calm below 3, densifies above 6, tints only water and can be disabled',()=>{
 assert.equal(windSurface(0).density,1);assert.equal(windSurface(3).white,0);assert.ok(windSurface(12).density>windSurface(7).density);assert.ok(windSurface(12).tint>0);assert.equal(windSurface(20,false).tint,0);assert.ok(windSurface(12).spacing<1);
});
test('white-wind parameters are exactly silent at zero and linear in real live wind, independent of engine state',()=>{
 assert.equal(windSound(0).level,0);near(windSound(12).level,2*windSound(6).level);assert.equal(windSound(12,false).level,0);assert.ok(windSound(12).cutoff>windSound(6).cutoff);const b=createBoat('lake',{coldStart:true});near(soundParameters(b,{windSpeed:10}).wind.level,.04);assert.equal(soundParameters(b,{windSpeed:10,windSound:false}).wind.level,0);
});
test('racer alone allows twin 600 HP Z-drives; regular limits and propulsion restrictions stay intact',()=>{
 const r=specification({profile:'racing',powers:[900,580],engineCount:1,propulsion:'jet'});assert.deepEqual(r.powers,[600,580]);assert.equal(r.engineCount,2);assert.equal(r.propulsion,'zdrive');assert.ok(r.deadrise>25);assert.equal(r.diesel,false);assert.equal(r.engineType,'petrol');assert.equal(specification({powers:[600]}).powers[0],350);assert.equal(specification({profile:'pwc',engineCount:2}).engineCount,1);
});
test('racing drivetrain physically accelerates and planes far beyond a default runabout without changing normal engine dynamics',()=>{
 const r=createBoat('lake',{profile:'racing'}),b=createBoat('lake');r.throttle=b.throttle=1;
 for(let i=0;i<3600;i++)for(const q of [r,b]){step(q,calm,dt);q.x=80;q.y=110;}
 assert.ok(r.telemetry.surge>25,r.telemetry.surge);assert.ok(r.telemetry.surge>b.telemetry.surge*1.7);assert.ok(r.planing>.8);assert.equal(r.damage,0);assert.ok(r.engines.every(e=>e.rpm>6200&&e.rpm<7000));
});
test('racing throttle spools faster and its petrol fuel has physical mass',()=>{
 const a=engineState(600),b=engineState(600);a.gear=b.gear=1;for(let i=0;i<60;i++){updateEngine(a,1,0,dt,0,{racing:true});updateEngine(b,1,0,dt);}assert.ok(a.n>b.n);const r=specification({profile:'racing'});near(r.mass-r.dryMass,r.fuelCapacity*.75*.745);
});
test('turbo tracks real load/spool, drops boost at engine stop and produces a single release on an abrupt throttle cut',()=>{
 const e={key:'running',n:.9,load:.9,command:1,gear:1},p=turboParameters(e);assert.ok(p.level>0&&p.frequency>2000);assert.ok(p.boost>turboParameters({...e,load:.1}).boost);assert.equal(turboParameters({...e,command:0},{...e,boost:p.boost}).bov,true);assert.equal(turboParameters({...e,command:0,gear:0},{key:'running',boost:.7,command:0,gear:1}).bov,false);assert.equal(turboParameters({...e,key:'off'}).level,0);
});
test('new cabin/cruiser defaults include requested thrusters, explicit opt-out still removes mass and installation',()=>{
 const c=specification({profile:'cabin'}),d=specification({profile:'cruiser'}),off=specification({profile:'cabin',bowThruster:false});assert.ok(c.bowThruster&&!c.sternThruster);assert.ok(d.bowThruster&&d.sternThruster);assert.equal(off.bowThruster,false);near(c.mass-off.mass,22);
});
test('removing an active fleet body disconnects all tows, preserves the rig and shared world and never deletes the last hull',()=>{
 const f=fresh(),a=f.boats[0],b=addFleetBoat(f,'banana',{x:62,y:110,a:0}).boat;connectBoatPoints(f,a.id,'stern',b.id,'bow');f.activeId=b.id;const traffic=a.traffic,id=f.nextId;const r=removeFleetBoat(f,b.id);assert.ok(r.ok);assert.equal(f.activeId,a.id);assert.equal(f.tows.length,0);assert.equal(a.traffic,traffic);assert.equal(f.nextId,id);assert.equal(removeFleetBoat(f,a.id).ok,false);assert.equal(f.boats.length,1);
});
test('logbook increments lifetime totals once, updates the same session, excludes the SUV and retains a deleted craft contribution',()=>{
 const f=fresh();f.logbookId='one';const a=f.boats[0];a.operations.distance=1000;a.operations.fuelUsed=3;a.operations.maxSpeed=12;a.engines[0].operatingHours=.5;f.time=50;let b=captureLogbook(createLogbook(),f,1000),again=captureLogbook(b,f,2000);assert.deepEqual(again.totals,b.totals);assert.equal(again.sessions.length,1);near(again.sessions[0].duration,100);near(again.totals.hours,.5);const toy=addFleetBoat(f,'runabout',{x:60,y:110,a:0}).boat;toy.operations.distance=250;again=captureLogbook(again,f,3000);removeFleetBoat(f,toy.id);again=captureLogbook(again,f,4000);near(again.totals.distance,1250);assert.equal(b.totals.distance,1000);
});
test('logbook persists over new trials and reloads, bounds history, respects opt-out and recovers corrupt storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};let book=createLogbook();for(let i=0;i<35;i++){const f=fresh();f.logbookId='s'+i;f.boats[0].operations.distance=100;book=captureLogbook(book,f,i+100);}assert.equal(book.sessions.length,30);near(book.totals.distance,3500);assert.ok(writeLogbook(storage,book));assert.deepEqual(readLogbook(storage),book);book.enabled=false;const f=fresh();f.logbookId='disabled';assert.deepEqual(captureLogbook(book,f),book);map.set(LOGBOOK_KEY,'{bad');assert.deepEqual(readLogbook(storage),createLogbook());
});
test('restoring an older backup cannot count the same travelled metres, fuel or hours twice',()=>{
 const f=fresh();f.logbookId='backup';const a=f.boats[0];a.operations.distance=1000;let book=captureLogbook(createLogbook(),f,1000);a.operations.distance=900;book=captureLogbook(book,f,2000);a.operations.distance=1000;book=captureLogbook(book,f,3000);near(book.totals.distance,1000);a.operations.distance=1100;book=captureLogbook(book,f,4000);near(book.totals.distance,1100);
});
test('malformed nested logbook counters cannot break a healthy session or the independent autosave',()=>{
 const f=fresh();f.logbookId='invalid-record';const valid=captureLogbook(createLogbook(),f,1000);
 for(const corrupt of [b=>b.sessions[0].cursors='invalid',b=>b.sessions[0].last=[],b=>b.sessions[0].last={'boat-1':{distance:'100'}},b=>b.sessions[0].durationOffset='invalid',b=>b.sessions[0]=null]){
  const bad=structuredClone(valid);corrupt(bad);const storage={getItem:()=>JSON.stringify(bad)};
  const recovered=readLogbook(storage);assert.deepEqual(recovered,createLogbook());
  assert.doesNotThrow(()=>captureLogbook(recovered,f,2000));assert.ok(restoreSession(snapshotSession({fleet:f,env:calm})).ok);
 }
});
test('re-enabling a previously unused logbook starts at present counters and excludes disabled time and events',()=>{
 const f=fresh();f.logbookId='opt-out';f.time=20;const b=f.boats[0];b.operations.distance=100;let book=createLogbook();book.enabled=false;book=setLogbookEnabled(book,f,true,1000);book=captureLogbook(book,f,1100);near(book.totals.distance,0);near(book.sessions[0].duration,0);f.time=30;b.operations.distance=150;book=captureLogbook(book,f,1200);near(book.totals.distance,50);near(book.sessions[0].duration,20);
});
test('one impact episode creates one timestampable incident, a later independent hit increments collisions; autosave remains compatible',()=>{
 const f=fresh(),b=f.boats[0];f.logbookId='events';const hit={arm:{x:0,y:1},speed:.8,effective:800};recordImpact(b,hit);recordImpact(b,hit);assert.equal(b.collisionCount,1);b.time=f.time=1;recordImpact(b,hit);assert.equal(b.collisionCount,2);const book=captureLogbook(createLogbook(),f,100000);assert.equal(book.events.length,2);assert.equal(book.totals.collisions,2);assert.ok(book.events[0].message.includes('J'));const s=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(s.ok);assert.equal(s.session.fleet.logbookId,'events');assert.equal(s.session.fleet.boats[0].collisionCount,2);assert.equal(SAVE_KEY,'przystan-session-v1');
});
test('IALA A green and red pairs lie to starboard/port of the upstream direction, in actual water',()=>{
 const route={name:'test',points:[[880,300],[880,100]]},marks=routeMarks(route,()=>({distance:50,land:false}));for(const q of marks){assert.equal(q.kind,q.side>0?'green':'red');assert.ok(q.kind==='green'?q.x>marks.find(p=>p.kind==='red').x:q.x<marks.find(p=>p.kind==='green').x);}for(const q of NAV_MARKS)assert.equal(shoreAt(q.x,q.y).land,false,q.id);assert.ok(NAV_MARKS.some(q=>q.kind==='cardinal'));assert.equal(new Set(NAV_MARKS.map(q=>q.id)).size,NAV_MARKS.length);
});
test('isolated dangers are genuine sub-0.5m rocks that damage hull and prop through existing ground contact',()=>{
 for(const m of NAV_MARKS.filter(q=>q.kind==='danger')){const floor=bottomAt(m.x,m.y);assert.ok(floor.depth<.5);assert.equal(floor.material,'rock');const b=createBoat('lake',{profile:'cabin'});Object.assign(b,{x:m.x,y:m.y,vx:2,a:0});b.engines[0].gear=1;b.engines[0].n=.8;groundContact(b,{eta:0},dt,()=>{});assert.ok(b.grounded);assert.ok(b.damage>0);const e=b.engines[0];Object.assign(b,{x:m.x+b.spec.length*.5,y:m.y});propellerContact(b,e,dt,()=>{});assert.ok(e.propContact);assert.ok(e.propDamage>0);}
 const base={depth:5,material:'mud'};assert.equal(hazardBottom(-10000,-10000,base),base);const p=markPose(NAV_MARKS[0],2,{eta:.2,sx:.1,sy:.1});assert.ok(Math.abs(p.x-NAV_MARKS[0].x)<.2);near(p.heave,.2);
});
test('water in bilge adds mass, draft and a dynamic stern trim; dry hull has no added flood trim',()=>{
 const dry=createBoat('lake',{coldStart:true}),wet=createBoat('lake',{coldStart:true});wet.bilge.auto=false;wet.bilge.litres=400;systemsStep(wet,dt);near(wet.spec.mass-dry.spec.mass,400);assert.ok(wet.spec.draft>dry.spec.draft);assert.equal(bilgeTrimAngle(dry.spec,0),0);for(let i=0;i<600;i++){step(dry,calm,dt);step(wet,calm,dt);}const r=immersionReadings(wet);assert.ok(wet.pitch>dry.pitch+.015);assert.ok(r.stern>r.bow);assert.ok(r.mean>dry.spec.draft);
});
test('full sinking shorts all electrical branches at once, latches across start attempts and autosave, without changing healthy battery behavior',()=>{
 const f=fresh(),b=f.boats[0];b.sunken=true;assert.equal(applyFloodShort(b),true);assert.equal(b.battery.soc,0);assert.equal(b.battery.voltage,0);assert.ok(Object.values(b.electrics.powered).every(v=>!v));assert.equal(b.bilge.running,false);assert.equal(engineKey(b,0,'ignition').ok,false);setMainPower(b,true);electricalStep(b,1);assert.equal(b.electrics.master,false);assert.equal(b.battery.voltage,0);const restored=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(restored.ok);electricalStep(restored.session.fleet.boats[0],1);assert.equal(restored.session.fleet.boats[0].battery.voltage,0);const healthy=createBoat('lake',{coldStart:true});assert.equal(applyFloodShort(healthy),false);electricalStep(healthy,1);assert.ok(healthy.battery.voltage>12);
});
test('a critically broken drive shorts only after water reaches the installation; sinking status follows the real waterline',()=>{
 const b=createBoat('lake',{coldStart:true});b.bilge.driveLeak=.8;b.engines[0].propDamage=90;b.submersion=.7;assert.equal(applyFloodShort(b),false);b.heave=-1;assert.equal(applyFloodShort(b),true);assert.equal(immersionReadings(b).below,true);
});
test('service can restore a dried electrical installation, leaving master OFF until deliberately powered again',()=>{
 const b=createBoat('service',{coldStart:true});b.sunken=true;applyFloodShort(b);b.sunken=false;b.heave=0;b.damage=20;assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22')).ok);assert.ok(requestRepair(b).ok);for(let i=0;i<1200;i++)serviceStep(b,dt);assert.equal(b.electrics.floodFault,false);assert.equal(b.electrics.master,false);assert.ok(b.battery.soc>.5);setMainPower(b,true);assert.equal(b.electrics.powered.instruments,true);assert.ok(b.battery.voltage>12);
});
test('Euzebia has continuous gentle west approaches, visible shallow sand and traversable reeds without moving old mooring trees',()=>{
 for(const a of [2.8,3.1,3.5]){near(euzebiaSlope(a),.085);assert.ok(Math.abs(euzebiaSlope(a+.001)-euzebiaSlope(a))<.001);}for(const id of ['EUZ-D4','EUZ-D5']){const t=BOLLARDS.find(q=>q.id===id),n=shoreAt(t.x,t.y),p={x:t.x+n.nx*6,y:t.y+n.ny*6};assert.ok(bottomAt(p.x,p.y).depth>0&&bottomAt(p.x,p.y).depth<1);assert.ok(reedDensityAt(p.x,p.y)>0);}assert.ok(REEDS.filter(r=>r.shallow).length>=2);
});
