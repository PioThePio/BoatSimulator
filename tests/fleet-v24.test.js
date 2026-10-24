import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {createFleet,addFleetBoat,selectFleetBoat,fleetStep,rigBoat,recordFleetTrails,placementStatus} from '../src/fleet.js';
import {createFleetCraft,TOWABLES} from '../src/fleet-craft.js';
import {connectMarineTow,marineTowStep} from '../src/marine-tow.js';
import {cleat,attachRope} from '../src/rigging.js';
import {BOLLARDS,bottomAt} from '../src/world.js';
import {engineKey} from '../src/craft.js';
import {createTowRig} from '../src/towing.js';
import {snapshotSession,restoreSession,readAutosave,writeAutosave,SAVE_KEY,BACKUP_KEY} from '../src/session-save.js';
import {sandPosition,sandNormal} from './shore-fixture.js';
const calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0},dt=1/120;
const fresh=()=>createFleet(createBoat('lake',{coldStart:true}));
const add=(f,kind='runabout',offset=-16,options={})=>{const b=f.boats[0],result=addFleetBoat(f,kind,{x:b.x+offset,y:b.y,a:0},options);assert.equal(result.ok,true,result.message);return result.boat;};
const run=(f,seconds,e=calm)=>{for(let i=0;i<seconds*120;i++)fleetStep(f,e,dt);};
const storage=()=>{const map=new Map();return{map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};

test('all powered hulls are independently created and all five unpowered kinds have physical mass, inertia and draft',()=>{
 for(const kind of ['tender','runabout','cabin','cruiser','pwc','flat','rib','swamp',...Object.keys(TOWABLES)]){const b=createFleetCraft(kind);assert.ok(b.spec.mass>30&&b.spec.mx>0&&b.spec.my>0&&b.spec.iz>0&&b.spec.draft>0);assert.ok(b.engines.every(en=>en.key==='off'));if(TOWABLES[kind]){assert.equal(b.spec.passive,true);assert.equal(engineKey(b,0,'start').ok,false);assert.equal(b.fuel.litres,0);}}
 const a=createFleetCraft('barge'),b=createFleetCraft('mat');assert.ok(a.spec.mass>b.spec.mass*30);assert.ok(a.spec.iz>b.spec.iz*50);
});
test('map placement rejects land, piers, occupied space and insufficient depth; explicit grounded placement requires shoal',()=>{
 const f=fresh(),b=createFleetCraft('runabout');assert.equal(placementStatus(f,b,{x:80,y:-50,a:0}).ok,false);assert.equal(placementStatus(f,b,{x:80,y:110,a:0}).ok,false);assert.equal(placementStatus(f,b,{x:50,y:110,a:0},{grounded:true}).ok,false);
 let found=false;for(let d=1;d<12;d+=.3){const p=sandPosition(d),a=Math.atan2(sandNormal.y,sandNormal.x),check=placementStatus(f,b,{...p,a},{grounded:true});if(check.ok){found=true;assert.equal(placementStatus(f,b,{...p,a}).ok,false);break;}}assert.ok(found);
});
test('switching vessels preserves individual fuel, battery, damage, hours, route and hull inertia',()=>{
 const f=fresh(),a=f.boats[0],b=add(f,'rib');a.fuel.litres=21;a.battery.soc=.42;a.engines[0].operatingHours=12.3;a.damage=7;a.trail.push({x:79,y:110});a.vy=.3;a.throttle=.5;
 assert.equal(selectFleetBoat(f,b.id).ok,true);assert.equal(a.throttle,0);assert.equal(a.vy,.3);assert.equal(b.occupied,true);assert.equal(a.occupied,false);run(f,.15);assert.equal(a.engines[0].operatingHours,12.3);assert.equal(a.fuel.litres,21);assert.equal(a.damage,7);assert.ok(a.battery.soc<.42);assert.equal(selectFleetBoat(f,a.id).boat,a);assert.equal(a.trail.length,1);assert.notEqual(a.engines,b.engines);
});
test('placement admits genuinely separated parallel hulls but excludes marina boats and floating Y-booms',()=>{
 const f=fresh(),b=createFleetCraft('runabout');assert.equal(placementStatus(f,b,{x:80,y:114.8,a:0}).ok,true);assert.equal(placementStatus(f,b,{x:80,y:111,a:0}).ok,false);
 f.boats[0].traffic=[{...f.boats[0],x:110,y:110}];assert.equal(placementStatus(f,b,{x:110,y:110,a:0}).ok,false);assert.equal(placementStatus(f,b,{x:110,y:110,a:0},{traffic:false}).ok,true);f.boats[0].traffic=[];f.boats[0].booms=[{x1:110,y1:110,a:0,length:10,width:.3}];assert.equal(placementStatus(f,b,{x:115,y:110,a:0}).ok,false);
});
test('fleet integrates shared booms, buoys and marina once, while every hull receives weather and wake histories',()=>{
 const f=fresh(),b=add(f),clock=f.time;run(f,.25,{...calm,windSpeed:5,currentSpeed:.2,currentDirection:90,waveHeight:.1});assert.ok(f.boats.every(q=>Math.abs(q.time-clock-.25)<1e-10));assert.equal(f.boats[0].booms,b.booms);assert.equal(f.boats[0].traffic,b.traffic);assert.ok(Math.abs(b.vx)+Math.abs(b.vy)>0);assert.equal(b.wakeSources[0].history,f.boats[0].wake);recordFleetTrails(f);assert.equal(b.trail.length,1);
});
test('with a single boat fleet integration matches existing boat integration exactly',()=>{
 const b=createBoat('lake'),f=createFleet(createBoat('lake'));b.throttle=f.boats[0].throttle=.4;for(let i=0;i<40;i++){step(b,calm,dt);fleetStep(f,calm,dt);}for(const k of ['x','y','vx','vy','a','w','planing','heave'])assert.equal(f.boats[0][k],b[k]);
});
test('a newly thrown tow has slack and never attracts or teleports either boat',()=>{
 const f=fresh(),a=f.boats[0],b=add(f);assert.equal(connectMarineTow(f,a.id,b.id).ok,true);const before=[a.x,a.y,b.x,b.y];marineTowStep(f,dt);assert.equal(f.tows[0].tension,0);assert.deepEqual([a.x,a.y,b.x,b.y],before);assert.equal(a.vx+b.vx,0);
});
test('taut tow transmits equal opposing impulses and a physical moment at off-centre cleats',()=>{
 const f=fresh(),a=f.boats[0],b=add(f);connectMarineTow(f,a.id,b.id);const r=f.tows[0];b.x-=1;marineTowStep(f,dt);assert.ok(r.tension>0);assert.ok(a.vx<0&&b.vx>0);assert.ok(Math.abs(a.vx*a.spec.mx+b.vx*b.spec.mx)<1e-8);r.fromEnd='starboardStern';a.vx=b.vx=0;marineTowStep(f,dt);assert.ok(Math.abs(a.w)>.0001);
});
test('sharp take-up can rupture a tow; both crews receive the warning and the broken line transmits no further impulse',()=>{
 const f=fresh(),a=f.boats[0],b=add(f);connectMarineTow(f,a.id,b.id,{strength:4000});const r=f.tows[0];a.vx=16;b.x-=1;marineTowStep(f,dt);assert.equal(r.broken,true);assert.ok(r.breakTension>r.strength);assert.equal(a.vx,16);assert.equal(b.vx,0);assert.ok(a.events[0].message.includes('Zerwany hol'));assert.ok(b.events[0].message.includes('Zerwany hol'));marineTowStep(f,dt);assert.equal(r.tension,0);
});
test('tow shortening/pay-out acts only while held, with human force limit and actual persistent rest length',()=>{
 const f=fresh(),a=f.boats[0],b=add(f);connectMarineTow(f,a.id,b.id);const r=f.tows[0];r.length+=5;const length=r.length;r.control=-1;marineTowStep(f,dt);assert.ok(r.length<length);r.control=0;const stopped=r.length;marineTowStep(f,dt);assert.equal(r.length,stopped);r.control=1;marineTowStep(f,dt);assert.ok(r.length>stopped);r.control=-1;b.x-=10;marineTowStep(f,dt);assert.equal(r.blocked,true);assert.equal(r.rate,0);
});
test('alongside connection uses two independent physical fore/aft lines and rejects loops and out-of-range throws',()=>{
 const f=fresh(),a=f.boats[0],b=add(f);assert.equal(connectMarineTow(f,a.id,b.id,{mode:'alongside'}).ok,true);assert.equal(f.tows.length,2);assert.deepEqual(f.tows.map(r=>r.fromEnd),['starboardBow','starboardStern']);assert.equal(connectMarineTow(f,b.id,a.id).ok,false);const c=add(f,'tender',50);assert.equal(connectMarineTow(f,a.id,c.id).ok,false);
});
test('a running tow boat accelerates the trailer-free body through line tension; a barge loads it more than a banana',()=>{
 function scenario(kind){const f=fresh(),a=f.boats[0],b=add(f,kind,-18);a.engines[0].key='running';a.throttle=.5;connectMarineTow(f,a.id,b.id,{strength:40000});run(f,5);return{a,b,r:f.tows[0]};}
 const light=scenario('banana'),heavy=scenario('barge');assert.ok(light.b.vx>.3);assert.ok(heavy.b.vx>0);assert.ok(heavy.a.vx<light.a.vx*.9);assert.ok(heavy.r.tension>light.r.tension);assert.equal(heavy.r.broken,false);assert.equal(heavy.b.engines[0].thrust,0);
});
test('unpowered hulls drift in current, ground with their own draft, and human paddling requires an occupied rowboat',()=>{
 const f=fresh(),a=f.boats[0],b=add(f,'kayak');b.throttle=1;run(f,.5);assert.equal(b.vx,0);selectFleetBoat(f,b.id);b.throttle=1;run(f,1);assert.ok(b.vx>.1);assert.equal(b.engines[0].rpm,0);assert.equal(b.fuel.litres,0);const c=fresh(),mat=add(c,'mat');run(c,1,{...calm,currentSpeed:.4,currentDirection:90});assert.ok(mat.vx>0);assert.equal(mat.spec.sealed,true);assert.equal(mat.bilge.litres,0);
});
test('a disabled boat cannot generate thrust and can still receive a tow and move under the towing force',()=>{
 const f=fresh(),a=f.boats[0],b=add(f,'runabout',-16,{condition:'broken'});assert.equal(b.disabledEngine,true);assert.equal(engineKey(b,0,'ignition').ok,false);connectMarineTow(f,a.id,b.id);a.engines[0].key='running';a.throttle=.5;run(f,3);assert.ok(b.vx>.1);assert.equal(b.engines[0].thrust,0);
});
test('a towable can use the same bollard/cleat mooring, with finite dynamic tension instead of freezing',()=>{
 const f=fresh(),b=add(f,'rowboat'),q=BOLLARDS.find(q=>q.kind==='bollard'&&!q.trailer);Object.assign(b,{x:q.x+3,y:q.y,a:Math.PI});assert.equal(attachRope(b,'bow',BOLLARDS.indexOf(q)).ok,true);b.vx=.3;run(f,.1);assert.ok(Number.isFinite(b.ropes[0]?.tension??0));assert.notEqual(b.x,q.x+3);
});
test('tow force overcomes shallow sandy grounding progressively without teleporting the grounded hull',()=>{
 const a=createBoat('lake'),b=createFleetCraft('flat'),f=createFleet(a),a0=Math.atan2(sandNormal.y,sandNormal.x);
 Object.assign(b,sandPosition(3),{a:a0,id:'boat-2',name:'Mielizna',trail:[]});Object.assign(a,sandPosition(20),{a:a0,throttle:.7});f.boats.push(b);f.nextId=3;assert.equal(connectMarineTow(f,a.id,b.id,{strength:40000}).ok,true);run(f,1);assert.ok(b.groundLoad>50);const before={x:b.x,y:b.y};run(f,5);assert.ok(Math.hypot(b.x-before.x,b.y-before.y)>2);assert.equal(b.groundLoad,0);assert.equal(f.tows[0].broken,false);
});
test('snapshot restores engines/hours, all fuel and damage, electrics, bilge, anchor, tracks, tow lengths and shared attachments',()=>{
 const f=fresh(),a=f.boats[0],rig=createTowRig(a),b=add(f,'rib');a.engines[0].operatingHours=24.7;a.engines[0].temperature=81;a.engines[0].trim=.55;a.fuel.litres=32;a.battery.soc=.39;a.bilge.litres=42;a.bilge.autoRunning=true;a.damage=12;a.sectionDamage.portStern=4;a.operations.distance=4812;a.trail=[{x:70,y:110},{x:80,y:110}];a.anchor.mode='holding';a.anchor.length=18;a.anchor.x=78;a.anchor.y=111;a.anchor.z=3;a.navigationTarget='fuel';a.electrics.gps=false;connectMarineTow(f,a.id,b.id);f.tows[0].length=20;b.vy=.13;b.ropes=[{end:'bow',bollard:0,length:4,tension:30,control:-1}];selectFleetBoat(f,b.id);
 const data=snapshotSession({fleet:f,towRig:rig,env:{windSpeed:4},start:'lake',boatOptions:{profile:'runabout'},vehicle:'boat',ui:{showTrail:true}},1000),result=restoreSession(data);assert.equal(result.ok,true,result.message);const restored=result.session.fleet,aa=restored.boats[0],bb=restored.boats[1];assert.equal(aa.engines[0].operatingHours,24.7);assert.equal(aa.engines[0].temperature,81);assert.equal(aa.engines[0].trim,.55);assert.equal(aa.fuel.litres,32);assert.equal(aa.battery.soc,.39);assert.equal(aa.bilge.litres,42);assert.equal(aa.sectionDamage.portStern,4);assert.equal(aa.operations.distance,4812);assert.deepEqual(aa.trail,a.trail);assert.equal(aa.anchor.length,18);assert.equal(aa.electrics.gps,false);assert.equal(aa.navigationTarget,'fuel');assert.equal(bb.vy,.13);assert.equal(bb.ropes[0].control,0);assert.equal(restored.tows[0].length,20);assert.equal(aa.booms,bb.booms);assert.equal(bb.worldRig,aa.towRig);assert.equal(aa.towRig,result.session.towRig);assert.equal(rigBoat(restored),aa);assert.equal(restored.activeId,b.id);assert.equal(restored.time,f.time);
});
test('loaded trailer, independent SUV pose, winch, straps and boat trim survive an autosave round trip',()=>{
 const a=createBoat('lake',{coldStart:true}),rig=createTowRig(a,{loaded:true}),f=createFleet(a);rig.car.x+=.2;rig.awd=true;rig.handbrake=true;rig.engine.operatingHours=2.5;rig.winch.control=-1;const result=restoreSession(snapshotSession({fleet:f,towRig:rig,env:calm,vehicle:'suv'}));assert.equal(result.ok,true,result.message);const r=result.session.towRig;assert.equal(r.secured,true);assert.equal(r.boatLoaded,true);assert.equal(r.awd,true);assert.equal(r.handbrake,true);assert.equal(r.car.x,rig.car.x);assert.equal(r.engine.operatingHours,2.5);assert.equal(r.winch.control,0);assert.equal(result.session.fleet.boats[0].engines[0].trim,1);
});
test('autosave keeps an atomic previous copy, recovers from corruption and rejects incompatible or unsafe data',()=>{
 const store=storage(),session={fleet:fresh(),env:calm};assert.equal(readAutosave(store).ok,false);assert.equal(writeAutosave(store,session,1000).ok,true);session.fleet.boats[0].damage=5;assert.equal(writeAutosave(store,session,2000).ok,true);assert.ok(store.getItem(BACKUP_KEY));store.setItem(SAVE_KEY,'{broken');const recovered=readAutosave(store);assert.equal(recovered.ok,true);assert.equal(recovered.backup,true);assert.equal(recovered.session.fleet.boats[0].damage,0);const bad=snapshotSession(session);bad.version=999;assert.equal(restoreSession(bad).ok,false);bad.version=1;bad.fleet.boats[0].x=null;assert.equal(restoreSession(bad).ok,false);assert.equal(writeAutosave({getItem:()=>null,setItem:()=>{throw Error('quota');}},session).ok,false);
});
test('loading does not advance time, fuel, Ah, pumps or operating hours while the game was closed',()=>{
 const f=fresh(),a=f.boats[0];a.engines[0].key='running';a.engines[0].operatingHours=10;a.bilge.manual=true;a.bilge.litres=100;const saved=JSON.stringify(snapshotSession({fleet:f,env:calm},1)),result=restoreSession(saved);assert.equal(result.ok,true);const b=result.session.fleet.boats[0];assert.equal(b.time,a.time);assert.equal(b.fuel.litres,a.fuel.litres);assert.equal(b.battery.soc,a.battery.soc);assert.equal(b.bilge.litres,100);assert.equal(b.engines[0].operatingHours,10);assert.equal(b.bilge.manual,true);
});
