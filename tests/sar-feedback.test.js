import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {createFleet} from '../src/fleet.js';
import {throwRescue,recoverRescue,rescueStep} from '../src/rescue-scene.js';
import {pickupStatus} from '../src/rescue.js';
import {rescueApproach,rescueContactMeasurement,rescueResult} from '../src/rescue-metrics.js';
import {thermalStep,coolingWarning} from '../src/thermal.js';
import {propellerContact} from '../src/ground.js';
import {driveGeometry} from '../src/drive.js';
import {bottomAt,BOLLARDS,shoreAt} from '../src/world.js';
import {snapshotSession,restoreSession,SAVE_KEY} from '../src/session-save.js';
import {createLogbook,captureLogbook} from '../src/logbook.js';
const calm={windSpeed:0,currentSpeed:0,waveHeight:0,traffic:false},dt=1/120;
const scene=()=>{const b=createBoat('lake',{coldStart:true}),f=createFleet(b),o=throwRescue(f,b,'mob').object;Object.assign(o,{vx:0,vy:0});return{b,f,o};};
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
test('ground support does not mean a dry intake; submerged running idle stays cooled even in reeds or while bow is grounded',()=>{
 const {b}=scene(),e=b.engines[0];e.key='running';e.n=.22;e.load=.2;e.gear=0;b.grounded=true;b.reeds=1;
 for(let i=0;i<1200;i++)thermalStep(e,dt,{intake:1,grounded:true});
 assert.ok(e.cooling>.6);assert.equal(coolingWarning(b),'');assert.ok(e.temperature<95);
 const tree=BOLLARDS.find(q=>q.id==='EUZ-D5'),normal=shoreAt(tree.x,tree.y),actual=createBoat('euzebia',{profile:'tender'});Object.assign(actual,{x:tree.x+normal.nx*5,y:tree.y+normal.ny*5,a:Math.atan2(-normal.ny,-normal.nx)});actual.engines[0].trim=actual.engines[0].trimTarget=0;let groundedWet=0,load=0;
 for(let i=0;i<240;i++){step(actual,calm,dt);if(actual.grounded&&actual.engines[0].intake>.9&&!actual.engines[0].intakeBlocked)groundedWet++;load=Math.max(load,actual.groundLoad);assert.equal(coolingWarning(actual),'');}
 assert.ok(groundedWet>120&&load>0&&actual.reeds>.8);
});
test('intake burial is derived from actual bottom clearance, independently of hull support',()=>{
 const t=BOLLARDS.find(q=>q.id==='D1'),normal=shoreAt(t.x,t.y),b=createBoat('beach'),e=b.engines[0];b.a=Math.atan2(normal.ny,normal.nx);e.key='running';e.trim=e.trimTarget=0;let buried=false,clear=false;
 for(let d=1;d<16;d+=.5){b.x=t.x+normal.nx*d;b.y=t.y+normal.ny*d;b.heave=0;const g=driveGeometry(b,e,calm);propellerContact(b,e,dt,()=>{},calm);
  if(g.intakeClearance<0&&g.intake>.05){assert.equal(e.intakeBlocked,true);thermalStep(e,dt,{intake:e.intake,intakeBlocked:e.intakeBlocked});assert.match(coolingWarning(b),/przy dnie/);buried=true;}
  if(g.intakeClearance>.1&&g.intake>.9){assert.equal(e.intakeBlocked,false);clear=true;}
 }
 assert.ok(buried&&clear);
});
test('lowering advice appears only for a raised and exposed drive, with different instructions for low trim and buried intake',()=>{
 const {b}=scene(),e=b.engines[0];e.key='running';e.cooling=0;e.intake=0;e.trim=1;assert.match(coolingWarning(b),/opuść napęd/);e.trim=0;assert.doesNotMatch(coolingWarning(b),/opuść/);e.intake=1;e.intakeBlocked=true;assert.match(coolingWarning(b),/przy dnie/);e.key='off';assert.equal(coolingWarning(b),'');
});
test('SAR radial closing speed differs from relative speed and includes turning at the pickup point',()=>{
 const {b,o}=scene();Object.assign(o,{x:b.x+10,y:b.y,vx:1});b.vx=3;b.vy=0;let q=rescueApproach(b,o);near(q.closingSpeed,2);near(q.relativeSpeed,2);b.vx=-1;q=rescueApproach(b,o);near(q.closingSpeed,-2);b.vx=1;b.vy=2;q=rescueApproach(b,o);near(q.closingSpeed,0);near(q.relativeSpeed,2);b.vy=0;b.w=1;assert.ok(rescueApproach(b,o).relativeSpeed>2);
});
test('SAR pickup permits actual gear F with a penalty but still rejects excessive relative speed',()=>{
 const {b,o}=scene();b.engines[0].key='running';b.engines[0].gear=1;b.throttle=0;assert.equal(pickupStatus(b,o).ok,true);assert.equal(rescueResult(b,o,0).score,70);b.engines[0].gear=0;assert.equal(pickupStatus(b,o).ok,true);b.w=1;assert.equal(pickupStatus(b,o).ok,false);
});
test('contact force estimate grows with impact speed squared and object mass, vanishes at rest and does not change velocities',()=>{
 const {b,o}=scene(),before=[b.vx,o.vx];b.vx=1;const a=rescueContactMeasurement(b,o,{x:1,y:0},80);b.vx=2;const fast=rescueContactMeasurement(b,o,{x:1,y:0},80),ring=rescueContactMeasurement(b,{...o,kind:'ring'},{x:1,y:0},2.5);near(fast.force,a.force*4);assert.ok(fast.force>ring.force*10);b.vx=0;assert.equal(rescueContactMeasurement(b,o,{x:1,y:0},80).force,0);assert.deepEqual([b.vx,o.vx],before);
});
test('physical MOB contact registers force before the soft solver pushes it aside; stationary overlap has zero impact force',()=>{
 const {b,f,o}=scene();Object.assign(o,{x:b.x+2.5,y:b.y,vx:0,vy:0});b.vx=2;b.engines[0].gear=1;rescueStep(f,calm,dt);const m=o.contactMetrics[b.id];assert.ok(m.peakForce>1000);assert.ok(m.inGear);assert.equal(m.contacts,1);assert.ok(o.vx>0);assert.equal(b.damage,0);
 const quiet=scene();Object.assign(quiet.o,{x:quiet.b.x,y:quiet.b.y,vx:0,vy:0});rescueStep(quiet.f,calm,dt);assert.equal(quiet.o.contactMetrics[quiet.b.id].peakForce,0);
});
test('SAR score penalises pickup speed, peak contact force and touching in gear, while recording actual engine keys and N',()=>{
 const {b,o}=scene(),perfect=rescueResult(b,o,20);assert.equal(perfect.score,100);b.vx=.5;const quick=rescueResult(b,o,20);assert.ok(quick.score<perfect.score);o.contactMetrics={[b.id]:{peakForce:800,contacts:1,inGear:true}};const hit=rescueResult(b,o,20);assert.ok(hit.score<quick.score);assert.equal(hit.enginesNeutral,true);assert.equal(hit.engines[0].key,'off');assert.equal(hit.peakForce,800);
});
test('completed SAR is saved in the current session and Logbook once, with physical duration and measured speed, force and engine state',()=>{
 const {b,f,o}=scene();f.logbookId='sar';f.time=12;b.time=12;const result=recoverRescue(f,b,o.id);assert.ok(result.ok);assert.equal(result.result.elapsed,12);assert.equal(result.result.enginesNeutral,true);assert.equal(f.rescue.lastResult.score,100);let book=captureLogbook(createLogbook(),f,100000);assert.equal(book.events.filter(e=>e.type==='sar').length,2);assert.ok(book.events[0].message.includes('kontakt szac. 0 N'));const count=b.logEvents.length;assert.equal(recoverRescue(f,b,o.id).ok,false);assert.equal(b.logEvents.length,count);book=captureLogbook(book,f,110000);assert.equal(book.events.length,2);
 const saved=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(saved.ok,saved.message);assert.deepEqual(saved.session.fleet.rescue.lastResult,f.rescue.lastResult);assert.equal(SAVE_KEY,'przystan-session-v1');
});
test('selected object and per-boat contact measurements survive reload; malformed new result is rejected while legacy rescue remains readable',()=>{
 const {b,f,o}=scene();Object.assign(o,{x:b.x+2.5,y:b.y});b.vx=.2;rescueStep(f,calm,dt);const s=snapshotSession({fleet:f,env:calm}),r=restoreSession(s);assert.ok(r.ok,r.message);assert.equal(r.session.fleet.rescue.targetId,o.id);assert.ok(r.session.fleet.rescue.objects[0].contactMetrics[b.id].peakForce>0);b.vx=0;Object.assign(o,{x:b.x,y:b.y+2,vx:0,vy:0});assert.ok(recoverRescue(f,b,o.id).ok);const bad=snapshotSession({fleet:f,env:calm});bad.fleet.rescue.lastResult.pickupSpeed=-1;assert.equal(restoreSession(bad).ok,false);
});
test('a high-speed racer contact cannot invalidate autosave simply because the yielding float briefly exceeds 30 m/s',()=>{
 const {b,f,o}=scene();Object.assign(o,{x:b.x+2.5,y:b.y,vx:0,vy:0});b.vx=34;rescueStep(f,calm,dt);assert.ok(o.vx>30);assert.ok(restoreSession(snapshotSession({fleet:f,env:calm})).ok);
});
test('waterjet cooling uses its measured wet intake too, retaining full flow when submerged and none when exposed',()=>{
 const {b}=scene(),e=b.engines[0];e.key='running';e.n=.5;thermalStep(e,dt,{jet:true,intake:0});assert.equal(e.cooling,0);thermalStep(e,dt,{jet:true,intake:1});assert.equal(e.cooling,1);
});
