import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {hullLateralForces} from '../src/hydrodynamics.js';
import {recordHullWake,sampleHullWake,wakeEdges} from '../src/wake.js';
import {contactZone,recordImpact,impactPaint} from '../src/impacts.js';
const speed=b=>Math.hypot(b.vx,b.vy);
const run=(b,t,free=true)=>{for(let i=0;i<t*120;i++){step(b,{},1/120);if(free){b.x=64;b.y=48;}}return b;};
function entry(options={}){const b=createBoat('open',options);b.a=0;b.vx=9;b.planing=.9;b.throttle=1;b.engines[0].n=.95;b.engines[0].gear=1;b.steer=b.spec.maxSteer;return b;}
test('at the same entry speed weak power falls off plane, strong power maintains a tighter powered turn',()=>{
 const weak=run(entry({powers:[45]}),12),strong=run(entry({powers:[350]}),12);
 assert.ok(speed(weak)<7&&weak.planing<.25);assert.ok(speed(strong)>9&&strong.planing>.75);
 assert.ok(speed(strong)/strong.w<speed(weak)/weak.w*.6);assert.ok(strong.telemetry.thrust>weak.telemetry.thrust*2);
 for(const b of [weak,strong]){const stern=b.telemetry.sway-b.w*b.spec.length*.44,bow=b.telemetry.sway+b.w*b.spec.length*.44;assert.ok(stern<-.8);assert.ok(Math.abs(stern)>Math.abs(bow)*2);assert.ok(b.telemetry.surge>Math.abs(b.telemetry.sway)*3);}
});
test('extra hull mass reduces angular response and ability to hold planing at the same power',()=>{
 const light=run(entry({powers:[350],hullMass:800}),12),heavy=run(entry({powers:[350],hullMass:2200}),12);
 assert.ok(heavy.w<light.w*.7);assert.ok(heavy.planing<.3&&light.planing>.75);
 assert.ok(speed(heavy)/heavy.w>speed(light)/light.w*1.5);
});
test('powered hard turns mirror without introducing a preferred yaw direction',()=>{
 const right=entry({powers:[350]}),left=entry({powers:[350]});left.steer*=-1;run(right,10);run(left,10);
 assert.ok(Math.abs(right.w+left.w)<1e-8);assert.ok(Math.abs(right.telemetry.sway+left.telemetry.sway)<1e-8);assert.ok(Math.abs(speed(right)-speed(left))<1e-8);
});
test('jet pump responds faster at equal power and PWC makes a tighter planing turn',()=>{
 const jet=createBoat('open',{profile:'pwc',powers:[170]}),outboard=createBoat('open',{powers:[170]});
 for(const b of [jet,outboard]){b.a=0;b.throttle=1;b.steer=b.spec.maxSteer;run(b,2);}
 assert.ok(speed(jet)>speed(outboard)*3);assert.ok(jet.w>outboard.w*2);
 const turning=run(entry({profile:'pwc',powers:[170]}),12);assert.ok(turning.planing>.65);assert.ok(speed(turning)/turning.w<turning.spec.length*3.5);
});
test('taking most throttle off a planing boat brakes it into displacement while it keeps advancing',()=>{
 const b=createBoat('open');b.a=0;b.throttle=1;run(b,40);const top=speed(b);assert.ok(b.planing>.9);
 b.throttle=.12;run(b,6);assert.ok(speed(b)<top*.55);run(b,12);assert.ok(b.planing<.02);assert.ok(b.telemetry.surge>1&&b.telemetry.surge<3.5);assert.equal(b.engines[0].gear,1);
});
test('every distributed hull force remains passive at large sideslip and yaw',()=>{
 for(const profile of ['runabout','cabin','pwc'])for(const u of [-8,0,12])for(const v of [-3,.1,3])for(const r of [-1,.02,1]){
  const S=createBoat('open',{profile}).spec;let power=0;
  hullLateralForces(S,u,v,r,.9,(fx,fy,x)=>power+=fx*u+fy*(v+r*x));assert.ok(power<=1e-8);
 }
});
test('wake surface follows the visible crest, decays and cannot be created by rotating stationary snapshots',()=>{
 const b=createBoat('open');b.a=0;b.vx=10;const history=[];
 for(let i=0;i<30;i++){b.x=120+i*2;b.y=110;b.time=i*.2;recordHullWake(history,b,{x:.3,y:0});}
 const crest=wakeEdges(history[12],9)[1],wave=sampleHullWake(history,crest.x,crest.y,9);
 assert.ok(wave.eta>.02&&wave.eta<.25);assert.equal(sampleHullWake(history,crest.x+200,crest.y+200,9).eta,0);assert.equal(sampleHullWake(history,crest.x,crest.y,40).eta,0);
 const rest=[];for(let i=0;i<1000;i++){b.time=10+i/120;b.a+=.01;recordHullWake(rest,b,{x:0,y:0});}assert.equal(rest.length,1);
});
test('returning across an actual curved wake produces bounded heave on otherwise flat water',()=>{
 const b=createBoat('open',{powers:[350]});b.a=0;b.throttle=1;run(b,45);b.wake=[];b.x=120;b.y=110;b.steer=b.spec.maxSteer;
 let encounter=0,heave=0;for(let i=0;i<3600;i++){step(b,{},1/120);encounter=Math.max(encounter,b.wakeEncounter);heave=Math.max(heave,Math.abs(b.heave));}
 assert.ok(encounter>.04);assert.ok(heave>.01&&heave<.3);assert.ok(b.wake.length>50&&b.wake.length<=155);assert.equal(b.damage,0);
});
function collide(speed,fenders=true,bow=false){const b=createBoat('berth');b.x=bow?22.7:20.9;b.y=22;b.a=bow?Math.PI:-Math.PI/2;b.vx=-speed;b.fenders=fenders;return run(b,.6,false);}
test('gentle fender contact flashes its real fender without marking undamaged hull',()=>{
 const b=collide(.2);assert.equal(b.damage,0);assert.ok(b.lastImpact.protectedContact);assert.ok(b.lastImpact.fender);assert.ok(impactPaint(b,b.lastImpact.fender,true).flash>0);assert.equal(impactPaint(b,b.lastImpact.zone).color,null);
 b.time+=2;assert.equal(impactPaint(b,b.lastImpact.fender,true).color,null);
});
test('bow impact bypasses side fenders and identifies the damaged hull section',()=>{
 const b=collide(.5,true,true);assert.ok(b.damage>0);assert.equal(b.lastImpact.zone,'bow');assert.equal(b.lastImpact.protectedContact,false);assert.ok(b.sectionDamage.bow>0);assert.ok(impactPaint(b,'bow').flash>0);
 b.time+=2;assert.equal(impactPaint(b,'bow').flash,0);assert.equal(impactPaint(b,'bow').color,'#bf6350');assert.equal(impactPaint(b,'portStern').color,null);
});
test('contact zones rotate with the boat, and jitter cooldown does not hide a different hit',()=>{
 const b=createBoat('open');b.a=Math.PI/2;const arm={x:b.spec.beam/2,y:b.spec.length*.25};assert.equal(contactZone(b,arm),'portBow');
 recordImpact(b,{arm,speed:.5,effective:500,target:'test'});const damage=b.damage;recordImpact(b,{arm,speed:.5,effective:500,target:'test'});assert.equal(b.damage,damage);
 recordImpact(b,{arm:{x:-arm.x,y:-arm.y},speed:.5,effective:500,target:'test'});assert.ok(b.damage>damage);assert.ok(b.sectionDamage.starboardStern>0);
 const fresh=createBoat('open');assert.equal(fresh.damage,0);assert.deepEqual(fresh.sectionDamage,{});assert.deepEqual(fresh.impacts,[]);
});
