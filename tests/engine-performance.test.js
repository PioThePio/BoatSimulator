import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {specification,engineState,updateEngine,updateMass} from '../src/craft.js';
import {dieselAvailable,shaftPowerFraction,turboStep} from '../src/combustion.js';
import {racingSternRelease} from '../src/racing.js';
import {hullLateralForces} from '../src/hydrodynamics.js';
import {createFleet} from '../src/fleet.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
const dt=1/120,calm={traffic:false,spatialEffects:false,windSpeed:0,currentSpeed:0,waveHeight:0};
function run(b,seconds){for(let i=0;i<seconds/dt;i++){step(b,calm,dt,{sharedStep:false});b.x=80;b.y=110;}return b;}
test('twin 600 HP racer reaches the 160–180 km/h calibration envelope with real 6200–7000 RPM and bounded propulsive power',()=>{
 const b=createBoat('lake',{profile:'racing'});b.throttle=1;run(b,70);const speed=Math.hypot(b.vx,b.vy)*3.6;
 assert.ok(speed>=160&&speed<=180,`speed ${speed}`);assert.ok(b.planing>.9);assert.equal(b.damage,0);
 for(const en of b.engines){assert.ok(en.rpm>6200&&en.rpm<7000,en.rpm);assert.ok(en.boost>.8);assert.ok(en.shaftPower<=en.hp*735.5);assert.ok(Math.abs(en.thrust*en.inflow)<=en.shaftPower*.680001);}
 const weaker=createBoat('lake',{profile:'racing',powers:[300,300]});weaker.throttle=1;run(weaker,70);assert.ok(Math.hypot(weaker.vx,weaker.vy)<Math.hypot(b.vx,b.vy)*.9);
});
test('racing boost builds over physical time and changes actual shaft power, then releases on lift-off',()=>{
 const en={n:.8,gear:1,load:.7,boost:0};turboStep(en,1,dt);const first=en.boost;for(let i=0;i<240;i++)turboStep(en,1,dt);assert.ok(first<.02);assert.ok(en.boost>.7);
 assert.ok(shaftPowerFraction(.8,{racing:true},en.boost)>shaftPowerFraction(.8,{racing:true},0)*1.7);const boosted=en.boost;for(let i=0;i<120;i++)turboStep(en,0,dt);assert.ok(en.boost<boosted*.01);
});
test('hard racing turns retain forward thrust, develop a measurable stern slide, and shed speed rather than rotating at rest',()=>{
 const b=createBoat('lake',{profile:'racing'});b.throttle=1;run(b,35);const straight=Math.hypot(b.vx,b.vy);b.steer=b.spec.maxSteer;let peak=0;
 for(let i=0;i<120*12;i++){step(b,calm,dt,{sharedStep:false});b.x=80;b.y=110;peak=Math.max(peak,Math.abs(Math.atan2(b.telemetry.sway,b.telemetry.surge)));}
 assert.ok(peak>10*Math.PI/180,`slide ${peak*180/Math.PI}`);assert.ok(b.telemetry.surge>10);assert.ok(Math.hypot(b.vx,b.vy)<straight*.8);assert.ok(Math.abs(b.w)>.2);assert.equal(b.damage,0);
 const release=racingSternRelease(b.spec,b.engines,b.spec.maxSteer,5);assert.ok(release>racingSternRelease(b.spec,b.engines,b.spec.maxSteer,30));
 hullLateralForces(b.spec,8,-3,.7,.5,(_x,y,arm)=>assert.ok(y*(-3+.7*arm)<=1e-9),.5,release);
});
test('diesel is optional only for suitable shaft/sterndrive hulls; engine and fuel mass change draft',()=>{
 assert.equal(dieselAvailable('runabout','outboard'),false);assert.equal(dieselAvailable('runabout','zdrive'),true);assert.equal(dieselAvailable('cabin','inboard'),true);
 assert.equal(specification({profile:'racing',engineType:'diesel'}).engineType,'petrol');assert.equal(specification({engineType:'diesel'}).engineType,'petrol');
 const petrol=specification({profile:'cruiser'}),diesel=specification({profile:'cruiser',engineType:'diesel'});assert.equal(petrol.diesel,false);assert.equal(diesel.fuelDensity,.84);assert.ok(diesel.mass>petrol.mass);assert.ok(diesel.draft>petrol.draft);
 const a=engineState(110),b=engineState(110);a.gear=b.gear=1;for(let i=0;i<120*10;i++){updateEngine(a,1,0,dt,0);updateEngine(b,1,0,dt,0,{engineType:'diesel'});}
 assert.ok(a.rpm>5000);assert.ok(b.rpm>3200&&b.rpm<3700);assert.ok(b.crankTorque>a.crankTorque*1.35);assert.ok(b.fuelFlow<a.fuelFlow);assert.ok(b.shaftPower<=b.hp*735.5);
});
test('Continue upgrades the old 4200 RPM racing engine without erasing voyage, fuel, ignition, SOC or hours',()=>{
 const b=createBoat('lake',{profile:'racing'});delete b.spec.engineType;b.spec.diesel=true;b.spec.fuelDensity=.84;updateMass(b.spec,b.fuel.litres);b.engines[0].operatingHours=12.5;b.battery.soc=.62;b.operations.distance=9000;
 const raw=snapshotSession({fleet:createFleet(b),env:calm}),r=restoreSession(raw);assert.ok(r.ok,r.message);const restored=r.session.fleet.boats[0];assert.equal(restored.spec.engineType,'petrol');assert.equal(restored.spec.diesel,false);assert.equal(restored.fuel.litres,b.fuel.litres);assert.equal(restored.engines[0].operatingHours,12.5);assert.equal(restored.engines[0].key,b.engines[0].key);assert.equal(restored.battery.soc,.62);assert.equal(restored.operations.distance,9000);
});
