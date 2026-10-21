// SI, x east / y south. Heading clockwise from east. Physics reference: docs/PHYSICS.md.
import {clamp,DOCKS,SOLIDS,BOLLARDS,SERVICE_STATION,environment,bottomAt,waveAt,reedDensityAt} from './world.js';
import {trimAngle} from './drive.js';
import {recordHullWake,sampleHullWake} from './wake.js';
import {FENDERS,recordImpact} from './impacts.js';
export {impactClass} from './impacts.js';
import {createBooms,boomPoint,boomStep} from './marina.js';
import {hullLateralForces,windForces} from './hydrodynamics.js';
import {groundContact,propellerContact} from './ground.js';
import {createSystems,systemsStep} from './systems.js';
import {createTraffic,trafficStep} from './traffic.js';
import {specification,engineState,updateEngine} from './craft.js';
import {placeTrailerBoat} from './towing.js';
import {point,cleat,attachRope,solveRopes,createAnchor,updateAnchor,inverseMass,impulse} from './rigging.js';
export {clamp,DOCKS,SOLIDS,BOLLARDS,environment,bottomAt,waveAt,point,cleat,attachRope};
export const MODEL=specification();
export function createBoat(scenario='approach',options={}){
 const spec=specification(options);
 const starts={approach:[43,37,-2.1],berth:[24.3,22,-Math.PI/2],open:[64,48,-Math.PI/2],beach:[8.2,147,Math.PI/2],island:[304,278,Math.PI],fuel:[54,20,Math.PI/2],service:[SERVICE_STATION.start.x,SERVICE_STATION.start.y,SERVICE_STATION.start.a],canal:[304,204,0],harbor:[61,40,-Math.PI/2],lake:[80,110,0]};
 const [x,y,a]=starts[scenario]||starts.approach;
 return{...createSystems(spec,options.coldStart),booms:createBooms(),traffic:createTraffic(),x,y,a,vx:0,vy:0,w:0,steer:0,actualSteer:0,throttle:0,throttle2:0,linked:true,enginesRaised:false,groundLoad:0,groundMaterial:'sand',spec,
 engines:spec.powers.map((hp,i)=>engineState(hp,spec.engineCount===1?0:(i===0?-1:1)*spec.engineSpacing/2,options.coldStart)),
 fenders:true,damage:0,dockDamage:0,sectionDamage:{},bottomDamage:{},impacts:[],impactTimes:{},ropes:[],anchor:createAnchor(spec),time:0,lastImpact:null,events:[],maxTension:0,wake:[],
 cameraZoom:1,heave:0,heaveVelocity:0,roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,planing:0,underKeel:bottomAt(x,y).depth-spec.draft,grounded:false,groundEvent:-10,
 telemetry:{surge:0,sway:0,thrust:0,drag:0,shaftPower:0}};
}
function event(b,message){b.events.unshift({time:b.time,message});b.events=b.events.slice(0,12);}
function oscillator(state,vel,target,omega,zeta,dt,forcing=0){const acc=omega*omega*(target-state)-2*zeta*omega*vel+forcing;vel+=acc*dt;return[state+vel*dt,vel];}
export function step(b,e,dt){
 b.time+=dt;const S=b.spec,c=Math.cos(b.a),s=Math.sin(b.a);
 if(b.towRig?.boatLoaded){
  placeTrailerBoat(b.towRig,b);b.throttle=b.throttle2=0;
  for(const en of b.engines)updateEngine(en,0,0,dt,b.damage,{noFuel:b.fuel.litres<=0,raised:true,immersion:0,intake:0});
  systemsStep(b,dt);trafficStep(b,e,dt);boomStep(b,e,dt);return;
 }
 const env=environment(b.time,e,b.x,b.y),wave=waveAt(b.x,b.y,b.time,e);
 const ownWave=sampleHullWake(b.wake,b.x,b.y,b.time);
 for(const key of ['eta','sx','sy','vx','vy','ax','ay'])wave[key]+=ownWave[key];
 // Bow/stern encounter slopes capture pitching over one's own curved wake even
 // when the centre happens to lie between its two crests.
 const bow=point(b,S.length*.4,0),stern=point(b,-S.length*.4,0);
 const foreWake=sampleHullWake(b.wake,bow.x,bow.y,b.time),aftWake=sampleHullWake(b.wake,stern.x,stern.y,b.time);
 const encounterSlope=(foreWake.eta-aftWake.eta)/(S.length*.8),centreSlope=ownWave.sx*c+ownWave.sy*s;
 wave.sx+=(encounterSlope-centreSlope)*c;wave.sy+=(encounterSlope-centreSlope)*s;
 b.wakeEncounter=Math.max(Math.abs(ownWave.eta),Math.abs(foreWake.eta),Math.abs(aftWake.eta));
 // Oscillatory orbital flow at draft, with independent restoring heave/roll/pitch.
 const water={x:env.current.x+wave.vx*.65,y:env.current.y+wave.vy*.65};
 [b.heave,b.heaveVelocity]=oscillator(b.heave,b.heaveVelocity,wave.eta-(b.anchor.shape?.V??0)/(1000*9.81*S.length*S.beam*.65),4.2+3*b.planing,.65,dt);
 const windSide=-env.wind.x*s+env.wind.y*c;
 const rollTarget=clamp(Math.atan(-wave.sx*s+wave.sy*c)+windSide*Math.abs(windSide)*S.freeboard/(S.mass*.9)-b.planing*Math.atan((b.telemetry.surge??0)*b.w/9.81)*.6,-.3,.3);
 [b.roll,b.rollVelocity]=oscillator(b.roll,b.rollVelocity,rollTarget,Math.sqrt(9.81/(S.beam*.32)),.28,dt);
 const ur=(b.vx-env.current.x)*c+(b.vy-env.current.y)*s;
 const vr=-(b.vx-env.current.x)*s+(b.vy-env.current.y)*c;
 const u=(b.vx-water.x)*c+(b.vy-water.y)*s;
 const v=-(b.vx-water.x)*s+(b.vy-water.y)*c;
 const viewTarget=1-.22*clamp((Math.hypot(ur,vr)-3)/12,0,1);b.cameraZoom+=(viewTarget-b.cameraZoom)*(1-Math.exp(-dt/2));
 let X=0,Y=0,N=0;
 const force=(x,y,px=0,py=0)=>{X+=x;Y+=y;N+=px*y-py*x;};
 const fn=Math.abs(u)/Math.sqrt(9.81*S.length);
 const meanTrim=S.jet?.10:b.engines.reduce((sum,en)=>sum+en.trim,0)/b.engines.length;
 const driveAngle=trimAngle(meanTrim);
 const turnLoad=Math.hypot(1,u*b.w/9.81);
 const liftRatio=.5*1000*u*u*S.length*S.beam*.23*Math.max(.025,.09-S.deadrise*.0012)/Math.max(1,S.mass*9.81*turnLoad);
 const targetPlaning=S.planing&&u>0?clamp((fn-.48)/.4,0,1)*clamp((liftRatio-(S.jet?.12:.22))/(S.jet?.40:.43),0,1):0;
 b.planing+=(targetPlaning-b.planing)*(1-Math.exp(-dt/(targetPlaning>b.planing?2.8:1.4)));
 const hump=Math.exp(-(((fn-.55)/.24)**2))*(1-.65*b.planing);
 const pitchTarget=clamp(Math.atan(wave.sx*c+wave.sy*s)+hump*.085+(b.planing*(.045+driveAngle*.42))+(b.telemetry.acceleration??0)*.014-S.cgX/S.length*.3-(b.anchor.shape?.V??0)/(S.mass*9.81)*.5,-.12,.24);
 [b.pitch,b.pitchVelocity]=oscillator(b.pitch,b.pitchVelocity,pitchTarget,Math.sqrt(9.81/(S.length*.14)),.65,dt);
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
 const drag=friction+Math.sign(u)*(turnDrag+induced+waveDrag+support+displacementLimit+transom);
 force(-drag-S.mass*.009*u,0);
 hullLateralForces(S,u,v,b.w,b.planing,force);
 // Outboards rotate at a finite rate; linked controls copy commands, not engine states.
 const steeringRate=S.jet?1.6:.38;
 b.actualSteer+=clamp(b.steer-b.actualSteer,-steeringRate*dt,steeringRate*dt);
 if(b.linked)b.throttle2=b.throttle;
 if(b.engines.length===2)b.engines[1].trimTarget=b.engines[0].trimTarget;
 let totalThrust=0;
 b.engines.forEach((engine,i)=>{
  const x=S.engineLever,y=engine.y,delta=b.actualSteer;
  const inflow=(u-b.w*y)*Math.cos(delta)-(v+b.w*x)*Math.sin(delta);
  const lateral=(u-b.w*y)*Math.sin(delta)+(v+b.w*x)*Math.cos(delta);
  propellerContact(b,engine,dt,m=>event(b,m),e);
  // Encounter rate includes moving into a wave, not just its time oscillation.
  // Subtract hull heave/pitch/roll so following the surface does not add load.
  const g=engine.drive,surfaceRate=engine.lastSurface==null?0:(g.surface-engine.lastSurface)/dt;
  engine.lastSurface=g.surface;
  const vertical=b.heaveVelocity+g.mountX*Math.cos(b.pitch)*b.pitchVelocity+engine.y*Math.cos(b.roll)*b.rollVelocity;
  const waveLoad=clamp(2.5*Math.abs(u)*Math.max(0,surfaceRate-vertical)/(9.81*S.length),0,.25);
  let thrust=updateEngine(engine,i===0?b.throttle:b.throttle2,inflow,dt,b.damage,{noFuel:b.fuel.litres<=0,jet:S.jet,grounded:b.grounded,moored:b.ropes.length>0,raised:b.enginesRaised,speed:Math.hypot(ur,vr),immersion:engine.immersion,intake:engine.intake,crossflow:lateral,waveLoad});
  if(b.enginesRaised){thrust=0;engine.thrust=0;}
  thrust*=S.jet?1:Math.cos(trimAngle(engine.trim));
  force(thrust*Math.cos(delta),-thrust*Math.sin(delta),x,y);totalThrust+=thrust;
  // Submerged skeg: flow creates steering even in neutral; stalls at large incidence.
  const axial=(u-b.w*y)*Math.cos(delta)-(v+b.w*x)*Math.sin(delta);
  const skeg=(b.enginesRaised||S.jet?0:engine.immersion)*-.5*1000*(.022+engine.hp*.00012)*1.1*Math.hypot(axial,lateral)*lateral;
  force(skeg*Math.sin(delta),skeg*Math.cos(delta),x,y);
 });
 systemsStep(b,dt);
 force(0,b.thrusters.bowForce,S.length*.38,0);force(0,b.thrusters.sternForce,-S.length*.38,0);
 const reeds=reedDensityAt(b.x,b.y);b.reeds=reeds;
 force(-S.mass*.35*reeds*u*Math.abs(u),-S.mass*.6*reeds*v*Math.abs(v));
 const ax=env.wind.x-b.vx,ay=env.wind.y-b.vy,au=ax*c+ay*s,av=-ax*s+ay*c;
 windForces(S,au,av,b.w,force);
 force(S.mass*.12*(wave.ax*c+wave.ay*s),S.mass*.25*(-wave.ax*s+wave.ay*c));
 // Body-axis added-mass model with an empirical correction of the yaw moment.
 const udot=(X+S.mass*vr*b.w)/S.mx;
 const vdot=(Y-S.mass*ur*b.w)/S.my;
 // Empirical hull stability cancels the bare potential-flow Munk moment.
 // Leaving it uncalibrated amplifies sideslip into a spin at planing speed.
 const rotationalDrag=.5*1000*S.beam*S.length**4*(.004+.003*b.planing)*b.w*Math.abs(b.w);
 const rdot=(N-rotationalDrag)/S.iz-(.16+.04*Math.abs(u)/S.length)*b.w;
 // Convert body acceleration to world acceleration without double-counting frame rotation.
 const du=udot-b.w*vr,dv=vdot+b.w*ur;
 b.vx+=(c*du-s*dv)*dt;b.vy+=(s*du+c*dv)*dt;b.w+=rdot*dt;
 solveRopes(b,dt,m=>event(b,m));updateAnchor(b,e,dt,m=>event(b,m));
 groundContact(b,wave,dt,m=>event(b,m));
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
 recordHullWake(b.wake,b,env.current);
 contacts(b,dt);boomContacts(b,dt);trafficStep(b,e,dt);if(e.traffic)for(const q of b.traffic)boomContacts(q,dt,b);boomStep(b,e,dt);
 if(b.damage>=100){b.throttle=0;b.throttle2=0;}
 b.telemetry={surge:ur,sway:vr,thrust:totalThrust,drag:Math.abs(drag),acceleration:udot,shaftPower:b.engines.reduce((sum,en)=>sum+en.hp*735.5*en.n**3,0)};
}
const CONTACTS=SOLIDS;
function contactSamples(b){
 const S=b.spec,radius=S.beam*.48,offset=S.length*.5-radius,count=Math.max(3,Math.ceil(2*offset/(radius*1.4))+1);
 return[...(b.fenders?FENDERS.map(f=>({x:f.x*S.length,y:f.y*S.beam,radius:S.beam*.065,fender:f.id})):[]),...Array.from({length:count},(_,i)=>({x:-offset+2*offset*i/(count-1),y:0,radius}))];
}
function contacts(b,dt){
 for(let iteration=0;iteration<3;iteration++)for(const sample of contactSamples(b)){
  const {radius,fender}=sample,p=point(b,sample.x,sample.y);
  for(let k=0;k<CONTACTS.length;k++){
   const rect=CONTACTS[k],near={x:clamp(p.x,rect.x,rect.x+rect.w),y:clamp(p.y,rect.y,rect.y+rect.h)};
   const dx=p.x-near.x,dy=p.y-near.y,d=Math.hypot(dx,dy);let depth=radius-d;
   if(depth<=0)continue;let nx,ny;
   if(d<1e-8){const sides=[{v:p.x-rect.x,x:-1,y:0},{v:rect.x+rect.w-p.x,x:1,y:0},{v:p.y-rect.y,x:0,y:-1},{v:rect.y+rect.h-p.y,x:0,y:1}].sort((a,b)=>a.v-b.v);nx=sides[0].x;ny=sides[0].y;depth=radius+sides[0].v;}else{nx=dx/d;ny=dy/d;}
   const arm={x:p.x-b.x-nx*radius,y:p.y-b.y-ny*radius},n={x:nx,y:ny};
   const vn=(b.vx-b.w*arm.y)*nx+(b.vy+b.w*arm.x)*ny,effective=1/inverseMass(b,n,arm);
   const dockContact=k<DOCKS.length||!!rect.fender;
   const protectedContact=(!!fender||!!rect.fender)&&dockContact;
   if(vn<0){
    const speed=-vn;impulse(b,n,-1.015*vn*effective,arm);
    recordImpact(b,{arm,speed,effective,protectedContact,fender,target:rect.id??'solid-'+k,dock:dockContact},m=>event(b,m));
   }
   b.x+=nx*depth*.8;b.y+=ny*depth*.8;
  }
 }
}

function boomContacts(b,dt,world=b){
 for(const q of world.booms){
  const end=boomPoint(q),dx=end.x-q.x1,dy=end.y-q.y1;
  for(const sample of contactSamples(b)){
   const {radius,fender}=sample,p=point(b,sample.x,sample.y),t=clamp(((p.x-q.x1)*dx+(p.y-q.y1)*dy)/(q.length*q.length),0,1);
   const near=boomPoint(q,t),rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),depth=radius+q.width/2-d;
   if(depth<=0||d<1e-6)continue;
   const n={x:rx/d,y:ry/d},arm={x:p.x-b.x-n.x*radius,y:p.y-b.y-n.y*radius};
   const lever=(near.x-q.x1)*n.y-(near.y-q.y1)*n.x;
   const vn=(b.vx-b.w*arm.y-near.vx)*n.x+(b.vy+b.w*arm.x-near.vy)*n.y;
   if(vn<0){const effective=1/(inverseMass(b,n,arm)+lever*lever/q.inertia),j=-vn*effective;
    impulse(b,n,j,arm);q.w-=lever*j/q.inertia;
    if(b===world)recordImpact(b,{arm,speed:-vn,effective,protectedContact:!!fender,fender,target:q.id??'Y-bom'},m=>event(b,m));
   }
   b.x+=n.x*depth*.65;b.y+=n.y*depth*.65;
  }
 }
}
