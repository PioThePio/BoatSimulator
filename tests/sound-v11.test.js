import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat} from '../src/physics.js';
import {engineState,updateEngine} from '../src/craft.js';
import {soundParameters} from '../src/sound.js';

test('ignition warning follows the key, including a stall and just one stopped engine of a twin installation',()=>{
 const b=createBoat('lake',{engineCount:2,coldStart:true});assert.equal(soundParameters(b).ignitionAlarm,false);
 b.engines[0].key='ignition';assert.equal(soundParameters(b).ignitionAlarm,true);
 b.engines[0].key='starting';assert.equal(soundParameters(b).ignitionAlarm,false);
 b.engines[0].key='running';assert.equal(soundParameters(b).ignitionAlarm,false);
 b.engines[1].key='ignition';assert.equal(soundParameters(b).ignitionAlarm,true);
 b.engines[1].key='off';assert.equal(soundParameters(b).ignitionAlarm,false);
 updateEngine(b.engines[0],0,0,1/120,0,{noFuel:true});assert.equal(b.engines[0].key,'ignition');assert.equal(soundParameters(b).ignitionAlarm,true);
 b.engines[0].key='off';assert.equal(soundParameters(b).ignitionAlarm,false);
});

test('cold idle has gentle slow hunting that fades as the actual engine warms, and disappears under throttle',()=>{
 const sample=(temperature,command=0)=>{
  const en=engineState(90);en.temperature=temperature;let lo=Infinity,hi=0;const rpms=[];
  for(let i=0;i<1800;i++){updateEngine(en,command,0,1/120);if(i>600){rpms.push(en.rpm);lo=Math.min(lo,en.rpm);hi=Math.max(hi,en.rpm);}}
  return{en,rpms,range:hi-lo};
 };
 const cold=sample(18),warm=sample(70);assert.ok(cold.range>warm.range*1.5);assert.ok(cold.range<100);assert.ok(warm.range>15&&warm.range<40);
 const movingCold=sample(18,.8),movingWarm=sample(70,.8);assert.ok(movingCold.rpms.every((rpm,i)=>Math.abs(rpm-movingWarm.rpms[i])<1e-7));
 cold.en.key='off';updateEngine(cold.en,0,0,1/120);assert.equal(cold.en.rpm,0);
});

test('water changes progressively to a separate spray layer with real planing and water-relative speed',()=>{
 const b=createBoat('lake');b.telemetry.surge=12;const displacing=soundParameters(b);
 b.planing=.5;const transition=soundParameters(b);b.planing=1;const planing=soundParameters(b);
 assert.equal(displacing.spray,0);assert.ok(transition.spray>0&&transition.spray<planing.spray);assert.ok(planing.sprayCutoff>planing.waterCutoff*1.5);
 b.telemetry.surge=b.telemetry.sway=0;assert.equal(soundParameters(b).spray,0);
});
