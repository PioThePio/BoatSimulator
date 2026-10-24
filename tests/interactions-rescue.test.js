import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBoat,step,attachRope} from '../src/physics.js';
import {createFleet,addFleetBoat,fleetStep} from '../src/fleet.js';
import {bankSuctionForce,passingInteraction} from '../src/hydro-interactions.js';
import {sampleBankGeometry,vesselInteractions} from '../src/interaction-scene.js';
import {crossWaveDrag,towHeelAngle,whipState} from '../src/towable-water.js';
import {connectBoatPoints} from '../src/marine-tow.js';
import {RESCUE_TYPES,createRescue,advanceRescueObject,pickupStatus,validRescueState} from '../src/rescue.js';
import {throwRescue,recoverRescue,rescueStep} from '../src/rescue-scene.js';
import {BOLLARDS,DOCKS,SOLIDS,TRAFFIC,EUZEBIA,ISLANDS,PILAWA,MAP_STARTS,shoreAt,bottomAt,FUEL_STATION,FUEL_STATIONS,WORLD,polygonShore,islandRadius} from '../src/world.js';
import {createShoreQuery} from '../src/shore-geometry.js';
import {fuelBerthStatus} from '../src/systems.js';
import {createTraffic} from '../src/traffic.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {cleat} from '../src/rigging.js';
import {recordHullWake,wakeEdges} from '../src/wake.js';
const dt=1/120,calm={traffic:false,hydroInteractions:true,windSpeed:0,currentSpeed:0,waveHeight:0},zero={eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0};
const fresh=()=>createFleet(createBoat('lake',{coldStart:true}));
const close=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
const bank={mass:1500,length:5.5,beam:2.15,draft:.38,speed:1,gap:.7,depth:2,steepness:1,nx:0,ny:1,heading:0};
test('steep bank suction is speed squared, lateral, short range, aft acting and bounded; beach/rest have none',()=>{
 const slow=bankSuctionForce(bank),fast=bankSuctionForce({...bank,speed:2});assert.ok(slow.y>0);close(slow.x,0);close(fast.magnitude,slow.magnitude*4);assert.ok(slow.arm<0);
 assert.ok(bankSuctionForce({...bank,gap:6}).magnitude<slow.magnitude*.02);assert.equal(bankSuctionForce({...bank,speed:0}).magnitude,0);assert.equal(bankSuctionForce({...bank,steepness:0}).magnitude,0);assert.equal(bankSuctionForce({...bank,nx:1,ny:0}).magnitude,0);
 assert.ok(bankSuctionForce({...bank,speed:100,gap:0}).magnitude<=bank.mass*9.81*.08);assert.deepEqual(bankSuctionForce(bank),slow);
});
test('hard pier detection yields a real lateral acceleration and yaw; optional switch removes only the new term',()=>{
 const a=createBoat('lake',{coldStart:true}),b=createBoat('lake',{coldStart:true});for(const q of [a,b])Object.assign(q,{x:14,y:23,a:Math.PI/2,vy:1.2});
 assert.equal(sampleBankGeometry(a).steepness,1);step(a,calm,dt);step(b,{...calm,hydroInteractions:false},dt);assert.ok(a.bankSuction>0);assert.equal(b.bankSuction,0);assert.ok(a.vx>b.vx);assert.ok(a.w!==b.w);
});
test('passing attraction is reciprocal, quadratic and absent at rest, crossways or when separated longitudinally',()=>{
 const a=createBoat('lake'),b=createBoat('lake');Object.assign(a,{x:0,y:0,vx:1,vy:0});Object.assign(b,{x:1,y:3.3,vx:-1,vy:0,a:Math.PI});const f=passingInteraction(a,b);assert.ok(f.y>0);assert.ok(f.armA!==0);a.vx*=2;b.vx*=2;close(passingInteraction(a,b).magnitude,f.magnitude*4);
 a.vx=b.vx=0;assert.equal(passingInteraction(a,b),null);b.a=Math.PI/2;a.vx=1;assert.equal(passingInteraction(a,b),null);b.a=0;b.x=30;assert.equal(passingInteraction(a,b),null);
});
test('nearby fleet hulls receive equal opposing momentum and a moment; disabled feature is inert',()=>{
 const f=fresh(),a=f.boats[0],b=addFleetBoat(f,'runabout',{x:81,y:114.5,a:0}).boat;a.vx=2;b.vx=-2;
 vesselInteractions(f,calm,dt);assert.ok(a.vy>0&&b.vy<0);close(a.spec.my*a.vy+b.spec.my*b.vy,0);assert.ok(Math.abs(a.w)>0);const before=[a.vy,b.vy,a.w,b.w];vesselInteractions(f,{...calm,hydroInteractions:false},dt);assert.deepEqual([a.vy,b.vy,a.w,b.w],before);
});
test('MOB and ring advance without mutating their input, drift with flow/wind, strand on land and respond to waves',()=>{
 for(const kind of Object.keys(RESCUE_TYPES)){let o={id:'rescue-1',kind,x:0,y:0,a:0,vx:0,vy:0,heave:0,roll:0,thrownAt:0,recovered:false},initial={...o};const flow={wind:{x:5,y:0},current:{x:.25,y:.1}};
  for(let i=0;i<1200;i++)o=advanceRescueObject(o,flow,{...zero,eta:.1,sy:.12},{depth:3},dt);assert.ok(o.x>.5&&o.y>.2);assert.ok(o.heave>.08&&o.roll>.05);assert.equal(initial.x,0);
  o.vx=1;for(let i=0;i<1200;i++)o=advanceRescueObject(o,{wind:{x:0,y:0},current:{x:0,y:0}},zero,{depth:-1},dt);assert.ok(o.vx<.001);assert.equal(o.grounded,true);
 }
 const input={kind:'ring',x:0,y:0,a:0,vx:0,vy:0,heave:0,roll:0};advanceRescueObject(input,{wind:{x:0,y:0},current:{x:0,y:0}},zero,{depth:3},dt);assert.deepEqual(input,{kind:'ring',x:0,y:0,a:0,vx:0,vy:0,heave:0,roll:0});
});
test('throw inherits motion, creates separate objects without using vessel slots, rejects piers/trailer, bounds active count',()=>{
 const f=fresh(),b=f.boats[0];b.vx=1;const r=throwRescue(f,b,'ring',1);assert.ok(r.ok);close(r.object.vx,1);assert.ok(r.object.vy>0);assert.equal(f.boats.length,1);assert.equal(validRescueState(f.rescue),true);
 b.towRig={boatLoaded:true};assert.equal(throwRescue(f,b).ok,false);delete b.towRig;for(let i=0;i<11;i++)assert.equal(throwRescue(f,b,'mob',-1).ok,true);assert.equal(throwRescue(f,b).ok,false);assert.equal(f.rescue.objects.length,12);
 const near=createBoat('lake',{coldStart:true});Object.assign(near,{x:14.5,y:22,a:Math.PI/2});const g=createFleet(near);assert.equal(throwRescue(g,near,'ring',-1).ok,false);
});
test('pickup requires close hull, neutral and low relative speed; no remote rescue or automatic pickup',()=>{
 const f=fresh(),b=f.boats[0],o=throwRescue(f,b).object;o.vx=o.vy=0;assert.ok(pickupStatus(b,o).ok);b.throttle=.08;assert.equal(recoverRescue(f,b,o.id).ok,false);b.throttle=0;b.vx=1;assert.equal(pickupStatus(b,o).ok,false);b.vx=0;o.y+=5;assert.equal(pickupStatus(b,o).ok,false);o.y-=5;f.time=12;assert.equal(recoverRescue(f,b,o.id).ok,true);assert.equal(f.rescue.recovered,1);assert.equal(o.elapsed,12);assert.equal(recoverRescue(f,b,o.id).ok,false);
});
test('rescue objects encounter current; contact is counted without sinking the hull',()=>{
 const f=fresh(),b=f.boats[0],o=throwRescue(f,b,'mob').object;o.x=b.x;o.y=b.y;o.vx=o.vy=0;rescueStep(f,calm,dt);assert.equal(f.rescue.contacts,1);assert.equal(b.damage,0);
 o.x=b.x-7;o.y=b.y+7;for(let i=0;i<120;i++)fleetStep(f,{...calm,currentSpeed:.2,currentDirection:90},dt);assert.ok(o.x!==b.x-7||f.rescue.objects[0].x!==b.x-7);assert.equal(f.rescue.objects[0].recovered,false);
});
test('a MOB training float receives actual delayed registered wake; identical still water has no heave or orbital drift',()=>{
 const f=fresh(),quiet=fresh(),b=f.boats[0],emitter=createBoat('lake'),history=[];
 for(let i=0;i<30;i++){Object.assign(emitter,{x:70+i*2,y:110,a:0,vx:10,vy:0,time:i*.2});recordHullWake(history,emitter,{x:0,y:0});}
 const p=wakeEdges(history[12],7)[1],o=throwRescue(f,b).object,q=throwRescue(quiet,quiet.boats[0]).object;for(const body of [o,q])Object.assign(body,p,{vx:0,vy:0});b.wakeSources=[{id:'external',history}];let peak=0;
 for(let i=0;i<120;i++){b.time=f.time=quiet.boats[0].time=quiet.time=7+i*dt;rescueStep(f,calm,dt);rescueStep(quiet,calm,dt);peak=Math.max(peak,Math.abs(o.heave));}
 assert.ok(peak>.01);assert.ok(Math.hypot(o.vx,o.vy)>.005);assert.equal(q.heave,0);assert.equal(q.vx,0);assert.equal(q.vy,0);
});
test('cross-wave resistance dissipates energy in either direction; lateral tow tension gives bounded heel',()=>{
 const b=createBoat(),S={...b.spec,inflatable:true};assert.equal(crossWaveDrag(S,7,0),0);for(const u of [-8,-1,1,8])assert.ok(crossWaveDrag(S,u,.2)*u>0);assert.ok(crossWaveDrag(S,8,.2)>crossWaveDrag(S,4,.2)*3.9);assert.equal(towHeelAngle(S,1000,{x:1,y:0},0),0);assert.ok(towHeelAngle(S,1000,{x:0,y:1},0)>0);assert.ok(Math.abs(towHeelAngle(S,1e8,{x:0,y:1},0))<=.14);
 assert.equal(whipState({x:0,y:0,vx:5,vy:0},{x:0,y:10,vx:8,vy:0}).active,true);
});
for(const kind of ['banana','mat'])test(`${kind}: powered turn causes physical whip, heel and delayed wake without a boost, rope break or teleport`,()=>{
 const f=createFleet(createBoat('lake',{powers:[200]})),a=f.boats[0],b=addFleetBoat(f,kind,{x:62,y:110,a:0}).boat;connectBoatPoints(f,a.id,'stern',b.id,'bow');a.throttle=.85;let gain=0,roll=0,wake=0,previous={x:b.x,y:b.y};
 for(let i=0;i<1800;i++){if(i===900)a.steer=.65;fleetStep(f,calm,dt);if(i>900){gain=Math.max(gain,b.whip?.gain??0);roll=Math.max(roll,Math.abs(b.roll));}wake=Math.max(wake,b.wakeEncounter);assert.ok(Math.hypot(b.x-previous.x,b.y-previous.y)<.4);previous={x:b.x,y:b.y};}
 assert.ok(gain>.5);assert.ok(roll>.01);assert.ok(wake>.005);assert.equal(f.tows[0].broken,false);
});
test('append-only sites keep all legacy mooring indices and coordinates unchanged',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-bollards.json',import.meta.url)));assert.equal(fixture.length,332);assert.deepEqual(BOLLARDS.slice(0,fixture.length).map(({id,x,y})=>({id,x,y})),fixture);assert.equal(new Set(BOLLARDS.map(q=>q.id)).size,BOLLARDS.length);
});
test('island bounding-box rejection preserves exact shore distances compared with unconditional polygon queries',()=>{
 const query=createShoreQuery(EUZEBIA.outline);for(let i=0;i<700;i++){const x=WORLD.left+(i*347%1000)/1000*(WORLD.right-WORLD.left),y=WORLD.top+(i*619%1000)/1000*(WORLD.bottom-WORLD.top);let d=polygonShore(x,y).distance;for(const q of ISLANDS){const value=q.outline?-query(x,y).distance:Math.hypot(x-q.x,y-q.y)-islandRadius(Math.atan2(y-q.y,x-q.x),q);d=Math.min(d,value);}close(shoreAt(x,y).distance,d);}
});
test('Euzebia is a distinct irregular island at Rządza mouth, with dry mooring trees, gentle sandy approaches and a deep start',()=>{
 assert.equal(shoreAt(EUZEBIA.x,EUZEBIA.y).land,true);assert.ok(EUZEBIA.outline.length>10);assert.ok(EUZEBIA.rx*EUZEBIA.ry>Math.max(...ISLANDS.filter(q=>q!==EUZEBIA).map(q=>q.rx*q.ry)));assert.equal(ISLANDS.length,4);const trees=BOLLARDS.filter(q=>q.site==='euzebia');assert.equal(trees.length,5);
 for(const t of trees){const s=shoreAt(t.x,t.y);assert.ok(s.distance< -1.3);const x=t.x+s.nx*7,y=t.y+s.ny*7,q=bottomAt(x,y);assert.equal(q.land,false);assert.equal(q.material,'sand');assert.ok(q.depth>.25&&q.depth<1.4,q.depth);}
 for(const id of ['euzebia','pilawa'])assert.ok(bottomAt(MAP_STARTS[id].x,MAP_STARTS[id].y).depth>1.5);
});
test('Pilawa piers meet land, fingers/fuel form connected assemblies and mooring points lie on their actual docks',()=>{
 for(const d of PILAWA.docks.filter(q=>q.w>10)){assert.ok(shoreAt(d.x+d.w,d.y+d.h/2).distance<0);assert.ok(shoreAt(d.x,d.y).distance>10);}
 for(const q of PILAWA.bollards)if(q.kind!=='buoy')assert.ok(PILAWA.docks.some(d=>q.x>=d.x-.01&&q.x<=d.x+d.w+.01&&q.y>=d.y-.01&&q.y<=d.y+d.h+.01),q.id);
 for(const d of PILAWA.docks)assert.ok(SOLIDS.includes(d)&&DOCKS.includes(d));assert.ok(FUEL_STATIONS.includes(PILAWA.fuel));
});
test('each Euzebia wild berth allows a shallow flat boat to throw its bow line without grounding or hull damage',()=>{
 for(const [index,t]of BOLLARDS.entries()){if(t.site!=='euzebia')continue;const n=shoreAt(t.x,t.y),b=createBoat('euzebia',{profile:'flat',coldStart:true});Object.assign(b,{x:t.x+n.nx*7.7,y:t.y+n.ny*7.7,a:Math.atan2(-n.ny,-n.nx)});assert.equal(attachRope(b,'bow',index).ok,true);for(let i=0;i<30;i++)step(b,calm,dt);assert.equal(b.grounded,false);assert.equal(b.damage,0);assert.ok(b.underKeel>.15);}
});
test('Pilawa contains mixed, individually moored sail/motor/PWC boats with clear water and no initial pier penetrations',()=>{
 const traffic=createTraffic().filter(q=>q.site==='pilawa');assert.equal(traffic.length,19);assert.equal(new Set(traffic.map(q=>q.type)).size,3);
 for(const q of traffic){assert.ok(bottomAt(q.x,q.y).depth>q.spec.draft);assert.ok(q.ropes.length>=2);for(const r of q.ropes){assert.ok(r.bollard>=332);const p=cleat(q,r.end),target=BOLLARDS[r.bollard];close(r.length,Math.hypot(p.x-target.x,p.y-target.y)+.12);}assert.ok(!DOCKS.some(d=>q.x>d.x&&q.x<d.x+d.w&&q.y>d.y&&q.y<d.y+d.h));}
});
test('both fuel sites require own mooring, idle hull and engines/key off, preserving the original station',()=>{
 for(const station of FUEL_STATIONS){const b=createBoat('lake',{coldStart:true});Object.assign(b,{x:station.x+b.spec.beam/2+.5,y:station.y,a:Math.PI/2});assert.equal(fuelBerthStatus(b).ok,false);const i=BOLLARDS.findIndex(q=>q.kind==='bollard'&&Math.abs(q.x-station.x)<.3&&Math.abs(q.y-station.y)<6);assert.ok(i>=0);assert.ok(attachRope(b,'bow',i).ok||attachRope(b,'portStern',i).ok);assert.equal(fuelBerthStatus(b).ok,true);b.engines[0].key='ignition';assert.equal(fuelBerthStatus(b).ok,false);}
 assert.equal(FUEL_STATION,FUEL_STATIONS[0]);
});
test('legacy localStorage fixture restores old state and numeric ropes, adds new marina without resetting the session',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/local-session-v24.json',import.meta.url))),old=fixture.fleet.boats[0];old.engines[0].operatingHours=12.25;old.battery.soc=.42;old.ropes=[{end:'bow',bollard:0,length:5,tension:100,control:-1}];const r=restoreSession(fixture);assert.ok(r.ok,r.message);const b=r.session.fleet.boats[0];assert.equal(b.engines[0].operatingHours,12.25);assert.equal(b.battery.soc,.42);assert.equal(b.ropes[0].bollard,0);assert.equal(b.ropes[0].control,0);assert.equal(b.traffic.length,TRAFFIC.length);assert.deepEqual(r.session.fleet.rescue,createRescue());
});
test('rescue, weather options, elapsed training time and recovered objects survive local save without offline progress; malformed state rejected',()=>{
 const f=fresh(),b=f.boats[0],o=throwRescue(f,b,'mob').object;o.vx=o.vy=0;f.time=6;recoverRescue(f,b,o.id);throwRescue(f,b,'ring');const s=snapshotSession({fleet:f,env:{...calm,hydroInteractions:false,towEffects:false}}),r=restoreSession(s);assert.ok(r.ok,r.message);assert.deepEqual(r.session.fleet.rescue,f.rescue);assert.equal(r.session.env.hydroInteractions,false);assert.equal(r.session.fleet.time,6);s.fleet.rescue.objects[0].kind='invalid';assert.equal(restoreSession(s).ok,false);
});
