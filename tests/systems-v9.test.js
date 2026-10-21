import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,cleat,BOLLARDS} from '../src/physics.js';
import {requestHaul} from '../src/rigging.js';
import {weatherAt,waveHeight,FUEL_STATION,FUEL_FENDERS,SOLIDS} from '../src/world.js';
import {systemsStep,requestRefuel} from '../src/systems.js';
import {soundParameters} from '../src/sound.js';
import {anchorAdvice} from '../src/drive.js';
const run=(b,t)=>{for(let i=0;i<t*120;i++)step(b,{},1/120);};
test('separate strength bands and direction variations remain bounded and smooth',()=>{
 const e={windMin:6,windMax:10,windDirection:350,windDirectionVariation:30,currentMin:.3,currentMax:1.1,currentDirection:40,currentDirectionVariation:20};
 let previous=weatherAt(0,e),lo=15,hi=0;
 for(let i=1;i<18000;i++){
  const w=weatherAt(i*.1,e);lo=Math.min(lo,w.windSpeed);hi=Math.max(hi,w.windSpeed);
  assert.ok(w.windSpeed>=6&&w.windSpeed<=10);assert.ok(w.currentSpeed>=.3&&w.currentSpeed<=1.1);
  for(const name of ['wind','current']){const base=e[name+'Direction'],angle=Math.atan2(Math.sin((w[name+'Direction']-base)*Math.PI/180),Math.cos((w[name+'Direction']-base)*Math.PI/180))*180/Math.PI;assert.ok(Math.abs(angle)<=e[name+'DirectionVariation']+1e-8);}
  assert.ok(Math.abs(w.windSpeed-previous.windSpeed)<.15);assert.ok(Math.abs(w.currentSpeed-previous.currentSpeed)<.02);previous=w;
 }
 assert.ok(hi-lo>3);
});
test('direction and strength vary independently, equal endpoints give steady strength, automatic waves follow wind',()=>{
 for(const time of [0,10,30,70]){
  const base={windMin:7,windMax:7,windDirection:90,currentMin:.6,currentMax:.6,currentDirection:180};
  const fixed=weatherAt(time,base),turning=weatherAt(time,{...base,windDirectionVariation:45,currentDirectionVariation:30});assert.equal(fixed.windSpeed,turning.windSpeed);assert.equal(turning.windSpeed,7);assert.equal(turning.currentSpeed,.6);
  const variable=weatherAt(time,{...base,windMin:3,windMax:10});assert.equal(variable.windDirection,90);assert.equal(variable.currentDirection,180);
 }
 const e={windMin:3,windMax:10,autoWaves:true};assert.notEqual(waveHeight(e,0),waveHeight(e,8));assert.equal(waveHeight({...e,autoWaves:false,waveHeight:.2},8),.2);
 assert.equal(anchorAdvice(createBoat('open'),{windSpeed:5,windMin:0,windMax:10}).scope,7);
});
test('held rope builds bounded human effort and releasing immediately stops length changes',()=>{
 const b=createBoat('berth');attachRope(b,'bow');const r=b.ropes[0],initial=r.length;
 requestHaul(r,-1);run(b,.5);const first=r.manualForce;assert.ok(first>=170&&first<200);assert.ok(r.length<initial);
 run(b,4);assert.equal(r.manualForce,450);requestHaul(r,0);const held=r.length;run(b,1);assert.equal(r.length,held);assert.equal(r.manualForce,0);assert.equal(r.rate,0);
 requestHaul(r,1);run(b,.5);assert.ok(r.length>held+.1);requestHaul(r,0);const loose=r.length;run(b,1);assert.equal(r.length,loose);
});
test('simultaneous ropes share one person rather than multiplying manual force',()=>{
 const b=createBoat('berth');attachRope(b,'bow');attachRope(b,'starboardBow');for(const r of b.ropes)requestHaul(r,-1);run(b,4);
 assert.ok(b.ropes.reduce((sum,r)=>sum+r.manualForce,0)<=450.0001);assert.ok(b.ropes.every(r=>r.manualForce>0));
});
test('both thrusters on larger boats sustain rated thrust without low-voltage on/off oscillation',()=>{
 for(const profile of ['cabin','cruiser']){
  const b=createBoat('open',{profile,coldStart:true,bowThruster:true,sternThruster:true});b.engines[0].key='ignition';b.thrusters.bow=b.thrusters.stern=1;let min=Infinity,max=0;
  for(let i=0;i<1800;i++){systemsStep(b,1/120);if(i>240){min=Math.min(min,b.thrusters.bowForce);max=Math.max(max,b.thrusters.bowForce);}}
  assert.ok(min>b.spec.thrusterRating*.85);assert.ok(max-min<10);assert.ok(b.battery.voltage>10.8);assert.ok(b.battery.soc<.85);
  b.engines[0].key='off';systemsStep(b,1/120);assert.equal(b.thrusters.bowForce,0);assert.equal(b.thrusters.sternForce,0);
 }
});
test('reverse angled outboard and thrusters reduce stern blow-off with a bow line in strong cross-current',()=>{
 const boats=[false,true].map(assist=>{
  const b=createBoat('fuel',{profile:'cabin',powers:[200],bowThruster:true,sternThruster:true});b.x=55;b.y=22;b.a=Math.PI/2;
  const bollard=BOLLARDS.findIndex(q=>Math.abs(q.x-51.8)<.01&&Math.abs(q.y-22.8)<.01);assert.ok(attachRope(b,'bow',bollard).ok);b.ropes[0].length-=.3;
  if(assist){b.steer=b.spec.maxSteer;b.throttle=-.7;b.thrusters.bow=b.thrusters.stern=1;}
  for(let i=0;i<1200;i++)step(b,{windSpeed:7.5,windDirection:90,currentSpeed:.95,currentDirection:90},1/120);return b;
 });
 assert.ok(cleat(boats[1],'portStern').x<cleat(boats[0],'portStern').x-3);assert.ok(boats[1].engines[0].thrust<0);assert.equal(boats[1].ropes.length,1);assert.equal(boats[1].damage,0);
});
test('fuel berth requires a line to that pier, alongside position, rest and all engines off',()=>{
 const b=createBoat('fuel',{coldStart:true});b.fuel.litres=20;assert.equal(requestRefuel(b).ok,false);assert.ok(attachRope(b,'bow').ok);assert.ok(requestRefuel(b).ok);systemsStep(b,1);assert.ok(b.fuel.litres>20);
 b.ropes=[];systemsStep(b,1);assert.equal(b.fuel.refueling,false);assert.match(b.fuel.status,/przerwane/);
 attachRope(b,'bow');b.engines[0].key='running';assert.equal(requestRefuel(b).ok,false);b.engines[0].key='off';b.vx=.2;assert.equal(requestRefuel(b).ok,false);b.vx=0;b.a=0;assert.equal(requestRefuel(b).ok,false);b.a=Math.PI/2;b.x+=5;assert.equal(requestRefuel(b).ok,false);
 const full=createBoat('fuel',{coldStart:true});attachRope(full,'bow');full.fuel.litres=full.fuel.capacity-.1;assert.ok(requestRefuel(full).ok);systemsStep(full,1);assert.equal(full.fuel.refueling,false);assert.equal(full.fuel.status,'Zbiornik pełny');assert.equal(requestRefuel(full).ok,false);
 assert.equal(FUEL_STATION.radius,undefined);assert.equal(FUEL_FENDERS.length,5);assert.ok(FUEL_FENDERS.every(f=>SOLIDS.includes(f)));
});
test('hull-dependent wheel travel and optional outboard limit leave the jet nozzle distinct',()=>{
 const jet=createBoat('open',{profile:'pwc',steeringLimit:45}),boat=createBoat('open',{steeringLimit:45}),cabin=createBoat('open',{profile:'cabin'});
 assert.equal(jet.spec.wheelTurns,.25);assert.ok(cabin.spec.wheelTurns>boat.spec.wheelTurns);assert.equal(jet.spec.maxSteer,28*Math.PI/180);assert.equal(boat.spec.maxSteer,45*Math.PI/180);assert.ok(jet.spec.steeringLockTime<boat.spec.steeringLockTime);
});
test('audio follows each engine RPM, starter, water speed, waves and thruster state',()=>{
 const b=createBoat('open',{engineCount:2});b.engines[0].rpm=750;b.engines[1].rpm=3000;const idle=soundParameters(b,{});assert.equal(idle.engines[1].frequency,idle.engines[0].frequency*4);assert.equal(idle.wash,0);
 b.engines[0].key='starting';b.planing=1;b.telemetry.surge=15;b.thrusters.bowActual=1;const moving=soundParameters(b,{waveHeight:.3});assert.ok(moving.engines[0].starting);assert.ok(moving.wash>.03&&moving.waves>0&&moving.thrusters[0]>0);
 b.engines.forEach(e=>e.key='off');assert.ok(soundParameters(b,{}).engines.every(e=>e.level===0));
});
