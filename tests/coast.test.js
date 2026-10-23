import {sandPosition,sandNormal,faceSand} from './shore-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,bottomAt,BOLLARDS} from '../src/physics.js';
import {WORLD,ISLAND,islandOutline,shoreAt,MAP_STARTS} from '../src/world.js';
import {propellerContact} from '../src/ground.js';
import {anchorCommand} from '../src/rigging.js';
import {engineState,updateEngine} from '../src/craft.js';
import {throttleStep,angleDelta,rimPosition} from '../src/controls.js';
import {propWashCount} from '../src/render.js';
function run(b,t){for(let i=0;i<t*120;i++)step(b,{},1/120);}
test('Zegrze has metre-scale arms, Bug islands and progressively shallow beaches',()=>{
 assert.ok(WORLD.right-WORLD.left>16000);assert.ok(WORLD.bottom-WORLD.top>13000);
 assert.ok(bottomAt(ISLAND.x,ISLAND.y+25).depth<0);assert.ok(shoreAt(ISLAND.x,ISLAND.y+25).land);
 assert.ok(bottomAt(MAP_STARTS.canal.x,MAP_STARTS.canal.y).depth>2);assert.ok(!shoreAt(MAP_STARTS.canal.x,MAP_STARTS.canal.y).land);
 assert.ok(islandOutline().length>50);assert.ok(!shoreAt(400,210).land);
 const depths=[5,8,15,30].map(d=>{const p=sandPosition(d);return bottomAt(p.x,p.y).depth;});for(let i=1;i<depths.length;i++)assert.ok(depths[i]>depths[i-1]);
 assert.equal(bottomAt(MAP_STARTS.beach.x,MAP_STARTS.beach.y).material,'sand');assert.equal(bottomAt(80,6).material,'rock');
});
test('small tender can moor to shore tree while deeper cruiser grounds there',()=>{
 const tender=createBoat('beach',{profile:'tender'});tender.enginesRaised=true;
 const tree=BOLLARDS.findIndex(q=>q.kind==='tree');assert.equal(attachRope(tender,'bow',tree).ok,true);run(tender,1);assert.equal(tender.grounded,false);assert.ok(tender.underKeel>0);
 const large=createBoat('beach',{profile:'cruiser'});large.enginesRaised=true;run(large,.2);assert.ok(large.grounded);assert.ok(large.groundLoad>0);assert.ok(large.heave>0);
});
test('hull progressively rides up on the beach and loses speed without teleporting',()=>{
 const b=faceSand(createBoat('open'),1.5,17.5);b.enginesRaised=true;
 let maxStep=0,lastX=b.x,firstGroundX=null;for(let i=0;i<22*120;i++){step(b,{},1/120);maxStep=Math.max(maxStep,Math.abs(b.x-lastX));lastX=b.x;if(b.grounded&&firstGroundX===null)firstGroundX=shoreAt(b.x,b.y).distance;}
 assert.ok(firstGroundX>3&&firstGroundX<8);assert.ok(b.groundLoad>500);assert.ok(Math.hypot(b.vx,b.vy)<.08);assert.ok(shoreAt(b.x,b.y).distance>0);assert.ok(b.heave>.05);assert.ok(maxStep<.02);
});
test('island shore uses the same gradual grounding physics as the mainland',()=>{
 const b=createBoat('island');b.a=-Math.PI/2;b.vy=-1.3;b.enginesRaised=true;run(b,50);assert.ok(b.grounded);assert.ok(b.y>ISLAND.y+20);assert.ok(Math.hypot(b.vx,b.vy)<.1);
});
function abrasion(x,y,raised=false){const b=createBoat('open');b.x=x;b.y=y;b.a=0;b.vx=.2;b.enginesRaised=raised;const en=b.engines[0];en.gear=1;en.n=.6;for(let i=0;i<120;i++){b.time+=1/120;propellerContact(b,en,1/120,()=>{});}return en;}
test('rock strikes harm the propeller much more than sand abrasion',()=>{
 const p=sandPosition(5.5),sand=abrasion(p.x,p.y),rocks=abrasion(80,6.1);assert.ok(sand.propContact&&rocks.propContact);assert.ok(sand.propDamage>0&&sand.propDamage<2);assert.ok(rocks.propDamage>sand.propDamage*10);assert.ok(rocks.propDamage<=100);
});
test('a stationary nonrotating propeller does not abrade itself in sand',()=>{
 const b=createBoat('beach');b.a=0;for(let i=0;i<1200;i++){b.time+=1/120;propellerContact(b,b.engines[0],1/120,()=>{});}assert.equal(b.engines[0].propDamage,0);
});
test('twin props contact the bottom independently',()=>{
 const b=createBoat('open',{engineCount:2});b.x=80;b.y=6.1;b.a=0;b.vx=.3;
 for(const en of b.engines){en.gear=1;en.n=.5;propellerContact(b,en,1/120,()=>{});}
 assert.ok(b.engines[0].propDamage>0);assert.equal(b.engines[1].propDamage,0);
});
test('raised drive avoids prop strikes and produces no thrust',()=>{
 assert.equal(abrasion(80,6.1,true).propDamage,0);
 const b=createBoat('open');b.enginesRaised=true;b.throttle=1;run(b,4);assert.equal(b.engines[0].thrust,0);assert.equal(b.vx,0);assert.equal(b.vy,0);
});
test('a destroyed prop removes thrust while a partly damaged one loses efficiency',()=>{
 const healthy=engineState(60),hurt=engineState(60),lost=engineState(60);hurt.propDamage=50;lost.propDamage=100;
 for(let i=0;i<600;i++)for(const en of [healthy,hurt,lost])updateEngine(en,1,2,1/120);
 assert.ok(hurt.thrust>0&&hurt.thrust<healthy.thrust*.5);assert.equal(lost.thrust,0);
});
test('up selects a stable creep notch, opposite tap neutralizes before reverse',()=>{
 assert.equal(throttleStep(0,1),.08);assert.equal(throttleStep(.08,-1),0);assert.equal(throttleStep(0,-1),-.08);assert.equal(throttleStep(-.08,1),0);assert.ok(throttleStep(.5,1)>.5);
 const en=engineState(60);for(let i=0;i<600;i++)updateEngine(en,.08,0,1/120);assert.equal(propWashCount(en),1);const creep=en.thrust;
 for(let i=0;i<600;i++)updateEngine(en,1,0,1/120);assert.ok(en.thrust>creep*8);assert.ok(propWashCount(en)>=5);en.thrust=0;assert.equal(propWashCount(en),0);
});
test('rim angle follows circular drag continuously over the minus-pi boundary',()=>{
 assert.ok(Math.abs(angleDelta(179*Math.PI/180,-179*Math.PI/180)-2*Math.PI/180)<1e-9);
 assert.ok(Math.abs(angleDelta(-Math.PI/2,0)-Math.PI/2)<1e-9);
 const q=rimPosition(50,10,{left:0,top:0,width:100,height:100});assert.equal(q.radius,.8);assert.ok(Math.abs(q.angle+Math.PI/2)<1e-9);
});
test('windlass retrieves an offset anchor without the stiff-chain overload deadlock',()=>{
 for(const profile of ['runabout','cruiser']){
  const b=createBoat('open',{profile});anchorCommand(b,'lower',20);run(b,40);b.x+=8;anchorCommand(b,'raise');let peak=0,lastLength=b.anchor.length;
  for(let i=0;i<160*120&&b.anchor.mode!=='stowed';i++){
   step(b,{},1/120);peak=Math.max(peak,b.anchor.tension);assert.equal(b.anchor.broken,false);
   if(b.anchor.mode!=='stowed'){assert.ok(lastLength-b.anchor.length<=.35/120+.00001);lastLength=b.anchor.length;}
  }
  assert.equal(b.anchor.mode,'stowed',profile);assert.ok(peak<2210,`${profile}: ${peak}`);
 }
});
