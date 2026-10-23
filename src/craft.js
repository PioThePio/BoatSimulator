import {STARTER_LIMITS} from './electrical.js';
import {trimAngle} from './drive.js';
import {thermalStep,THERMAL_LIMITS} from './thermal.js';
import {clamp} from './world.js';
export const CRAFTS={
 tender:{name:'Łódź otwarta 4,2 m',length:4.2,beam:1.75,hullMass:380,draft:.28,hp:25,freeboard:.45,planing:true,deadrise:12,fuel:45,color:'#e8e9cf',anchorMass:6,chain:6,lineEA:80000,lineBreak:10000},
 runabout:{name:'Motorówka 5,5 m',length:5.5,beam:2.15,hullMass:800,draft:.38,hp:90,freeboard:.65,planing:true,deadrise:20,fuel:100,color:'#f3f1e7',anchorMass:10,chain:8,lineEA:160000,lineBreak:18000},
 cabin:{name:'Kabinowa 7,5 m',length:7.5,beam:2.65,hullMass:2100,draft:.55,hp:200,freeboard:1.15,planing:true,deadrise:22,fuel:250,color:'#e0eaf0',anchorMass:16,chain:10,lineEA:240000,lineBreak:28000},
 cruiser:{name:'Wypornościowa 9 m',length:9,beam:3.1,hullMass:4200,draft:.75,hp:90,freeboard:1.5,planing:false,deadrise:8,fuel:400,color:'#d9ded0',anchorMass:24,chain:14,lineEA:330000,lineBreak:40000},
 pwc:{name:'Skuter wodny 3,2 m',length:3.2,beam:1.22,hullMass:310,draft:.20,hp:170,freeboard:.30,planing:true,deadrise:22,fuel:60,color:'#e5b35c',jet:true,anchorMass:3,chain:3,lineEA:60000,lineBreak:8000}
};
CRAFTS.flat={...CRAFTS.tender,name:'Płaskodenna 4,6 m',length:4.6,beam:1.9,hullMass:440,draft:.23,hp:50,deadrise:3,color:'#e2dab7'};
CRAFTS.rib={...CRAFTS.runabout,name:'RIB 5,2 m',length:5.2,beam:2.25,hullMass:470,draft:.30,hp:100,deadrise:18,color:'#b4bdbc'};
CRAFTS.swamp={...CRAFTS.flat,name:'Swamp boat · śmigło powietrzne 5,3 m',length:5.3,beam:2.35,hullMass:650,draft:.16,hp:180,freeboard:.42,fuel:90,air:true,color:'#bec39a'};
const hulls={tender:['v',.2,.55,1,1],runabout:['v',.2,.6,1,1],cabin:['cabin',.4,1,1.1,.85],cruiser:['displacement',.6,1,.0,.65],pwc:['jet',0,.3,.75,.9],flat:['flat',.2,.55,.7,1.65],rib:['rib',.25,.9,.78,1.1],swamp:['flat',0,.85,.65,1.5]};
for(const [id,p]of Object.entries(CRAFTS)){
 const [hullType,propWalkStrength,windageFactor,planingThreshold,waveResponse]=hulls[id];
 Object.assign(p,{maxHp:350,hullType,propWalkStrength,windageFactor,planingThreshold,waveResponse});
}
export const PROPULSIONS={tender:['outboard'],runabout:['outboard','zdrive'],cabin:['outboard','zdrive','inboard'],cruiser:['inboard'],pwc:['jet'],flat:['outboard'],rib:['outboard'],swamp:['air']};
for(const [id,p]of Object.entries(CRAFTS)){p.propulsions=PROPULSIONS[id];p.steeringDegrees=p.jet?28:45;}
export function specification(options={}){
 const profile=options.profile in CRAFTS?options.profile:'runabout',p=CRAFTS[profile];
 const length=clamp(Number(options.length)||p.length,2.8,11),beam=clamp(Number(options.beam)||p.beam,1.1,3.8),hullMass=clamp(Number(options.hullMass)||p.hullMass,200,8000);
 const engineCount=p.jet||p.air?1:options.engineCount===2?2:1;
 const powers=Array.from({length:engineCount},(_,i)=>clamp(Number(options.powers?.[i])||p.hp,10,350));
 const fuelCapacity=clamp(Number(options.fuelCapacity)||p.fuel,10,800),tankCount=options.tankCount===2?2:1;
 const crewCount=clamp(Math.round(Number(options.crewCount??(p.jet?1:2))),0,12),crewMass=crewCount*75,equipmentMass=clamp(Number(options.equipmentMass??(p.jet?5:25)),0,1500);
 // A sterndrive is an inboard engine with a steerable, tiltable leg. It must
 // never share the fixed-shaft/rudder branch (inboard) merely by engine location.
 const propulsion=p.propulsions.includes(options.propulsion)?options.propulsion:p.propulsions[0];
 const structureMass=hullMass+powers.reduce((sum,hp)=>sum+(p.jet?0:28+hp*.62),0)+fuelCapacity*.08+2*tankCount+(p.jet?0:22*(Number(!!options.bowThruster)+Number(!!options.sternThruster)));
 const dryMass=structureMass+crewMass+equipmentMass;
 const mass=dryMass+fuelCapacity*.75*.745;
 const base={...p,profile,length,beam,hullMass,engineCount,powers,fuelCapacity,tankCount,dryMass,mass,structureMass,crewCount,crewMass,equipmentMass,propulsion,
  propWalkStrength:clamp(Number(options.propWalkStrength??p.propWalkStrength),0,1),windageFactor:clamp(Number(options.windageFactor??p.windageFactor),0,2),
  referenceMass:structureMass+(p.jet?75:150)+(p.jet?5:25)+fuelCapacity*.75*.745,referenceDraft:p.draft*(hullMass/p.hullMass)**.32,draft:p.draft*(hullMass/p.hullMass)**.32,engineSpacing:engineCount===2?beam*.46:0,maxSteer:(p.jet?p.steeringDegrees:clamp(Number(options.steeringLimit)||p.steeringDegrees,30,45))*Math.PI/180,
  wheelTurns:({tender:1.5,runabout:2.5,cabin:3,cruiser:3.5,pwc:.25,flat:1.5,rib:2,swamp:.75})[profile],steeringLockTime:({tender:1,runabout:1.4,cabin:1.7,cruiser:1.9,pwc:.45,flat:1,rib:1.1,swamp:.65})[profile],thrusterRating:clamp(length*beam*45,220,1550),
  engineLever:p.jet?-.40*length:p.air?-.50*length:propulsion==='inboard'?-.36*length:-.44*length,rudderLever:-.53*length,bowThruster:!p.jet&&!p.air&&!!options.bowThruster,sternThruster:!p.jet&&!p.air&&!!options.sternThruster};
 return updateMass(base,fuelCapacity*.75);
}
export function updateMass(spec,fuelLitres,bilgeLitres=0){
 spec.mass=spec.dryMass+Math.max(0,fuelLitres)*.745+Math.max(0,bilgeLitres);
 spec.draft=Math.max(.08,spec.referenceDraft+(spec.mass-spec.referenceMass)/(1000*spec.length*spec.beam*.7));
 spec.cgX=-spec.length*(.16*fuelLitres*.745+.30*bilgeLitres)/spec.mass;
 spec.inertia=spec.mass*((.27*spec.length)**2+(.22*spec.beam)**2)+fuelLitres*.745*(spec.length*.16)**2+bilgeLitres*(spec.length*.30)**2;
 spec.mx=spec.mass*1.08;spec.my=spec.mass*1.65;spec.iz=spec.inertia*1.55;
 return spec;
}
export function engineState(hp,y=0,coldStart=false){return{hp,y,clock:0,operatingHours:0,fuelUsed:0,thermalStage:'normal',command:0,gear:0,n:0,shift:0,thrust:0,rpm:coldStart?0:750,propDamage:0,propContact:false,propClearance:10,lastStrike:-10,key:coldStart?'off':'running',startTime:0,trim:.10,trimTarget:.10,trimRate:0,immersion:1,intake:1,propDepth:.4,ventilation:0,load:0,governorLoad:0,inflow:0,opposingFlow:0,waveLoad:0,fuelFlow:0,temperature:18,cooling:0,overheated:false,thermalLimit:1,thermalTrip:false};}
export function engineKey(b,index,action){
 const en=b.engines[index];if(!en)return{ok:false,message:'Brak silnika.'};
 if(action==='off'){en.key='off';en.startTime=0;en.gear=0;en.thrust=0;en.ventilation=0;return{ok:true,message:'Silnik wyłączony.'};}
 if(action==='ignition'&&b.electrics?.master===false)return{ok:false,message:'Włącz główne zasilanie łodzi.'};
 if(action==='ignition'){en.key='ignition';en.thrust=0;en.gear=0;return{ok:true,message:'Zapłon włączony.'};}
 if(action==='start'){
  if(b.electrics?.master===false)return{ok:false,message:'Włącz główne zasilanie łodzi.'};
  if(en.flooded||b.sunken)return{ok:false,message:'Silnik zalany · wypompuj wodę i napraw łódź w serwisie.'};
  if(en.key==='running')return{ok:true,message:'Silnik już pracuje.'};
  if(en.temperature>THERMAL_LIMITS.restart)return{ok:false,message:'Silnik przegrzany — poczekaj, aż ostygnie poniżej 110°C.'};
  en.thermalTrip=false;
  if(Math.abs(index===0?b.throttle:b.throttle2)>.035)return{ok:false,message:'Przed rozruchem ustaw manetkę na luz.'};
  if(b.fuel.litres<=0)return{ok:false,message:'Brak paliwa.'};
  if(b.battery.soc<STARTER_LIMITS.minimumSOC||b.battery.voltage<STARTER_LIMITS.minimumVoltage)return{ok:false,message:'Akumulator nie pozwala na rozruch.'};
  if(en.key==='off')return{ok:false,message:'Najpierw włącz zapłon.'};
  if(en.key!=='running'){en.key='starting';en.startTime=0;en.crankProgress=0;en.startFailure=false;}return{ok:true,message:'Rozrusznik pracuje…'};
 }
 return{ok:false,message:'Nieznana pozycja stacyjki.'};
}
export function updateEngine(en,command,inflow,dt,damage=0,context={}){
 en.clock+=dt;const previousN=en.n;
 const trimStep=clamp(en.trimTarget-en.trim,-(en.trim>.4?.16:.10)*dt,(en.trim>.4?.16:.10)*dt);
 en.trim+=trimStep;en.trimRate=dt>0?trimStep/dt:0;en.inflow=inflow;
 const cmd=clamp(command,context.air?0:-1,1);en.command=cmd;
 thermalStep(en,dt,context);
 if(en.key==='starting'){
  en.startTime+=dt;const voltage=context.starterVoltage??12.6;en.rpm=260*clamp((voltage-8)/3.8,.15,1);en.thrust=0;en.gear=0;
  en.crankProgress=(en.crankProgress??0)+(en.rpm>=STARTER_LIMITS.minimumRPM?dt*en.rpm/260:0);
  if(en.crankProgress>1.15)en.key='running';
  else if(voltage<9||en.startTime>STARTER_LIMITS.timeout){en.key='ignition';en.rpm=0;en.startFailure=true;}return 0;
 }
 if(en.key!=='running'||context.noFuel){en.n*=Math.exp(-dt/.35);en.rpm=0;en.thrust=0;en.gear=0;en.load=0;en.governorLoad=0;en.opposingFlow=0;en.waveLoad=0;en.ventilation=0;en.propGrip=0;en.burst=0;en.regrip=0;if(context.noFuel)en.key='ignition';return 0;}
 const desired=Math.abs(cmd)<.035?0:Math.sign(cmd);
 const airExposure=context.air?0:clamp((.70-(context.immersion??1))/.70,0,1);
 const highAngle=context.fixedDrive||context.air?0:clamp((trimAngle(en.trim)*180/Math.PI-10)/38,0,1);
 const trimVent=context.air?0:Math.max(airExposure,context.jet?0:highAngle*(.15+.85*clamp((Math.abs(inflow)-.5)/6,0,1)))*clamp(en.n/.5,0,1)*(.2+.8*Math.abs(cmd));
 en.ventilation+=(trimVent-en.ventilation)*(1-Math.exp(-dt/.35));
 // Signed advance matters: backing against forward motion loads the propeller
 // more than running with the same inflow. Steering alone cannot create load.
 // A PWC reverses its deflector, not the pump's rotation or inlet flow.
 const loadAdvance=context.jet?Math.abs(inflow):en.gear*inflow,crossflow=context.crossflow??0;
 const advanceLoad=clamp(1-loadAdvance/(4+12*en.n),.15,1);
 const crossLoad=clamp(.65*crossflow**2/(inflow**2+(3+9*en.n)**2),0,.25);
 en.waveLoad=clamp(context.waveLoad??0,0,.25);
 en.opposingFlow=en.gear?Math.max(0,-en.gear*inflow):0;
 const load=en.gear?clamp((advanceLoad+crossLoad+en.waveLoad)*(1-en.ventilation)*(context.immersion??1),0,1):0;
 en.load+=(load-en.load)*(1-Math.exp(-dt/.14));
 // Limited torque reserve: a new load first pulls RPM down; the slow governor
 // recovers part of that dip. The resulting shaft speed also determines thrust.
 en.governorLoad+=(en.load-en.governorLoad)*(1-Math.exp(-dt/1.4));
 const transientLoad=Math.max(0,en.load-en.governorLoad);
 if(desired!==en.gear){en.n*=Math.exp(-dt/(context.jet?.14:.28));en.shift+=dt;if(en.n<.055&&en.shift>=(context.jet?.22:.65)){en.gear=desired;en.shift=0;}}
 else{
  en.shift=0;const demand=desired?.23+.77*clamp((Math.abs(cmd)-.08)/.92,0,1)**.65:0;
  const target=clamp(demand*(1-.035*en.load-.025*transientLoad)+en.ventilation*.13,0,1);
  const tau=target>en.n?(context.jet?.25+.18*en.load:.65+.30*(en.hp/350)**.3+.35*en.load):(context.jet?.22:.4);
  en.n+=(target-en.n)*(1-Math.exp(-dt/tau));
 }
 const n=en.n,gear=en.gear;
 // A short-lived disturbed jet after clutch engagement / rapid spool-up.
 // This is engine-time state, independent of render frame rate.
 const burstTarget=gear?clamp(((n-previousN)/dt-.12)*1.6,0,1):0;
 en.burst=Math.max(burstTarget,(en.burst??0)*Math.exp(-dt/.65));
 const staticThrust=(context.air?40:context.jet?62:85)*en.hp**.8,advance=gear*inflow;
 const advanceFactor=context.air?clamp(1-.16*advance/(8+30*n),.3,1.1):clamp(1-.22*advance/(2+11*n),.12,1.35);
 const reverse=context.jet?.34:.58;
 const bollard=staticThrust*n*n*(gear<0?reverse:1)*advanceFactor;
 const powerLimit=(context.jet?.63:.55)*en.hp*735.5*n**3/Math.max(context.air?5:1,Math.abs(inflow));
 // Loss of wet grip is immediate; refilling an aired propeller stream/intake
 // takes time. A returning wave cannot restore the whole thrust in one tick.
 const previousGrip=en.propGrip??1,grip=(1-.90*en.ventilation)*(context.immersion??1);
 en.propGrip=grip<(en.propGrip??1)?grip:(en.propGrip??1)+(grip-(en.propGrip??1))*(1-Math.exp(-dt/.30));
 // Recovery of an aired propeller displaces the remaining air for a moment.
 const recovery=previousGrip<.85?clamp((en.propGrip-previousGrip)/dt*.55,0,1):0;
 en.regrip=Math.max(recovery,(en.regrip??0)*Math.exp(-dt/.45));
 en.thrust=desired===gear?gear*Math.min(bollard,powerLimit)*(1-damage/100)*(1-en.propDamage/100)**1.5*en.propGrip*en.thermalLimit:0;
 // Idle governor responds to clutch load; small combustion/governor ripple, independent per engine.
 const idle=750+(gear!==0?65*clamp(n/.22,0,1):0),shaft=4750*clamp((n-.23)/.77,0,1);
 const ripple=(11+9*n)*Math.sin(en.clock*8.1+en.y*2.7)+5*Math.sin(en.clock*13.7+en.hp*.01);
 // Cold idle hunting fades with temperature and throttle; each engine has its
 // own phase. It never introduces RPM on an engine that has stopped.
 const cold=clamp((60-en.temperature)/42,0,1)*(1-clamp((n-.23)/.25,0,1)),phase=en.y*2.3+en.hp*.013;
 const hunting=cold*(18*Math.sin(en.clock*2.1+phase)+9*Math.sin(en.clock*3.3-phase));
 en.rpm=idle+shaft+en.ventilation*450+ripple+hunting;
 en.fuelFlow=.45+.003*en.hp+.29*en.hp*n**3*(.55+.45*en.load);
 return en.thrust;
}
