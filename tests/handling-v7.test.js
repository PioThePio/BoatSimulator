import {faceSand,sandNormal,sandPosition} from './shore-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {driveGeometry,trimAngle,trimStep,anchorAdvice} from '../src/drive.js';
import {propellerContact} from '../src/ground.js';
import {anchorCommand} from '../src/rigging.js';
import {recordHullWake,wakeEdges} from '../src/wake.js';
const run=(b,t,env={})=>{for(let i=0;i<t*120;i++){step(b,env,1/120);b.x=64;b.y=48;}return b;};
test('35 degree lock sheds speed and tightens the arc while a powerful boat sustains planing',()=>{
 for(const hp of [90,350]){
  const b=createBoat('open',{powers:[hp],steeringLimit:35});b.a=0;b.throttle=1;run(b,40);const top=Math.hypot(b.vx,b.vy);assert.ok(b.planing>.8);
  b.steer=b.spec.maxSteer;run(b,1);const earlyRadius=Math.hypot(b.vx,b.vy)/b.w;run(b,9);
  const speed=Math.hypot(b.vx,b.vy),radius=speed/b.w;
  assert.ok(speed<top*.70,`${hp} HP: ${speed}/${top}`);
  assert.ok(radius<earlyRadius*.95&&radius<b.spec.length*5,`${hp} HP: ${radius}`);assert.ok(b.w>.20&&b.w<1);assert.ok(b.telemetry.surge>4);
  if(hp===350)assert.ok(b.planing>.75,'adequate power must maintain planing through the hard turn');
  b.steer=0;run(b,12);assert.ok(Math.abs(b.w)<.015);assert.ok(Math.hypot(b.vx,b.vy)>speed*1.2);
 }
});
test('trim detents cross between fine power-trim and faster tilt steps without skipping 40%',()=>{
 const up=[];let value=0;for(let i=0;i<14;i++){value=trimStep(value,1);up.push(Math.round(value*100));}
 assert.deepEqual(up,[5,10,15,20,25,30,35,40,50,60,70,80,90,100]);
 const down=[];for(let i=0;i<14;i++){value=trimStep(value,-1);down.push(Math.round(value*100));}
 assert.deepEqual(down,[90,80,70,60,50,40,35,30,25,20,15,10,5,0]);
 assert.ok(trimAngle(.4)<Math.PI/10);assert.ok(trimAngle(1)>Math.PI/3);
});
test('tilting raises the real propeller clear of sand while retaining low-speed thrust when immersed',()=>{
 const b=createBoat('beach');Object.assign(b,sandPosition(5.5));b.a=Math.atan2(sandNormal.x,-sandNormal.y);const en=b.engines[0];en.gear=1;en.n=.25;
 en.trim=en.trimTarget=0;propellerContact(b,en,1/120,()=>{});const low=driveGeometry(b,en);assert.ok(en.propContact&&low.clearance<0);
 en.trim=en.trimTarget=.7;propellerContact(b,en,1/120,()=>{});const tilted=driveGeometry(b,en);assert.ok(tilted.clearance>0);assert.ok(tilted.immersed>.95);assert.equal(en.propContact,false);
 const recovery=faceSand(createBoat('beach'),0,4.5);const initial={x:recovery.x,y:recovery.y};recovery.engines[0].trim=recovery.engines[0].trimTarget=.7;
 for(let i=0;i<240;i++)step(recovery,{},1/120);assert.ok(recovery.grounded);recovery.throttle=-.6;
 for(let i=0;i<4800;i++)step(recovery,{},1/120);
 assert.ok((recovery.x-initial.x)*sandNormal.x+(recovery.y-initial.y)*sandNormal.y>15);assert.equal(recovery.grounded,false);assert.equal(recovery.engines[0].propDamage,0);assert.ok(recovery.engines[0].thrust<0);
});
test('full tilt removes water thrust and cooling; partial exposure gives proportionate immersion',()=>{
 const b=createBoat('open');b.a=0;const en=b.engines[0];en.trim=en.trimTarget=.9;const partial=driveGeometry(b,en);assert.ok(partial.immersed>0&&partial.immersed<.5);assert.equal(partial.intake,0);
 en.trim=en.trimTarget=1;b.throttle=.6;run(b,4);assert.equal(en.thrust,0);assert.equal(en.immersion,0);assert.equal(en.cooling,0);assert.equal(b.vx,0);
});
test('operating trim improves planing efficiency compared with full down, while tilt loses propulsion',()=>{
 const boats=[0,.22,1].map(trim=>{const b=createBoat('open',{powers:[350]});b.a=0;b.throttle=1;b.engines[0].trim=b.engines[0].trimTarget=trim;return run(b,35);});
 assert.ok(boats[1].vx>boats[0].vx*1.05);assert.ok(boats[1].pitch>boats[0].pitch);assert.equal(boats[2].engines[0].thrust,0);
});
test('anchor advice includes roller height, responds to conditions and discloses insufficient rode',()=>{
 const b=createBoat('open');const calm=anchorAdvice(b),wind=anchorAdvice(b,{windSpeed:9});assert.equal(calm.scope,5);assert.equal(wind.scope,7);assert.ok(calm.required>calm.depth*5);assert.ok(wind.required>calm.required);
 anchorCommand(b,'lower',20);const anchored=anchorAdvice(b);assert.ok(Math.abs(anchored.depth-calm.depth)<.01);
 b.anchor.reserve=10;const short=anchorAdvice(b,{windSpeed:9});assert.ok(short.limited);assert.equal(short.length,10);assert.ok(short.required>short.length);
});
test('V wake spreads out from the travelled path, advects with current and fades after stopping',()=>{
 const b=createBoat('open');b.a=0;const history=[];recordHullWake(history,b,{x:0,y:0});assert.equal(history.length,0);
 b.vx=8;for(let i=0;i<20;i++){b.time+=.15;b.x+=1.2;recordHullWake(history,b,{x:.5,y:0});}
 assert.ok(history.length>8);const old=history[0],young=history[history.length-1],edges=wakeEdges(old,b.time),fresh=wakeEdges(young,b.time);
 assert.ok(edges[1].y-edges[0].y>fresh[1].y-fresh[0].y+5);assert.ok(edges[0].x>old.x);assert.ok(fresh[0].x>edges[0].x);
 b.vx=.5;b.time+=7;recordHullWake(history,b,{x:.5,y:0});assert.ok(history.length>0);b.time+=38;recordHullWake(history,b,{x:.5,y:0});assert.equal(history.length,0);
});
