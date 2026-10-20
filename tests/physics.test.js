import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,cleat,BOLLARDS,impactClass,MODEL} from '../src/physics.js';
const calm={windSpeed:0,windDirection:90,currentSpeed:0,currentDirection:90,gusts:false};
function run(b,seconds,e=calm){for(let i=0;i<seconds*120;i++)step(b,e,1/120);return b;}
test('rest is stable in still water',()=>{const b=createBoat('open'),x=b.x,y=b.y;run(b,30);assert.equal(b.x,x);assert.equal(b.y,y);assert.equal(b.w,0);});
test('neutral retains momentum, water drag gradually slows boat',()=>{const b=createBoat('open');b.a=0;b.vx=2;run(b,1);assert.ok(b.vx>1&&b.vx<2);assert.ok(b.x>61);run(b,20);assert.ok(b.vx<.7);});
test('outboard accelerates forward and reverse, reverse has less thrust',()=>{const f=createBoat('open'),r=createBoat('open');f.a=r.a=0;f.throttle=1;r.throttle=-1;run(f,2);run(r,2);assert.ok(f.vx>.5&&f.vx<1.5);assert.ok(r.vx< -.2&&r.vx>-.8);assert.ok(f.vx>Math.abs(r.vx));});
test('wheel holds position and outboard torque reverses in reverse gear',()=>{const f=createBoat('open'),r=createBoat('open');f.steer=r.steer=.35;f.throttle=.4;r.throttle=-.4;run(f,2);run(r,2);assert.ok(f.w>0);assert.ok(r.w<0);assert.equal(f.steer,.35);});
test('wind moves and turns a boat in neutral',()=>{const b=createBoat('open');run(b,12,{...calm,windSpeed:7});assert.ok(b.x>62);assert.ok(Math.abs(b.w)>.001);assert.equal(b.throttle,0);});
test('current entrains a boat relative to land without engine',()=>{const b=createBoat('open');run(b,25,{...calm,currentSpeed:.6});assert.ok(b.vx>.45&&b.vx<.61);assert.ok(b.x>67);});
test('ropes attach only within range and reject duplicate cleats',()=>{const b=createBoat('open');assert.equal(attachRope(b,'bow').ok,false);const n=createBoat('berth');assert.equal(attachRope(n,'bow').ok,true);assert.equal(attachRope(n,'bow').ok,false);assert.equal(n.ropes.length,1);});
test('slack rope does not push; taut rope exerts force and torque',()=>{const b=createBoat('berth');attachRope(b,'bow');b.ropes[0].length=12;run(b,1);assert.equal(b.maxTension,0);assert.equal(b.vx,0);const r=b.ropes[0];const p=cleat(b,'bow'),q=BOLLARDS[r.bollard];r.length=Math.hypot(p.x-q.x,p.y-q.y)-.2;step(b,calm,1/120);assert.ok(b.maxTension>0);assert.ok(Math.hypot(b.vx,b.vy)>0);assert.ok(Math.abs(b.w)>0);});
test('overloaded rope breaks instead of destabilizing integration',()=>{const b=createBoat('berth');attachRope(b,'bow');b.ropes[0].length=.5;step(b,calm,1/120);assert.equal(b.ropes.length,0);assert.match(b.events[0].message,/pękła/);});
function collide(speed,fenders=true){const b=createBoat('berth');b.x=20.9;b.y=22;b.a=-Math.PI/2;b.vx=-speed;b.fenders=fenders;run(b,.5);return b;}
test('side contact with fenders protects low-speed docking',()=>{const b=collide(.2);assert.ok(b.lastImpact);assert.equal(b.lastImpact.protectedContact,true);assert.equal(b.damage,0);const bare=collide(.2,false);assert.ok(bare.damage>0);});
test('fast pier impact destroys hull and dock, cuts propulsion',()=>{const b=collide(2.2);assert.equal(b.damage,100);assert.equal(b.dockDamage,100);assert.equal(b.throttle,0);assert.ok(b.x>20.5);});
test('rotation alone contributes to collision damage',()=>{const b=createBoat('berth');b.x=20.85;b.y=22;b.a=-Math.PI/2;b.w=-1.2;run(b,.25);assert.ok(b.lastImpact?.speed>.3);assert.ok(b.damage>0);});
test('thresholds are explicit and depend on fender protection',()=>{assert.equal(impactClass(.15),'gentle');assert.equal(impactClass(.2),'damage');assert.equal(impactClass(.3,true),'gentle');assert.equal(impactClass(1.5),'destruction');assert.equal(impactClass(1.79,true),'damage');assert.equal(impactClass(1.8,true),'destruction');});
test('long gusty simulation stays finite and inside the lake',()=>{const b=createBoat('open');b.throttle=.45;b.steer=.2;run(b,180,{...calm,windSpeed:12,currentSpeed:1.2,gusts:true});for(const key of ['x','y','a','vx','vy','w'])assert.ok(Number.isFinite(b[key]),key);assert.ok(b.x>3&&b.x<181);assert.ok(b.y>3&&b.y<111);assert.ok(b.damage>=0&&b.damage<=100);});
test('rope damping resists separating motion and reduces force while approaching',()=>{
 const b=createBoat('berth');attachRope(b,'bow');const r=b.ropes[0],p=cleat(b,'bow'),q=BOLLARDS[r.bollard],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);r.length=d-.15;
 const away=structuredClone(b),toward=structuredClone(b);away.vx=-dx/d*.3;away.vy=-dy/d*.3;toward.vx=dx/d*.3;toward.vy=dy/d*.3;
 step(away,calm,1/120);step(toward,calm,1/120);assert.ok(away.maxTension>toward.maxTension);assert.ok(toward.maxTension>=0);
});
