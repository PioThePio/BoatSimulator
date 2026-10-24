// Deterministic behavioural measurements. Run with npm run audit:physics.
import {pathToFileURL} from 'node:url';
import {createBoat,step} from '../src/physics.js';
import {CRAFTS,engineState,updateEngine,specification} from '../src/craft.js';
import {createTowRig,towStep,trailerContact,trailerAction,placeTrailerBoat,SUV} from '../src/towing.js';
import {bodyPoint,bodyLocal} from '../src/tow-geometry.js';
import {connectWinch} from '../src/trailer-winch.js';
import {systemsStep} from '../src/systems.js';
import {trafficStep} from '../src/traffic.js';
import {soundParameters} from '../src/sound.js';
import {towAudioBoat} from '../src/towing.js';
const dt=1/120;
export function swim(b,seconds,e={}){for(let i=0;i<seconds*120;i++){step(b,e,dt);b.x=80;b.y=110;}return b;}
export function tow(r,b,seconds,e={}){for(let i=0;i<seconds*120;i++){towStep(r,b,dt);step(b,e,dt);trailerContact(r,b,dt);}}
const motion=b=>({surge:b.telemetry.surge,sway:b.telemetry.sway,yaw:b.w,speed:Math.hypot(b.vx,b.vy),planing:b.planing,rpm:b.engines[0].rpm,thrust:b.engines[0].thrust,ventilation:b.engines[0].ventilation});
const boatFor=drive=>createBoat('lake',{profile:drive==='air'?'swamp':drive==='jet'?'pwc':'cabin',propulsion:drive,bowThruster:false,sternThruster:false});
export function auditResults(){
 const result={};
 result.drives=Object.fromEntries(['outboard','zdrive','inboard','jet','air'].map(drive=>{
  const powered=boatFor(drive),neutral=boatFor(drive),reverse=boatFor(drive);
  for(const b of [powered,neutral,reverse])b.steer=b.spec.maxSteer;
  powered.throttle=.08;reverse.throttle=-.08;swim(powered,6);swim(neutral,6);swim(reverse,6);
  return[drive,{powered:motion(powered),neutral:motion(neutral),reverse:motion(reverse)}];
 }));
 result.walk=Object.fromEntries(['outboard','zdrive','inboard','jet','air'].map(drive=>{
  const b=boatFor(drive);b.throttle=-.08;swim(b,5);const f=b.engines[0].propWalk??0;
  return[drive,{force:f,moment:f*b.spec.engineLever,yaw:b.w,sway:b.telemetry.sway}];
 }));
 result.ventilation={};
 for(const [name,immersion]of [['wet',1],['aired',.4]]){
  const en=engineState(150);en.gear=1;for(let i=0;i<1200;i++)updateEngine(en,.65,4,dt,0,{immersion});
  result.ventilation[name]={rpm:en.rpm,thrust:en.thrust,ventilation:en.ventilation};
  if(name==='aired'){
   updateEngine(en,.65,4,dt,0,{immersion:1});result.ventilation.firstRecovery={thrust:en.thrust,ventilation:en.ventilation};
   for(let i=0;i<240;i++)updateEngine(en,.65,4,dt,0,{immersion:1});
   result.ventilation.recovered={rpm:en.rpm,thrust:en.thrust,ventilation:en.ventilation};
  }
 }
 result.trim=Object.fromEntries([.1,.65].map(trim=>{
  const b=createBoat('lake',{powers:[150],propulsion:'zdrive'});b.engines[0].trim=b.engines[0].trimTarget=trim;b.throttle=.65;swim(b,8);
  return[trim,motion(b)];
 }));
 const empty=createBoat('lake'),flooded=createBoat('lake');flooded.bilge.auto=false;flooded.bilge.litres=250;systemsStep(flooded,dt);
 result.bilge={before:{mass:empty.spec.mass,draft:empty.spec.draft},flooded:{mass:flooded.spec.mass,draft:flooded.spec.draft,cgX:flooded.spec.cgX}};
 for(const b of [empty,flooded]){b.throttle=1;swim(b,12);}
 result.bilge.performance={empty:motion(empty),flooded:motion(flooded)};
 const pumped=createBoat('lake',{coldStart:true});pumped.bilge.auto=false;pumped.bilge.manual=true;pumped.bilge.litres=40;systemsStep(pumped,dt);const pumpMass=pumped.spec.mass;
 for(let i=0;i<120*90;i++)systemsStep(pumped,dt);
 result.bilge.manual={removed:pumpMass-pumped.spec.mass,remaining:pumped.bilge.litres,mass:pumped.spec.mass,draft:pumped.spec.draft};
 const auto=createBoat('lake',{coldStart:true});auto.bilge.litres=auto.bilge.autoOnLitres*1.2;systemsStep(auto,dt);systemsStep(auto,dt);const autoStarted=auto.bilge.running;
 for(let i=0;i<120*220;i++)systemsStep(auto,dt);
 result.bilge.auto={started:autoStarted,running:auto.bilge.running,level:auto.bilge.level};
 result.guides=[];
 for(const offset of [.20,.65,1.4]){
  const b=createBoat('service'),r=createTowRig(b,{atSlip:true,slipCarY:9}),p=bodyPoint(r.trailer,r.trailer.offset-.8,offset);
  Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a+(offset>.6?.4:.06)});connectWinch(r,b);r.winch.control=-1;tow(r,b,12);
  result.guides.push({initialOffset:offset,local:bodyLocal(r.trailer,b),angle:Math.abs(b.a-r.trailer.a),score:r.loadingScore.quality,secured:trailerAction(r,b,'secure').ok,damage:b.damage});
 }
 const dry=createBoat('lake'),rig=createTowRig(dry,{loaded:true});trailerAction(rig,dry,'release');dry.ropes=[];rig.winch.attached=false;
 dry.x-=Math.cos(dry.a)*.6;dry.y-=Math.sin(dry.a)*.6;connectWinch(rig,dry);tow(rig,dry,1);const before=bodyLocal(rig.trailer,dry).x-rig.trailer.offset;
 rig.winch.control=-1;tow(rig,dry,12);rig.winch.control=0;const length=rig.winch.length;tow(rig,dry,.5);
 result.winch={before,after:bodyLocal(rig.trailer,dry).x-rig.trailer.offset,tension:rig.winch.tension,capacity:rig.winch.capacity,lengthChangeAfterRelease:rig.winch.length-length,damage:dry.damage};
 result.suv=[];
 for(const profile of ['cabin','cruiser'])for(const awd of [false,true]){
  const b=createBoat('lake',{profile}),r=createTowRig(b,{atSlip:true,slipCarY:9});b.x=80;b.y=110;r.engine.key='running';r.gear='D';r.gas=1;r.awd=awd;let noise=0;
  for(let i=0;i<480;i++){tow(r,b,dt);noise=Math.max(noise,soundParameters(towAudioBoat(r,b)).tyres);}
  result.suv.push({profile,awd,emptyMass:r.trailer.emptyMass,axles:r.trailer.axles,travel:9-r.car.y,speed:r.speed,noise});
 }
 result.launch=[];
 for(const carY of [-20,5,9,11]){
  const b=createBoat('lake'),r=createTowRig(b,{loaded:true,misalignment:0});const shift=carY-r.car.y;r.car.y+=shift;r.trailer.y+=shift;placeTrailerBoat(r,b);trailerAction(r,b,'release');tow(r,b,6);
  result.launch.push({carY,loadKg:b.trailerSupport.kg,sternFloat:b.trailerSupport.sternFloat,bowFloat:b.trailerSupport.bowFloat,loaded:r.boatLoaded,damage:b.damage});
 }
 const air=boatFor('air');air.throttle=1;air.steer=air.spec.maxSteer;swim(air,20);const entry=motion(air),direction=Math.atan2(air.vy,air.vx);air.throttle=0;swim(air,.5);const half=motion(air),directionAfter=Math.atan2(air.vy,air.vx);swim(air,4.5);
 result.swamp={powered:entry,halfSecond:half,afterFive:motion(air),directionChangeHalfSecond:Math.atan2(Math.sin(directionAfter-direction),Math.cos(directionAfter-direction)),draft:air.spec.draft};
 result.mooring=[];
 for(const e of [{traffic:true},{traffic:true,windSpeed:7,currentSpeed:.5,waveHeight:.3,waveDirection:90}]){
  const b=createBoat('lake');let displacement=0,yaw=0,heave=0,tensionMax=0,tensionMin=Infinity;
  for(let i=0;i<2400;i++){b.time+=dt;trafficStep(b,e,dt);const q=b.traffic[0];displacement=Math.max(displacement,Math.hypot(q.x-q.homeX,q.y-q.homeY));yaw=Math.max(yaw,Math.abs(q.a-q.homeA));heave=Math.max(heave,Math.abs(q.heave));for(const r of q.ropes){tensionMax=Math.max(tensionMax,r.tension);tensionMin=Math.min(tensionMin,r.tension);}}
  result.mooring.push({displacement,yaw,heave,tensionMin,tensionMax});
 }
 result.defaults=Object.keys(CRAFTS).map(profile=>{const s=specification({profile});return{profile,name:s.name,length:s.length,beam:s.beam,hullMass:s.hullMass,mass:s.mass,draft:s.draft,propulsion:s.propulsion,powers:s.powers,fuelCapacity:s.fuelCapacity,fuelStart:s.fuelCapacity*.75,crew:s.crewCount,equipment:s.equipmentMass,wheelTurns:s.wheelTurns};});
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(auditResults(),null,2));
