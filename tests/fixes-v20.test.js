import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {bilgeStep,BILGE_PUMPS} from '../src/bilge.js';
import {systemsStep} from '../src/systems.js';
import {createTowRig,selectCarGear} from '../src/towing.js';
import {towView} from '../src/camera.js';
import {FENDERS} from '../src/impacts.js';
import {recordHullWake,sampleHullWake,sampleWakeField} from '../src/wake.js';
import {trafficStep} from '../src/traffic.js';
import {WORLD,DOCKS,SERVICE_STATION,PARKING,BRIDGES,reflectionFacesNear,waveAt,bottomAt} from '../src/world.js';
import {compressWorld,fromAtlas,toGeo,fromGeo} from '../src/zegrze.js';
import {coolingWaterIntensity,propSurfaceIntensity} from '../src/render.js';
const dt=1/120;
function run(b,t){for(let i=0;i<t*120;i++)step(b,{},dt);}
function passage(y=0){const h=[];for(let i=0;i<31;i++)recordHullWake(h,{spec:{length:7.5,beam:2.65},x:5+i*3,y,a:0,vx:15,vy:0,time:i*.2},{x:0,y:0});return h;}

test('every requested pump removes its rated litres at 12 V and recovers physical mass and draft',()=>{
 const ratings={tender:32,flat:32,rib:50,runabout:50,cabin:95,cruiser:126};
 for(const [profile,rate]of Object.entries(ratings)){const b=createBoat('lake',{profile,coldStart:true}),q=b.bilge;q.auto=false;q.manual=true;q.litres=150;systemsStep(b,dt);const before={litres:q.litres,mass:b.spec.mass,draft:b.spec.draft};b.battery.voltage=12;bilgeStep(b,10);assert.ok(Math.abs(before.litres-q.litres-rate/6)<1e-8,profile);systemsStep(b,dt);assert.ok(b.spec.mass<before.mass&&b.spec.draft<before.draft,profile);assert.equal(q.pumpRate,rate);assert.equal(BILGE_PUMPS[profile],rate);}
});
test('large pump uses more electrical power; AUTO stops at its float and a dead battery stops outflow',()=>{
 const a=createBoat('lake',{profile:'tender',coldStart:true}),b=createBoat('lake',{profile:'cruiser',coldStart:true});for(const v of [a,b]){v.bilge.litres=100;systemsStep(v,1);}assert.ok(b.bilge.outflow>a.bilge.outflow*3);assert.ok(b.battery.current>a.battery.current);b.bilge.litres=2;bilgeStep(b,dt);assert.equal(b.bilge.running,false);b.bilge.litres=100;b.battery.soc=0;bilgeStep(b,dt);assert.equal(b.bilge.outflow,0);
});
test('real gear selection holds the exact camera pose across R → N → P and D → N → P, independent of velocity',()=>{
 const b=createBoat('lake'),r=createTowRig(b,{loaded:true});for(const gear of ['R','D']){selectCarGear(r,gear);const view=towView(r,b,390,500,8);for(const neutral of ['N','P']){assert.ok(selectCarGear(r,neutral).ok);assert.deepEqual(towView(r,b,390,500,8),view);}r.car.vx=12;assert.deepEqual(towView(r,b,390,500,8).camera,view.camera);assert.equal(towView(r,b,390,500,8).scale,view.scale);r.car.vx=0;}
});
test('six real fenders include both transom quarters; a slow stern-side docking contact is protected',()=>{
 assert.equal(FENDERS.length,6);for(const sign of [-1,1]){const side=FENDERS.filter(f=>Math.sign(f.y)===sign);assert.equal(side.length,3);assert.ok(side.some(f=>f.x<-.4));}
 const b=createBoat('berth');Object.assign(b,{x:20.95,y:20,a:-Math.PI/2,vx:-.18});run(b,.8);assert.equal(b.damage,0);assert.equal(b.lastImpact?.protectedContact,true);
});
test('cooling discharge is independent of idle prop foam and disappears when dry, stopped or on an airboat',()=>{
 const b=createBoat('lake'),en=b.engines[0];run(b,2);assert.ok(coolingWaterIntensity(b,en)>.4);assert.equal(propSurfaceIntensity(b,en),0);en.key='off';assert.equal(coolingWaterIntensity(b,en),0);en.key='running';en.immersion=0;assert.equal(coolingWaterIntensity(b,en),0);const air=createBoat('lake',{profile:'swamp'});run(air,2);assert.equal(coolingWaterIntensity(air,air.engines[0]),0);
});
test('actual throttle surge creates a finite foam pulse; normal steady running clears it; braking in reverse disturbs water again',()=>{
 const b=createBoat('lake'),en=b.engines[0];b.throttle=1;run(b,2);assert.ok(propSurfaceIntensity(b,en)>.03);run(b,12);assert.ok(en.thrust>1000);assert.ok(propSurfaceIntensity(b,en)<.01);b.throttle=-1;run(b,2);assert.equal(en.gear,-1);assert.ok(en.opposingFlow>1);assert.ok(propSurfaceIntensity(b,en)>.05);b.throttle=0;run(b,3);assert.equal(propSurfaceIntensity(b,en),0);
});
test('a wake reaches a mooring after travelling, then physically rocks, yaws and tensions the tied boats in otherwise calm weather',()=>{
 const b=createBoat('lake');b.wake=passage(33);let early=0,heave=0,yaw=0,tension=0;
 for(let i=0;i<26*120;i++){b.time=i*dt;trafficStep(b,{traffic:true},dt);for(const q of b.traffic){if(b.time<1)early=Math.max(early,Math.abs(q.heave),Math.abs(q.w));heave=Math.max(heave,Math.abs(q.heave));yaw=Math.max(yaw,Math.abs(q.w));tension=Math.max(tension,...q.ropes.map(r=>r.tension));}}
 assert.equal(early,0);assert.ok(heave>.05);assert.ok(yaw>.01);assert.ok(tension>20);for(const q of b.traffic)assert.ok(Math.hypot(q.x-q.homeX,q.y-q.homeY)<.8);
});
test('a finite pier reflects a weaker wake back after impact, reverses orbital direction, and adds no pre-arrival motion',()=>{
 const h=passage(),face={a:{x:-100,y:10},b:{x:200,y:10},nx:0,ny:-1,coefficient:.42};
 assert.equal(sampleHullWake(h,30,4,2,face).eta,0);let peakDirect=0,peakReflected=0,peakImage=0,arrivalDirect=0,arrivalReflected=0;
 for(let t=2;t<15;t+=.05){const d=sampleHullWake(h,30,4,t),r=sampleHullWake(h,30,4,t,face);if(Math.abs(d.eta)>.005&&!arrivalDirect)arrivalDirect=t;if(Math.abs(r.eta)>.005&&!arrivalReflected)arrivalReflected=t;peakDirect=Math.max(peakDirect,Math.abs(d.eta));peakReflected=Math.max(peakReflected,Math.abs(r.eta));peakImage=Math.max(peakImage,Math.abs(sampleHullWake(h,30,16,t).eta));}
 assert.ok(arrivalReflected>arrivalDirect+2);assert.ok(peakDirect>0&&peakReflected>0&&peakReflected<=peakImage*.42+1e-10);
 const t=7,virtual=sampleHullWake(h,30,16,t),r=sampleHullWake(h,30,4,t,face);assert.ok(Math.abs(r.eta-virtual.eta*.42)<1e-10);assert.ok(Math.abs(r.vy+virtual.vy*.42)<1e-10);
 const short={...face,a:{x:100,y:10},b:{x:120,y:10}};assert.equal(sampleHullWake(h,30,4,7,short).eta,0);assert.equal(sampleHullWake(h,30,12,7,face).eta,0);
});
test('real dock faces reflect the passing wave; after the wake dies the reflected field is also zero',()=>{
 const faces=reflectionFacesNear(40,18),h=passage(33);assert.ok(faces.some(f=>f.id.startsWith('dock')));let reflected=0;for(let t=3;t<20;t+=.2){const a=sampleHullWake(h,40,18,t),b=sampleWakeField(h,40,18,t,faces);reflected=Math.max(reflected,Math.abs(b.eta-a.eta));}assert.ok(reflected>.002);assert.deepEqual(sampleWakeField(h,40,18,45,faces),{eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0});
});
test('weather reflections remain bounded and water waves never appear on the dry service yard',()=>{
 let peak=0;for(let i=0;i<240;i++){const w=waveAt(40,16,i/30,{waveHeight:.3,waveDirection:0});assert.ok(Object.values(w).filter(v=>typeof v==='number').every(Number.isFinite));peak=Math.max(peak,Math.abs(w.eta));}assert.ok(peak>.04&&peak<.3);assert.equal(waveAt(124,-30,4,{waveHeight:.5}).eta,0);
});
test('lake travel is exactly 30% shorter with unchanged aspect, physical boats, main slip, parking and remote pier dimensions',()=>{
 assert.ok(Math.abs((WORLD.right-WORLD.left)-(1280*1000/75*.7))<1e-8);assert.ok(Math.abs((WORLD.right-WORLD.left)/(WORLD.bottom-WORLD.top)-1280/1042)<1e-10);
 for(const [x,y]of [[0,0],[1280,1042],[834,741]]){const p=fromAtlas(x,y),old={x:(x-610)*1000/75,y:(y-739)*1000/75};assert.deepEqual(p,compressWorld(old));}
 assert.equal(createBoat('lake').spec.length,5.5);assert.deepEqual([SERVICE_STATION.slip.w,SERVICE_STATION.slip.h],[7,44]);assert.deepEqual([PARKING.w,PARKING.h],[64,40]);assert.deepEqual([DOCKS[0].w,DOCKS[0].h],[23,2.8]);assert.equal(DOCKS[13].w,38);assert.equal(BRIDGES[0].width,17);
 const p=fromGeo(52.51,21.07),geo=toGeo(p.x,p.y);assert.ok(Math.abs(geo.latitude-52.51)<1e-10&&Math.abs(geo.longitude-21.07)<1e-10);assert.ok(bottomAt(80,110).depth>2);
});
