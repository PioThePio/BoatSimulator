import test from 'node:test';import assert from 'node:assert/strict';
import{createBoat}from'../src/physics.js';import{createTowRig,towStep,bodyPoint,SUV,placeTrailerBoat,hitchAction}from'../src/towing.js';
import{bottomAt,shoreAt,DOCKS,BUILDINGS,BUILDING_SOLIDS,BOLLARDS,SOLIDS,BRIDGES}from'../src/world.js';
import{SERVICE_BAYS,PARKING_SPACES,YARD_ISLANDS,HANGAR,RETURN_BAY,WILD_SLIP}from'../src/port-yard.js';
import{createFleet}from'../src/fleet.js';import{depotStatus,returnBoat}from'../src/trailer-depot.js';
import{circleSolidHit}from'../src/solid-geometry.js';import{vehicleSurface}from'../src/vehicle-terrain.js';
import{BRIDGE_RAILS,bridgeRailContact,onBridge}from'../src/bridge-road.js';import{towProfile}from'../src/tow-profile.js';
import{trafficStep}from'../src/traffic.js';import{tieTraffic,untieTraffic}from'../src/traffic-mooring.js';
import{snapshotSession,restoreSession}from'../src/session-save.js';import{cleat}from'../src/rigging.js';
const dt=1/120;
test('service workshop meets the old waterfront and two concrete basins are genuinely cut into dry land with navigable 2.7 m beds',()=>{
 const house=BUILDINGS.find(q=>q.service);assert.deepEqual([house.x,house.y],[139,-9]);
 for(const x of[164,184]){for(let y=-13;y<=10;y+=2){const p={x:x+4.5,y};assert.equal(shoreAt(p.x,p.y).land,false);assert.ok(bottomAt(p.x,p.y).depth>2);assert.ok(!SOLIDS.some(q=>circleSolidHit(p,1.5,q)));}assert.ok(shoreAt(x-2.5,-8).land);assert.ok(DOCKS.some(q=>q.material==='concrete'&&q.x===x-2));}
 for(const q of SERVICE_BAYS){assert.ok(q.h<=13);assert.equal(q.heading,-Math.PI/2);assert.ok(q.y+q.h<house.y);}
});
test('parking islands have two opposite rows with their closed ends at the island and free drive aisles; only three bays are long enough for a complete rig',()=>{
 for(const island of YARD_ISLANDS){const row=PARKING_SPACES.filter(q=>q.type===(island.x<140?'car':'trailer'));assert.ok(row.some(q=>Math.abs(q.y+q.h-island.y)<.1&&q.closedEdge==='south'));assert.ok(row.some(q=>Math.abs(q.y-island.y-island.h)<.1&&q.closedEdge==='north'));}
 assert.equal(PARKING_SPACES.filter(q=>q.type==='rig').length,3);assert.ok(PARKING_SPACES.filter(q=>q.type==='trailer').every(q=>q.h<=13));
});
test('34 degree physical wheel angle is retained at road speed and actual tyre forces turn a moving SUV instead of hidden variable steering geometry',()=>{
 for(const speed of[8,14,22]){const b=createBoat('lake'),r=createTowRig(b);r.attached=false;Object.assign(r.car,{x:165,y:-55,a:0,vx:speed});r.gear='N';r.steer=r.actualSteer=SUV.maxSteer;for(let i=0;i<120;i++)towStep(r,b,dt);assert.equal(r.tyreSteer,SUV.maxSteer);assert.ok(r.car.a>.2&&r.car.w>.2);}
});
test('power saturation produces real rear sideslip on sand; AWD reduces it at equal forward speed while pulling through the front axle',()=>{
 function slide(awd){const b=createBoat('lake'),r=createTowRig(b);r.attached=false;r.awd=awd;Object.assign(r.car,{x:249,y:-88,a:0,vx:2.5});r.engine.key='running';r.gear='D';r.gas=r.pedal=1;r.steer=r.actualSteer=.5;let side=0;
 for(let i=0;i<120;i++){const c=r.car,s=Math.sin(c.a),co=Math.cos(c.a),v=-c.vx*s+c.vy*co;c.vx=2.5*co-v*s;c.vy=2.5*s+v*co;towStep(r,b,dt);c.x=249;c.y=-88;const p=bodyPoint(c,-SUV.wb/2);side=Math.max(side,Math.abs(-p.vx*Math.sin(c.a)+p.vy*Math.cos(c.a)));}return side;}
 const rwd=slide(false),awd=slide(true);assert.ok(rwd>.25);assert.ok(awd<rwd*.7,{rwd,awd});
});
test('a physical kerb crossing has a finite energy loss, sound event and changed whole-body side profile',()=>{
 const b=createBoat('lake'),r=createTowRig(b);hitchAction(r);Object.assign(r.car,{x:227,y:-25,a:0,vx:1.4});r.gear='N';let profile='',pitch=0;for(let i=0;i<300;i++){towStep(r,b,dt);if(Math.abs(r.car.pitch)>pitch){pitch=Math.abs(r.car.pitch);profile=towProfile(r,b,{focusCar:true});}}
 assert.ok(pitch>.01);assert.ok(r.curbEvent>=1);assert.ok(r.curbStrength>0);assert.match(profile,/data-pitch="[1-9]/);assert.ok(Math.hypot(r.car.vx,r.car.vy)<.5);
});
test('a loaded 9 m trailer reverses through the real hangar doorway, stops inside and can be detached and deposited',()=>{
 const b=createBoat('lake',{profile:'cruiser',coldStart:true}),r=createTowRig(b,{loaded:true,misalignment:0}),f=createFleet(b);r.car.x=76;r.car.y=-50;r.car.a=Math.PI/2;r.trailer.a=r.car.a;const pin=bodyPoint(r.car,-SUV.hitch);r.trailer.x=pin.x;r.trailer.y=pin.y-r.trailer.hitch;placeTrailerBoat(r,b);r.engine.key='running';r.gear='R';r.gas=.15;
 let minClearance=Infinity;for(let i=0;i<4800&&b.y>-82;i++){towStep(r,b,dt);minClearance=Math.min(minClearance,r.car.x-HANGAR.x);}
 assert.ok(b.y<=-82,{x:b.x,y:b.y,status:r.status});r.gas=0;r.handbrake=true;r.gear='P';for(let i=0;i<480;i++)towStep(r,b,dt);r.attached=false;r.trailerPark=true;r.engine.key='off';assert.ok(depotStatus(f).ok,depotStatus(f).message);assert.ok(returnBoat(f).ok);assert.equal(b.stored,true);assert.equal(r.contacts,0);assert.ok(minClearance>2);assert.ok(!BUILDING_SOLIDS.some(q=>circleSolidHit({x:76,y:-75},1.5,q)));
});
test('bridge guard contains a gentle glancing SUV contact but yields to a high-energy strike; underwater solids do not contain deck guards',()=>{
 const rail=BRIDGE_RAILS.find(q=>q.bridge==='zegrze'),p=rail.pose,a=p.a,n={x:-Math.sin(a),y:Math.cos(a)};
 for(const speed of[.3,5]){const b=createBoat('lake'),r=createTowRig(b);r.attached=false;Object.assign(r.car,{x:p.x-n.x*.9,y:p.y-n.y*.9,a,vx:n.x*speed,vy:n.y*speed});bridgeRailContact(r,r.car,SUV.length,SUV.beam,dt);if(speed<1){assert.ok(r.car.vx*n.x+r.car.vy*n.y<.1);assert.ok(!r.guardDamage[rail.id]);}else assert.equal(r.guardDamage[rail.id],1);}
 assert.ok(!SOLIDS.includes(rail));assert.ok(onBridge(p));
});
test('wild slip is a continuous grass/sand ramp connected to land and loses traction as its wheels enter water',()=>{
 const x=WILD_SLIP.x+WILD_SLIP.w/2;assert.ok(vehicleSurface(x,WILD_SLIP.y).z>2);assert.ok(vehicleSurface(x,WILD_SLIP.waterY+2).depth>.2);assert.ok(vehicleSurface(x,WILD_SLIP.waterY+2).mu<vehicleSurface(124.5,9.5).mu);for(let y=WILD_SLIP.y;y<10;y++){assert.ok(Math.abs(bottomAt(x,y+1).depth-bottomAt(x,y).depth)<.25);}
});
test('ambient mooring is a real mutable rope: detach permits wind drift, attach never moves the body and survives Continue',()=>{
 const b=createBoat('lake'),f=createFleet(b),q=b.traffic.find(q=>q.id==='north-row-16'),end=q.ropes[0].end,target=q.ropes[0].bollard,p={x:q.x,y:q.y};untieTraffic(q,end);assert.equal(q.ropes.length,0);const result=tieTraffic(b,q,end,target);assert.ok(result.ok,result.message);assert.deepEqual({x:q.x,y:q.y},p);const restored=restoreSession(snapshotSession({fleet:f,env:{traffic:true}}));assert.ok(restored.ok);assert.equal(restored.session.fleet.boats[0].traffic.find(v=>v.id===q.id).ropes[0].bollard,target);
 untieTraffic(q,end);for(let i=0;i<600;i++){b.time+=dt;trafficStep(b,{traffic:true,windSpeed:9,windDirection:90},dt);}assert.ok(Math.hypot(q.x-p.x,q.y-p.y)>.2);
});
test('partly beached kayaks retain bottom support in calm water but the lightly grounded kayak can be blown afloat in strong offshore wind',()=>{
 const b=createBoat('lake'),q=b.traffic.find(q=>q.id==='beach-kayak-2'),start={x:q.x,y:q.y};for(let i=0;i<240;i++){b.time+=dt;trafficStep(b,{traffic:true},dt);}assert.ok(q.groundLoad>1);assert.ok(Math.hypot(q.x-start.x,q.y-start.y)<.01);for(let i=0;i<3600;i++){b.time+=dt;trafficStep(b,{traffic:true,windSpeed:14,windDirection:180},dt);}assert.ok(Math.hypot(q.x-start.x,q.y-start.y)>.5);
});
