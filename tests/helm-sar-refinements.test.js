import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {createFleet,addFleetBoat,fleetStep} from '../src/fleet.js';
import {sternPowerOnState,oarForces} from '../src/maneuver-transient.js';
import {hullLateralForces} from '../src/hydrodynamics.js';
import {propulsionFlow,spreadingJet} from '../src/local-water.js';
import {recordBrakingWave,sampleBrakingWaves} from '../src/braking-waves.js';
import {throwRescue,scheduleRescue,rescueStep,recoverRescue} from '../src/rescue-scene.js';
import {advanceRescueObject,validRescueState} from '../src/rescue.js';
import {snapshotSession,restoreSession,SAVE_KEY} from '../src/session-save.js';
import {appendRestorePoint,readRestoreHistory,chooseRestorePoints,unpackRestorePoint,HISTORY_KEY} from '../src/restore-history.js';
import {anchorWinch,windlassPowered} from '../src/anchor-winch.js';
import {anchorCommand,updateAnchor} from '../src/rigging.js';
import {electricalStep,setMainPower} from '../src/electrical.js';
import {nearbyEngines} from '../src/spatial-audio.js';
import {createFleetCraft} from '../src/fleet-craft.js';
import {localAttachment} from '../src/attachment-points.js';
const dt=1/120,calm={windSpeed:0,currentSpeed:0,waveHeight:0,traffic:false},near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} / ${b}`);
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};

test('stern release distinguishes sudden thrust, gradual application, steering, speed and propulsion; steady thrust decays',()=>{
 const s=createBoat('lake').spec,e=[{effectiveThrust:4000,forceSteer:s.maxSteer}];
 const abrupt=sternPowerOnState(s,e,s.maxSteer,0,.1,{lateral:0}),ramp=sternPowerOnState(s,e,s.maxSteer,0,5,{lateral:0});assert.ok(abrupt.release>ramp.release*2);
 assert.equal(sternPowerOnState(s,e,s.maxSteer,8,.1,{lateral:0}).release,0);assert.equal(sternPowerOnState(s,e,0,0,.1,{lateral:0}).release,0);
 assert.equal(sternPowerOnState({...s,propulsion:'inboard'},e,s.maxSteer,0,.1,{lateral:0}).release,0);
 assert.ok(sternPowerOnState(s,e,s.maxSteer,0,2,abrupt).release<abrupt.release*.1);
});
test('power-on stern release remains dissipative at each hull strip and cannot produce free lateral energy',()=>{
 const s=createBoat('lake').spec;for(const burst of [0,.5,1])for(const [u,v,r]of [[0,.5,.4],[2,-.7,.3],[9,1,-.5]]){let energy=0;hullLateralForces(s,u,v,r,.5,(_,fy,x)=>{assert.ok(fy*(v+r*x)<=1e-9);energy+=fy*(v+r*x);},1,burst);assert.ok(energy<0);}
});
test('actual strong outboard kicks its stern more than a weak or slowly opened engine while still translating forward',()=>{
 const run=(hp,ramp)=>{const b=createBoat('lake',{powers:[hp]});b.steer=b.actualSteer=b.spec.maxSteer;let release=0;for(let i=0;i<360;i++){b.throttle=ramp?i/600:1;step(b,calm,dt);release=Math.max(release,b.powerOn.release);}return{b,release};};
 const strong=run(350,false),weak=run(60,false),gentle=run(350,true);assert.ok(strong.b.w>weak.b.w*1.5);assert.ok(Math.abs(strong.b.telemetry.sway)>Math.abs(weak.b.telemetry.sway)*2);assert.ok(strong.b.telemetry.surge>1);assert.ok(strong.release>gentle.release*1.5);
});
test('differential rowing pivots without net surge at full helm, straight rowing propels and neutral has no oar force',()=>{
 const b=createFleetCraft('rowboat'),s=b.spec;const turn=oarForces(s,0,1,s.maxSteer);near(turn.port+turn.starboard,0);assert.ok(turn.port>0&&turn.starboard<0);const straight=oarForces(s,0,1,0);near(straight.port,straight.starboard);near(oarForces(s,0,0,s.maxSteer).port,0);
 b.occupied=true;b.throttle=1;b.steer=b.actualSteer=s.maxSteer;for(let i=0;i<360;i++)step(b,calm,dt);assert.ok(b.w>.01);assert.ok(Math.hypot(b.vx,b.vy)<.15);
});
test('propeller jet follows actual vectored thrust and reverse, with zero flow on neutral, stopped motor or airboat',()=>{
 const b=createBoat('lake'),e=b.engines[0];e.gear=1;e.effectiveThrust=2000;e.forceSteer=.4;e.immersion=1;const q=propulsionFlow([b],b.x-5,b.y+1.3);assert.ok(q.x<-.1&&q.y>0);e.gear=-1;const reverse=propulsionFlow([b],b.x,b.y-1);assert.ok(reverse.x>0&&reverse.y<0);e.gear=0;assert.deepEqual(propulsionFlow([b],b.x-5,b.y),{x:0,y:0});e.gear=1;e.key='off';assert.deepEqual(propulsionFlow([b],b.x-5,b.y),{x:0,y:0});const air=createBoat('lake',{profile:'swamp'});air.engines[0].effectiveThrust=4000;air.engines[0].gear=1;assert.deepEqual(propulsionFlow([air],air.x-5,air.y),{x:0,y:0});
});
test('finite jets spread and attenuate, and powered thrusters push a nearby float opposite the boat reaction',()=>{
 const a=spreadingJet(1,0,{x:0,y:0},0,2000,.2),far=spreadingJet(10,0,{x:0,y:0},0,2000,.2);assert.ok(a.x>far.x&&far.x>0);assert.equal(spreadingJet(-1,0,{x:0,y:0},0,2000,.2).x,0);
 const b=createBoat('lake',{bowThruster:true,coldStart:true});b.thrusters.bowForce=400;const x=b.x+b.spec.length*.38,y=b.y-b.spec.beam;assert.ok(propulsionFlow([b],x,y).y<-.1);setMainPower(b,false);assert.deepEqual(propulsionFlow([b],x,y),{x:0,y:0});
});
test('braking surge is finite, delayed, strongest ahead and transports a MOB after the wavefront arrives',()=>{
 const b=createBoat('lake');b.wakeSpeed=8;b.vx=7;b.time=1;recordBrakingWave(b,{x:0,y:0},dt);assert.equal(b.brakingWaves.length,1);const q=b.brakingWaves[0],x=q.x+8,y=q.y;assert.equal(sampleBrakingWaves(b.brakingWaves,x,y,1.1).eta,0);
 const arrival=1+(8-q.initial)/q.speed,w=sampleBrakingWaves(b.brakingWaves,x,y,arrival);assert.ok(w.eta>.05&&w.driftX>0);assert.ok(w.eta>sampleBrakingWaves(b.brakingWaves,q.x-8,y,arrival).eta*3);assert.equal(sampleBrakingWaves(b.brakingWaves,x,y,20).eta,0);
 let o={kind:'mob',x,y,a:0,vx:0,vy:0,heave:0,roll:0};let peak=0;for(let t=1;t<8;t+=dt){const w=sampleBrakingWaves(b.brakingWaves,o.x,o.y,t);o=advanceRescueObject(o,{wind:{x:0,y:0},current:{x:w.driftX,y:w.driftY}},w,{depth:10},dt);peak=Math.max(peak,Math.abs(o.heave));}assert.ok(peak>.03);assert.ok(Math.abs(o.x-x)>.02);
});
test('actual rescue solver moves a stationary ring in a powered thruster stream, not with an inactive thruster',()=>{
 const trial=force=>{const b=createBoat('lake',{bowThruster:true,coldStart:true}),f=createFleet(b),o=throwRescue(f,b,'ring',-1).object;Object.assign(o,{x:b.x+b.spec.length*.38,y:b.y-b.spec.beam,vx:0,vy:0});b.thrusters.bowForce=force;const y=o.y;for(let i=0;i<240;i++){f.time=b.time=i*dt;rescueStep(f,calm,dt);}return y-o.y;};assert.ok(trial(450)>trial(0)+.1);
});
test('scheduled SAR uses physical time, survives save, throws on a random available side and records an alarm sequence',()=>{
 const b=createBoat('lake',{coldStart:true}),f=createFleet(b);scheduleRescue(f,b,'mob',()=>0);assert.equal(f.rescue.pending.at,30);const saved=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(saved.ok);const g=saved.session.fleet;g.time=29.99;rescueStep(g,calm,dt);assert.equal(g.rescue.objects.length,0);g.time=30;rescueStep(g,calm,dt);assert.equal(g.rescue.objects.length,1);assert.equal(g.rescue.pending,null);assert.equal(g.rescue.alarmSequence,1);assert.ok(validRescueState(g.rescue));
});
test('in-gear recovery is permitted and records the real gear plus scoring penalty in the voyage log',()=>{
 const b=createBoat('lake'),f=createFleet(b),o=throwRescue(f,b,'mob').object;o.vx=o.vy=0;b.engines[0].gear=1;const r=recoverRescue(f,b,o.id,{random:()=>0});assert.ok(r.ok);assert.equal(r.result.score,70);assert.equal(r.result.enginesNeutral,false);assert.equal(r.result.engines[0].gear,1);assert.match(b.logEvents.at(-1).message,/biegi F\/R/);
});
test('compressed 30 s / 3 min / 5 min restore points recover real positions and counters, leaving main autosave untouched',async()=>{
 const store=storage(),f=createFleet(createBoat('lake'));store.setItem(SAVE_KEY,'current');for(let i=0;i<=10;i++){f.boats[0].operations.distance=i*100;await appendRestorePoint(store,JSON.stringify(snapshotSession({fleet:f,env:calm},100000+i*30000)),100000+i*30000);}
 const items=readRestoreHistory(store);assert.equal(items.length,11);assert.equal(items[0].encoding,'gzip');const selected=chooseRestorePoints(items,400000);assert.deepEqual(selected.map(q=>q.record.at),[370000,220000,100000]);for(const q of selected){const r=await unpackRestorePoint(q.record);assert.ok(r.ok);assert.equal(r.session.fleet.boats[0].operations.distance,(q.record.at-100000)/300);}
 assert.equal(store.getItem(SAVE_KEY),'current');assert.ok(store.getItem(HISTORY_KEY).length<1400000);assert.deepEqual(chooseRestorePoints(items,1000000).map(q=>q.record),[null,null,null]);
});
test('restore history rejects malformed data and storage denial never damages the current save',async()=>{
 const store=storage();store.setItem(HISTORY_KEY,'{"version":1,"items":[{"at":0,"data":4}]}');assert.deepEqual(readRestoreHistory(store),[]);assert.equal((await unpackRestorePoint({encoding:'gzip',data:'bad'})).ok,false);const denied={getItem:()=>null,setItem:()=>{throw Error('Quota');}};assert.equal((await appendRestorePoint(denied,'{}',30000)).ok,false);
});
test('anchor retrieval speeds and force depend on hull, with physical electrical load and a holding brake on power loss',()=>{
 const small=createBoat('lake',{profile:'tender'}),large=createBoat('lake',{profile:'cabin'});assert.ok(anchorWinch(small.spec).up<anchorWinch(large.spec).up);assert.ok(anchorWinch(small.spec).force<anchorWinch(large.spec).force);
 assert.ok(anchorCommand(large,'lower',10).ok);updateAnchor(large,calm,.5,()=>{});assert.ok(large.anchor.electricalAmps>0);electricalStep(large,.5);assert.ok(large.battery.loads.windlass>0);const length=large.anchor.length;setMainPower(large,false);assert.equal(windlassPowered(large),false);updateAnchor(large,calm,.5,()=>{});assert.equal(large.anchor.mode,'holding');assert.equal(large.anchor.length,length);assert.equal(large.anchor.electricalAmps,0);assert.equal(anchorCommand(large,'raise').ok,false);
});
test('nearby engines stay audible after changing boat and fade with actual distance; active boat is excluded',()=>{
 const a=createBoat('lake'),b=createBoat('lake');a.id='a';b.id='b';b.x=a.x+5;let voices=nearbyEngines([a,b],a,a.id);assert.equal(voices.length,1);const gain=voices[0].gain;b.x=a.x+50;assert.ok(nearbyEngines([a,b],a,a.id)[0].gain<gain*.2);b.x=a.x+141;assert.equal(nearbyEngines([a,b],a,a.id).length,0);b.x=a.x+5;b.engines[0].key='off';assert.equal(nearbyEngines([a,b],a,a.id).length,0);
});
test('PWC has a bow towing eye forward of the centre of mass',()=>{const b=createBoat('lake',{profile:'pwc'}),p=localAttachment(b.spec,'bow');assert.ok(p.x>b.spec.length*.4);});

test('wake broad-phase cache preserves continuous equations inside an epoch, at activation/expiry and after a new snapshot',async()=>{
 const{sampleHullWake}=await import('../src/wake.js'),{referenceHullWake}=await import('./wake-reference-v24.js');const h=Array.from({length:8},(_,i)=>({x:80+i*1.5,y:100,nx:0,ny:1,time:i*.2,currentX:.2,currentY:0,spread:3,width:1,amplitude:.18}));
 for(const time of[1.741,1.749,1.751,1.799,1.801,35.999,36.001,36.049])for(let i=0;i<30;i++){const x=80+i*.5,y=100+i*.1;const a=sampleHullWake(h,x,y,time),b=referenceHullWake(h,x,y,time);for(const key of Object.keys(a))near(a[key],b[key],1e-12);}
 h.push({...h.at(-1),x:92,time:1.6});assert.deepEqual(sampleHullWake(h,90,102,1.99),referenceHullWake(h,90,102,1.99));
});
