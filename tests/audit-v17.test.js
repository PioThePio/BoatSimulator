import {sandPosition,sandNormal} from './shore-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditResults,swim,tow} from '../scripts/audit-v17.mjs';
import {createBoat,step} from '../src/physics.js';
import {CRAFTS,engineState,updateEngine} from '../src/craft.js';
import {createTowRig,towStep,trailerContact,trailerAction,placeTrailerBoat,hitchAction} from '../src/towing.js';
import {bodyPoint,bodyLocal} from '../src/tow-geometry.js';
import {launchVerticalStep,trailerBoatContact} from '../src/trailer-support.js';
import {loadingScoreStep} from '../src/trailer-winch.js';
import {vehicleSurface,curbHeight} from '../src/vehicle-terrain.js';
import {PARKING,SERVICE_STATION,bottomAt,waveAt} from '../src/world.js';
import {waterMotionSamples} from '../src/boat-effects.js';
import {groundContact,propellerContact} from '../src/ground.js';
const a=auditResults(),dt=1/120;

for(const drive of ['outboard','zdrive','inboard','jet','air'])test(`${drive}: powered steering creates physical translation/yaw; stationary neutral cannot turn`,()=>{
 const d=a.drives[drive];assert.ok(d.powered.surge>.15);assert.ok(d.powered.yaw>.02);assert.ok(Math.abs(d.powered.sway)>.02);assert.equal(d.neutral.yaw,0);assert.equal(d.neutral.speed,0);
 if(drive==='air')assert.equal(d.reverse.thrust,0);else assert.ok(d.reverse.surge<-.1);
});
test('shaft rudder wash turns from rest but is weaker than a vectored drive, especially astern',()=>{
 assert.ok(a.drives.outboard.powered.yaw>a.drives.inboard.powered.yaw*2);
 assert.ok(Math.abs(a.drives.inboard.reverse.yaw)<Math.abs(a.drives.outboard.reverse.yaw)*.4);
});
test('single-screw reverse prop walk applies a stern force and yaw moment; fixed shaft has the strongest walk, jets and fans have none',()=>{
 assert.ok(a.walk.inboard.force<a.walk.outboard.force*1.3);assert.ok(a.walk.inboard.moment>0);assert.ok(a.walk.inboard.yaw>a.walk.outboard.yaw);assert.ok(a.walk.outboard.sway<0);
 for(const drive of ['jet','air']){assert.equal(a.walk[drive].force,0);assert.equal(Math.abs(a.walk[drive].moment),0);}
});
test('neutral reduces moving-hull steering; a coasting waterjet loses nozzle steering completely',()=>{
 for(const drive of ['outboard','zdrive','inboard','jet']){
  function run(power){const b=createBoat('lake',{profile:drive==='jet'?'pwc':'cabin',propulsion:drive});b.vx=.7;b.steer=b.spec.maxSteer;b.throttle=power;swim(b,4);return Math.abs(b.w);}
  const neutral=run(0),powered=run(.15);assert.ok(powered>neutral*1.5,`${drive}: ${neutral} vs ${powered}`);if(drive==='jet')assert.equal(neutral,0);else assert.ok(neutral>0);
 }
});
test('ventilation raises RPM, cuts thrust and restores wet grip gradually instead of jumping to full thrust',()=>{
 const v=a.ventilation;assert.ok(v.aired.rpm>v.wet.rpm+300);assert.ok(v.aired.thrust<v.wet.thrust*.5);assert.ok(v.firstRecovery.thrust>v.aired.thrust&&v.firstRecovery.thrust<v.wet.thrust*.5);assert.ok(v.recovered.thrust>v.wet.thrust*.97);assert.ok(v.recovered.ventilation<.002);
 assert.ok(a.trim[.65].rpm>a.trim[.1].rpm+200);assert.ok(a.trim[.65].speed<a.trim[.1].speed*.7);assert.ok(a.trim[.65].thrust<a.trim[.1].thrust*.85);
});
test('a waterjet that inhales air loses pump grip, flares RPM and recovers after its inlet is submerged',()=>{
 const wet=engineState(170),aired=engineState(170);wet.gear=aired.gear=1;
 for(let i=0;i<600;i++){updateEngine(wet,.65,4,dt,0,{jet:true,immersion:1});updateEngine(aired,.65,4,dt,0,{jet:true,immersion:.4});}
 assert.ok(aired.rpm>wet.rpm+250&&aired.thrust<wet.thrust*.5);const low=aired.thrust;
 for(let i=0;i<240;i++)updateEngine(aired,.65,4,dt,0,{jet:true,immersion:1});assert.ok(aired.thrust>low*2);
});
test('wave exposure really removes propeller grip and its return is gradual',()=>{
 const b=createBoat('lake',{powers:[150]});b.throttle=.65;swim(b,8);const en=b.engines[0],wet=en.thrust;
 // A wave trough at a fixed hull attitude samples the actual disk geometry.
 let low=1,high=0,minThrust=Infinity;const e={waveHeight:.6,waveDirection:90};
 b.heave=.24;
 for(let i=0;i<600;i++){b.time+=dt;propellerContact(b,en,dt,()=>{},e);updateEngine(en,.65,4,dt,0,{immersion:en.immersion,intake:en.intake});low=Math.min(low,en.immersion);high=Math.max(high,en.ventilation);minThrust=Math.min(minThrust,en.thrust);}
 assert.ok(low<.7&&high>.1);assert.ok(wet>0);assert.ok(minThrust<wet*.5);
});
test('bilge water adds physical mass/draft, slows acceleration and delays planing; manual pump restores mass/draft',()=>{
 const q=a.bilge;assert.equal(q.flooded.mass-q.before.mass,250);assert.ok(q.flooded.draft>q.before.draft+.03);
 assert.ok(q.performance.flooded.speed<q.performance.empty.speed*.94);assert.ok(q.performance.flooded.planing<q.performance.empty.planing*.7);
 assert.ok(q.manual.removed>39.9);assert.ok(Math.abs(q.manual.mass-q.before.mass)<.02);assert.ok(Math.abs(q.manual.draft-q.before.draft)<.00001);
 assert.equal(q.auto.started,true);assert.equal(q.auto.running,false);assert.ok(q.auto.level<=.04);
});
test('guide contacts gradually centre a mild approach, while a grossly skewed approach cannot secure itself and receives a low score',()=>{
 const [good,,bad]=a.guides;assert.ok(Math.abs(good.local.y)<good.initialOffset);assert.ok(good.angle<.06);assert.equal(good.secured,true);assert.equal(good.damage,0);
 assert.equal(bad.secured,false);assert.ok(bad.angle>.2||Math.abs(bad.local.y)>.5);assert.ok(bad.score<good.score*.6);
});
test('guides cannot attract a floating hull with no bunk contact and cannot move a supported hull inside their clearance',()=>{
 const b=createBoat('service'),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset,.25);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a,heave:1});launchVerticalStep(r,b,{},dt);assert.equal(b.trailerSupport.load,0);
 const pos={x:b.x,y:b.y},vel={x:b.vx,y:b.vy};trailerBoatContact(r,b,dt);assert.deepEqual({x:b.x,y:b.y},pos);assert.deepEqual({x:b.vx,y:b.vy},vel);
 const dry=createBoat('lake'),land=createTowRig(dry,{loaded:true,misalignment:0});trailerAction(land,dry,'release');dry.ropes=[];land.winch.attached=false;
 tow(land,dry,2);assert.ok(dry.trailerSupport.load>1000);assert.ok(dry.trailerSupport.samples.every(q=>q.guideForce===0));
});
test('dry winch hauls against bunk friction, stops at the bow roller without damage and holds its exact paid-out length on release',()=>{
 assert.ok(a.winch.before<-.5&&Math.abs(a.winch.after)<.08);assert.ok(a.winch.tension>1000&&a.winch.tension<=a.winch.capacity);assert.equal(a.winch.lengthChangeAfterRelease,0);assert.equal(a.winch.damage,0);
});
test('score measures heading, lateral tracking, stop position and impact penalty independently',()=>{
 function score({y=0,x=0,angle=0,damage=0}={}){const b=createBoat('service'),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset+x,y);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a+angle});r.loadingScore.active=true;r.loadingScore.startDamage=0;b.damage=damage;loadingScoreStep(r,b,0);return r.loadingScore.quality;}
 const perfect=score();assert.equal(perfect,100);for(const options of [{y:.7},{x:-.7},{angle:.3},{damage:10}])assert.ok(score(options)<perfect-15);
});
test('dry support, partial flotation and full flotation exchange load continuously without launch damage',()=>{
 const loads=a.launch.map(q=>q.loadKg);assert.ok(loads[0]>1100&&loads[1]<loads[0]&&loads[2]<loads[1]&&loads[3]<1);assert.ok(a.launch[2].sternFloat>.95&&a.launch[2].bowFloat<.8);assert.equal(a.launch[3].loaded,false);assert.ok(a.launch.every(q=>q.damage===0));
});
test('SUV pulls empty tandem and larger trailers up the wet ramp in RWD; AWD improves climb and actual wheelspin has sound',()=>{
 for(let i=0;i<a.suv.length;i+=2){const rear=a.suv[i],all=a.suv[i+1];assert.ok(rear.travel>4&&rear.speed>3);assert.ok(all.travel>rear.travel+4);assert.ok(rear.noise>.01);}
 assert.equal(a.suv[0].axles,2);assert.ok(a.suv[0].emptyMass<1000);
});
test('parking and entire slip width join continuously; yard is flat and the slope starts at the drawn ramp entrance',()=>{
 const r=SERVICE_STATION.slip,level=bottomAt(110,-30).depth;assert.equal(bottomAt(160,-20).depth,level);
 for(const x of [120.5,121.05,121.5,124.5,127.9,128.5])assert.ok(Math.abs(bottomAt(x,r.y-.001).depth-bottomAt(x,r.y+.001).depth)<.001);
 const slope=(bottomAt(124.5,-6).depth-bottomAt(124.5,-7).depth);assert.ok(Math.abs(slope-Math.tan(r.angle*Math.PI/180))<1e-8);
 assert.equal(curbHeight(124.5,r.y),0);assert.equal(curbHeight(PARKING.x,-30),.07);
});
test('outboard and Z-drive loaded starts keep every engine fully raised throughout an actual reverse journey from parking to slip',()=>{
 for(const profile of Object.keys(CRAFTS).filter(id=>!['pwc','swamp'].includes(id)))for(const propulsion of ['outboard','zdrive'].filter(q=>CRAFTS[profile].propulsions.includes(q))){
  const b=createBoat('lake',{profile,propulsion,engineCount:2}),r=createTowRig(b,{loaded:true,misalignment:0});r.engine.key='running';r.gear='R';r.gas=.22;
  assert.ok(b.engines.every(e=>e.trim===1&&e.trimTarget===1));let clearance=Infinity;
  for(let i=0;i<6000&&r.car.y<3;i++){towStep(r,b,dt);step(b,{},dt);trailerContact(r,b,dt);clearance=Math.min(clearance,...b.engines.map(e=>e.propClearance));}
  assert.ok(r.car.y>=3,`${profile}/${propulsion} completes the journey`);assert.ok(clearance>.1,`${profile}/${propulsion}: ${clearance}`);assert.ok(b.engines.every(e=>e.trim===1&&e.propDamage===0));assert.equal(b.damage,0);
 }
});
test('grass and sand have measurably higher rolling resistance than the paved yard',()=>{
 function coast(x){const b=createBoat('lake'),r=createTowRig(b);hitchAction(r);Object.assign(r.car,{x,y:-30,a:-Math.PI/2,vx:0,vy:-1.5});r.gear='N';for(let i=0;i<120;i++)towStep(r,b,dt);return Math.hypot(r.car.vx,r.car.vy);}
 const paved=coast(137),grass=coast(170),sand=coast(182);assert.ok(paved>grass+.2&&grass>sand+.3,`${paved}, ${grass}, ${sand}`);
});
test('a low parking curb changes wheel height, SUV pitch and its physical coasting speed',()=>{
 function cross(x){const b=createBoat('lake'),r=createTowRig(b);hitchAction(r);Object.assign(r.car,{x,y:-25,a:0,vx:1.4,vy:0});r.gear='N';let pitch=0;for(let i=0;i<300;i++){towStep(r,b,dt);pitch=Math.max(pitch,Math.abs(r.car.pitch));}return{speed:Math.hypot(r.car.vx,r.car.vy),pitch};}
 const curb=cross(162),flat=cross(140);assert.ok(curb.pitch>.01);assert.ok(curb.speed<flat.speed-.1);assert.ok(vehicleSurface(165,-25).curb>0);
});
test('mooring lines allow wave/current/wind-driven movement and yaw with dynamic slack and tension; calm boats stay still',()=>{
 const [calm,rough]=a.mooring;assert.equal(calm.displacement,0);assert.equal(calm.tensionMax,0);assert.ok(rough.displacement>.05&&rough.displacement<1.5);assert.ok(rough.yaw>.02&&rough.yaw<.5);assert.ok(rough.heave>.1);assert.equal(rough.tensionMin,0);assert.ok(rough.tensionMax>100);
});
test('hull water effects follow current and wave-relative point velocity, including lateral drift; drifting with current produces no false forward motion',()=>{
 const b=createBoat('lake');b.vy=.3;let samples=waterMotionSamples(b,{});assert.ok(samples.every(q=>q.relative.x===0&&q.relative.y===.3));
 const e={currentSpeed:.4,currentDirection:90};b.vx=.4;b.vy=0;samples=waterMotionSamples(b,e);assert.ok(samples.every(q=>Math.hypot(q.relative.x,q.relative.y)<1e-8));
 b.vx=0;samples=waterMotionSamples(b,e);assert.ok(samples.every(q=>q.relative.x<-.39));
 const waves={waveHeight:.3,waveDirection:90},q=waterMotionSamples(b,waves)[1],w=waveAt(q.p.x,q.p.y,b.time,waves);assert.ok(Math.abs(q.relative.x+.65*w.vx)<1e-8);
});
test('sand gives RIB and flat hulls less low-speed damage, but high-speed entry remains damaging',()=>{
 function damage(type,speed){const b=createBoat('beach');Object.assign(b,sandPosition(5));b.spec.hullType=type;b.spec.draft=.8;b.a=0;b.vx=speed;groundContact(b,{eta:0},dt,()=>{});return b.damage;}
 for(const type of ['rib','flat']){assert.ok(damage(type,2.5)<damage('v',2.5));assert.ok(damage(type,.3)<.001);assert.ok(damage(type,12)>damage(type,2.5)+5);}
});
test('swamp fan/air rudders generate broad sideslip and carry world momentum after throttle release instead of acting as an outboard',()=>{
 const s=a.swamp;assert.ok(Math.abs(s.powered.sway)>.7&&s.powered.yaw>.8);assert.ok(s.halfSecond.speed>s.powered.speed*.8);assert.ok(Math.abs(s.directionChangeHalfSecond)<.15);assert.ok(s.afterFive.speed>.5&&s.afterFive.speed<s.halfSecond.speed*.6);assert.equal(s.halfSecond.thrust,0);assert.ok(s.draft<.17);
});
test('swamp boat traverses water shallower than a submerged propeller and never incurs propeller-bottom damage',()=>{
 const b=createBoat('beach',{profile:'swamp'});Object.assign(b,sandPosition(2.5));b.a=Math.atan2(-sandNormal.x,sandNormal.y);b.throttle=1;const initial={x:b.x,y:b.y};assert.ok(bottomAt(b.x,b.y).depth<.23);
 for(let i=0;i<1200;i++)step(b,{},dt);
 assert.ok((b.x-initial.x)*sandNormal.y-(b.y-initial.y)*sandNormal.x>1);assert.equal(b.engines[0].propDamage,0);assert.equal(b.engines[0].propContact,false);assert.ok(b.damage<1);
});
