import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {engineState,updateEngine,engineKey} from '../src/craft.js';
import {recordTrail} from '../src/trail.js';
const free=(b,seconds,env={})=>{for(let i=0;i<seconds*120;i++){step(b,env,1/120);b.x=64;b.y=48;}return b;};
test('small steering remains a wide arc through full-throttle acceleration for every hull',()=>{
 for(const profile of ['tender','runabout','cabin','cruiser','pwc']){const b=createBoat('open',{profile,powers:[350]});b.a=0;b.steer=.025;b.throttle=1;free(b,25);const speed=Math.hypot(b.vx,b.vy);assert.ok(Math.abs(b.a)<.8,profile);assert.ok(Math.abs(b.w)<.04,profile);assert.ok(speed/Math.max(.0001,Math.abs(b.w))>b.spec.length*5,profile);assert.ok(Math.abs(b.telemetry.sway)<.3,profile);}
});
test('even a large turn at full 350 HP keeps an advancing path instead of spinning in place',()=>{
 const b=createBoat('open',{powers:[350]});b.a=0;b.throttle=1;b.steer=.5;free(b,20);const speed=Math.hypot(b.vx,b.vy);assert.ok(speed>6);assert.ok(Math.abs(b.w)<.4);assert.ok(speed/Math.abs(b.w)>b.spec.length*4);
 b.steer=0;free(b,8);assert.ok(Math.abs(b.w)<.015);assert.ok(Math.abs(b.telemetry.sway)<.15);
});
test('symmetric twins stay straight and held rudder makes gentle mirrored turns in reverse',()=>{
 const straight=createBoat('open',{engineCount:2,powers:[350,350]});straight.a=0;straight.throttle=1;free(straight,25);assert.ok(Math.abs(straight.w)<1e-9);assert.ok(Math.abs(straight.a)<1e-9);
 const ahead=createBoat('open'),back=createBoat('open');ahead.a=back.a=0;ahead.steer=back.steer=.03;ahead.throttle=.4;back.throttle=-.4;free(ahead,15);free(back,15);assert.ok(ahead.w>0&&back.w<0);assert.ok(Math.abs(back.a)<.6);
});
test('heat balance stays safe underway, but loss of cooling or prolonged restrained loading overheats',()=>{
 function heat(kind){const en=engineState(350);en.trim=en.trimTarget=kind==='trim'?1:.28;let peak=18;for(let i=0;i<240*120;i++){updateEngine(en,1,kind==='cruise'?10:0,1/120,0,{speed:kind==='cruise'?10:0,moored:kind==='moored',grounded:kind==='grounded'});peak=Math.max(peak,en.temperature);}return{en,peak};}
 const cruise=heat('cruise');assert.ok(cruise.peak>60&&cruise.peak<95);assert.equal(cruise.en.key,'running');
 for(const mode of ['trim','moored','grounded']){const {en,peak}=heat(mode);assert.ok(peak>=145,mode);assert.equal(en.key,'ignition');assert.ok(en.thermalTrip);assert.equal(en.thrust,0);}
});
test('lowering trim and reducing throttle restores cooling and permits restart after cooldown',()=>{
 const b=createBoat('open');const en=b.engines[0];en.temperature=125;en.trim=en.trimTarget=1;en.n=.8;en.gear=1;
 updateEngine(en,1,5,.1,0,{speed:5});assert.ok(en.thermalLimit<1);en.trimTarget=.25;for(let i=0;i<90*120;i++)updateEngine(en,0,0,1/120);assert.ok(en.temperature<100);assert.ok(en.cooling>.5);engineKey(b,0,'ignition');assert.equal(en.key,'ignition');assert.equal(engineKey(b,0,'start').ok,true);
 en.temperature=130;engineKey(b,0,'off');assert.equal(engineKey(b,0,'start').ok,false);
});
test('distance-based trail ignores still-water jitter and records slow genuine movement',()=>{
 const trail=[];for(let i=0;i<10000;i++)recordTrail(trail,{x:30+Math.sin(i)*.02,y:50+Math.cos(i)*.02});assert.equal(trail.length,1);
 for(let i=0;i<1000;i++)recordTrail(trail,{x:30+i*.003,y:50});assert.ok(trail.length>=8&&trail.length<12);for(let i=1;i<trail.length;i++)assert.ok(Math.hypot(trail[i].x-trail[i-1].x,trail[i].y-trail[i-1].y)>=.35);
});
