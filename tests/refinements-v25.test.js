import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat} from '../src/physics.js';
import {createFleet,addFleetBoat,fleetStep} from '../src/fleet.js';
import {createFleetCraft} from '../src/fleet-craft.js';
import {attachmentNames} from '../src/attachment-points.js';
import {connectBoatPoints} from '../src/marine-tow.js';
import {resolveFleetSpawn,spawnFleetCraft} from '../src/fleet-spawns.js';
import {fleetContacts} from '../src/fleet-contacts.js';
import {recordImpact} from '../src/impacts.js';
import {cleat} from '../src/rigging.js';
import {pumpMode,setPumpMode,bilgeStep} from '../src/bilge.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {sampleHullWake,sampleWakeField,reflectionPaths} from '../src/wake.js';
import {referenceHullWake} from './wake-reference-v24.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0};
const fresh=()=>createFleet(createBoat('lake',{coldStart:true}));

test('actual attachment sets distinguish banana, mat, kayak, barge and motorboat with a stern tow eye',()=>{
 assert.deepEqual(Object.keys(attachmentNames(createFleetCraft('banana'))),['bow']);assert.deepEqual(Object.keys(attachmentNames(createFleetCraft('mat'))),['bow']);assert.deepEqual(Object.keys(attachmentNames(createFleetCraft('kayak'))),['bow','stern']);assert.equal(Object.keys(attachmentNames(createFleetCraft('barge'))).length,9);assert.ok(attachmentNames(createBoat()).stern);
 const b=createBoat();assert.ok(cleat(b,'stern').x!==b.x);
});
test('point connections use selected arms, preserve slack and reject unavailable or occupied points',()=>{
 const f=fresh(),a=f.boats[0],b=addFleetBoat(f,'banana',{x:62,y:110,a:0}).boat;
 assert.equal(connectBoatPoints(f,a.id,'stern',b.id,'portBow').ok,false);assert.equal(connectBoatPoints(f,a.id,'stern',b.id,'bow').ok,true);assert.equal(f.tows[0].fromEnd,'stern');assert.equal(f.tows[0].toEnd,'bow');assert.equal(connectBoatPoints(f,a.id,'bow',b.id,'bow').ok,false);fleetStep(f,calm,dt);assert.equal(f.tows[0].tension,0);assert.equal(b.vx,0);
});
test('additional powered configuration retains dimensions, engine type, twin power, crew and thrusters',()=>{
 const b=createFleetCraft('cabin',{length:8,beam:2.9,hullMass:2600,propulsion:'zdrive',engineCount:2,powers:[250,200],crewCount:5,equipmentMass:150,fuelCapacity:300,tankCount:2,bowThruster:true,sternThruster:true});
 assert.equal(b.spec.length,8);assert.equal(b.spec.beam,2.9);assert.equal(b.spec.propulsion,'zdrive');assert.deepEqual(b.spec.powers,[250,200]);assert.equal(b.spec.crewMass,375);assert.equal(b.spec.equipmentMass,150);assert.ok(b.spec.bowThruster&&b.spec.sternThruster);assert.equal(b.fuel.tanks.length,2);
});
test('passive dimensions, riders and equipment alter actual mass, draft and rotational inertia; empty mat can be saved',()=>{
 const empty=createFleetCraft('mat',{crewCount:0}),full=createFleetCraft('mat',{crewCount:2,equipmentMass:20});assert.equal(empty.spec.mass,18);assert.equal(full.spec.mass,188);assert.ok(full.spec.draft>empty.spec.draft);assert.ok(full.spec.iz>empty.spec.iz);const f=createFleet(empty);assert.equal(restoreSession(snapshotSession({fleet:f,env:calm})).ok,true);
});
test('named moored spawn uses real, reachable bollards and a free water spawn has no fabricated ties',()=>{
 const f=fresh(),p=resolveFleetSpawn(f,'runabout','service',{moored:true});assert.equal(p.ok,true,p.message);const result=spawnFleetCraft(f,'runabout',p.pose,{moored:true});assert.equal(result.ok,true,result.message);assert.ok(result.boat.ropes.length>=1);assert.ok(result.boat.ropes.every(r=>r.length<=6.35&&r.tension===0));const open=resolveFleetSpawn(f,'kayak','lake',{});assert.equal(open.ok,true);const q=spawnFleetCraft(f,'kayak',open.pose,{});assert.equal(q.ok,true);assert.equal(q.boat.ropes.length,0);assert.equal(resolveFleetSpawn(f,'barge','lake',{moored:true}).ok,false);
});
test('map placement cannot claim moored status if no physical bollard is reachable',()=>{
 const f=fresh();assert.equal(spawnFleetCraft(f,'banana',{x:62,y:110,a:0},{moored:true}).ok,false);assert.equal(f.boats.length,1);
});
test('banana planes, swings out under a powered turn, can outrun the tow boat in the arc, and encounters its delayed wake',()=>{
 const f=createFleet(createBoat('lake',{powers:[200]})),a=f.boats[0],b=addFleetBoat(f,'banana',{x:62,y:110,a:0}).boat;connectBoatPoints(f,a.id,'stern',b.id,'bow');a.throttle=.85;let slip=0,wake=0,speedExcess=0;
 for(let i=0;i<1800;i++){if(i===900)a.steer=.65;fleetStep(f,calm,dt);if(i>900){slip=Math.max(slip,Math.abs(-b.vx*Math.sin(b.a)+b.vy*Math.cos(b.a)));speedExcess=Math.max(speedExcess,Math.hypot(b.vx,b.vy)-Math.hypot(a.vx,a.vy));}wake=Math.max(wake,b.wakeEncounter);}
 assert.ok(b.planing>.6);assert.ok(slip>1);assert.ok(speedExcess>.5);assert.ok(wake>.005);assert.equal(f.tows[0].broken,false);assert.ok(Number.isFinite(b.roll)&&Number.isFinite(b.w));
});
test('slow motorboat contact pushes a banana without hull damage; a fast hit mostly damages the inflatable',()=>{
 function hit(speed){const a=createBoat('lake'),b=createFleetCraft('banana');Object.assign(b,{id:'b',x:84,y:110,a:0});a.id='a';a.vx=speed;fleetContacts(a,b,dt);return{a,b};}
 const gentle=hit(1),fast=hit(8);assert.equal(gentle.a.damage,0);assert.equal(gentle.b.damage,0);assert.ok(gentle.b.vx>.5);assert.ok(fast.b.damage>50);assert.ok(fast.a.damage<fast.b.damage*.15);
});
test('a massive steel barge changes collision impulses and damage compared with a soft tow toy',()=>{
 const a=createBoat('lake'),b=createFleetCraft('barge');Object.assign(b,{id:'b',x:84,y:110,a:0});a.id='a';a.vx=1;fleetContacts(a,b,dt);assert.ok(b.vx<.4);assert.ok(a.damage>1);assert.ok(b.damage<a.damage*.1);
});
test('RIB inflatable side absorbs a moderate hit better than an equally heavy rigid hull, without immunity at high speed',()=>{
 function hit(profile,speed){const b=createBoat('lake',{profile,hullMass:800,length:5.5,beam:2.15});recordImpact(b,{arm:{x:0,y:1},speed,effective:700,dock:false});return b.damage;}
 assert.ok(hit('rib',2)<hit('runabout',2)*.5);assert.ok(hit('rib',10)>0);
});
test('pump OFF/AUTO/ON is exclusive, AUTO follows its float and all modes still require battery power',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.bilge;assert.equal(pumpMode(q),'auto');q.litres=30;bilgeStep(b,dt);assert.equal(q.running,true);setPumpMode(q,'off');bilgeStep(b,dt);assert.equal(q.running,false);setPumpMode(q,'on');q.litres=0;bilgeStep(b,dt);assert.equal(q.running,true);assert.equal(q.auto,false);setPumpMode(q,'auto');bilgeStep(b,dt);assert.equal(q.running,false);b.electrics.master=false;q.litres=50;bilgeStep(b,dt);assert.equal(q.running,false);assert.equal(pumpMode(q),'auto');
});
test('spatial wake cache matches the v24 equations at random points and reflected paths through expiry and new snapshots',()=>{
 const h=Array.from({length:180},(_,i)=>({x:40+i*1.1,y:15+Math.sin(i*.09)*8,nx:-Math.sin(i*.03)*.3,ny:Math.sqrt(1-(Math.sin(i*.03)*.3)**2),time:i*.2,currentX:.12,currentY:-.02,spread:2.4,width:1,amplitude:.14}));
 const faces=[{a:{x:10,y:-30},b:{x:300,y:-30},nx:0,ny:1,coefficient:.56},{a:{x:10,y:100},b:{x:300,y:100},nx:0,ny:-1,coefficient:.34}];let signal=0;
 for(const time of [4,20,36,50,80])for(let i=0;i<120;i++){const x=20+(i*43%250),y=-20+(i*31%115);for(const path of [null,...reflectionPaths(faces)]){const a=sampleHullWake(h,x,y,time,path),b=referenceHullWake(h,x,y,time,path);for(const key of Object.keys(a)){assert.ok(Math.abs(a[key]-b[key])<1e-12,`${key} at ${x},${y},${time}`);signal+=Math.abs(a[key]);}}}assert.ok(signal>1);
 h.push({...h.at(-1),x:240,time:36});h.shift();assert.deepEqual(sampleHullWake(h,230,20,37),referenceHullWake(h,230,20,37));assert.deepEqual(sampleWakeField(h,0,0,90,faces),{eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0});
});
