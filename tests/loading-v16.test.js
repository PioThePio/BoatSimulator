import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {createTowRig,towStep,trailerContact,trailerAction,placeTrailerBoat,SUV} from '../src/towing.js';
import {bodyPoint,bodyLocal} from '../src/tow-geometry.js';
import {loadingScoreStep,connectWinch} from '../src/trailer-winch.js';
import {waterMotionSamples} from '../src/boat-effects.js';
import {PARKING,PARKING_SPACES,SERVICE_BAYS,SAND_PRACTICE,bottomAt,environment,waveAt} from '../src/world.js';
import {serviceStatus,requestRepair} from '../src/service.js';
import {groundContact,propellerContact} from '../src/ground.js';
import {ropeLoadState} from '../src/rope-load.js';
import {soundParameters} from '../src/sound.js';
import {towAudioBoat} from '../src/towing.js';
import {trafficStep} from '../src/traffic.js';
const dt=1/120;
function run(r,b,t,e={}){for(let i=0;i<t*120;i++){towStep(r,b,dt);step(b,e,dt);trailerContact(r,b,dt);}}
function land(){const b=createBoat('lake'),r=createTowRig(b,{loaded:true});return{b,r};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

test('yard is level, parking spaces avoid the slip corridor and service bays; sand is outside the yard',()=>{
 assert.ok(Math.abs(bottomAt(110,-40).depth-bottomAt(160,-16).depth)<1e-8);assert.equal(overlap(PARKING,SAND_PRACTICE),false);
 const corridor={x:121,y:-48,w:7,h:40};for(const p of PARKING_SPACES){assert.equal(overlap(p,corridor),false);for(const bay of SERVICE_BAYS)assert.equal(overlap(p,bay),false);}
 const {r,b}=land();assert.ok(Math.abs(r.car.pitch)<.001);assert.ok(r.trailer.axleX<0);const big=createTowRig(createBoat('lake',{profile:'cabin'}));assert.equal(big.trailer.axles,2);assert.ok(big.trailer.axleX<-.1*big.boatLength);assert.ok(b.spec.length>0);
});

test('unsecured boat stays supported at rest without either bow restraint; gentle driving and braking do not throw it off',()=>{
 const {r,b}=land();trailerAction(r,b,'release');r.winch.attached=false;b.ropes=[];run(r,b,6,{windSpeed:6,currentSpeed:.8,waveHeight:.3});let p=bodyLocal(r.trailer,b);assert.ok(Math.abs(p.x-r.trailer.offset)<.03&&Math.abs(p.y)<.02);assert.equal(b.damage,0);assert.ok(b.trailerSupport.kg>b.spec.mass*.98);
 r.engine.key='running';r.gear='D';r.gas=.25;r.steer=.1;run(r,b,4);r.gas=0;r.brake=.35;run(r,b,2);p=bodyLocal(r.trailer,b);assert.ok(Math.abs(p.x-r.trailer.offset)<.10&&Math.abs(p.y)<.08);assert.equal(r.boatLoaded,true);assert.equal(b.damage,0);
});

test('SUV pulls an empty tandem trailer up the default wet slip in rear drive; tyre slip produces its own noise',()=>{
 const b=createBoat('lake',{profile:'cabin'}),r=createTowRig(b,{atSlip:true,slipCarY:9});b.x=80;b.y=110;r.engine.key='running';r.gear='D';r.gas=1;let noise=0;for(let i=0;i<480;i++){towStep(r,b,dt);step(b,{},dt);trailerContact(r,b,dt);noise=Math.max(noise,soundParameters(towAudioBoat(r,b)).tyres);}
 assert.equal(r.trailer.axles,2);assert.ok(r.car.y<5);assert.ok(r.speed>1);assert.ok(noise>.01);r.engine.key='off';r.gas=r.pedal=r.tyreSlip=0;assert.equal(soundParameters(towAudioBoat(r,b)).tyres,0);
});

test('winch hauls on dry carpeted bunks, stops against the padded roller without hull damage, and release stops reeling immediately',()=>{
 const {r,b}=land();trailerAction(r,b,'release');b.ropes=[];r.winch.attached=false;b.x-=Math.cos(b.a)*.6;b.y-=Math.sin(b.a)*.6;assert.ok(connectWinch(r,b).ok);run(r,b,1);assert.ok(bodyLocal(r.trailer,b).x-r.trailer.offset<-.5);
 r.winch.control=-1;run(r,b,12);const p=bodyLocal(r.trailer,b);assert.ok(p.x-r.trailer.offset>-.08&&p.x-r.trailer.offset<.10);assert.ok(r.winch.tension>1000);assert.ok(r.winch.capacity>5000);assert.equal(b.damage,0);assert.equal(r.postBroken,false);
 r.winch.control=0;const length=r.winch.length;run(r,b,.5);assert.equal(r.winch.length,length);assert.equal(r.winch.rate,0);
});

test('wet approach meets the supporting cradle, centres a small offset, and freezes its score and achieved pose when secured',()=>{
 const b=createBoat('service'),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset-.8,.20);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a+.06});assert.ok(connectWinch(r,b).ok);r.winch.control=-1;run(r,b,12);const local=bodyLocal(r.trailer,b);
 assert.ok(Math.abs(local.y)<.15);assert.ok(Math.abs(local.x-r.trailer.offset)<.1);assert.ok(b.trailerSupport.load>100);assert.ok(r.loadingScore.quality>80);assert.equal(b.damage,0);const score=r.loadingScore.quality;
 b.engines[0].key='running';r.winch.control=0;const pose={x:b.x,y:b.y,a:b.a};assert.ok(trailerAction(r,b,'secure').ok);assert.ok(Math.hypot(b.x-pose.x,b.y-pose.y)<1e-8);assert.ok(Math.abs(b.a-pose.a)<1e-8);assert.equal(b.engines[0].key,'running');assert.equal(r.loadingScore.complete,true);run(r,b,.2);assert.equal(r.loadingScore.quality,score);r.boatLoaded=r.secured=false;const back=bodyPoint(r.trailer,r.trailer.offset-b.spec.length);Object.assign(b,{x:back.x,y:back.y,vx:0,vy:0});loadingScoreStep(r,b,dt);assert.equal(r.loadingScore.complete,false);assert.equal(r.loadingScore.previous,score);b.vy=-.2;loadingScoreStep(r,b,dt);assert.equal(r.loadingScore.active,true);
});

test('winch has a real attachment range and will not retrieve a boat across the lake',()=>{
 const {r,b}=land();connectWinch(r,b);b.x+=30;assert.equal(connectWinch(r,b).ok,false);assert.equal(r.winch.attached,false);
});

test('dry supports have neither water current, orbital waves, drift arrows nor a water wake after releasing straps',()=>{
 const {r,b}=land(),weather={currentSpeed:.9,windSpeed:7,waveHeight:.4};trailerAction(r,b,'release');run(r,b,1,weather);assert.deepEqual(environment(0,weather,b.x,b.y).current,{x:0,y:0});assert.equal(waveAt(b.x,b.y,1,weather).eta,0);assert.deepEqual(waterMotionSamples(b,weather),[]);assert.equal(b.wake.length,0);
});

test('drift arrows track ground movement, separately from water passing a moored hull',()=>{
 const b=createBoat('lake');b.a=0;b.vx=.05;const samples=waterMotionSamples(b,{currentSpeed:.5,currentDirection:90});assert.equal(samples.length,3);assert.ok(samples[1].ground.x>0&&samples[1].relative.x<0);
 b.vx=0;b.w=.1;const rotating=waterMotionSamples(b,{});assert.ok(rotating[0].ground.y<0&&rotating[2].ground.y>0);
});

test('both land service bays repair a secured boat without a shore line and refuse moving or misparked rigs',()=>{
 for(const bay of SERVICE_BAYS){const {r,b}=land(),dx=bay.x+bay.w/2-r.car.x;r.car.x+=dx;r.trailer.x+=dx;placeTrailerBoat(r,b);b.damage=35;b.engines[0].propDamage=20;assert.ok(serviceStatus(b).ok);assert.ok(requestRepair(b).ok);run(r,b,15);assert.equal(b.damage,0);assert.equal(b.engines[0].propDamage,0);
  r.car.vx=.3;assert.equal(serviceStatus(b).ok,false);r.car.vx=0;r.car.x+=15;assert.equal(serviceStatus(b).ok,false);
 }
});

test('sand contact spreads load on broad flat and RIB hulls; the same hard-rock strike is not discounted',()=>{
 function hit(type,rock=false){const b=createBoat('beach');b.spec.hullType=type;b.spec.draft=.8;b.a=0;b.vx=rock?.5:2.5;if(rock){b.x=80;b.y=6;}groundContact(b,{eta:0},dt,()=>{});assert.equal(b.grounded,true);return b.damage;}
 const v=hit('v'),rib=hit('rib'),flat=hit('flat');assert.ok(v>rib&&rib>flat&&flat>=0);assert.equal(hit('v',true),hit('flat',true));
});

test('airboat has one dry air propeller, no reverse thrust or prop walk, and its rudders swing the stern into broad sideslip',()=>{
 const b=createBoat('lake',{profile:'swamp',engineCount:2});b.a=0;b.throttle=1;b.steer=.5;for(let i=0;i<2400;i++){step(b,{},dt);b.x=80;b.y=110;}assert.equal(b.engines.length,1);assert.equal(b.spec.propulsion,'air');assert.equal(b.engines[0].propWalk,0);assert.equal(b.engines[0].ventilation,0);assert.ok(b.telemetry.surge>1.5&&Math.abs(b.telemetry.sway)>1.5&&b.w>.2);
 b.x=7;b.y=150;b.vx=1;propellerContact(b,b.engines[0],dt,()=>{});assert.equal(b.engines[0].propContact,false);assert.equal(b.engines[0].propDamage,0);b.throttle=-1;for(let i=0;i<600;i++){step(b,{},dt);b.x=80;b.y=110;}assert.equal(b.engines[0].thrust,0);
});

test('moored traffic has driven heave, heel and yaw within its rope constraints, and no motion on calm water',()=>{
 const calm=createBoat('lake'),rough=createBoat('lake');let heave=0,roll=0,yaw=0;for(let i=0;i<1200;i++){calm.time+=dt;rough.time+=dt;trafficStep(calm,{traffic:true},dt);trafficStep(rough,{traffic:true,windSpeed:7,waveHeight:.3,waveDirection:90},dt);for(const q of rough.traffic){heave=Math.max(heave,Math.abs(q.heave));roll=Math.max(roll,Math.abs(q.roll));yaw=Math.max(yaw,Math.abs(q.a-q.homeA));}}
 assert.ok(heave>.12&&roll>.04&&yaw>.02&&yaw<.5);assert.equal(calm.traffic[0].heave,0);assert.equal(calm.traffic[0].roll,0);
});

test('rope-load indication measures tension independently of whether a knaga is attached to the selected poler',()=>{
 const S=createBoat('lake').spec,r={tension:0};assert.equal(ropeLoadState(r,S).tone,'slack');r.tension=S.lineBreak*.25;assert.equal(ropeLoadState(r,S).tone,'loaded');assert.equal(ropeLoadState(r,S).percent,25);r.tension=S.lineBreak*.85;r.blocked=true;assert.equal(ropeLoadState(r,S).tone,'danger');assert.match(ropeLoadState(r,S).title,/za ciężko/);
});

test('airboat on locked supports steers its rudders and transmits the air thrust and moment to the rig',()=>{
 const b=createBoat('lake',{profile:'swamp'}),r=createTowRig(b,{loaded:true});b.engines[0].key='running';b.throttle=1;b.steer=.4;for(let i=0;i<600;i++)step(b,{},dt);assert.ok(b.actualSteer>.39);assert.ok(b.engines[0].thrust>500);assert.ok(Math.abs(r.ropeForce.torque)>100);assert.equal(b.engines[0].propDamage,0);assert.ok(b.engines[0].cooling>.6);
});
