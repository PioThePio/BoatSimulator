import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {createTowRig,towStep,trailerContact,trailerAction,hitchAction,placeTrailerBoat,carKey,selectCarGear,stepCarGear,toggleHandbrake,towAudioBoat,bodyPoint,SUV} from '../src/towing.js';
import {engineKey} from '../src/craft.js';
import {soundParameters} from '../src/sound.js';
import {cleat} from '../src/rigging.js';
import {mooringPoint} from '../src/marina.js';
import {towProfile} from '../src/tow-profile.js';
const dt=1/120;
function run(r,b,t,e={}){for(let i=0;i<t*120;i++){towStep(r,b,dt);step(b,e,dt);trailerContact(r,b,dt);}}
function setup(options={},config={}){const b=createBoat('service',{coldStart:true,...options}),r=createTowRig(b,config);return{b,r};}
function position(r,b,y){r.car.y=y;r.trailer.y=y+SUV.hitch+r.trailer.hitch;placeTrailerBoat(r,b);}
test('pedals rise linearly instead of instantly; handbrake remains applied after the key is released; Q/E traverses PRND',()=>{
 const {b,r}=setup();r.gas=r.brake=1;run(r,b,.1);assert.ok(r.pedal>.12&&r.pedal<.18);assert.ok(r.brakePedal>.19&&r.brakePedal<.25);r.gas=r.brake=0;run(r,b,.1);assert.equal(r.pedal,0);assert.equal(r.brakePedal,0);
 toggleHandbrake(r);run(r,b,.2);assert.equal(r.handbrake,true);toggleHandbrake(r);assert.equal(r.handbrake,false);
 for(const gear of ['R','N','D']){assert.ok(stepCarGear(r,1).ok);assert.equal(r.gear,gear);}assert.ok(stepCarGear(r,-1).ok);assert.equal(r.gear,'N');
});
test('loaded start raises the outboard and includes a real slack bow line; only SUV ignition has no alarm',()=>{
 const {r,b}=setup({}, {loaded:true});assert.equal(b.engines[0].trim,1);assert.equal(b.engines[0].trimTarget,1);assert.equal(b.ropes[0].end,'bow');const rope=b.ropes[0],p=cleat(b,'bow'),q=mooringPoint(b,rope.bollard);assert.ok(rope.length>Math.hypot(p.x-q.x,p.y-q.y));
 r.engine.key='ignition';assert.equal(soundParameters(towAudioBoat(r,b)).ignitionAlarm,false);b.engines[0].key='ignition';assert.equal(soundParameters(b).ignitionAlarm,true);
});
test('a loaded trailer can be parked/unhitched on land and the SUV drives alone; reattachment needs alignment and proximity',()=>{
 const {r,b}=setup({}, {loaded:true});assert.ok(hitchAction(r).ok);assert.equal(r.attached,false);const start={x:r.trailer.x,y:r.trailer.y};r.engine.key='running';r.gear='D';r.gas=.3;run(r,b,3);assert.ok(r.car.y<-34);assert.ok(Math.hypot(r.trailer.x-start.x,r.trailer.y-start.y)<.01);assert.ok(Math.abs(b.y-(r.trailer.y-Math.sin(-r.trailer.a)*r.trailer.offset))<.1);
 r.gas=0;r.brake=1;run(r,b,3);assert.equal(hitchAction(r).ok,false);const h=bodyPoint(r.trailer,r.trailer.hitch);Object.assign(r.car,{x:h.x+Math.cos(r.trailer.a)*SUV.hitch,y:h.y+Math.sin(r.trailer.a)*SUV.hitch,a:r.trailer.a,vx:0,vy:0,w:0});assert.ok(hitchAction(r).ok);assert.equal(r.attached,true);
});
test('a submerged trailer cannot be unhitched and a moving rig cannot be uncoupled',()=>{
 const water=setup({}, {atSlip:true});assert.equal(hitchAction(water.r).ok,false);const land=setup();land.r.car.vy=.3;assert.equal(hitchAction(land.r).ok,false);
});
test('rear drive loses rear grip while the front keeps steering; 4x4 can climb the same wet slip',()=>{
 const results=[];for(const awd of [false,true]){const {r,b}=setup({profile:'cabin'},{loaded:true,atSlip:true});r.awd=awd;r.engine.key='running';r.gear='D';r.gas=1;run(r,b,3);results.push(r);}
 assert.ok(results[0].frontGrip>results[0].rearGrip*2);assert.ok(results[0].slip>.2);assert.ok(results[1].car.y<results[0].car.y-1);assert.ok(results[1].speed>results[0].speed+.5);
});
test('soft ground plus overloaded spinning wheels creates ruts and bogging instead of asphalt-like acceleration',()=>{
 const {r,b}=setup({profile:'cabin',length:11,hullMass:8000},{loaded:true});r.car.x=r.trailer.x=182;position(r,b,-27);r.engine.key='running';r.gear='D';r.gas=1;run(r,b,8);assert.equal(r.surface,'sand');assert.ok(r.rearSink>.25);assert.equal(r.bogged,true);assert.ok(Math.abs(r.speed)<.2);
});
test('jackknifing damages SUV, trailer and hitch; a motionless parked angle does not keep adding damage',()=>{
 const {r,b}=setup({}, {loaded:true});r.trailer.a=r.car.a+1.32;const h=bodyPoint(r.car,-SUV.hitch);r.trailer.x=h.x-Math.cos(r.trailer.a)*r.trailer.hitch;r.trailer.y=h.y-Math.sin(r.trailer.a)*r.trailer.hitch;towStep(r,b,dt);assert.ok(r.carDamage>0&&r.trailerDamage>0&&r.hitchDamage>0);const damage=r.hitchDamage;run(r,b,.4);assert.equal(r.hitchDamage,damage);
});
test('restraints can be released during dry driving; a severe 50 km/h turn without the winch can throw the hull off and break its bow line',()=>{
 const {r,b}=setup({}, {loaded:true});position(r,b,-24);r.car.vy=r.trailer.vy=-14;placeTrailerBoat(r,b);assert.ok(trailerAction(r,b,'release').ok);assert.equal(r.secured,false);r.winch.attached=false;r.engine.key='running';r.gear='D';r.gas=1;r.steer=.59;run(r,b,8);assert.equal(r.boatLoaded,false);assert.ok(b.damage>0);assert.ok(b.grounded);assert.equal(b.ropes.length,0);
});
test('stern floats before bow, measurable bunk load declines, and deep release floats without teleporting away from its bow line',()=>{
 const partial=setup({}, {loaded:true,atSlip:true});trailerAction(partial.r,partial.b,'release');run(partial.r,partial.b,5);assert.ok(partial.b.trailerSupport.kg>20&&partial.b.trailerSupport.kg<400);assert.ok(partial.b.trailerSupport.sternFloat>.95);assert.ok(partial.b.trailerSupport.bowFloat<.9);assert.ok(partial.b.pitch<partial.r.trailer.pitch*.6);
 const floating=setup({}, {loaded:true,atSlip:true});position(floating.r,floating.b,11);trailerAction(floating.r,floating.b,'release');run(floating.r,floating.b,7,{windSpeed:5,windDirection:90});assert.ok(floating.b.trailerSupport.kg<5);assert.equal(floating.r.boatLoaded,false);assert.equal(floating.b.ropes.length,1);const rope=floating.b.ropes[0],p=cleat(floating.b,'bow'),q=mooringPoint(floating.b,rope.bollard);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<=rope.length+.10);assert.equal(floating.b.damage,0);
});
test('boat engines can start on a trailer; a dry intake heats faster than a submerged cooling intake',()=>{
 const {r,b}=setup({}, {loaded:true});assert.ok(engineKey(b,0,'ignition').ok);assert.ok(engineKey(b,0,'start').ok);run(r,b,120);assert.equal(b.engines[0].key,'running');assert.ok(b.engines[0].temperature>105);assert.equal(b.engines[0].cooling,0);assert.equal(b.damage,0);
});
test('a fast bow landing breaks the bow stop and can hit the SUV; gentle approach keeps the stop intact',()=>{
 const results=[];for(const speed of [.7,4]){const {r,b}=setup({}, {atSlip:true}),p=bodyPoint(r.trailer,r.trailer.offset);Object.assign(b,{x:p.x,y:p.y+1.8,a:r.trailer.a,vy:-speed});run(r,b,3);results.push({r,b});}
 assert.ok(results[0].b.damage<2);assert.equal(results[0].r.postBroken,false);assert.ok(results[1].b.damage>results[0].b.damage+20);assert.equal(results[1].r.postBroken,true);assert.ok(results[1].r.carDamage>0);assert.ok(results[1].b.impacts.some(q=>q.target==='suv'));
});
test('SUV reversing into an afloat hull transfers impulse and moves the boat',()=>{
 const {r,b}=setup({}, {atSlip:true});Object.assign(b,{x:124.5,y:14.4,a:-Math.PI/2});r.gear='N';r.car.vy=r.trailer.vy=1;run(r,b,1);assert.ok(b.y>14.5);assert.ok(b.impacts.some(q=>q.target==='suv'));assert.ok(r.carDamage>0);
});
test('side profile rotates whole SUV, trailer and hull by their independent physical pitch angles',()=>{
 const {r,b}=setup({}, {loaded:true,atSlip:true});trailerAction(r,b,'release');run(r,b,4);const svg=towProfile(r,b);for(const name of ['suv','trailer','boat'])assert.match(svg,new RegExp(`data-profile-body="${name}"[^>]+transform="[^"]+rotate`));assert.ok(Math.abs(r.car.pitch-r.trailer.pitch)>.01);assert.ok(Math.abs(b.pitch-r.trailer.pitch)>.04);assert.match(svg,/kg na podporach/);
});
