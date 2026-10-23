import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,cleat} from '../src/physics.js';
import {engineState,updateEngine} from '../src/craft.js';
import {BOLLARDS,DOCKS,YBOOMS,BUOY_SLIPS} from '../src/world.js';
import {mooringPoint,boomPoint} from '../src/marina.js';
import {trafficStep} from '../src/traffic.js';
const run=(b,t,env={})=>{for(let i=0;i<t*120;i++){step(b,env,1/120);b.x=64;b.y=48;}return b;};
const speed=b=>Math.hypot(b.vx,b.vy);
test('full lock at creep produces sustained forward progress, not bow-centred rotation',()=>{
 for(const profile of ['tender','runabout','cabin','cruiser','pwc']){
  const b=createBoat('open',{profile});b.a=0;b.throttle=.08;b.steer=b.spec.maxSteer;run(b,25);
  assert.ok(b.telemetry.surge>.30,profile);assert.ok(b.telemetry.surge>Math.abs(b.telemetry.sway)*1.8,profile);
  assert.ok(b.w>0&&b.w<.25,profile);assert.ok(speed(b)/b.w>b.spec.length,profile);
 }
});
test('medium-power full lock turns more tightly than creep and sacrifices forward speed',()=>{
 const creep=createBoat('open'),turn=createBoat('open'),straight=createBoat('open');
 for(const b of [creep,turn,straight])b.a=0;
 creep.throttle=.08;turn.throttle=straight.throttle=.5;creep.steer=turn.steer=turn.spec.maxSteer;
 for(const b of [creep,turn,straight])run(b,25);
 assert.ok(speed(turn)/turn.w<speed(creep)/creep.w);assert.ok(speed(turn)/turn.w<turn.spec.length*3);
 assert.ok(speed(turn)<speed(straight)*.75);assert.ok(turn.telemetry.surge>1.5);
});
test('power and water inflow distinguish a hard throttle burst at rest from a moving turn',()=>{
 const stopped=createBoat('open'),moving=createBoat('open');stopped.a=moving.a=0;moving.vx=5;
 for(const b of [stopped,moving]){b.throttle=1;b.steer=b.spec.maxSteer;run(b,2);}
 assert.ok(moving.telemetry.surge>stopped.telemetry.surge+2);assert.ok(moving.w>0&&moving.w<stopped.w);assert.ok(Math.abs(stopped.telemetry.sway/stopped.telemetry.surge)>Math.abs(moving.telemetry.sway/moving.telemetry.surge)*2);
 assert.ok(Math.abs(stopped.telemetry.sway)>.05);assert.ok(Math.abs(moving.telemetry.sway)>.05);
 assert.notEqual(moving.engines[0].load,stopped.engines[0].load);
});
test('neutral-coasting outboard steers with water flow; lifted leg and jet do not',()=>{
 const down=createBoat('open'),up=createBoat('open'),jet=createBoat('open',{profile:'pwc'});
 up.enginesRaised=true;
 for(const b of [down,up,jet]){b.a=0;b.vx=4;b.steer=.35;run(b,2);}
 assert.equal(down.engines[0].thrust,0);assert.ok(down.w>.01);assert.ok(Math.abs(up.w)<1e-9);assert.ok(Math.abs(jet.w)<1e-9);
});
test('crosswind rotates an asymmetric hull and broadside drift is bounded',()=>{
 const b=createBoat('open');b.a=0;run(b,20,{windSpeed:6,windDirection:180});
 assert.ok(b.a>.15&&b.a<1.2);assert.ok(speed(b)<.25);assert.ok(b.w>.005);
 const underway=createBoat('open');underway.a=0;underway.vx=6;underway.throttle=.5;run(underway,5,{windSpeed:6,windDirection:180});
 assert.ok(Math.abs(underway.telemetry.sway)<Math.abs(b.telemetry.sway));
});
test('creep lifts idle RPM slightly, both running engines vary independently, stopping reaches zero',()=>{
 const idle=engineState(90,-.5),creep=engineState(90,.5);let idleMin=Infinity,idleMax=0;
 idle.temperature=creep.temperature=70;
 for(let i=0;i<1200;i++){updateEngine(idle,0,0,1/120);updateEngine(creep,.08,0,1/120);if(i>600){idleMin=Math.min(idleMin,idle.rpm);idleMax=Math.max(idleMax,idle.rpm);assert.ok(creep.rpm>idle.rpm+20);}}
 assert.ok(idleMax-idleMin>15&&idleMax-idleMin<50);assert.ok(creep.rpm<900);
 creep.key='off';updateEngine(creep,0,0,1/120);assert.equal(creep.rpm,0);
});
test('camera gently widens under speed and recovers smoothly on slowdown',()=>{
 const b=createBoat('open');b.a=0;b.vx=14;b.throttle=1;step(b,{},1/120);assert.ok(b.cameraZoom<1&&b.cameraZoom>.99);run(b,6);
 assert.ok(b.cameraZoom<.93&&b.cameraZoom>=.60);const zoom=b.cameraZoom;b.vx=b.vy=b.w=0;b.throttle=0;step(b,{},1/120);assert.ok(b.cameraZoom>zoom&&b.cameraZoom<zoom+.003);
});
test('Y-boom geometry and its moving attachment share SI metres with the pier and boats',()=>{
 assert.ok(DOCKS[0].h>=2&&DOCKS[0].h<3);assert.ok(BUOY_SLIPS.length>=3);
 for(const q of YBOOMS){assert.ok(q.width>=.2&&q.width<=.3);assert.equal(q.length,10);assert.equal(q.y1,12.8);}
 const b=createBoat('open'),id=BOLLARDS.findIndex(q=>q.id==='Y1B'),initial=mooringPoint(b,id);
 b.booms[0].a+=.05;b.booms[0].w=.02;const moved=mooringPoint(b,id);
 assert.ok(Math.abs(moved.x-initial.x)>.4);assert.ok(Math.abs(moved.vx)>.1);assert.ok(Math.abs(boomPoint(b.booms[0]).y-b.booms[0].y1)<10.01);
 b.x=78;b.y=19;b.a=Math.PI/2;assert.ok(attachRope(b,'bow',id).ok);const before={vx:b.vx,vy:b.vy};step(b,{},1/120);assert.equal(b.maxTension,0);assert.equal(b.vx,before.vx);assert.equal(b.vy,before.vy);
});
test('ambient boats have actual cleat-to-bollard lines and yaw inside those constraints',()=>{
 const b=createBoat('open');b.x=150;b.y=100;
 for(const q of b.traffic)for(const r of q.ropes){const p=cleat(q,r.end),end=mooringPoint(b,r.bollard);assert.ok(end?.id);assert.ok(Math.abs(r.length-Math.hypot(p.x-end.x,p.y-end.y)-.12)<1e-8);}
 let motion=0,yaw=0,extension=0;
 for(let i=0;i<3600;i++){
  b.time+=1/120;trafficStep(b,{traffic:true,windSpeed:8,windDirection:90,waveHeight:.3,waveDirection:90},1/120);
  for(const q of b.traffic){motion=Math.max(motion,Math.hypot(q.x-q.homeX,q.y-q.homeY));yaw=Math.max(yaw,Math.abs(q.a-q.homeA));for(const r of q.ropes){const p=cleat(q,r.end),end=mooringPoint(b,r.bollard);extension=Math.max(extension,Math.hypot(p.x-end.x,p.y-end.y)-r.length);}}
 }
 assert.ok(motion>.05&&motion<1.3);assert.ok(yaw>.005&&yaw<.5);assert.ok(extension<.12);
});
test('removing ambient lines releases the boat instead of restoring its home position',()=>{
 const b=createBoat('open');b.x=150;b.y=100;const q=b.traffic[0];q.ropes=[];q.x+=2;
 for(let i=0;i<1200;i++){b.time+=1/120;trafficStep(b,{traffic:true},1/120);}
 assert.ok(Math.abs(q.x-q.homeX-2)<1e-9);assert.ok(Math.abs(q.w)<1e-9);
});
