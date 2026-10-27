import test from 'node:test';import assert from 'node:assert/strict';
import{createBoat,step}from'../src/physics.js';
import{createTowRig,towStep,SUV,bodyPoint,trailerImmersion,trailerAction,trailerBollardIndex,resetTowVehicle}from'../src/towing.js';
import{articulationStatus,COUPLER_LIMIT}from'../src/articulation.js';
import{attachRope,cleat,solveRopes,requestHaul,impulse}from'../src/rigging.js';
import{mooringPoint}from'../src/marina.js';import{mooringGear}from'../src/mooring-gear.js';
import{createFleet,fleetStep}from'../src/fleet.js';import{snapshotSession,restoreSession}from'../src/session-save.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0,autoWaves:false},near=(a,b,e=.005)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
function align(r,angle){r.trailer.a=r.car.a+angle;const p=bodyPoint(r.car,-SUV.hitch);r.trailer.x=p.x-Math.cos(r.trailer.a)*r.trailer.hitch;r.trailer.y=p.y-Math.sin(r.trailer.a)*r.trailer.hitch;}
test('P and handbrake absorb static dock contact through finite friction instead of a post-brake position correction walking the rig downhill',()=>{
 const b=createBoat('lake',{profile:'cruiser',coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:7});r.handbrake=true;r.car.x-=1.5;r.car.a+=.3;align(r,.2);const c={...r.car},t={...r.trailer},d=trailerImmersion(r,b);
 for(let i=0;i<120*90;i++)towStep(r,b,dt);near(r.car.x,c.x);near(r.car.y,c.y);near(r.trailer.x,t.x,.008);near(r.trailer.y,t.y,.008);near(trailerImmersion(r,b).rearDepth,d.rearDepth);assert.equal(r.attached,true);assert.equal(r.hitchDamage,0);
 const x=r.car.x;for(let i=0;i<240;i++){r.ropeForce.x=40000;towStep(r,b,dt);}assert.ok(Math.abs(r.car.x-x)>.2,'a real external pull still overcomes finite parking friction');
});
test('an empty trailer and P/handbrake SUV stay at the same waterline while the launched displacement boat is moored and the full fleet continues to simulate',()=>{
 const b=createBoat('service',{profile:'cruiser',coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:8.9}),f=createFleet(b);r.handbrake=true;attachRope(b,'bow');const c={...r.car},t={...r.trailer},d=trailerImmersion(r,b);
 for(let i=0;i<120*30;i++)fleetStep(f,{...calm,windSpeed:2,currentSpeed:.5,windDirection:90,currentDirection:90},dt);
 near(r.car.x,c.x);near(r.car.y,c.y);near(r.trailer.y,t.y);near(trailerImmersion(r,b).rearDepth,d.rearDepth);assert.equal(r.attached,true);assert.equal(r.hitchDamage,0);assert.ok(b.time>29);assert.ok(b.ropes.length);
});
test('longer drawbar leaves 1.2 m ahead of the winch post; a 9 m boat has full midship buoyancy with front tyres still dry',()=>{
 const b=createBoat('lake',{profile:'cruiser'}),r=createTowRig(b,{atSlip:true,slipCarY:8.9});near(r.trailer.hitch-(r.trailer.offset+b.spec.length*.59+.35),1.2,1e-9);const d=trailerImmersion(r,b);assert.equal(d.frontDepth,0);assert.ok(d.rearDepth<.45);assert.equal(d.buoyancy,1);assert.equal(d.tooDeep,false);
});
test('safe articulation has no arbitrary 70-degree damage; body interference and the mechanical coupler limit still detect real jackknifing',()=>{
 for(const profile of['runabout','cruiser']){const b=createBoat('lake',{profile}),r=createTowRig(b,{loaded:true});align(r,75*Math.PI/180);let q=articulationStatus(r,b);assert.ok(q.clearance>0);assert.equal(q.contact,false);towStep(r,b,dt);assert.equal(r.hitchDamage,0);align(r,COUPLER_LIMIT+.06);q=articulationStatus(r,b);assert.equal(q.contact,true);r.time=2;towStep(r,b,dt);assert.ok(r.hitchDamage>0);}
});
test('old save keeps its exact coupler geometry and parked pose, while explicit reset adopts the longer drawbar without moving a launched boat',()=>{
 const b=createBoat('service',{profile:'cruiser',coldStart:true}),r=createTowRig(b,{atSlip:true,slipCarY:8.9});r.trailer.hitch=r.trailer.offset+b.spec.length*.5+1.45;delete r.geometryVersion;align(r,.065);r.handbrake=true;const f=createFleet(b),q=restoreSession(snapshotSession({fleet:f,env:calm,vehicle:'boat'}));assert.ok(q.ok);const saved=q.session.towRig;near(saved.trailer.hitch,r.trailer.hitch,1e-9);near(saved.car.y,r.car.y,1e-9);for(let i=0;i<1200;i++)towStep(saved,q.session.fleet.boats[0],dt);near(saved.car.y,r.car.y);const pose={x:b.x,y:b.y,a:b.a};resetTowVehicle(r,b);assert.equal(r.geometryVersion,1);assert.deepEqual({x:b.x,y:b.y,a:b.a},pose);
});
test('profile rope thickness and strength differ without replacing existing stiffness; capstan assistance is explicit and unavailable on small hulls',()=>{
 const small=createBoat('lake',{profile:'tender'}),large=createBoat('lake',{profile:'cruiser'}),s=mooringGear(small.spec,true),l=mooringGear(large.spec,true);assert.equal(s.ratio,1);assert.equal(l.ratio,4);assert.ok(l.diameter>s.diameter);assert.ok(l.strength>s.strength);assert.equal(l.strength,large.spec.lineBreak);assert.equal(l.power,88);assert.equal(l.speed,.1125);
});
test('held hauling takes slack faster, shares one crew effort and stops immediately; the capstan trades speed for bounded fourfold line force and survives Continue',()=>{
 const b=createBoat('berth',{profile:'cruiser'});attachRope(b,'bow');const r=b.ropes[0];r.length+=2;const length=r.length;requestHaul(r,-1);for(let i=0;i<120;i++)solveRopes(b,dt,()=>{});near(length-r.length,.45,1e-7);b.mooringAssist=true;for(let i=0;i<480;i++)solveRopes(b,dt,()=>{});assert.equal(r.gearRatio,4);assert.equal(r.manualForce,1800);assert.ok(-r.rate<=.1125+.000001);requestHaul(r,0);const held=r.length;for(let i=0;i<120;i++)solveRopes(b,dt,()=>{});assert.equal(r.length,held);assert.equal(r.manualForce,0);const q=restoreSession(snapshotSession({fleet:createFleet(b),env:calm}));assert.ok(q.ok);assert.equal(q.session.fleet.boats[0].mooringAssist,true);assert.equal(q.session.fleet.boats[0].ropes[0].control,0);
});
test('0.5 m/s beam current dominates a 2 m/s wind but both thrusters can oppose it through real forces without altering the current model',()=>{
 const trial=thrust=>{const b=createBoat('lake',{profile:'cruiser'});b.a=-Math.PI/2;b.thrusters.bow=b.thrusters.stern=thrust;const x=b.x;for(let i=0;i<1200;i++)step(b,{...calm,windSpeed:2,currentSpeed:.5,windDirection:90,currentDirection:90,spatialEffects:false},dt,{sharedStep:false});return{drift:b.x-x,force:b.thrusters.bowForce,voltage:b.battery.voltage};};const drift=trial(0),control=trial(-1);assert.ok(drift.drift>2&&drift.drift<5);assert.ok(control.drift<0);assert.ok(Math.abs(control.force)>800);assert.ok(control.voltage<drift.voltage);
});

test('capstan force changes the actual impulse and can haul farther against a physical opposing load, rather than only changing the UI mode',()=>{
 const trial=assisted=>{const b=createBoat('berth',{profile:'cruiser'});b.mooringAssist=assisted;attachRope(b,'bow');const r=b.ropes[0],p=cleat(b,'bow'),q=mooringPoint(b,r.bollard);r.length=Math.hypot(q.x-p.x,q.y-p.y);const initial=r.length;requestHaul(r,-1);for(let i=0;i<960;i++){const p=cleat(b,'bow'),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);impulse(b,{x:dx/d,y:dy/d},-600*dt,{x:0,y:0});solveRopes(b,dt,()=>{});b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;b.vx*=.999;b.vy*=.999;b.w*=.999;}return{hauled:initial-r.length,tension:r.tension};};const hand=trial(false),capstan=trial(true);assert.ok(capstan.hauled>hand.hauled+.15);assert.ok(capstan.tension>1000);assert.ok(hand.tension<=450.001);
});
