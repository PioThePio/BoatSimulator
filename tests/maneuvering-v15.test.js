import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {specification,updateMass,engineState,updateEngine,engineKey} from '../src/craft.js';
import {propWalkForce,bankInfluence} from '../src/maneuvering.js';
import {propellerContact} from '../src/ground.js';
import {attachRope,cleat,solveRopes,requestHaul} from '../src/rigging.js';
import {mooringPoint} from '../src/marina.js';
import {bilgeStep} from '../src/bilge.js';
import {systemsStep} from '../src/systems.js';
import {windForces} from '../src/hydrodynamics.js';
import {createTowRig,towStep,hitchAction,hitchStatus,resetTowVehicle,bodyPoint,SUV,towAudioBoat} from '../src/towing.js';
import {soundParameters} from '../src/sound.js';
import {propFoamIntensity} from '../src/render.js';
const dt=1/120;
function run(b,seconds,e={}){for(let i=0;i<seconds*120;i++){step(b,e,dt);b.x=80;b.y=110;}return b;}

test('a single right-handed propeller walks the stern to port astern; twins, jets, speed and planing cancel it',()=>{
 const S=specification({profile:'cabin'}),en=engineState(200);Object.assign(en,{gear:-1,thrust:-1000});
 const slow=propWalkForce(S,en,0,0);assert.ok(slow<0);assert.ok(Math.abs(propWalkForce(S,en,1,0))<Math.abs(slow)*.4);
 assert.equal(propWalkForce(S,en,3,0),0);assert.equal(propWalkForce(S,en,0,1),0);assert.equal(propWalkForce({...S,engineCount:2},en,0,0),0);assert.equal(propWalkForce({...S,jet:true},en,0,0),0);
 assert.ok(Math.abs(propWalkForce({...S,propulsion:'inboard'},en,0,0))>Math.abs(slow));en.gear=1;assert.equal(propWalkForce(S,en,0,0),0);
 const walk=createBoat('lake',{propWalkStrength:.4}),straight=createBoat('lake',{propWalkStrength:0});for(const b of [walk,straight]){b.a=0;b.throttle=-.08;run(b,8);}
 assert.ok(walk.w>.004&&walk.telemetry.sway<-.005);assert.ok(Math.abs(straight.w)<1e-8);
});

test('outboard prop wash turns from rest below 3 km/h; the same stationary hull in neutral cannot turn',()=>{
 const powered=createBoat('lake'),neutral=createBoat('lake');for(const b of [powered,neutral]){b.a=0;b.steer=b.spec.maxSteer;}powered.throttle=.08;run(powered,5);run(neutral,5);
 assert.ok(powered.w>.04&&powered.telemetry.surge>.1&&powered.telemetry.surge<3/3.6);assert.equal(neutral.w,0);assert.equal(neutral.telemetry.surge,0);
});

test('neutral retains lateral and yaw momentum; a 150 HP throttle burst releases the stern more than 50 HP',()=>{
 const cases=[50,150].map(hp=>{const b=createBoat('lake',{powers:[hp]});b.a=0;b.throttle=.08;b.steer=b.spec.maxSteer;run(b,10);const v=b.telemetry.sway,w=b.w;b.throttle=0;run(b,.5);assert.ok(Math.abs(b.telemetry.sway)>Math.abs(v)*.75);assert.ok(b.w>w*.5);b.throttle=1;run(b,2);return b;});
 assert.ok(Math.abs(cases[1].telemetry.sway)>Math.abs(cases[0].telemetry.sway)*1.5);assert.ok(cases[1].w>cases[0].w*1.3);assert.ok(cases[1].telemetry.surge>1.5&&cases[1].w<.6);
});

test('ventilation below 70% immersion flares RPM, reduces thrust and clears when the engine stops',()=>{
 const full=engineState(150),air=engineState(150);full.gear=air.gear=1;for(let i=0;i<1200;i++){updateEngine(full,.65,4,dt,0,{immersion:1});updateEngine(air,.65,4,dt,0,{immersion:.40});}
 assert.equal(full.ventilation,0);assert.ok(air.ventilation>.25);assert.ok(air.rpm>full.rpm+200);assert.ok(air.thrust<full.thrust*.5);
 const boat=createBoat('lake');boat.engines[0]=air;engineKey(boat,0,'off');assert.equal(air.ventilation,0);updateEngine(air,1,4,dt);assert.equal(air.rpm,0);assert.equal(air.thrust,0);assert.equal(soundParameters(boat).engines[0].churn,0);
});

test('neutral propeller touching sand reports contact without wear; spinning sand scuffs and rock still damages an idle drive',()=>{
 const b=createBoat('beach'),en=b.engines[0];b.a=Math.PI/2;b.vy=.4;en.trim=en.trimTarget=0;en.gear=0;en.n=0;const events=[];
 for(let i=0;i<240;i++){b.time+=dt;propellerContact(b,en,dt,m=>events.push(m));}assert.equal(en.propContact,true);assert.equal(en.propDamage,0);assert.ok(events.some(m=>m.includes('piasku')));
 en.gear=1;en.n=.5;for(let i=0;i<240;i++){b.time+=dt;propellerContact(b,en,dt,()=>{});}assert.ok(en.propDamage>0&&en.propDamage<5);
 const rock=createBoat('island');rock.x=268;rock.y=153;rock.a=Math.PI/2;rock.vy=1;const r=rock.engines[0];r.trim=0;propellerContact(rock,r,dt,()=>{});
 // Find an actual rocky contact without substituting a test-only seabed.
 if(!r.propContact||r.drive.floor.material!=='rock'){let found=false;for(let x=225;x<380&&!found;x+=2)for(let y=120;y<285&&!found;y+=2){rock.x=x;rock.y=y;r.propContact=false;propellerContact(rock,r,dt,()=>{});if(r.propContact&&r.drive.floor.material==='rock')found=true;}assert.ok(found);}
 assert.ok(r.propDamage>5);assert.equal(r.gear,0);
});

test('crew, equipment, fuel and floodwater all increase mass, draft and inertia; load delays acceleration and planing',()=>{
 const light=createBoat('lake',{crewCount:0,equipmentMass:0}),heavy=createBoat('lake',{crewCount:6,equipmentMass:400});assert.equal(heavy.spec.mass-light.spec.mass,850);assert.ok(heavy.spec.draft>light.spec.draft+.08);assert.ok(heavy.spec.iz>light.spec.iz);
 const S=specification(),m=S.mass,draft=S.draft;updateMass(S,100,100);assert.ok(S.mass>m+100&&S.draft>draft);
 for(const b of [light,heavy]){b.a=0;b.throttle=1;run(b,10);}assert.ok(light.telemetry.surge>heavy.telemetry.surge*1.3);assert.ok(light.planing>.6&&heavy.planing<.15);
});

test('hull profiles differ: flat and RIB plane readily, loaded cabin is slower and displacement never planes',()=>{
 const boats=['flat','rib','cabin','cruiser'].map(profile=>{const b=createBoat('lake',{profile,powers:[90]});b.a=0;b.throttle=1;return run(b,25);});
 assert.ok(boats[0].planing>.9&&boats[1].planing>.9);assert.ok(boats[2].telemetry.surge<boats[1].telemetry.surge*.7);assert.equal(boats[3].planing,0);assert.ok(boats[3].telemetry.surge<4);assert.ok(boats[0].spec.draft<boats[2].spec.draft);assert.ok(boats[0].spec.waveResponse>boats[2].spec.waveResponse);
});

test('inboard keeps axial thrust and uses a less effective rudder; outboard turns more strongly at creeping speed',()=>{
 const boats=['outboard','inboard'].map(propulsion=>{const b=createBoat('lake',{profile:'cabin',propulsion});b.a=0;b.steer=b.spec.maxSteer;b.throttle=.08;return run(b,6);});
 assert.ok(boats[0].w>boats[1].w*2);assert.ok(boats[1].telemetry.surge>0);assert.ok(boats[1].w>0);assert.equal(boats[1].engines[0].ventilation,0);
});

test('windage changes actual side force for identical submerged hulls, not just descriptive metadata',()=>{
 const S=specification();function side(factor){let y=0;windForces({...S,windageFactor:factor},0,6,0,(_,fy)=>y+=fy);return y;}
 assert.ok(Math.abs(side(1)/side(.3)-1/.3)<1e-8);assert.ok(specification({profile:'cabin'}).windageFactor>specification({profile:'pwc'}).windageFactor);
});

test('bank influence fades outside two lengths and creates no suction energy at rest',()=>{
 const near=createBoat('berth'),far=createBoat('lake');assert.ok(bankInfluence(near).strength>.3);assert.equal(bankInfluence(far).strength,0);const before={x:near.x,y:near.y};for(let i=0;i<240;i++)step(near,{},dt);assert.equal(near.x,before.x);assert.equal(near.y,before.y);assert.equal(near.w,0);
});

test('slack rope snaps taut with small elastic rebound, limited extension and no injected energy',()=>{
 const b=createBoat('berth');attachRope(b,'bow',4);const r=b.ropes[0],p=cleat(b,'bow'),q=mooringPoint(b,4),d=Math.hypot(p.x-q.x,p.y-q.y),nx=(p.x-q.x)/d,ny=(p.y-q.y)/d;b.vx=nx*.5;b.vy=ny*.5;
 const energy=()=>{const c=Math.cos(b.a),s=Math.sin(b.a),u=b.vx*c+b.vy*s,v=-b.vx*s+b.vy*c;return .5*(b.spec.mx*u*u+b.spec.my*v*v+b.spec.iz*b.w*b.w);};const initialEnergy=energy();let maxEnergy=initialEnergy,extension=0,rebound=0;for(let i=0;i<360;i++){b.time+=dt;solveRopes(b,dt,()=>{});maxEnergy=Math.max(maxEnergy,energy());b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;const p=cleat(b,'bow'),rx=p.x-b.x,ry=p.y-b.y;extension=Math.max(extension,Math.hypot(p.x-q.x,p.y-q.y)-r.length);rebound=Math.min(rebound,(b.vx-b.w*ry)*nx+(b.vy+b.w*rx)*ny);}
 assert.ok(maxEnergy<=initialEnergy*1.001);assert.ok(extension>.005&&extension/r.length<.015);assert.ok(rebound<-.05&&rebound>-.3);assert.equal(b.ropes.length,1);
 const fresh=createBoat('berth');attachRope(fresh,'bow',4);const line=fresh.ropes[0],start=line.length;requestHaul(line,-1);solveRopes(fresh,dt,()=>{});assert.ok(start-line.length>.22*dt);requestHaul(line,0);const stop=line.length;solveRopes(fresh,dt,()=>{});assert.equal(line.length,stop);
});

test('bilge admits water only with a breach, raises stern draft/mass, and warns once past 50%',()=>{
 const sound=createBoat('lake');sound.engines[0].propDamage=20;run(sound,3);assert.equal(sound.bilge.litres,0,'a scraped blade alone cannot puncture the hull');
 const b=createBoat('lake');b.damage=50;b.bottomDamage={bottomBow:20};b.bilge.auto=false;const m=b.spec.mass,d=b.spec.draft;run(b,60);assert.ok(b.bilge.litres>100&&b.spec.mass>m+100&&b.spec.draft>d);assert.ok(b.spec.cgX<-.1);
 b.bilge.litres=b.bilge.capacity*.51;b.bilge.level=.51;bilgeStep(b,dt);assert.equal(b.bilge.alarm,true);assert.match(b.events[0].message,/WODA W ZĘZIE/);const count=b.events.length;bilgeStep(b,dt);assert.equal(b.events.length,count);
});

test('manual and automatic bilge pumps draw battery, clear water with hysteresis, and stop on a flat battery',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.bilge;q.litres=q.capacity*.25;q.level=.25;const before=b.battery.soc;systemsStep(b,1);assert.equal(q.running,true);assert.ok(b.battery.soc<before);assert.ok(q.litres<q.capacity*.25);assert.ok(soundParameters(b).bilgePump>0);
 q.auto=false;q.manual=false;bilgeStep(b,1);assert.equal(q.running,false);q.manual=true;bilgeStep(b,1);assert.equal(q.running,true);b.battery.soc=0;bilgeStep(b,1);assert.equal(q.running,false);
 b.battery.soc=.8;q.litres=q.capacity*.03;q.level=.03;q.manual=false;q.auto=true;bilgeStep(b,1);assert.equal(q.autoRunning,false);assert.equal(q.running,false);
});

test('SUV begins with a small articulation and hitch reattachment captures a nearby angled coupler without kicking the trailer',()=>{
 const b=createBoat('lake'),r=createTowRig(b,{loaded:true});assert.ok(Math.abs(r.car.a-r.trailer.a)>.04);assert.ok(hitchAction(r).ok);r.car.x+=.55;assert.equal(hitchStatus(r).ready,true);const t={x:r.trailer.x,y:r.trailer.y};assert.ok(hitchAction(r).ok);assert.equal(r.trailer.x,t.x);assert.equal(r.trailer.y,t.y);
 const p=bodyPoint(r.car,-SUV.hitch),q=bodyPoint(r.trailer,r.trailer.hitch);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);towStep(r,b,dt);assert.ok(Math.hypot(r.car.vx,r.car.vy)<.01);
 hitchAction(r);r.car.x+=2;const x=r.car.x;assert.equal(hitchAction(r).ok,false);assert.equal(r.car.x,x);
});

test('vehicle reset preserves boat damage, bilge, fuel and environment time; detached trailer stays where parked',()=>{
 const b=createBoat('lake'),r=createTowRig(b,{loaded:true});b.damage=25;b.fuel.litres=22;b.bilge.litres=12;b.time=30;r.car.x+=7;r.gear='D';resetTowVehicle(r,b);assert.equal(r.gear,'P');assert.equal(r.handbrake,true);assert.equal(b.damage,25);assert.equal(b.fuel.litres,22);assert.equal(b.bilge.litres,12);assert.equal(b.time,30);assert.equal(b.ropes.length,1);
 hitchAction(r);const t={x:r.trailer.x,y:r.trailer.y},boat={x:b.x,y:b.y};resetTowVehicle(r,b);assert.deepEqual({x:r.trailer.x,y:r.trailer.y},t);assert.deepEqual({x:b.x,y:b.y},boat);assert.equal(r.attached,false);assert.equal(r.car.x,137);
});

test('SUV has a separate starter voice and no pedal clicks; boat gear clicks and continuous ignition alarm remain',()=>{
 const b=createBoat('lake'),r=createTowRig(b);r.engine.key='starting';r.engine.startTime=.2;const suv=soundParameters(towAudioBoat(r,b)),boat=soundParameters(b);assert.equal(suv.engines[0].carStarter,true);assert.equal(suv.engines[0].level,0);assert.ok(suv.engines[0].starterFrequency>170);assert.equal(suv.commandClick,false);assert.equal(boat.commandClick,true);assert.equal(suv.ignitionAlarm,false);
});

test('ventilation foam requires a turning wet propeller and stops immediately on ignition/off despite a stale air value',()=>{
 const en=engineState(150);Object.assign(en,{gear:1,n:.8,immersion:.5,ventilation:.7});assert.ok(propFoamIntensity(en)>.5);
 for(const key of ['off','ignition','starting']){en.key=key;assert.equal(propFoamIntensity(en),0);}en.key='running';en.gear=0;assert.equal(propFoamIntensity(en),0);en.gear=1;en.immersion=0;assert.equal(propFoamIntensity(en),0);
});
test('a damaged hull on dry supports cannot continue taking bilge water from the lake',()=>{
 const b=createBoat('lake');b.damage=70;b.bottomDamage={bottomStern:40};b.grounded=true;b.heave=b.spec.draft+.1;b.bilge.auto=false;bilgeStep(b,1);assert.equal(b.bilge.inflow,0);assert.equal(b.bilge.litres,0);
});
