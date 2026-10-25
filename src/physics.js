import {recordBrakingWave} from './braking-waves.js';
import {sternPowerOnState,oarForces} from './maneuver-transient.js';
import {voyageEvent} from './voyage-events.js';
import {racingResistance,racingSternRelease} from './racing.js';
import {bilgeTrimAngle,applyFloodShort} from './flood-systems.js';
import {enforceMainPower} from './electrical.js';
import {contacts,boomContacts} from './contacts.js';
import {beginFenderStep} from './fenders.js';
import {inflatableDrag,inflatableLateral,crossWaveDrag} from './towable-water.js';
import {sampleBankGeometry,bankForce} from './interaction-scene.js';
import {createBuoys} from './buoys.js';
// SI, x east / y south. Heading clockwise from east. Physics reference: docs/MODEL.md.
import {clamp,DOCKS,SOLIDS,BOLLARDS,SERVICE_STATION,MAP_STARTS,environment,bottomAt,waveAt,reflectionFacesNear,reedDensityAt} from './world.js';
import {trimAngle} from './drive.js';
import {engineSteering} from './drive-effects.js';
import {sampleWorldWake,wakeHistories} from './wave-field.js';
import {recordHullWake} from './wake.js';
export {impactClass} from './impacts.js';
import {createBooms,boomStep} from './marina.js';
import {hullLateralForces,windForces} from './hydrodynamics.js';
import {groundContact,propellerContact} from './ground.js';
import {createSystems,systemsStep} from './systems.js';
import {createTraffic,trafficStep} from './traffic.js';
import {specification,engineState,updateEngine} from './craft.js';
import {placeTrailerBoat} from './towing.js';
import {launchVerticalStep} from './trailer-support.js';
import {propWalkForce,bankInfluence,airRudderForce} from './maneuvering.js';
import {floodingDepth,floodingStep} from './flooding.js';
import {point,cleat,attachRope,solveRopes,createAnchor,updateAnchor} from './rigging.js';
export {clamp,DOCKS,SOLIDS,BOLLARDS,environment,bottomAt,waveAt,point,cleat,attachRope};
export const MODEL=specification();
export function createBoat(scenario='approach',options={}){
 const spec=specification(options);
 const starts={approach:[43,37,-2.1],berth:[24.3,22,-Math.PI/2],open:[64,48,-Math.PI/2],beach:[8.2,147,Math.PI/2],island:[304,278,Math.PI],fuel:[54,20,Math.PI/2],service:[SERVICE_STATION.start.x,SERVICE_STATION.start.y,SERVICE_STATION.start.a],canal:[304,204,0],harbor:[61,40,-Math.PI/2],lake:[80,110,0]};
 const selected=MAP_STARTS[scenario];const [x,y,a]=selected?[selected.x,selected.y,selected.a]:starts[scenario]||starts.approach;
 return{...createSystems(spec,options.coldStart),booms:createBooms(),buoys:createBuoys(),traffic:createTraffic(),x,y,a,vx:0,vy:0,w:0,steer:0,actualSteer:0,throttle:0,throttle2:0,linked:true,enginesRaised:false,groundLoad:0,groundMaterial:'sand',spec,
 engines:spec.powers.map((hp,i)=>{const en=engineState(hp,spec.engineCount===1?0:(i===0?-1:1)*spec.engineSpacing/2,options.coldStart);if(spec.racing)en.trim=en.trimTarget=.20;return en;}),
 fenders:true,damage:0,dockDamage:0,sectionDamage:{},bottomDamage:{},impacts:[],impactTimes:{},ropes:[],anchor:createAnchor(spec),time:0,lastImpact:null,events:[],maxTension:0,wake:[],
 cameraZoom:1,heave:0,heaveVelocity:0,roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,planing:0,underKeel:bottomAt(x,y).depth-spec.draft,grounded:false,groundEvent:-10,
 telemetry:{surge:0,sway:0,thrust:0,drag:0,shaftPower:0}};
}
function event(b,message){if(!/^(Łagodny kontakt|Uszkodzenie ·|Silna kolizja)/.test(message))voyageEvent(b,{type:'incident',message});b.events.unshift({time:b.time,message});b.events=b.events.slice(0,12);}
function oscillator(state,vel,target,omega,zeta,dt,forcing=0){const acc=omega*omega*(target-state)-2*zeta*omega*vel+forcing;vel+=acc*dt;return[state+vel*dt,vel];}
export function step(b,e,dt,{sharedStep=true}={}){
 b.time+=dt;enforceMainPower(b);beginFenderStep(b);const S=b.spec,c=Math.cos(b.a),s=Math.sin(b.a);
 if(b.towRig?.boatLoaded&&b.towRig.secured){
  placeTrailerBoat(b.towRig,b);
  const rate=S.jet?1.6:.80;b.actualSteer+=clamp(b.steer-b.actualSteer,-rate*dt,rate*dt);
  if(b.linked)b.throttle2=b.throttle;
  if(b.engines.length===2)b.engines[1].trimTarget=b.engines[0].trimTarget;
  for(const [i,en]of b.engines.entries()){
   propellerContact(b,en,dt,m=>event(b,m),e);
   updateEngine(en,i?b.throttle2:b.throttle,0,dt,b.damage,{starterVoltage:b.battery.voltage,noFuel:b.fuel.litres<=0,jet:S.jet,air:S.air,racing:!!S.racing,engineType:S.engineType,fixedDrive:S.propulsion==='inboard',moored:true,onTrailer:true,speed:0,immersion:en.immersion,intake:en.intake,intakeBlocked:en.intakeBlocked});
   const steering=engineSteering(b,en,dt);en.forceSteer=steering;
   const delta=S.air||S.propulsion==='inboard'?0:steering,T=en.thrust*(S.jet||S.air||S.propulsion==='inboard'?1:Math.cos(trimAngle(en.trim)));en.effectiveThrust=T;
   const air=airRudderForce(S,T,b.actualSteer),X=S.air?air.x:T*Math.cos(delta),Y=S.air?air.y:-T*Math.sin(delta),fx=c*X-s*Y,fy=s*X+c*Y;
   b.towRig.ropeForce.x+=fx;b.towRig.ropeForce.y+=fy;
   const arm=point(b,S.engineLever,en.y);b.towRig.ropeForce.torque+=(arm.x-b.towRig.trailer.x)*fy-(arm.y-b.towRig.trailer.y)*fx;
  }
  systemsStep(b,dt);trafficStep(b,e,dt,{integrate:sharedStep});if(sharedStep)boomStep(b,e,dt);return;
 }
 const env=environment(b.time,e,b.x,b.y),wave=waveAt(b.x,b.y,b.time,e);
 const reflections=wakeHistories(b).some(h=>h.length>1)?reflectionFacesNear(b.x,b.y):[];
 const ownWave=sampleWorldWake(b,b.x,b.y,b.time,reflections);
 for(const key of ['eta','sx','sy','vx','vy','ax','ay'])wave[key]+=ownWave[key];
 b.encounter={eta:wave.eta,crossSlope:Math.abs(-wave.sx*s+wave.sy*c)};
 // Bow/stern encounter slopes capture pitching over one's own curved wake even
 // when the centre happens to lie between its two crests.
 const bow=point(b,S.length*.4,0),stern=point(b,-S.length*.4,0);
 const foreWake=sampleWorldWake(b,bow.x,bow.y,b.time,reflections),aftWake=sampleWorldWake(b,stern.x,stern.y,b.time,reflections);
 const encounterSlope=(foreWake.eta-aftWake.eta)/(S.length*.8),centreSlope=ownWave.sx*c+ownWave.sy*s;
 wave.sx+=(encounterSlope-centreSlope)*c;wave.sy+=(encounterSlope-centreSlope)*s;
 b.wakeEncounter=Math.max(Math.abs(ownWave.eta),Math.abs(foreWake.eta),Math.abs(aftWake.eta));
 // Oscillatory orbital flow at draft, with independent restoring heave/roll/pitch.
 const water={x:env.current.x+wave.vx*.65,y:env.current.y+wave.vy*.65};
 const onSupports=b.towRig?launchVerticalStep(b.towRig,b,e,dt):false,wetFraction=onSupports?(b.wetFraction??1):1;
 if(!onSupports)[b.heave,b.heaveVelocity]=oscillator(b.heave,b.heaveVelocity,wave.eta*(1+(S.waveResponse-1)*b.planing)-floodingDepth(b)-(b.anchor.shape?.V??0)/(1000*9.81*S.length*S.beam*.65),4.2+3*b.planing,.65,dt);
 floodingStep(b,dt,wave.eta);applyFloodShort(b,wave.eta);
 const windSide=-env.wind.x*s+env.wind.y*c;
 const rollTarget=clamp(Math.atan(-wave.sx*s+wave.sy*c)*S.waveResponse+windSide*Math.abs(windSide)*S.freeboard/(S.mass*.9)-b.planing*Math.atan((b.telemetry.surge??0)*b.w/9.81)*.6+(S.inflatable&&e.towEffects!==false?(b.towHeel??0):0),-.3,.3);
 if(!onSupports)[b.roll,b.rollVelocity]=oscillator(b.roll,b.rollVelocity,rollTarget,Math.sqrt(9.81/(S.beam*.32)),.28,dt);
 const ur=(b.vx-env.current.x)*c+(b.vy-env.current.y)*s;
 const vr=-(b.vx-env.current.x)*s+(b.vy-env.current.y)*c;
 const u=(b.vx-water.x)*c+(b.vy-water.y)*s;
 const v=-(b.vx-water.x)*s+(b.vy-water.y)*c;
 const viewTarget=1-.40*clamp((Math.hypot(ur,vr)-2)/8,0,1);b.cameraZoom+=(viewTarget-b.cameraZoom)*(1-Math.exp(-dt/1.5));
 let X=0,Y=0,N=0;
 const force=(x,y,px=0,py=0)=>{X+=x;Y+=y;N+=px*y-py*x;};
 const fn=Math.abs(u)/Math.sqrt(9.81*S.length);
 const meanTrim=S.jet||S.air||S.propulsion==='inboard'?.10:b.engines.reduce((sum,en)=>sum+en.trim,0)/b.engines.length;
 const driveAngle=trimAngle(meanTrim);
 const turnLoad=Math.hypot(1,u*b.w/9.81);
 const liftRatio=.5*1000*u*u*S.length*S.beam*.23*Math.max(.025,.09-S.deadrise*.0012)/Math.max(1,S.mass*9.81*turnLoad);
 const threshold=S.planingThreshold??1;
 const targetPlaning=S.planing&&u>0?wetFraction*clamp((fn-.48*threshold)/(.4*threshold),0,1)*clamp((liftRatio-(S.jet?.12:.22)*threshold)/(S.jet?.40:.43),0,1):0;
 b.planing+=(targetPlaning-b.planing)*(1-Math.exp(-dt/(targetPlaning>b.planing?2.8:1.4)));
 const hump=Math.exp(-(((fn-.55)/.24)**2))*(1-.65*b.planing);
 const pitchTarget=clamp(Math.atan(wave.sx*c+wave.sy*s)*S.waveResponse+hump*.085+(b.planing*(.045+driveAngle*.42))+(b.telemetry.acceleration??0)*.014-S.cgX/S.length*.3-(b.anchor.shape?.V??0)/(S.mass*9.81)*.5+bilgeTrimAngle(S,b.bilge?.litres),-.12,.24);
 if(!onSupports)[b.pitch,b.pitchVelocity]=oscillator(b.pitch,b.pitchVelocity,pitchTarget,Math.sqrt(9.81/(S.length*.14)),.65,dt);
 // ITTC-inspired friction + approximate wave-making hump and planing support drag.
 const re=Math.max(1e5,Math.abs(u)*S.length/1e-6),cf=.075/(Math.log10(re)-2)**2;
 const lowTrim=S.jet?0:clamp((.22-meanTrim)/.22,0,1);
 const wet=S.length*(S.beam*.75+S.draft*1.7)*(1-.65*b.planing)*(1+.30*lowTrim*b.planing);
 const friction=.5*1000*wet*(cf+.0015)*u*Math.abs(u);
 const waveDrag=S.mass*9.81*(S.planing?.055:.085)*Math.exp(-(((fn-.43)/.15)**2))*(1-.8*b.planing);
 const support=S.mass*9.81*(.032+.025*lowTrim+.00022*u*u+.30*(driveAngle-.08)**2)*b.planing;
 const displacementLimit=S.planing?0:S.mass*9.81*.085*Math.max(0,fn-.42)**2*12;
 const transom=u<0?(.5*1000*S.beam*S.draft*.75*u*u):0;
 const turnFlow=Math.hypot(v,b.w*S.length*.4);
 const turnDrag=.5*1000*S.draft*S.length*.12*turnFlow*turnFlow*Math.abs(u)/Math.hypot(u,turnFlow,.5);
 // Turning costs power through sideslip and the extra lift needed for centripetal
 // acceleration, rather than a brake keyed to the steering-wheel angle.
 const induced=S.mass*9.81*.10*(turnLoad*turnLoad-1)*b.planing;
 const baseDrag=S.inflatable?inflatableDrag(S,u,b.planing):friction+Math.sign(u)*(turnDrag+induced+waveDrag+support+displacementLimit+transom);
 const drag=S.racing?racingResistance(baseDrag,b.planing,meanTrim):baseDrag;
 force((-drag-S.mass*.009*u)*wetFraction*(S.towDragFactor??1),0);
 if(S.inflatable&&e.towEffects!==false)force(-crossWaveDrag(S,u,b.encounter.crossSlope)*wetFraction,0);
 const poweredTurn=clamp(Math.abs(b.actualSteer)/S.maxSteer,0,1)*clamp(b.engines.reduce((sum,en)=>sum+Math.abs(en.thrust),0)/(S.mass*2),0,1)*clamp(1-Math.abs(u)/5,0,1);
 b.powerOn=sternPowerOnState(S,b.engines,b.actualSteer,u,dt,b.powerOn);
 b.racingSlide=racingSternRelease(S,b.engines,b.actualSteer,u);
 if(S.inflatable)inflatableLateral(S,v,b.w,b.planing,force);else hullLateralForces(S,u,v,b.w,b.planing,(x,y,px,py)=>force(x*wetFraction,y*wetFraction,px,py),poweredTurn,Math.max(b.powerOn.release,b.racingSlide));
 if(!b.bank||b.time>=(b.bankAt??0)){b.bank=bankInfluence(b);b.bankAt=b.time+.25;}
 const bankSteering=1-.06*b.bank.strength*clamp(Math.abs(u)/2,0,1);
 // Outboards rotate at a finite rate; linked controls copy commands, not engine states.
 const steeringRate=S.jet?1.6:.80;
 b.actualSteer+=clamp(b.steer-b.actualSteer,-steeringRate*dt,steeringRate*dt);
 if(b.linked)b.throttle2=b.throttle;
 if(b.engines.length===2)b.engines[1].trimTarget=b.engines[0].trimTarget;
 let totalThrust=0;
 b.engines.forEach((engine,i)=>{
  if(S.passive){engine.thrust=engine.rpm=engine.n=engine.gear=engine.fuelFlow=0;return;}
  const x=S.engineLever,y=engine.y,delta=engineSteering(b,engine,dt,bankSteering),driveDelta=S.propulsion==='inboard'||S.air?0:delta;engine.forceSteer=delta;
  const inflow=(u-b.w*y)*Math.cos(driveDelta)-(v+b.w*x)*Math.sin(driveDelta);
  const lateral=(u-b.w*y)*Math.sin(delta)+(v+b.w*x)*Math.cos(delta);
  propellerContact(b,engine,dt,m=>event(b,m),e);
  // Encounter rate includes moving into a wave, not just its time oscillation.
  // Subtract hull heave/pitch/roll so following the surface does not add load.
  const g=engine.drive,surfaceRate=engine.lastSurface==null?0:(g.surface-engine.lastSurface)/dt;
  engine.lastSurface=g.surface;
  const vertical=b.heaveVelocity+g.mountX*Math.cos(b.pitch)*b.pitchVelocity+engine.y*Math.cos(b.roll)*b.rollVelocity;
  const waveLoad=clamp(2.5*Math.abs(u)*Math.max(0,surfaceRate-vertical)/(9.81*S.length),0,.25);
  let thrust=updateEngine(engine,i===0?b.throttle:b.throttle2,inflow,dt,b.damage,{starterVoltage:b.battery.voltage,noFuel:b.fuel.litres<=0,jet:S.jet,air:S.air,racing:!!S.racing,engineType:S.engineType,fixedDrive:S.propulsion==='inboard',onTrailer:onSupports,grounded:b.grounded,moored:b.ropes.length>0,raised:b.enginesRaised,speed:Math.hypot(ur,vr),immersion:engine.immersion,intake:engine.intake,intakeBlocked:engine.intakeBlocked,crossflow:lateral,waveLoad});
  if(b.enginesRaised){thrust=0;engine.thrust=0;}
  thrust*=S.jet||S.air||S.propulsion==='inboard'?1:Math.cos(trimAngle(engine.trim));
  engine.effectiveThrust=thrust;
  // Vectored thrust is the outboard's prop wash: it works before the hull moves.
  // An inboard keeps axial thrust and feeds a separate, stalling rudder.
  const air=airRudderForce(S,thrust,delta);
  force(S.air?air.x:thrust*Math.cos(driveDelta),S.air?air.y:-thrust*Math.sin(driveDelta),x,y);totalThrust+=thrust;
  if(S.propulsion==='inboard'){
   const wash=thrust>0?Math.sqrt(thrust/(.5*1000*.18))*.55:0;
   const flow=u+wash,side=(flow-b.w*y)*Math.sin(delta)+(v+b.w*x)*Math.cos(delta);
   const rudder=-.5*1000*.16*Math.hypot(flow,side)*side/(1+Math.abs(side)/Math.max(.5,Math.abs(flow)));
   force(rudder*Math.sin(delta),rudder*Math.cos(delta),S.rudderLever,y);
  }
  const walk=propWalkForce(S,engine,Math.hypot(u,v),b.planing);force(0,walk,x,y);engine.propWalk=walk;
  // Submerged skeg: flow creates steering even in neutral; stalls at large incidence.
  const axial=(u-b.w*y)*Math.cos(delta)-(v+b.w*x)*Math.sin(delta);
  const skeg=(b.enginesRaised||S.jet||S.air||S.propulsion==='inboard'?0:engine.immersion)*-.5*1000*(S.racing?.035:.022+engine.hp*.00012)*1.1*Math.hypot(axial,lateral)*lateral;
  force(skeg*Math.sin(delta),skeg*Math.cos(delta),x,y);
 });
 // Oars/paddle, when occupied, supply human power rather than an invisible engine.
 if(S.manual&&b.occupied){const oars=oarForces(S,u,b.throttle,b.actualSteer);b.oars=oars;force(oars.port,0,0,-oars.arm);force(oars.starboard,0,0,oars.arm);}
 systemsStep(b,dt);
 force(0,b.thrusters.bowForce,S.length*.38,0);force(0,b.thrusters.sternForce,-S.length*.38,0);
 const reeds=reedDensityAt(b.x,b.y);b.reeds=reeds;
 force(-S.mass*.35*reeds*u*Math.abs(u),-S.mass*.6*reeds*v*Math.abs(v));
 const ax=env.wind.x-b.vx,ay=env.wind.y-b.vy,au=ax*c+ay*s,av=-ax*s+ay*c;
 windForces(S,au,av,b.w,force);
 const bank=b.bank,suction=S.mass*.012*bank.strength*Math.min(9,u*u)*wetFraction;
 force(suction*(bank.nx*c+bank.ny*s),suction*(-bank.nx*s+bank.ny*c),-.18*S.length,0);
 b.bankSuction=0;
 if(e.hydroInteractions===true&&wetFraction>.1){if(!b.bankGeometry||b.time>=(b.bankGeometryAt??0)){b.bankGeometry=sampleBankGeometry(b);b.bankGeometryAt=b.time+.2;}const f=bankForce(b,ur,b.bankGeometry);force((f.x*c+f.y*s)*wetFraction,(-f.x*s+f.y*c)*wetFraction,f.arm,0);b.bankSuction=f.magnitude*wetFraction;}
 force(S.mass*.12*(wave.ax*c+wave.ay*s),S.mass*(S.inflatable?.45:.25)*(-wave.ax*s+wave.ay*c));
 if(S.inflatable)for(const [q,x]of [[foreWake,S.length*.35],[aftWake,-S.length*.35]])force(S.mass*.07*(q.ax*c+q.ay*s),S.mass*.25*(-q.ax*s+q.ay*c),x,0);
 // Body-axis added-mass model with an empirical correction of the yaw moment.
 const udot=(X+S.mass*vr*b.w)/(S.mass+(S.mx-S.mass)*wetFraction);
 const vdot=(Y-S.mass*ur*b.w)/(S.mass+(S.my-S.mass)*wetFraction);
 // Empirical hull stability cancels the bare potential-flow Munk moment.
 // Leaving it uncalibrated amplifies sideslip into a spin at planing speed.
 const rotationalDrag=(1-.42*(b.powerOn?.release??0))*(1-.35*(b.racingSlide??0))*(S.inflatable?.12:S.air?.35:1)*.5*1000*S.beam*S.length**4*(.004+.003*b.planing)*b.w*Math.abs(b.w);
 const rdot=(N-rotationalDrag)/S.iz-(.10+.04*Math.abs(u)/S.length)*b.w;
 // Convert body acceleration to world acceleration without double-counting frame rotation.
 const du=udot-b.w*vr,dv=vdot+b.w*ur;
 b.vx+=(c*du-s*dv)*dt;b.vy+=(s*du+c*dv)*dt;b.w+=rdot*dt;
 solveRopes(b,dt,m=>event(b,m));updateAnchor(b,e,dt,m=>event(b,m));
 groundContact(b,wave,dt,m=>event(b,m));
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
 if(wetFraction>.1&&bottomAt(b.x,b.y).depth>0){recordHullWake(b.wake,b,env.current);recordBrakingWave(b,env.current,dt);}else b.wake=[];
 contacts(b,dt);boomContacts(b,dt);trafficStep(b,e,dt,{integrate:sharedStep});if(sharedStep&&e.traffic)for(const q of b.traffic)boomContacts(q,dt,b);if(sharedStep)boomStep(b,e,dt);
 if(b.damage>=100){b.throttle=0;b.throttle2=0;}
 b.telemetry={surge:ur,sway:vr,thrust:totalThrust,drag:Math.abs(drag),acceleration:udot,shaftPower:b.engines.reduce((sum,en)=>sum+(en.shaftPower??en.hp*735.5*en.n**3),0)};
}
