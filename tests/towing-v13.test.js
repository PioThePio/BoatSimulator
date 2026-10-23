import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope} from '../src/physics.js';
import {createTowRig,SUV,towStep,trailerContact,trailerImmersion,trailerAction,trailerBollardIndex,bodyPoint,trailerPost,carKey,selectCarGear,placeTrailerBoat} from '../src/towing.js';
import {mooringPoint,boomLoad} from '../src/marina.js';
import {bottomAt,setSlipAngle,SERVICE_STATION} from '../src/world.js';
import {bunkZ} from '../src/tow-geometry.js';
const dt=1/120;
function run(r,b,seconds){for(let i=0;i<seconds*120;i++){towStep(r,b,dt);step(b,{},dt);trailerContact(r,b,dt);}}
function ready(options={},rigOptions={}){const b=createBoat('service',{coldStart:true,...options}),r=createTowRig(b,rigOptions);carKey(r,1);carKey(r,1);run(r,b,1);return{b,r};}
function shift(r,b,dy){r.car.y+=dy;r.trailer.y+=dy;if(r.boatLoaded)placeTrailerBoat(r,b);}
test('trailers scale with beam, length and loaded mass; a transported boat stays on its supports without beach damage',()=>{
 let previous=0;
 for(const profile of ['pwc','runabout','cabin','cruiser']){const {b,r}=ready({profile},{loaded:true});assert.ok(r.trailer.beam>b.spec.beam);assert.ok(r.trailer.hitch>b.spec.length*.5);assert.ok(r.trailer.mass>previous);previous=r.trailer.mass;
  selectCarGear(r,'R');r.gas=.3;run(r,b,3);const p=bodyPoint(r.trailer,r.trailer.offset);assert.ok(Math.hypot(b.x-p.x,b.y-p.y)<1e-9);assert.equal(b.a,r.trailer.a);assert.equal(b.damage,0);assert.equal(b.grounded,false);assert.equal(b.engines[0].key,'off');
  assert.ok(Math.abs((b.heave-b.spec.draft)-bunkZ(r.trailer,r.trailer.offset))<1e-9);
 }
});
test('SUV ignition needs P/N, takes time to start and the left turn switches ignition off',()=>{
 const b=createBoat('lake',{coldStart:true}),r=createTowRig(b);assert.equal(r.engine.key,'off');carKey(r,1);assert.equal(r.engine.key,'ignition');selectCarGear(r,'R');assert.equal(carKey(r,1).ok,false);selectCarGear(r,'N');assert.ok(carKey(r,1).ok);run(r,b,.4);assert.equal(r.engine.key,'starting');run(r,b,.6);assert.equal(r.engine.key,'running');assert.ok(r.engine.rpm>220);run(r,b,.6);assert.ok(r.engine.rpm>650);carKey(r,-1);run(r,b,1);assert.equal(r.engine.key,'off');assert.ok(r.engine.rpm<1);
});
test('load reduces acceleration and extends braking distance; changing direction at speed is refused',()=>{
 const states=[false,true].map(loaded=>ready({}, {loaded}));
 for(const {r,b}of states){selectCarGear(r,'R');r.gas=.15;run(r,b,3);assert.equal(selectCarGear(r,'D').ok,false);}
 assert.ok(Math.abs(states[0].r.speed)>Math.abs(states[1].r.speed)*1.25);
 const distances=[];
 for(const {r,b}of states){r.car.y=-30;r.trailer.y=r.car.y+SUV.hitch+r.trailer.hitch;r.car.vx=r.trailer.vx=0;r.car.vy=r.trailer.vy=3;r.gas=0;r.brake=1;r.gear='N';const y=r.car.y;run(r,b,2);assert.ok(Math.abs(r.speed)<.03);distances.push(r.car.y-y);}
 assert.ok(distances[1]>distances[0]*1.01,distances.join(','));
});
test('front steering turns clockwise forward and counterclockwise in reverse; hitch stays coincident',()=>{
 for(const gear of ['D','R']){const {r,b}=ready();selectCarGear(r,gear);r.gas=.05;r.steer=.3;run(r,b,5);const p=bodyPoint(r.car,-SUV.hitch),q=bodyPoint(r.trailer,r.trailer.hitch);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<.002);assert.ok(gear==='D'?r.car.a>-Math.PI/2:r.car.a<-Math.PI/2);assert.ok(Math.abs(r.car.a-r.trailer.a)>.1);}
});
test('released transport restraints do not launch a dry boat; immersed supports let it float without hull damage',()=>{
 const {b,r}=ready({}, {loaded:true});assert.ok(trailerAction(r,b,'release').ok);run(r,b,2);assert.equal(r.boatLoaded,true);assert.equal(b.damage,0);assert.equal(b.ropes.length,1);
 const water=ready({}, {loaded:true,atSlip:true,slipCarY:9});shift(water.r,water.b,2);run(water.r,water.b,.1);trailerAction(water.r,water.b,'release');run(water.r,water.b,5);assert.equal(water.r.boatLoaded,false);assert.equal(water.b.damage,0);assert.equal(water.b.grounded,false);assert.ok(Math.abs(water.b.heave)<.15);assert.ok(Math.abs(water.b.pitch)<.1);
});
test('retrieval requires the real bow line, alignment, modest relative speed, depth, and accepts running boat engines when securing',()=>{
 const b=createBoat('service',{coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a});
 assert.match(trailerAction(r,b,'secure').message,/cumę/);assert.ok(attachRope(b,'bow',trailerBollardIndex()).ok);
 b.engines[0].key='running';b.vy=.6;assert.equal(trailerAction(r,b,'secure').ok,false);b.vy=0;b.x+=1;assert.equal(trailerAction(r,b,'secure').ok,false);b.x-=1;
 assert.equal(trailerAction(r,b,'secure').ok,true);assert.equal(r.boatLoaded,true);assert.equal(r.secured,true);assert.equal(b.engines[0].key,'running');run(r,b,1);assert.equal(b.damage,0);
});
test('a deep trailer is not an invisible dock: it refuses loading, and an unsunk trailer resists sliding a hull over the rollers',()=>{
 const b=createBoat('service',{coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:9});shift(r,b,5);assert.equal(trailerImmersion(r,b).tooDeep,true);assert.match(trailerAction(r,b,'secure').message,/za głęboko/);
 shift(r,b,-9);const p=bodyPoint(r.trailer,r.trailer.offset);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a,vx:0,vy:-.4});placeTrailerBoat(r,b);b.x-=Math.cos(r.trailer.a);b.y-=Math.sin(r.trailer.a);b.heave=bunkZ(r.trailer,r.trailer.offset-1)+b.spec.draft;b.vy=-.4;run(r,b,.5);assert.ok(b.vy>-.4);assert.ok(b.trailerSupport.load>0);assert.equal(b.damage,0);
});
test('the trailer bollard follows its body, reports point velocity and receives the reaction from its boat line',()=>{
 const b=createBoat('service',{coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:9}),index=trailerBollardIndex();Object.assign(r.trailer,{vx:1,vy:.4,w:.2});const p=trailerPost(r),q=mooringPoint(b,index);assert.equal(q.x,p.x);assert.equal(q.vy,p.vy);assert.notEqual(q.vy,r.trailer.vy);
 boomLoad(b,index,300,120);assert.equal(r.ropeForce.x,300);assert.notEqual(r.ropeForce.torque,0);const before=r.car.vx;towStep(r,b,dt);assert.equal(r.ropeForce.x,0);assert.notEqual(r.car.vx,before);
});
test('a trailer guide arrests sideways hull motion and transfers contact impulse to the trailer',()=>{
 const b=createBoat('service',{coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset,.4);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a,vx:.3,vy:0,heave:bunkZ(r.trailer,r.trailer.offset)-.2+b.spec.draft});trailerContact(r,b,dt);assert.ok(b.vx<.25);assert.ok(r.trailer.vx>0);assert.equal(b.damage,0);
});
test('wet submerged wheels have less grip; a heavy boat cannot climb an arbitrarily steep ramp at full throttle',()=>{
 setSlipAngle(8);const {r,b}=ready({}, {atSlip:true,slipCarY:9});towStep(r,b,dt);const wet=r.traction;selectCarGear(r,'D');r.gas=1;run(r,b,.4);assert.ok(r.slip>.1);shift(r,b,-12);towStep(r,b,dt);assert.ok(r.traction>wet*1.3);
 try{setSlipAngle(18);const heavy=ready({length:11,hullMass:8000,profile:'cabin'},{loaded:true});shift(heavy.r,heavy.b,26);selectCarGear(heavy.r,'D');heavy.r.gas=1;run(heavy.r,heavy.b,1.8);assert.ok(heavy.r.speed<.1,`${heavy.r.speed} m/s`);}finally{setSlipAngle(8);}
});
test('slip angle changes physical depth, and a deeply submerged SUV intake stalls its engine',()=>{
 try{setSlipAngle(4);const shallow=bottomAt(124.5,18).depth;setSlipAngle(16);assert.ok(bottomAt(124.5,18).depth>shallow*3);setSlipAngle(8);const {r,b}=ready({}, {atSlip:true,slipCarY:9});shift(r,b,10);run(r,b,.1);assert.equal(r.engine.key,'ignition');assert.ok(trailerImmersion(r,b).frontDepth>.9);assert.equal(carKey(r,1).ok,false);}finally{setSlipAngle(8);}
});
test('complete water cycle: float off, bow-line retrieval, secure and tow back onto dry land',()=>{
 const {r,b}=ready({}, {loaded:true,atSlip:true,slipCarY:9});carKey(r,-1);shift(r,b,2);run(r,b,.1);assert.ok(trailerAction(r,b,'release').ok);run(r,b,5);assert.equal(r.boatLoaded,false);
 assert.ok(b.ropes.some(q=>q.end==='bow'&&q.bollard===trailerBollardIndex()));assert.ok(trailerAction(r,b,'secure').ok);r.awd=true;carKey(r,1);carKey(r,1);run(r,b,1);selectCarGear(r,'D');r.gas=.45;
 for(let i=0;i<2400&&r.car.y>-15;i++)run(r,b,dt);r.gas=0;r.brake=1;run(r,b,2);assert.ok(r.car.y<-10);assert.ok(bottomAt(b.x,b.y).depth<0);assert.equal(r.boatLoaded,true);assert.equal(b.damage,0);assert.equal(b.grounded,false);assert.ok(Math.abs(r.speed)<.04);
});
