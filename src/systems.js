import {clamp,FUEL_STATION} from './world.js';
import {updateMass} from './craft.js';
export function createSystems(spec,cold=false){return{
 fuel:{capacity:spec.fuelCapacity,litres:spec.fuelCapacity*.75,flow:0,refueling:false,status:'',tanks:Array.from({length:spec.tankCount},(_,i)=>({capacity:spec.fuelCapacity/spec.tankCount,litres:spec.fuelCapacity*.75/spec.tankCount,x:-.16*spec.length,y:spec.tankCount===1?0:(i===0?-1:1)*spec.beam*.22}))},
 battery:{capacity:spec.jet?35:80,soc:.85,voltage:12.65,current:0},thrusters:{bow:0,stern:0,bowActual:0,sternActual:0,bowForce:0,sternForce:0},coldStart:cold};}
export function requestRefuel(b){
 if(Math.hypot(b.x-FUEL_STATION.x,b.y-FUEL_STATION.y)>FUEL_STATION.radius)return{ok:false,message:'Podejdź do pomostu z dystrybutorem (symbol paliwa na mapie).'};
 if(Math.hypot(b.vx,b.vy)>.15)return{ok:false,message:'Zatrzymaj łódź przed tankowaniem.'};
 if(b.engines.some(e=>e.key==='running'||e.key==='starting'))return{ok:false,message:'Zgaś oba silniki przed tankowaniem.'};
 b.fuel.refueling=!b.fuel.refueling;return{ok:true,message:b.fuel.refueling?'Tankowanie rozpoczęte.':'Tankowanie zatrzymane.'};
}
export function systemsStep(b,dt){
 const fuel=b.fuel,battery=b.battery;
 fuel.flow=b.engines.reduce((sum,en)=>sum+(en.key==='running'?en.fuelFlow:0),0);
 fuel.litres=Math.max(0,fuel.litres-fuel.flow/3600*dt);
 if(fuel.refueling){
  const allowed=Math.hypot(b.x-FUEL_STATION.x,b.y-FUEL_STATION.y)<=FUEL_STATION.radius&&Math.hypot(b.vx,b.vy)<.15&&!b.engines.some(en=>en.key==='running'||en.key==='starting');
  if(allowed){fuel.litres=Math.min(fuel.capacity,fuel.litres+.65*dt);fuel.status='Tankowanie';if(fuel.litres>=fuel.capacity)fuel.refueling=false;}
  else{fuel.refueling=false;fuel.status='Tankowanie przerwane';}
 }
 for(const tank of fuel.tanks)tank.litres=fuel.litres*tank.capacity/fuel.capacity;
 updateMass(b.spec,fuel.litres);
 const ignition=b.engines.some(e=>e.key!=='off');
 let draw=ignition?1.2:0;
 for(const en of b.engines){if(en.key==='starting')draw+=110;if(en.key==='running')draw-=12+22*en.n;}
 const forceScale=clamp(b.spec.mass*.24,150,850),speed=Math.abs(b.telemetry.surge);
 const availability=ignition&&battery.soc>.04&&battery.voltage>10.2?1:0;
 for(const end of ['bow','stern']){
  const installed=b.spec[end+'Thruster'];
  const target=installed?b.thrusters[end]*availability:0;
  b.thrusters[end+'Actual']+=(target-b.thrusters[end+'Actual'])*(1-Math.exp(-dt/.22));
  const value=b.thrusters[end+'Actual'];
  b.thrusters[end+'Force']=availability*forceScale*value/(1+(speed/1.8)**2)*clamp(battery.voltage/12,0,1.1);
  draw+=Math.abs(value)*forceScale*7.5/Math.max(10,battery.voltage);
 }
 battery.current=draw;battery.soc=clamp(battery.soc-draw/3600/battery.capacity*dt,0,1);
 const ocv=11.8+battery.soc*1.05;
 battery.voltage=draw<0?clamp(13.5-draw*.006,13.5,14.4):clamp(ocv-draw*.006,8,13);
}
