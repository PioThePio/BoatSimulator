import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {windForces,hullLateralForces} from '../src/hydrodynamics.js';
import {rollTarget,heelReading,heelProjection} from '../src/attitude.js';
import {currentShear} from '../src/current-shear.js';
import {waveCurrent,windSea} from '../src/wave-current.js';
import {shaftRudderForce} from '../src/shaft-rudder.js';
import {buoyStep,buoyContacts} from '../src/buoys.js';
import {environment,waveHeight,waveAt,NIEPORET,BOLLARDS} from '../src/world.js';
import {sampleBrakingWaves} from '../src/braking-waves.js';
import {mooringPoint} from '../src/marina.js';
import {attachRope,cleat} from '../src/rigging.js';
import {createFleet} from '../src/fleet.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {thermalStep,coolingWarning} from '../src/thermal.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0,spatialEffects:false};
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
function swim(b,seconds,e=calm){for(let i=0;i<seconds*120;i++){step(b,e,dt,{sharedStep:false});b.x=80;b.y=110;}return b;}

test('8 m/s wind generates quadratic real pressure and different yaw centres for the exposed cabin, open hull and aft fan',()=>{
 const loads={};for(const profile of['runabout','cabin','cruiser','swamp','pwc']){const S=createBoat('lake',{profile,coldStart:true}).spec,a=windForces(S,0,8,0),half=windForces(S,0,4,0);near(a.y,4*half.y);assert.ok(a.y>0);loads[profile]={...a,cp:a.yaw/a.y/S.length};assert.ok(windForces(S,0,0,1).yaw<0,'rotation is damped even without ambient air motion');}
 assert.ok(loads.cabin.y>loads.runabout.y*2);assert.ok(loads.cabin.cp>loads.cruiser.cp*2);assert.ok(loads.swamp.cp<0);assert.ok(loads.pwc.y<loads.runabout.y);const S=createBoat('lake').spec,q=windForces(S,8,.1,0);assert.ok(q.y>0,'small oblique wind still has lateral pressure');
});
test('neutral hull has a genuine oblique wind drift and rotation, with no forced velocity alignment or self-propulsion in calm water',()=>{
 const b=createBoat('lake',{profile:'cabin',coldStart:true});b.a=0;swim(b,5,{...calm,windSpeed:8,windDirection:180});assert.ok(b.telemetry.sway>.03);assert.ok(b.a>.02);const course=Math.atan2(b.vy,b.vx);assert.ok(Math.abs(Math.sin(course-b.a))>.3);assert.equal(b.engines[0].thrust,0);
 const still=createBoat('lake',{coldStart:true});swim(still,5);assert.equal(still.vx,0);assert.equal(still.vy,0);assert.equal(still.w,0);
});
test('a marina full of low piers does not multiply away the air flow, while a real building still shelters downwind',()=>{
 const e={windSpeed:8,windDirection:90,spatialEffects:true};for(const p of[NIEPORET.start,NIEPORET.fuel]){const q=environment(0,e,p.x+6,p.y);assert.ok(Math.hypot(q.wind.x,q.wind.y)>7.2);}
 const q=environment(0,e,53,0);assert.ok(q.shelter<1);assert.ok(q.shelter>0);
});
test('uniform current advects an already entrained oblique hull without arbitrary yaw; a velocity gradient creates a physical strip moment',()=>{
 const b=createBoat('lake',{coldStart:true});b.a=.7;b.vx=.7;swim(b,4,{...calm,currentSpeed:.7,currentDirection:90,windSpeed:.7,windDirection:90});near(b.vx,.7,1e-6);near(b.vy,0,1e-6);near(b.w,0,1e-6);
 let N=0,Y=0;hullLateralForces(b.spec,0,0,0,0,(_x,y,x)=>{N+=x*y;Y+=y;},0,0,{fore:.2,aft:-.2});assert.ok(Math.abs(N)>1);assert.ok(Number.isFinite(Y));assert.equal(currentShear(b,calm,{x:.7,y:0}),null);
 Object.assign(b,{x:33,y:25,a:Math.PI/4});const shear=currentShear(b,{...calm,spatialEffects:true,currentSpeed:.7,currentDirection:90},environment(b.time,{spatialEffects:true,currentSpeed:.7,currentDirection:90},b.x,b.y).current);assert.ok(Number.isFinite(shear.fore)&&Number.isFinite(shear.aft));assert.ok(Math.abs(shear.fore-shear.aft)>.001);
});
test('right/left planing turns bank inward, side wind heels downwind, and visual projection distinguishes both signs',()=>{
 const S=createBoat('lake').spec;for(const direction of[-1,1]){const angle=rollTarget(S,{surge:15,yaw:direction*.8,planing:1});assert.equal(Math.sign(angle),-direction);assert.equal(heelReading(angle).side,direction>0?'P':'L');assert.equal(Math.sign(heelProjection(S,angle).deckShift),direction);}
 assert.ok(rollTarget(S,{windSide:8})<0);assert.ok(rollTarget(S,{crossSlope:.05})>0);assert.equal(heelReading(0).side,'równo');
});
test('ordinary full-power twin-outboard turn keeps both cooling intakes wet; physical pitch acceleration does not include rotating-frame deceleration',()=>{
 const b=createBoat('lake',{engineCount:2,powers:[200,200]});b.throttle=1;swim(b,25);b.steer=b.spec.maxSteer;let roll=0;
 for(let i=0;i<120*12;i++){step(b,calm,dt,{sharedStep:false});b.x=80;b.y=110;roll=Math.max(roll,Math.abs(b.roll));assert.ok(b.engines.every(e=>e.intake>.95));assert.equal(coolingWarning(b),'');}
 assert.ok(roll>5*Math.PI/180&&roll<15*Math.PI/180);assert.ok(b.roll<0);assert.equal(b.damage,0);
});
test('a brief splash does not announce complete cooling loss, but a truly dry intake still loses cooling and raises the warning',()=>{
 const b=createBoat('lake'),en=b.engines[0];en.intake=0;for(let i=0;i<24;i++)thermalStep(en,dt,{intake:0});assert.equal(coolingWarning(b),'');assert.equal(en.cooling,0);for(let i=0;i<36;i++)thermalStep(en,dt,{intake:0});assert.match(coolingWarning(b),/Wlot/);en.intake=1;thermalStep(en,dt,{intake:1});assert.equal(coolingWarning(b),'');
});
test('opposing current shortens and steepens the wave; following current stretches it, with finite blocking and no invented large waves from still air',()=>{
 const against=waveCurrent(2.8,3,-.5),rest=waveCurrent(2.8,3,0),withFlow=waveCurrent(2.8,3,.5);assert.ok(against.wavelength<rest.wavelength&&rest.wavelength<withFlow.wavelength);assert.ok(against.heightScale>rest.heightScale&&rest.heightScale>withFlow.heightScale);
 for(const U of[-.8,-.5,0,.5,.8]){const q=waveCurrent(2.8,3,U);near(q.sigma+q.k*U,q.omega,.0002);assert.ok(q.groundGroup>0);}
 for(const U of[-3,-2,-1,0,1,3]){const q=waveCurrent(1.9,.5,U);assert.ok(Object.values(q).filter(v=>typeof v==='number').every(Number.isFinite));assert.ok(q.heightScale<=1.65&&q.k>0);}
 const base={windSpeed:6,windDirection:90,currentSpeed:1,currentDirection:90};assert.ok(windSea({...base,currentDirection:270}).height>windSea(base).height);assert.equal(waveHeight({autoWaves:true,windSpeed:0,currentSpeed:0}),0);assert.ok(waveHeight({autoWaves:true,windSpeed:0,currentSpeed:1})<.01);
 const wave=waveAt(40,40,1,{autoWaves:true,windSpeed:5,currentSpeed:.5,currentDirection:270,windDirection:90});assert.ok(Object.values(wave).filter(v=>typeof v==='number').every(Number.isFinite));
});
test('small wind waves make a moored hull breathe between its actual ropes and fenders, instead of a fixed pressed pose',()=>{
 const b=createBoat('berth',{coldStart:true});Object.assign(b,{x:21.16,y:22,a:-Math.PI/2});assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='P2')).ok);assert.ok(attachRope(b,'portStern',BOLLARDS.findIndex(q=>q.id==='P3')).ok);let low=Infinity,high=0,tLo=Infinity,tHi=0;
 for(let i=0;i<120*18;i++){step(b,{...calm,spatialEffects:true,autoWaves:true,windSpeed:3,windDirection:270},dt);if(i>120*5){const c=Math.max(0,...Object.values(b.fenderContacts).map(q=>q.compression));low=Math.min(low,c);high=Math.max(high,c);const t=Math.max(0,...b.ropes.map(r=>r.tension));tLo=Math.min(tLo,t);tHi=Math.max(tHi,t);}}
 assert.ok(high>.001);assert.ok(high-low>.0005,`${low}..${high}`);assert.ok(tHi-tLo>1);assert.equal(b.damage,0);
});
test('mooring buoy rocks with waves, leans under a line, resists large displacement and recentres after release',()=>{
 const b=createBoat('lake'),q=b.buoys.find(Boolean);b.buoys=[q];let bob=0,lean=0,max=0;
 for(let i=0;i<120*12;i++){b.time+=dt;q.loadX=800;buoyStep(b,{...calm,autoWaves:true,windSpeed:3},dt);bob=Math.max(bob,Math.abs(q.heave));lean=Math.max(lean,Math.abs(q.heelX));max=Math.max(max,Math.hypot(q.x-q.homeX,q.y-q.homeY));}
 assert.ok(bob>.001);assert.ok(lean>.03);assert.ok(max>.1&&max<.55);for(let i=0;i<1200;i++){b.time+=dt;buoyStep(b,calm,dt);}assert.ok(Math.hypot(q.x-q.homeX,q.y-q.homeY)<.005);
});
test('hull contact displaces an anchored plastic buoy with reaction on the boat, without counting it as a pier strike',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.buoys.find(Boolean);b.buoys=[q];Object.assign(b,{x:q.x-b.spec.length*.5-.15,y:q.y,a:0,vx:.6,vy:0});const before=b.vx;buoyContacts(b,dt);assert.ok(q.vx>0);assert.ok(b.vx<before);assert.equal(b.damage,0);assert.ok(q.contactForce>0);
 for(let i=0;i<1200;i++){b.time+=dt;buoyStep(b,calm,dt);}assert.ok(Math.hypot(q.x-q.homeX,q.y-q.homeY)<.01);
});
test('each Nieporęt buoy row has one stand-off from its own pier; boats of different sizes have different bow-line lengths',()=>{
 for(let row=0;row<3;row++){const pier=NIEPORET.docks.find(d=>d.id==='nieporet-pier-'+row),c=Math.cos(pier.pose.a),s=Math.sin(pier.pose.a),buoys=BOLLARDS.filter(q=>q.id.startsWith('PIL-B-'+row+'-'));assert.ok(buoys.length>=5);for(const q of buoys)near(-(q.x-pier.pose.x)*s+(q.y-pier.pose.y)*c,12);}
 const b=createBoat('lake'),lengths=b.traffic.filter(q=>q.site==='nieporet').flatMap(q=>q.ropes.filter(r=>BOLLARDS[r.bollard].kind==='buoy').map(r=>r.length));assert.ok(Math.max(...lengths)-Math.min(...lengths)>2);
});
test('buoy-home migration preserves an existing boat and the actual line slack, fuel and engine hours',()=>{
 const b=createBoat('lake',{coldStart:true}),f=createFleet(b),i=BOLLARDS.findIndex(q=>q.kind==='buoy'),q=b.buoys[i];Object.assign(b,{x:q.x-6,y:q.y,a:0});assert.ok(attachRope(b,'bow',i).ok);q.homeX+=1.5;q.x+=1.5;const p=cleat(b,'bow');b.ropes[0].length=Math.hypot(p.x-q.x,p.y-q.y)+.2;b.engines[0].operatingHours=8;const r=restoreSession(snapshotSession({fleet:f,env:calm}));assert.ok(r.ok,r.message);const restored=r.session.fleet.boats[0],target=mooringPoint(restored,i),eye=cleat(restored,'bow');near(restored.ropes[0].length-Math.hypot(eye.x-target.x,eye.y-target.y),.2);near(restored.x,b.x);near(target.homeX,BOLLARDS[i].x);assert.equal(restored.engines[0].operatingHours,8);assert.equal(restored.fuel.litres,b.fuel.litres);
});
test('shaft rudder has real astern control only with water flow, scales with hull and remains a passive foil without prop wash',()=>{
 const S=createBoat('lake',{profile:'cruiser',propWalkStrength:0}).spec,still=shaftRudderForce(S,0,0,0,S.maxSteer,0),moving=shaftRudderForce(S,-1.5,0,0,S.maxSteer,0);near(still.x,0);near(still.y,0);assert.ok(moving.y>20);assert.ok(moving.y*S.rudderLever<0);assert.ok(moving.x*-1.5<=0);assert.ok(moving.area>.4);
 const straight=createBoat('lake',{profile:'cruiser',propWalkStrength:0}),turn=createBoat('lake',{profile:'cruiser',propWalkStrength:0});for(const b of[straight,turn])b.throttle=-.4;turn.steer=turn.spec.maxSteer;swim(straight,20);swim(turn,20);assert.ok(turn.telemetry.surge<-.3);assert.ok(turn.a<-.1);assert.ok(Math.abs(turn.w)>.005);near(straight.w,0);
});
test('lifting off a planing hull emits one physical bow surge, propagating ahead before decaying rather than endless foam at rest',()=>{
 const b=createBoat('lake',{powers:[200]});b.throttle=1;swim(b,25);assert.ok(b.planing>.8);assert.equal(b.brakingWaves?.length??0,0);b.throttle=0;swim(b,5);assert.equal(b.brakingWaves.length,1);const q=b.brakingWaves[0],x=q.x+Math.cos(q.a)*7,y=q.y+Math.sin(q.a)*7;assert.equal(sampleBrakingWaves([q],x,y,q.time+.05).eta,0);let peak=0;for(let age=.1;age<7;age+=.05)peak=Math.max(peak,Math.abs(sampleBrakingWaves([q],x,y,q.time+age).eta));assert.ok(peak>.03);assert.equal(sampleBrakingWaves([q],x,y,q.time+15).eta,0);swim(b,15);assert.equal(b.brakingWaves.length,0);
});
