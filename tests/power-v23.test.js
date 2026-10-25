import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {systemsStep} from '../src/systems.js';
import {engineKey} from '../src/craft.js';
import {electricalStep,setMainPower,batteryOpenVoltage,batteryResistance} from '../src/electrical.js';
const dt=1/120,run=(b,t)=>{for(let i=0;i<t*120;i++)step(b,{},dt);};

test('master disconnect removes every electrical load, stops the engine and actual thruster force, then requires a new key start',()=>{
 const b=createBoat('lake',{bowThruster:true});b.thrusters.bow=1;b.bilge.manual=true;b.bilge.litres=100;systemsStep(b,1);assert.ok(b.bilge.running&&b.thrusters.bowForce>0);
 setMainPower(b,false);const charge=b.battery.soc;run(b,1);assert.equal(b.battery.loadCurrent,0);assert.equal(b.battery.alternatorCurrent,0);assert.equal(b.battery.soc,charge);assert.equal(b.bilge.outflow,0);assert.equal(b.thrusters.bowForce,0);assert.equal(b.engines[0].key,'ignition');assert.ok(Object.values(b.electrics.powered).every(q=>q===false));assert.equal(engineKey(b,0,'ignition').ok,false);assert.equal(engineKey(b,0,'start').ok,false);
 setMainPower(b,true);assert.equal(b.engines[0].key,'ignition');assert.ok(b.electrics.powered.gps);assert.ok(engineKey(b,0,'ignition').ok);
});
test('thrusters work with every ignition OFF, consume real charge and voltage, and stop through their own switch',()=>{
 const b=createBoat('lake',{coldStart:true,bowThruster:true,sternThruster:true});systemsStep(b,dt);const rest=b.battery.voltage,soc=b.battery.soc;b.thrusters.bow=1;run(b,2);assert.equal(b.engines[0].key,'off');assert.ok(b.thrusters.bowForce>100);assert.ok(b.battery.loads.thrusters>100);assert.ok(b.battery.voltage<rest-.25);assert.ok(b.battery.soc<soc);assert.ok(Math.abs(b.w)>.001);b.electrics.thrusters=false;systemsStep(b,dt);assert.equal(b.thrusters.bowForce,0);assert.equal(b.battery.loads.thrusters,0);
});
test('each accessorized branch takes its exact current independently of ignition, and manual dry pump still uses electricity',()=>{
 const b=createBoat('lake',{coldStart:true});for(const key of ['gps','sonar','instruments'])b.electrics[key]=false;systemsStep(b,dt);assert.equal(b.battery.current,0);
 for(const [key,current]of [['gps',.35],['sonar',.7],['instruments',.55]]){b.electrics[key]=true;systemsStep(b,dt);assert.equal(b.battery.loads[key],current);assert.equal(b.electrics.powered[key],true);b.electrics[key]=false;}
 b.bilge.manual=true;systemsStep(b,dt);assert.equal(b.bilge.running,true);assert.equal(b.bilge.outflow,0);assert.equal(b.battery.loads.bilge,b.bilge.pumpAmps);
});
test('sustained load discharges physical Ah and lowers resting voltage; neither battery time nor charge is operationally accelerated',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.battery;systemsStep(b,dt);const soc=q.soc,voltage=q.voltage,demand=q.loadCurrent;for(let i=0;i<60;i++)electricalStep(b,60);
 assert.ok(Math.abs(q.soc-(soc-demand/q.capacity))<1e-10);assert.ok(q.voltage<voltage);const loaded=q.voltage;setMainPower(b,false);assert.ok(q.voltage>loaded);assert.ok(q.voltage<batteryOpenVoltage(soc));
});
test('low SOC increases internal resistance and load sag, not just an isolated percentage warning',()=>{
 const full=createBoat('lake',{coldStart:true}),low=createBoat('lake',{coldStart:true});low.battery.soc=.16;assert.ok(batteryResistance(low.battery)>batteryResistance(full.battery)*3);for(const b of [full,low]){b.engines[0].key='starting';electricalStep(b,dt);}assert.ok(low.battery.voltage<full.battery.voltage-1);assert.ok(low.battery.voltage<11);
});
test('weak battery actually cranks slowly and fails; healthy battery starts, fully discharged battery cannot request START',()=>{
 const weak=createBoat('lake',{coldStart:true}),healthy=createBoat('lake',{coldStart:true});weak.battery.soc=.16;
 for(const b of [weak,healthy]){electricalStep(b,dt);assert.ok(engineKey(b,0,'ignition').ok);assert.ok(engineKey(b,0,'start').ok);}run(weak,.7);run(healthy,.7);assert.ok(weak.engines[0].rpm<185);assert.ok(healthy.engines[0].rpm>240);run(weak,3);run(healthy,1);assert.equal(weak.engines[0].key,'ignition');assert.equal(weak.engines[0].startFailure,true);assert.equal(healthy.engines[0].key,'running');weak.battery.soc=.03;assert.equal(engineKey(weak,0,'start').ok,false);
});
test('alternator powers loads and recharges the same depleted battery, with idle/RPM output and bounded full charge',()=>{
 const b=createBoat('lake'),q=b.battery;q.soc=.5;b.engines[0].rpm=750;electricalStep(b,1);const idle=q.alternatorCurrent,soc=q.soc;assert.ok(q.current<0);b.engines[0].rpm=4500;electricalStep(b,60);assert.ok(q.alternatorCurrent>idle);assert.ok(q.soc>soc);assert.ok(q.voltage>=13.5&&q.voltage<=14.4);
 q.soc=1;electricalStep(b,1);assert.equal(q.soc,1);assert.equal(q.current,0);assert.equal(q.alternatorCurrent,q.loadCurrent);assert.ok(q.voltage>=13.5);
});
test('discharged battery can restart after alternator charging and load shedding; accessories preserve their switch commands across master OFF',()=>{
 const b=createBoat('lake',{coldStart:true});b.battery.soc=.16;b.electrics.gps=false;setMainPower(b,false);setMainPower(b,true);assert.equal(b.electrics.gps,false);b.engines[0].key='running';b.engines[0].rpm=4500;for(let i=0;i<120;i++)electricalStep(b,60);engineKey(b,0,'off');electricalStep(b,dt);engineKey(b,0,'ignition');assert.ok(engineKey(b,0,'start').ok);run(b,2);assert.equal(b.engines[0].key,'running');
});
