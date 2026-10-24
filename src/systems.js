import {clamp,FUEL_STATIONS} from './world.js';
import {updateMass} from './craft.js';
import {cleat} from './rigging.js';
import {mooringPoint} from './marina.js';
import {serviceStep} from './service.js';
import {createBilge,bilgeStep} from './bilge.js';
import {createElectrics,electricalStep} from './electrical.js';
import {createOperations,operationsStep,consumeOperatingFuel} from './operations.js';
export function createSystems(spec,cold=false){return{bilge:createBilge(spec),electrics:createElectrics(),operations:createOperations(),
 fuel:{capacity:spec.fuelCapacity,litres:spec.fuelCapacity*.75,flow:0,refueling:false,status:'',tanks:Array.from({length:spec.tankCount},(_,i)=>({capacity:spec.fuelCapacity/spec.tankCount,litres:spec.fuelCapacity*.75/spec.tankCount,x:-.16*spec.length,y:spec.tankCount===1?0:(i===0?-1:1)*spec.beam*.22}))},
 service:{active:false,progress:0,initial:0,status:''},battery:{capacity:spec.jet?35:80+80*(Number(spec.bowThruster)+Number(spec.sternThruster)),soc:.85,voltage:12.65,current:0},thrusters:{bow:0,stern:0,bowActual:0,sternActual:0,bowForce:0,sternForce:0},coldStart:cold};}
export function fuelBerthStatus(b){
 // A real hull side must lie alongside the marked east face of the fuel pier.
 const S=b.spec,angle=Math.abs(Math.cos(b.a));
 const face=b.x-Math.abs(Math.sin(b.a))*S.beam*.5-Math.abs(Math.cos(b.a))*S.length*.5;
 const station=FUEL_STATIONS.find(q=>angle<.40&&b.y>=q.alongMin&&b.y<=q.alongMax&&face>=q.x-.25&&face<=q.x+q.maxGap);
 const positioned=!!station;
 if(!positioned)return{ok:false,message:'Podejdź burtą do oznaczonego stanowiska paliwowego z odbijaczami.'};
 const tied=b.ropes.some(r=>{const q=mooringPoint(b,r.bollard),p=cleat(b,r.end);return q&&q.kind==='bollard'&&Math.abs(q.x-station.x)<.3&&q.y>=station.alongMin-2&&q.y<=station.alongMax+2&&Math.hypot(p.x-q.x,p.y-q.y)<=r.length+.3;});
 if(!tied)return{ok:false,message:'Przywiąż co najmniej jedną cumę do stanowiska paliwowego.'};
 if(Math.hypot(b.vx,b.vy)>.15)return{ok:false,message:'Zatrzymaj łódź przed tankowaniem.'};
 if(b.engines.some(e=>e.key!=='off'))return{ok:false,message:'Wyłącz silniki i zapłon przed tankowaniem.'};
 return{ok:true,station:station.id??'rynia',message:'Stanowisko gotowe do tankowania.'};
}
export function requestRefuel(b){
 if(b.fuel.refueling){b.fuel.refueling=false;b.fuel.status='Tankowanie zatrzymane';return{ok:true,message:'Tankowanie zatrzymane.'};}
 const status=fuelBerthStatus(b);if(!status.ok)return status;if(b.fuel.litres>=b.fuel.capacity)return{ok:false,message:'Zbiornik jest pełny.'};
 b.fuel.refueling=!b.fuel.refueling;b.fuel.status='';return{ok:true,message:b.fuel.refueling?'Tankowanie rozpoczęte.':'Tankowanie zatrzymane.'};
}
export function systemsStep(b,dt){
 serviceStep(b,dt);
 const fuel=b.fuel,battery=b.battery;
 consumeOperatingFuel(fuel,b.engines,b.operations,dt);
 operationsStep(b.operations,b.engines,b,dt,{travelling:!b.towRig?.boatLoaded&&!b.sunken});
 if(fuel.refueling){
  const allowed=fuelBerthStatus(b).ok;
  if(allowed){fuel.litres=Math.min(fuel.capacity,fuel.litres+.65*dt);fuel.status='Tankowanie';if(fuel.litres>=fuel.capacity){fuel.refueling=false;fuel.status='Zbiornik pełny';}}
  else{fuel.refueling=false;fuel.status='Tankowanie przerwane';}
 }
 for(const tank of fuel.tanks)tank.litres=fuel.litres*tank.capacity/fuel.capacity;
 bilgeStep(b,dt);updateMass(b.spec,fuel.litres,b.bilge.litres);
 const powered=b.electrics.master!==false&&b.electrics.thrusters!==false;
 let thrusterAmps=0;
 const forceScale=b.spec.thrusterRating,speed=Math.abs(b.telemetry.surge);
 const availability=powered&&battery.soc>.04&&battery.voltage>10.2?1:0;
 for(const end of ['bow','stern']){
  const installed=b.spec[end+'Thruster'];
  const target=installed?b.thrusters[end]*availability:0;
  b.thrusters[end+'Actual']+=(target-b.thrusters[end+'Actual'])*(1-Math.exp(-dt/.22));
  if(!availability)b.thrusters[end+'Actual']=0;
  const value=b.thrusters[end+'Actual'];
  b.thrusters[end+'Force']=availability*forceScale*value/(1+(speed/1.8)**2)*clamp(battery.voltage/12,0,1.1);
  thrusterAmps+=Math.abs(value)*forceScale*6.5/Math.max(10,battery.voltage);
 }
 electricalStep(b,dt,thrusterAmps);
}
