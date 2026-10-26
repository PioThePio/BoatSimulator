import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {CRAFTS,engineKey,engineState,updateEngine,updateMass} from '../src/craft.js';
import {setMainPower} from '../src/electrical.js';
import {turboParameters} from '../src/racing.js';
import {soundParameters} from '../src/sound.js';
import {createTowRig,towStep,hitchAction,resetTowTrailer,towAudioBoat,bodyPoint,SUV} from '../src/towing.js';
import {createFleet,fleetStep} from '../src/fleet.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {fuelPoint,fuelFrame} from '../src/fuel-geometry.js';
import {NIEPORET,FUEL_STATIONS,BOLLARDS,bottomAt,shoreAt} from '../src/world.js';
import {attachRope} from '../src/rigging.js';
import {fuelBerthStatus,requestRefuel} from '../src/systems.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0,spatialEffects:false};
const close=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);

test('key turns through I and mechanical START without master power, consumes no charge and cannot start on power restoration',()=>{
 const b=createBoat('lake',{coldStart:true});setMainPower(b,false);const soc=b.battery.soc;
 assert.ok(engineKey(b,0,'ignition').ok);assert.equal(b.engines[0].key,'ignition');assert.ok(engineKey(b,0,'start').ok);assert.ok(b.engines[0].keyStartUntil>b.time);
 for(let i=0;i<360;i++)step(b,calm,dt,{sharedStep:false});assert.equal(b.engines[0].key,'ignition');assert.equal(b.engines[0].rpm,0);assert.equal(b.battery.soc,soc);assert.equal(b.battery.loadCurrent,0);assert.equal(soundParameters(b).ignitionAlarm,false);
 setMainPower(b,true);for(let i=0;i<240;i++)step(b,calm,dt,{sharedStep:false});assert.equal(b.engines[0].key,'ignition');assert.ok(engineKey(b,0,'start').ok);for(let i=0;i<240;i++)step(b,calm,dt,{sharedStep:false});assert.equal(b.engines[0].key,'running');
});

test('each hull has one fixed tank capacity; selected litres set actual fill, mass, draft and split tanks, including empty start',()=>{
 for(const [profile,p]of Object.entries(CRAFTS)){
  const empty=createBoat('lake',{profile,initialFuelLitres:0}),half=createBoat('lake',{profile,initialFuelLitres:p.fuel/2,tankCount:2}),full=createBoat('lake',{profile,initialFuelLitres:p.fuel});
  assert.equal(empty.fuel.capacity,p.fuel);assert.equal(half.fuel.capacity,p.fuel);assert.equal(full.fuel.capacity,p.fuel);assert.equal(empty.fuel.litres,0);assert.equal(half.fuel.litres,p.fuel/2);assert.equal(full.fuel.litres,p.fuel);
  close(full.spec.mass-empty.spec.mass,p.fuel*.745);assert.ok(full.spec.draft>empty.spec.draft);close(half.fuel.tanks.reduce((s,q)=>s+q.litres,0),p.fuel/2);assert.equal(createBoat('lake',{profile,initialFuelLitres:9999}).fuel.litres,p.fuel);
 }
});

test('older tank saves gain the correct gauge capacity without losing litres or voyage state; an oversized legacy fill is preserved',()=>{
 for(const litres of[40,180]){const b=createBoat('lake',{coldStart:true}),f=createFleet(b);delete b.spec.fuelModelVersion;b.spec.fuelCapacity=b.fuel.capacity=200;b.spec.structureMass+=8;b.spec.dryMass+=8;b.spec.referenceMass+=8+75*.745;b.fuel.litres=litres;updateMass(b.spec,litres);b.fuel.tanks=[{capacity:200,litres,x:0,y:0}];b.engines[0].operatingHours=12.5;b.operations.distance=5432;
  const r=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(r.ok,r.message);const q=r.session.fleet.boats[0];assert.equal(q.fuel.capacity,litres>100?200:100);assert.equal(q.fuel.litres,litres);assert.equal(q.engines[0].operatingHours,12.5);assert.equal(q.operations.distance,5432);close(q.fuel.tanks[0].litres,litres);if(litres<=100){const expected=createBoat('lake',{initialFuelLitres:litres});close(q.spec.draft,expected.spec.draft);close(q.spec.mass,expected.spec.mass);}
 }
});

test('slow multi-frame lift-off still releases boost exactly once; steady turbo is softer than spool without losing physical power',()=>{
 const en=engineState(600);en.gear=1;for(let i=0;i<1200;i++)updateEngine(en,1,0,dt,0,{racing:true});const steady=turboParameters(en);en.boostRise=.8;const spool=turboParameters(en);assert.ok(spool.level>steady.level*2);en.boostRise=0;
 for(let i=0;i<120;i++)updateEngine(en,1-i/119,0,dt,0,{racing:true});assert.equal(en.bovSequence,1);assert.ok(en.bovStrength>.25);
 for(let i=0;i<360;i++)updateEngine(en,0,0,dt,0,{racing:true});assert.equal(en.bovSequence,1);assert.ok(en.boost<.01);
 for(let i=0;i<1200;i++)updateEngine(en,1,0,dt,0,{racing:true});updateEngine(en,0,0,dt,0,{racing:true});assert.equal(en.bovSequence,2);
});

test('parked skewed rig and detached supported trailer stay stable for 90 seconds; the parking brake has a finite holding force',()=>{
 for(const y of[-15,3,7]){const b=createBoat('lake',{coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:y,misalignment:.3});r.handbrake=true;if(y<0)assert.ok(hitchAction(r).ok);const c={...r.car},t={...r.trailer};
  for(let i=0;i<120*90;i++)towStep(r,b,dt);close(r.car.x,c.x,.002);close(r.car.y,c.y,.002);close(r.trailer.x,t.x,.002);close(r.trailer.y,t.y,.002);close(r.trailer.a,t.a,.002);assert.equal(r.hitchDamage,0);assert.equal(r.attached,y>=0);
 }
 const b=createBoat('lake'),r=createTowRig(b);assert.ok(hitchAction(r).ok);const before=r.trailer.x;for(let i=0;i<240;i++){r.ropeForce.x=30000;towStep(r,b,dt);}assert.ok(Math.abs(r.trailer.x-before)>1,'parking is friction, not a frozen pose');
});

test('detached trailer reset recovers a broken/wet runaway independently of the SUV and already launched boat, then permits rehitching',()=>{
 const b=createBoat('lake',{coldStart:true}),r=createTowRig(b);const car={...r.car},boat={x:b.x,y:b.y,a:b.a};r.attached=false;Object.assign(r.trailer,{x:124,y:24,a:2,vx:.6,vy:.4,w:1});r.hitchDamage=100;r.winch.attached=true;
 assert.ok(resetTowTrailer(r,b).ok);assert.deepEqual({x:b.x,y:b.y,a:b.a},boat);assert.deepEqual(r.car,car);assert.equal(r.attached,false);assert.equal(r.trailerPark,true);assert.ok(bottomAt(r.trailer.x,r.trailer.y).depth<0);const t={...r.trailer};for(let i=0;i<1200;i++)towStep(r,b,dt);close(r.trailer.x,t.x);close(r.trailer.y,t.y);close(r.trailer.a,t.a);
 const h=bodyPoint(r.trailer,r.trailer.hitch);Object.assign(r.car,{x:h.x+Math.cos(r.trailer.a)*SUV.hitch,y:h.y+Math.sin(r.trailer.a)*SUV.hitch,a:r.trailer.a,vx:0,vy:0,w:0});assert.ok(hitchAction(r).ok);assert.equal(r.attached,true);
});

test('both fuel stations allow real mooring and increasing litres on either heading for small and large hulls, but reject ignition, motion and no line',()=>{
 for(const F of FUEL_STATIONS)for(const profile of['tender','runabout','cabin','cruiser','racing'])for(const reverse of[false,true]){
  const b=createBoat('lake',{profile,coldStart:true,initialFuelLitres:20}),frame=fuelFrame(F);Object.assign(b,{...fuelPoint(F,-1,b.spec.beam/2+.45),a:Math.atan2(frame.ty,frame.tx)+(reverse?Math.PI:0)});const f=createFleet(b);
  assert.equal(fuelBerthStatus(b).ok,false);const posts=BOLLARDS.map((p,i)=>({p,i})).filter(({p})=>p.fuel===F.id||!F.id&&p.kind==='bollard'&&Math.abs(p.x-F.x)<.3&&p.y>F.alongMin&&p.y<F.alongMax);
  assert.ok(posts.some(({i})=>attachRope(b,'bow',i).ok||attachRope(b,'portStern',i).ok),profile);assert.ok(fuelBerthStatus(b).ok,profile+' '+F.id);
  b.engines[0].key='ignition';assert.equal(fuelBerthStatus(b).ok,false);b.engines[0].key='off';b.vx=.2;assert.equal(fuelBerthStatus(b).ok,false);b.vx=0;
  assert.ok(requestRefuel(b).ok);for(let i=0;i<240;i++)fleetStep(f,calm,dt);assert.ok(b.fuel.litres>20,profile);assert.equal(b.damage,0,profile);assert.equal(b.grounded,false,profile);assert.ok(fuelBerthStatus(b).ok,profile);
 }
 const F=NIEPORET.fuel;for(const along of[-8,0,8]){const p=fuelPoint(F,along,2);assert.equal(shoreAt(p.x,p.y).land,false);assert.ok(bottomAt(p.x,p.y).depth>1.5);}
});

test('diesel clatter follows firing rate and stops with the engine; equal rated power does not create fictitious extra watts',()=>{
 const petrol=createBoat('lake',{profile:'cabin',propulsion:'zdrive',powers:[200]}),diesel=createBoat('lake',{profile:'cabin',propulsion:'zdrive',engineType:'diesel',powers:[200]});
 assert.ok(diesel.spec.mass>petrol.spec.mass);assert.ok(diesel.spec.draft>petrol.spec.draft);for(const b of[petrol,diesel]){const en=b.engines[0];en.gear=1;for(let i=0;i<1200;i++)updateEngine(en,1,0,dt,0,{engineType:b.spec.engineType});assert.ok(en.shaftPower<=200*735.5);}
 const a=petrol.engines[0],d=diesel.engines[0];assert.ok(d.crankTorque>a.crankTorque);assert.ok(d.fuelFlow<a.fuelFlow);const sound=soundParameters(diesel).engines[0];assert.equal(sound.timbre,'diesel');assert.ok(sound.clatter>0);close(sound.firingRate,d.rpm/30);d.key='off';assert.equal(soundParameters(diesel).engines[0].clatter,0);
});


test('SUV audio cannot create a circular autosave: post-reset state, detached hitch and boat progress survive JSON and Continue',()=>{
 const b=createBoat('lake',{coldStart:true}),r=createTowRig(b,{loaded:true}),f=createFleet(b);resetTowTrailer(r,b);b.engines[0].operatingHours=7;
 towAudioBoat(r,b);const snapshot=snapshotSession({fleet:f,env:calm,vehicle:'suv'}),raw=JSON.stringify(snapshot),restored=restoreSession(raw);assert.ok(restored.ok,restored.message);assert.equal(restored.session.towRig.attached,false);assert.equal(restored.session.towRig.trailer.x,151);assert.equal(restored.session.fleet.boats[0].engines[0].operatingHours,7);assert.ok(!('audioBoat' in snapshot.rig));
});


test('old fuel mooring and camera follow the rotated berth on Continue without changing attachment ID, hours, fuel or charge',()=>{
 const b=createBoat('nieporet',{coldStart:true,initialFuelLitres:40}),old={x:NIEPORET.anchor.x+8,y:NIEPORET.anchor.y};Object.assign(b,{x:old.x+b.spec.beam/2+.45,y:old.y-1,a:Math.PI/2});const i=BOLLARDS.findIndex(q=>q.id==='PIL-F-4');assert.ok(attachRope(b,'bow',i).ok);b.engines[0].operatingHours=4.5;b.battery.soc=.43;const f=createFleet(b),raw=snapshotSession({fleet:f,env:calm,ui:{manualCenter:{x:b.x,y:b.y}}});delete raw.fuelBerthVersion;
 const r=restoreSession(raw);assert.ok(r.ok,r.message);const q=r.session.fleet.boats[0];assert.equal(q.ropes[0].bollard,i);assert.equal(q.engines[0].operatingHours,4.5);assert.equal(q.fuel.litres,40);assert.equal(q.battery.soc,.43);assert.ok(fuelBerthStatus(q).ok);close(r.session.ui.manualCenter.x,q.x);close(r.session.ui.manualCenter.y,q.y);assert.ok(restoreSession(snapshotSession(r.session)).ok);
});
