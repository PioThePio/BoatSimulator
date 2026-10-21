import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {engineState,updateEngine} from '../src/craft.js';
import {soundParameters} from '../src/sound.js';

function engineRun(en,seconds,command=.8,inflow=8,context={}){
 for(let i=0;i<seconds*120;i++)updateEngine(en,command,inflow,1/120,0,context);
 return en;
}
function boatRun(b,seconds,env={}){for(let i=0;i<seconds*120;i++){step(b,env,1/120);b.x=80;b.y=110;}return b;}

test('V8 styling starts at 150 HP per outboard; small twins and even a 350 HP PWC keep their buzz',()=>{
 const voices=options=>soundParameters(createBoat('lake',options)).engines.map(en=>en.timbre);
 assert.deepEqual(voices({powers:[149]}),['light']);assert.deepEqual(voices({powers:[150]}),['v8']);assert.deepEqual(voices({powers:[350]}),['v8']);
 assert.deepEqual(voices({engineCount:2,powers:[90,90]}),['light','light']);assert.deepEqual(voices({engineCount:2,powers:[90,200]}),['light','v8']);
 assert.deepEqual(voices({profile:'pwc',powers:[350]}),['jet']);
});

test('propeller load changes exhaust colour at fixed RPM; ignition and a stopped engine stay silent',()=>{
 for(const hp of [90,200]){
  const b=createBoat('lake',{powers:[hp]}),en=b.engines[0];Object.assign(en,{gear:1,n:.8,rpm:4500,load:.2});
  const light=soundParameters(b).engines[0];en.load=.9;const loaded=soundParameters(b).engines[0];
  assert.equal(light.frequency,loaded.frequency);assert.ok(loaded.exhaust>light.exhaust*3);assert.ok(loaded.harmonicMix>light.harmonicMix);assert.ok(loaded.level>light.level);
  for(const key of ['ignition','off']){en.key=key;const silent=soundParameters(b).engines[0];assert.equal(silent.level,0);assert.equal(silent.exhaust,0);assert.equal(silent.churn,0);}
 }
});

test('crash reverse gurgles only after actual engagement while the hull still moves ahead',()=>{
 const b=createBoat('lake',{powers:[200]});b.a=0;b.throttle=.8;boatRun(b,25);
 const forward=b.vx;assert.ok(forward>8);b.throttle=-1;step(b,{},1/120);
 assert.equal(b.engines[0].thrust,0);assert.equal(soundParameters(b).engines[0].churn,0);
 let braking=false;
 for(let i=0;i<360;i++){
  step(b,{},1/120);
  const en=b.engines[0];
  if(en.thrust<-100&&en.inflow>2){assert.ok(soundParameters(b).engines[0].churn>.005);assert.ok(b.telemetry.surge>0);braking=true;break;}
 }
 assert.ok(braking,'reverse must engage and churn against the remaining forward flow');
});

test('partial ventilation and raising a working wet propeller bubble, a fully dry or stopped propeller does not',()=>{
 const b=createBoat('lake'),en=b.engines[0];Object.assign(en,{gear:1,n:.8,rpm:4500,thrust:1000,inflow:4,immersion:1,ventilation:0});
 assert.equal(soundParameters(b).engines[0].churn,0);
 Object.assign(en,{immersion:.5,ventilation:.6,trimRate:0});const ventilating=soundParameters(b).engines[0].churn;assert.ok(ventilating>.01);
 en.trimRate=.16;assert.ok(soundParameters(b).engines[0].churn>ventilating);
 en.immersion=0;en.gear=-1;assert.equal(soundParameters(b).engines[0].churn,0);
 en.immersion=.5;en.key='off';assert.equal(soundParameters(b).engines[0].churn,0);
 // Both ahead-against-astern and astern-against-ahead dissipate water power.
 Object.assign(en,{key:'running',gear:1,inflow:-6,thrust:2500,immersion:1,ventilation:0,trimRate:0});assert.ok(soundParameters(b).engines[0].churn>.05);
 en.inflow=6;assert.equal(soundParameters(b).engines[0].churn,0);
});

test('signed propeller advance loads a reversing engine more against forward motion than while backing freely',()=>{
 const backing=engineState(200),braking=engineState(200);backing.gear=braking.gear=-1;
 engineRun(backing,15,-.8,-8);engineRun(braking,15,-.8,8);
 assert.ok(braking.load>backing.load+.3);assert.ok(braking.rpm<backing.rpm-50);assert.ok(Math.abs(braking.thrust)>Math.abs(backing.thrust));
 assert.equal(backing.opposingFlow,0);assert.equal(braking.opposingFlow,8);
 engineRun(braking,4,0,8);assert.equal(braking.gear,0);assert.ok(braking.load<.001);
});

test('PWC reverse redirects the jet while keeping the pump load tied to the same inlet flow',()=>{
 const forward=engineState(170),reverse=engineState(170);forward.gear=1;reverse.gear=-1;
 engineRun(forward,15,.8,8,{jet:true});engineRun(reverse,15,-.8,8,{jet:true});
 assert.equal(forward.load,reverse.load);assert.equal(forward.n,reverse.n);assert.equal(forward.rpm,reverse.rpm);
 assert.ok(forward.thrust>0&&reverse.thrust<0);assert.equal(reverse.opposingFlow,8);
});

test('new cross-flow or wave pressure produces a bounded shaft-speed dip, changes real thrust, and recovers on release',()=>{
 const base=engineState(200);base.gear=1;engineRun(base,18);
 for(const context of [{crossflow:8},{waveLoad:.25}]){
  const light=structuredClone(base),loaded=structuredClone(base);engineRun(light,1);engineRun(loaded,1,.8,8,context);
  const dip=light.rpm-loaded.rpm;assert.ok(dip>25&&dip<180,`load dip ${dip} RPM`);assert.ok(loaded.n<light.n);assert.ok(loaded.thrust<light.thrust);
  engineRun(light,8);engineRun(loaded,8);assert.ok(Math.abs(light.rpm-loaded.rpm)<3);assert.ok(Math.abs(light.thrust-loaded.thrust)<5);
 }
});

test('actual planing turn loads the engine; turning the wheel on a stationary hull adds no fictitious load',()=>{
 const b=createBoat('lake',{powers:[200]});b.a=0;b.throttle=.8;boatRun(b,30);
 const straight=structuredClone(b),turn=structuredClone(b);turn.steer=turn.spec.maxSteer;boatRun(straight,8);boatRun(turn,8);
 assert.ok(turn.engines[0].load>straight.engines[0].load+.1);assert.ok(turn.engines[0].rpm<straight.engines[0].rpm-30);assert.ok(turn.telemetry.surge>3);
 const a=createBoat('lake'),c=structuredClone(a);c.steer=c.spec.maxSteer;
 step(a,{},1/120);step(c,{},1/120);assert.equal(c.engines[0].load,a.engines[0].load);assert.equal(c.engines[0].rpm,a.engines[0].rpm);
});

test('travelling into actual waves modulates propeller loading and RPM without an arbitrary wave timer',()=>{
 const b=createBoat('lake',{powers:[200]});b.a=0;b.throttle=.8;boatRun(b,30);b.wake=[];
 const calm=structuredClone(b),head=structuredClone(b),stats=[];
 for(const [boat,env]of [[calm,{}],[head,{waveHeight:.22,waveDirection:270}]]){
  let lo=1,hi=0,minRPM=10000,maxRPM=0,waveLoad=0,minShaft=1,maxShaft=0,totalRPM=0,count=0;
  for(let i=0;i<1200;i++){
   step(boat,env,1/120);
   if(i>240){const en=boat.engines[0];lo=Math.min(lo,en.load);hi=Math.max(hi,en.load);minRPM=Math.min(minRPM,en.rpm);maxRPM=Math.max(maxRPM,en.rpm);waveLoad=Math.max(waveLoad,en.waveLoad);minShaft=Math.min(minShaft,en.n);maxShaft=Math.max(maxShaft,en.n);totalRPM+=en.rpm;count++;}
  }
  stats.push({loadRange:hi-lo,rpmRange:maxRPM-minRPM,waveLoad,shaftRange:maxShaft-minShaft,meanRPM:totalRPM/count});
 }
 assert.ok(stats[1].loadRange>stats[0].loadRange+.025);assert.ok(stats[1].shaftRange>stats[0].shaftRange+.001);assert.ok(stats[1].meanRPM<stats[0].meanRPM-10);assert.ok(stats[1].waveLoad>.03);assert.ok(stats[1].rpmRange<600);
});
