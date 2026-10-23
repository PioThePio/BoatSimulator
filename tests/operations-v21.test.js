import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope} from '../src/physics.js';
import {systemsStep} from '../src/systems.js';
import {createOperations,operationsStep,consumeOperatingFuel,worldScale,operationalTimeScale} from '../src/operations.js';
import {electricalStep,alternatorCurrent,ELECTRICAL_LOADS} from '../src/electrical.js';
import {engineKey,updateEngine} from '../src/craft.js';
import {thermalStep,thermalStage} from '../src/thermal.js';
import {bilgeStep} from '../src/bilge.js';
import {soundParameters} from '../src/sound.js';
import {createTowRig,towStep,resetTowVehicle} from '../src/towing.js';
import {DESTINATIONS,destinationStatus} from '../src/navigation.js';
import {bottomAt} from '../src/world.js';
const dt=1/120,close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} vs ${b}`);
const run=(b,t,e={})=>{for(let i=0;i<t*120;i++)step(b,e,dt);};

test('500 physical metres become 1000 logical metres and 600 physical seconds become 0.333 engine hours',()=>{
 const b=createBoat('lake'),s=createOperations();for(let i=0;i<600;i++)operationsStep(s,b.engines,{vx:500/600,vy:0},1);
 close(worldScale,.5);close(operationalTimeScale,2);close(s.physicalDistance,500);close(s.distance,1000);close(s.physicalSeconds,600);close(s.seconds,1200);close(b.engines[0].operatingHours,1/3);assert.equal(b.engines[0].clock,0);
});
test('real simulation keeps physics, engine spool, weather and animations at 1:1 while accounting advances separately',()=>{
 const b=createBoat('lake');b.throttle=.4;run(b,10,{windSpeed:2,waveHeight:.1});close(b.time,10);close(b.engines[0].clock,10);close(b.operations.seconds,20);close(b.engines[0].operatingHours,20/3600);close(b.operations.distance,b.operations.physicalDistance/.5);
 const en=createBoat('lake').engines[0];for(let i=0;i<70;i++)updateEngine(en,.08,0,dt);assert.equal(en.gear,0);for(let i=0;i<10;i++)updateEngine(en,.08,0,dt);assert.equal(en.gear,1);
});
test('logical clock metadata cannot change forces, contacts, ropes, waves, heating, battery or pump progress',()=>{
 const a=createBoat('berth',{powers:[150],bowThruster:true});a.throttle=.1;a.steer=.13;a.bilge.litres=20;attachRope(a,'bow');const b=structuredClone(a);
 operationsStep(b.operations,b.engines,{vx:8,vy:4},10000);assert.ok(b.operations.distance>100000);
 const e={windSpeed:3,currentSpeed:.1,waveHeight:.08,traffic:true};for(let i=0;i<240;i++){step(a,e,dt);step(b,e,dt);}
 for(const key of ['x','y','a','vx','vy','w','heave','roll','pitch','damage','time','cameraZoom','maxTension'])assert.equal(a[key],b[key],key);
 for(const key of ['rpm','clock','temperature','thrust','trim','n'])assert.equal(a.engines[0][key],b.engines[0][key],key);
 assert.deepEqual(a.battery,b.battery);assert.deepEqual(a.bilge,b.bilge);assert.deepEqual(a.ropes,b.ropes);assert.deepEqual(a.wake,b.wake);
});
test('L/h remains a rate per logical hour, actual fuel and mass decrease once, and twin consumption is apportioned',()=>{
 const b=createBoat('lake',{engineCount:2});b.engines[0].fuelFlow=24;b.engines[1].fuelFlow=36;const initial=b.fuel.litres,mass=b.spec.mass;
 for(let i=0;i<600;i++)systemsStep(b,1);
 assert.equal(b.fuel.flow,60);close(initial-b.fuel.litres,20);close(b.operations.fuelUsed,20);close(b.engines[0].fuelUsed,8);close(b.engines[1].fuelUsed,12);close(b.spec.mass,mass-(20)*.745);
 close(b.engines[0].operatingHours,1/3);close(b.engines[1].operatingHours,1/3);
});
test('only running engines accumulate hours and fuel; empty fuel cannot produce negative litres or fictitious fuel use',()=>{
 const b=createBoat('lake',{engineCount:2});b.engines[0].key='starting';b.engines[1].key='ignition';systemsStep(b,1);assert.equal(b.engines[0].operatingHours,0);assert.equal(b.engines[1].operatingHours,0);assert.equal(b.operations.fuelUsed,0);
 b.engines[0].key='running';b.engines[0].fuelFlow=36;b.fuel.litres=.001;systemsStep(b,1);close(b.operations.fuelUsed,.001);assert.equal(b.fuel.litres,0);assert.ok(b.engines[0].operatingHours>0);assert.equal(b.engines[1].operatingHours,0);
});
test('carried boat has engine hours but no sailing distance; vehicle reset adds no teleport kilometres',()=>{
 const b=createBoat('lake'),r=createTowRig(b,{loaded:true});b.engines[0].key='running';b.engines[0].fuelFlow=1;systemsStep(b,1);assert.ok(b.engines[0].operatingHours>0);assert.equal(b.operations.distance,0);assert.equal(b.operations.seconds,0);
 r.engine.key='running';towStep(r,b,dt);assert.ok(r.engine.operatingHours>0);assert.ok(r.operations.fuelUsed>0);const distance=r.operations.distance;r.car.x+=10;resetTowVehicle(r,b);towStep(r,b,dt);close(r.operations.distance,distance,.001);assert.equal(r.operations.physicalDistance,0);
});
test('pump output, leaking and electrical energy use physical seconds, independent of the operational multiplier',()=>{
 const b=createBoat('lake',{coldStart:true});b.bilge.manual=true;b.bilge.auto=false;b.bilge.litres=100;b.battery.voltage=12;bilgeStep(b,1);close(b.bilge.outflow,50/60);close(b.bilge.litres,100-50/60);
 const q=createBoat('lake',{coldStart:true});q.damage=40;q.bilge.auto=false;bilgeStep(q,1);close(q.bilge.litres,q.bilge.inflow);
 const soc=b.battery.soc;electricalStep(b,1);close(soc-b.battery.soc,b.battery.current/3600/b.battery.capacity);
});
test('each switched accessory has real current draw and can flatten a stopped boat battery',()=>{
 const b=createBoat('lake',{coldStart:true});for(const name of ['navigationLights','gps','sonar','instruments'])b.electrics[name]=false;electricalStep(b,1);assert.equal(b.battery.current,0);
 for(const name of ['navigationLights','gps','sonar','instruments']){b.electrics[name]=true;const soc=b.battery.soc;electricalStep(b,60);close(b.battery.current,ELECTRICAL_LOADS[name]);close(soc-b.battery.soc,ELECTRICAL_LOADS[name]/60/b.battery.capacity);assert.equal(b.electrics.powered[name],true);b.electrics[name]=false;}
 b.battery.soc=0;b.electrics.gps=b.electrics.sonar=true;electricalStep(b,1);assert.equal(b.electrics.powered.gps,false);assert.equal(b.electrics.powered.sonar,false);
});
test('starter draws 110 A and causes real voltage sag, not an operationally accelerated battery discharge',()=>{
 const b=createBoat('lake',{coldStart:true});electricalStep(b,dt);const rest=b.battery.voltage;engineKey(b,0,'ignition');assert.ok(engineKey(b,0,'start').ok);const before=b.battery.soc;electricalStep(b,.5);assert.equal(b.battery.loads.starter,110);assert.ok(b.battery.voltage<rest-.25);close(before-b.battery.soc,b.battery.current*.5/3600/b.battery.capacity);
});
test('alternator output follows real RPM, feeds consumers, charges the same battery and sums both engines',()=>{
 const b=createBoat('lake',{engineCount:2});b.engines[1].key='off';const en=b.engines[0];en.rpm=750;const idle=alternatorCurrent(en);en.rpm=3000;const cruise=alternatorCurrent(en);en.rpm=5500;const high=alternatorCurrent(en);assert.equal(idle,12);assert.ok(cruise>idle&&high>cruise);assert.equal(high,34);
 const before=b.battery.soc;electricalStep(b,60);assert.ok(b.battery.soc>before);assert.ok(b.battery.voltage>13&&b.battery.voltage<14.5);close(b.battery.current,b.battery.loadCurrent-b.battery.alternatorCurrent);
 b.engines[1].key='running';b.engines[1].rpm=5500;electricalStep(b,1);assert.equal(b.battery.alternatorCurrent,68);
 b.battery.soc=0;electricalStep(b,dt);assert.equal(b.electrics.powered.gps,true);assert.ok(b.battery.soc>0);
});
test('existing thruster load sags voltage and weakens only through the existing supply path, recovering when released',()=>{
 const b=createBoat('lake',{coldStart:true,bowThruster:true});engineKey(b,0,'ignition');systemsStep(b,dt);const rest=b.battery.voltage;b.thrusters.bow=1;for(let i=0;i<120;i++)systemsStep(b,dt);assert.ok(b.battery.loads.thrusters>100);assert.ok(b.battery.voltage<rest-.3);assert.ok(b.thrusters.bowForce>0);b.thrusters.bow=0;for(let i=0;i<240;i++)systemsStep(b,dt);assert.ok(b.battery.voltage>rest-.1);
});
test('temperature stages drive alarm and reversible power limiting without permanent engine damage',()=>{
 assert.equal(thermalStage(94),'normal');assert.equal(thermalStage(95),'high');assert.equal(thermalStage(105),'alarm');assert.equal(thermalStage(120),'overheat');
 const b=createBoat('lake'),en=b.engines[0];en.temperature=125;en.n=.8;en.gear=1;updateEngine(en,1,3,dt,0,{speed:3,intake:0});assert.ok(en.thermalLimit<1);assert.equal(soundParameters(b).temperatureAlarm,true);assert.equal(b.damage,0);assert.equal(en.propDamage,0);
 en.n=0;en.trim=en.trimTarget=.1;for(let i=0;i<1200;i++)updateEngine(en,0,0,.1,0,{intake:1});assert.ok(en.temperature<95);assert.equal(en.thermalLimit,1);assert.equal(en.thermalStage,'normal');assert.equal(soundParameters(b).temperatureAlarm,false);assert.equal(en.key,'running');
});
test('protective heat shutdown clears after cooldown and permits normal restart without a service repair',()=>{
 const b=createBoat('lake'),en=b.engines[0];en.temperature=145.1;en.n=.9;en.gear=1;thermalStep(en,dt,{intake:0});assert.equal(en.key,'ignition');assert.equal(en.thermalTrip,true);assert.equal(en.thrust,0);
 for(let i=0;i<4000;i++)thermalStep(en,.1);assert.ok(en.temperature<100);assert.equal(en.thermalTrip,false);assert.equal(b.damage,0);assert.equal(en.propDamage,0);assert.ok(engineKey(b,0,'start').ok);
 en.key='off';en.temperature=125;assert.equal(soundParameters(b).temperatureAlarm,false);
});
test('GPS approach points are afloat; ETA is a logical estimate only while approaching with powered GPS',()=>{
 for(const q of DESTINATIONS)assert.ok(bottomAt(q.x,q.y).depth>1.5,q.name);
 const b=createBoat('lake'),target=DESTINATIONS[0],dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy);assert.equal(destinationStatus(b,'main').eta,null);b.vx=5*dx/d;b.vy=5*dy/d;operationsStep(b.operations,b.engines,b,1);const q=destinationStatus(b,'main');close(q.distance,d/.5);close(q.eta,d/.5/5);b.vx*=-1;b.vy*=-1;assert.equal(destinationStatus(b,'main').eta,null);b.electrics.powered.gps=false;assert.equal(destinationStatus(b,'main').distance,null);assert.equal(destinationStatus(b,'main').eta,null);
});
