import {clamp,FUEL_STATION} from './world.js';
import {updateMass} from './craft.js';
import {cleat} from './rigging.js';
import {mooringPoint} from './marina.js';
import {serviceStep} from './service.js';
import {createBilge,bilgeStep} from './bilge.js';
export function createSystems(spec,cold=false){return{bilge:createBilge(spec),
 fuel:{capacity:spec.fuelCapacity,litres:spec.fuelCapacity*.75,flow:0,refueling:false,status:'',tanks:Array.from({length:spec.tankCount},(_,i)=>({capacity:spec.fuelCapacity/spec.tankCount,litres:spec.fuelCapacity*.75/spec.tankCount,x:-.16*spec.length,y:spec.tankCount===1?0:(i===0?-1:1)*spec.beam*.22}))},
 service:{active:false,progress:0,initial:0,status:''},battery:{capacity:spec.jet?35:80+80*(Number(spec.bowThruster)+Number(spec.sternThruster)),soc:.85,voltage:12.65,current:0},thrusters:{bow:0,stern:0,bowActual:0,sternActual:0,bowForce:0,sternForce:0},coldStart:cold};}
export function fuelBerthStatus(b){
 // A real hull side must lie alongside the marked east face of the fuel pier.
 const S=b.spec,angle=Math.abs(Math.cos(b.a));
 const face=b.x-Math.abs(Math.sin(b.a))*S.beam*.5-Math.abs(Math.cos(b.a))*S.length*.5;
 const positioned=angle<.40&&b.y>=FUEL_STATION.alongMin&&b.y<=FUEL_STATION.alongMax&&face>=FUEL_STATION.x-.25&&face<=FUEL_STATION.x+FUEL_STATION.maxGap;
 if(!positioned)return{ok:false,message:'Podejdź burtą do oznaczonego stanowiska paliwowego z odbijaczami.'};
 const tied=b.ropes.some(r=>{const q=mooringPoint(b,r.bollard),p=cleat(b,r.end);return q&&q.kind==='bollard'&&Math.abs(q.x-FUEL_STATION.x)<.3&&q.y>=FUEL_STATION.alongMin-2&&q.y<=FUEL_STATION.alongMax+2&&Math.hypot(p.x-q.x,p.y-q.y)<=r.length+.3;});
 if(!tied)return{ok:false,message:'Przywiąż co najmniej jedną cumę do stanowiska paliwowego.'};
 if(Math.hypot(b.vx,b.vy)>.15)return{ok:false,message:'Zatrzymaj łódź przed tankowaniem.'};
 if(b.engines.some(e=>e.key!=='off'))return{ok:false,message:'Wyłącz silniki i zapłon przed tankowaniem.'};
 return{ok:true,message:'Stanowisko gotowe do tankowania.'};
}
export function requestRefuel(b){
 if(b.fuel.refueling){b.fuel.refueling=false;b.fuel.status='Tankowanie zatrzymane';return{ok:true,message:'Tankowanie zatrzymane.'};}
 const status=fuelBerthStatus(b);if(!status.ok)return status;if(b.fuel.litres>=b.fuel.capacity)return{ok:false,message:'Zbiornik jest pełny.'};
 b.fuel.refueling=!b.fuel.refueling;b.fuel.status='';return{ok:true,message:b.fuel.refueling?'Tankowanie rozpoczęte.':'Tankowanie zatrzymane.'};
}
export function systemsStep(b,dt){
 serviceStep(b,dt);
 const fuel=b.fuel,battery=b.battery;
 fuel.flow=b.engines.reduce((sum,en)=>sum+(en.key==='running'?en.fuelFlow:0),0);
 fuel.litres=Math.max(0,fuel.litres-fuel.flow/3600*dt);
 if(fuel.refueling){
  const allowed=fuelBerthStatus(b).ok;
  if(allowed){fuel.litres=Math.min(fuel.capacity,fuel.litres+.65*dt);fuel.status='Tankowanie';if(fuel.litres>=fuel.capacity){fuel.refueling=false;fuel.status='Zbiornik pełny';}}
  else{fuel.refueling=false;fuel.status='Tankowanie przerwane';}
 }
 for(const tank of fuel.tanks)tank.litres=fuel.litres*tank.capacity/fuel.capacity;
 bilgeStep(b,dt);updateMass(b.spec,fuel.litres,b.bilge.litres);
 const ignition=b.engines.some(e=>e.key!=='off');
 let draw=(ignition?1.2:0)+(b.bilge.running?b.bilge.pumpAmps:0);
 for(const en of b.engines){if(en.key==='starting')draw+=110;if(en.key==='running')draw-=12+22*en.n;}
 const forceScale=b.spec.thrusterRating,speed=Math.abs(b.telemetry.surge);
 const availability=ignition&&battery.soc>.04&&battery.voltage>10.2?1:0;
 for(const end of ['bow','stern']){
  const installed=b.spec[end+'Thruster'];
  const target=installed?b.thrusters[end]*availability:0;
  b.thrusters[end+'Actual']+=(target-b.thrusters[end+'Actual'])*(1-Math.exp(-dt/.22));
  const value=b.thrusters[end+'Actual'];
  b.thrusters[end+'Force']=availability*forceScale*value/(1+(speed/1.8)**2)*clamp(battery.voltage/12,0,1.1);
  draw+=Math.abs(value)*forceScale*6.5/Math.max(10,battery.voltage);
 }
 battery.current=draw;battery.soc=clamp(battery.soc-draw/3600/battery.capacity*dt,0,1);
 const ocv=11.8+battery.soc*1.05;
 const resistance=.003*80/battery.capacity;
 battery.voltage=draw<0?clamp(13.5-draw*.006,13.5,14.4):clamp(ocv-draw*resistance,8,13);
}
