import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,cleat,BOLLARDS} from '../src/physics.js';
import {engineKey,CRAFTS,specification,updateMass} from '../src/craft.js';
import {requestRefuel,systemsStep} from '../src/systems.js';
import {environment,bottomAt,canalAt,reedDensityAt,YBOOMS,FUEL_STATION} from '../src/world.js';
function run(b,t,env={},recenter=true){for(let i=0;i<t*120;i++){step(b,env,1/120);if(recenter){b.x=64;b.y=48;}}return b;}
test('cold engine needs ignition and neutral; starter takes time; off removes propulsion',()=>{
 const b=createBoat('open',{coldStart:true});b.throttle=1;run(b,3);assert.equal(b.engines[0].thrust,0);assert.equal(engineKey(b,0,'start').ok,false);
 engineKey(b,0,'ignition');assert.equal(engineKey(b,0,'start').ok,false);b.throttle=0;const charge=b.battery.soc;assert.ok(engineKey(b,0,'start').ok);run(b,.5);assert.equal(b.engines[0].key,'starting');assert.ok(b.battery.soc<charge);run(b,1);assert.equal(b.engines[0].key,'running');b.throttle=.5;run(b,3);assert.ok(b.engines[0].thrust>0);engineKey(b,0,'off');step(b,{},1/120);assert.equal(b.engines[0].thrust,0);
});
test('fuel is consumed, contributes to mass/inertia/draft and empty tank stops engine',()=>{
 const b=createBoat('open',{tankCount:2,fuelCapacity:200});const full={mass:b.spec.mass,iz:b.spec.iz,draft:b.spec.draft,litres:b.fuel.litres};b.throttle=1;run(b,20);assert.ok(b.fuel.litres<full.litres-.02);assert.ok(b.spec.mass<full.mass);assert.ok(b.spec.iz<full.iz);assert.ok(b.spec.draft<full.draft);assert.ok(b.fuel.flow>5);
 assert.equal(b.fuel.tanks.length,2);assert.ok(Math.abs(b.fuel.tanks.reduce((s,t)=>s+t.litres,0)-b.fuel.litres)<1e-9);b.fuel.litres=0;run(b,.1);assert.equal(b.engines[0].key,'ignition');assert.equal(b.engines[0].thrust,0);
});
test('refueling requires station, rest and stopped engines, fills gradually and stops when leaving',()=>{
 const b=createBoat('fuel',{coldStart:true});b.fuel.litres=20;assert.ok(requestRefuel(b).ok);systemsStep(b,1);assert.ok(b.fuel.litres>20&&b.fuel.litres<21);b.vx=.4;systemsStep(b,1);assert.equal(b.fuel.refueling,false);assert.equal(requestRefuel(b).ok,false);b.vx=0;b.engines[0].key='running';assert.equal(requestRefuel(b).ok,false);b.engines[0].key='off';b.x=FUEL_STATION.x+FUEL_STATION.radius+1;assert.equal(requestRefuel(b).ok,false);
});
test('thrusters require ignition, turn opposite at bow/stern, discharge battery, weaken underway',()=>{
 const off=createBoat('open',{coldStart:true,bowThruster:true});off.thrusters.bow=1;run(off,1);assert.equal(off.thrusters.bowForce,0);assert.equal(off.w,0);
 const bow=createBoat('open',{coldStart:true,bowThruster:true}),stern=createBoat('open',{coldStart:true,sternThruster:true});for(const b of [bow,stern]){b.a=0;engineKey(b,0,'ignition');}bow.thrusters.bow=1;stern.thrusters.stern=1;const soc=bow.battery.soc;run(bow,1);run(stern,1);assert.ok(bow.w>0&&stern.w<0);assert.ok(bow.battery.soc<soc);const force=bow.thrusters.bowForce;bow.telemetry.surge=8;systemsStep(bow,.1);assert.ok(bow.thrusters.bowForce<force*.1);engineKey(bow,0,'off');systemsStep(bow,.01);assert.equal(bow.thrusters.bowForce,0);
});
test('small steering at planing speed stays directional instead of spinning broadside',()=>{
 for(const profile of ['tender','runabout','cabin','pwc']){const b=createBoat('open',{profile,powers:[250]});b.a=0;b.vx=12;b.throttle=.6;b.steer=.035;run(b,5);assert.ok(Math.abs(b.telemetry.sway)<.25,profile);assert.ok(Math.abs(b.w)<.15,profile);assert.ok(Math.abs(b.a)<.6,profile);}
});
test('planing develops gradually, displacement cruiser stays displacement, overtrim ventilates and loses speed',()=>{
 const boats=[.1,.42,1].map(trim=>{const b=createBoat('open',{powers:[350]});b.a=0;b.throttle=1;b.engines[0].trim=b.engines[0].trimTarget=trim;run(b,1);assert.ok(b.planing<.1);return run(b,34);});
 const [low,normal,high]=boats;assert.ok(normal.planing>.9);assert.ok(normal.pitch>low.pitch);assert.ok(normal.vx>low.vx*1.015);assert.ok(high.engines[0].ventilation>.5);assert.ok(high.vx<normal.vx*.65);assert.ok(high.pitch>normal.pitch);
 const cruiser=createBoat('open',{profile:'cruiser',powers:[350]});cruiser.a=0;cruiser.throttle=1;run(cruiser,30);assert.equal(cruiser.planing,0);
});
test('PWC is a single waterjet with little steering authority without thrust, unlike a skeg',()=>{
 const jet=createBoat('open',{profile:'pwc',engineCount:2,bowThruster:true}),outboard=createBoat('open');assert.equal(jet.engines.length,1);assert.equal(jet.spec.bowThruster,false);jet.a=outboard.a=0;jet.vx=outboard.vx=6;jet.steer=outboard.steer=.25;run(jet,1);run(outboard,1);assert.ok(Math.abs(jet.w)<.001);assert.ok(Math.abs(outboard.w)>.01);jet.throttle=.5;run(jet,4);assert.ok(jet.w>.01);
 for(const profile of Object.keys(CRAFTS))assert.equal(specification({profile,powers:[500]}).powers[0],350);
});
test('newly thrown rope has slack and no impulse at any of five cleats',()=>{
 const keys=['bow','portBow','starboardBow','portStern','starboardStern'];const positions=keys.map(end=>cleat(createBoat('berth'),end));assert.equal(new Set(positions.map(p=>p.x+','+p.y)).size,5);
 for(const end of keys){const b=createBoat('berth');b.x=25;assert.ok(attachRope(b,end).ok,end);const before={x:b.x,y:b.y};step(b,{},1/120);assert.equal(b.maxTension,0);assert.equal(b.x,before.x);assert.equal(b.y,before.y);}
});
test('local flow changes behind island, accelerates along channel and reeds are traversable drag',()=>{
 const e={spatialEffects:true,windSpeed:8,windDirection:90,currentSpeed:.5,currentDirection:90,waveHeight:.3};
 const lee=environment(0,e,402,204),exposed=environment(0,e,180,204),canal=environment(0,e,304,204);assert.ok(lee.wind.x<exposed.wind.x*.8);assert.ok(lee.waveScale<exposed.waveScale);assert.ok(canal.current.x>.5);
 for(const x of [240,270,304,335,365])assert.ok(bottomAt(x,canalAt(x).y).depth>1.8);
 assert.ok(reedDensityAt(25,245)>.9);assert.ok(bottomAt(25,245).depth>0);assert.equal(reedDensityAt(64,48),0);
 assert.ok(BOLLARDS.filter(q=>q.kind==='buoy').length>=4);assert.ok(BOLLARDS.filter(q=>q.kind==='bollard').length>30);assert.ok(YBOOMS.length>=4);assert.ok(YBOOMS.every(q=>q.width>=.2&&q.width<=.3));
});
test('moored traffic responds to environment and contact, toggle removes collisions',()=>{
 const b=createBoat('open'),q=b.traffic[0],x=q.x;run(b,8,{traffic:true,windSpeed:10,windDirection:90,waveHeight:.2});assert.ok(Math.abs(q.x-x)>.01&&Math.abs(q.x-x)<2);
 function hit(enabled){const b=createBoat('open');b.x=b.traffic[0].x+2;b.y=b.traffic[0].y;b.a=Math.PI;b.vx=-1;for(let i=0;i<60;i++)step(b,{traffic:enabled},1/120);return b;}
 const contact=hit(true),clear=hit(false);assert.ok(contact.traffic[0].vx<-.01||Math.abs(contact.traffic[0].w)>.001);assert.equal(clear.traffic[0].vx,0);assert.ok(Number.isFinite(contact.x));
});
test('Y-boom is a physical pier contact, including side fender protection',()=>{
 const b=createBoat('open');b.x=77.2;b.y=18;b.a=Math.PI/2;b.vx=-1;run(b,.5,{},false);assert.ok(b.lastImpact);assert.ok(b.lastImpact.protectedContact);assert.ok(b.x>76.5);assert.ok(Math.abs(b.booms[0].a-Math.PI/2)>.001);assert.ok(Number.isFinite(b.vx));
});
