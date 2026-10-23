import {clamp} from './world.js';

// Preserve the existing battery, 110 A starter and 12–34 A alternator range.
export const ELECTRICAL_LOADS={starter:110,ignition:1.2,navigationLights:.65,gps:.35,sonar:.70,instruments:.55};
export function createElectrics(){return{navigationLights:false,gps:true,sonar:true,instruments:true,powered:{navigationLights:false,gps:true,sonar:true,instruments:true}};}
export function alternatorCurrent(en){return en.key==='running'?12+22*clamp((en.rpm-750)/4750,0,1):0;}

export function electricalStep(b,dt,thrusterAmps=0){
 const battery=b.battery,devices=b.electrics,supply=b.engines.reduce((sum,en)=>sum+alternatorCurrent(en),0);
 const available=battery.soc>.001&&battery.voltage>9.5||supply>2;
 const loads={ignition:b.engines.some(en=>en.key!=='off')?ELECTRICAL_LOADS.ignition:0,
  starter:b.engines.filter(en=>en.key==='starting').length*ELECTRICAL_LOADS.starter,
  thrusters:thrusterAmps,bilge:b.bilge.running?b.bilge.pumpAmps:0};
 for(const name of ['navigationLights','gps','sonar','instruments']){devices.powered[name]=devices[name]&&available;loads[name]=devices.powered[name]?ELECTRICAL_LOADS[name]:0;}
 const demand=Object.values(loads).reduce((a,v)=>a+v,0),draw=demand-supply;
 battery.loads=loads;battery.loadCurrent=demand;battery.alternatorCurrent=supply;battery.current=draw;
 battery.soc=clamp(battery.soc-draw/3600/battery.capacity*dt,0,1);
 const ocv=11.8+battery.soc*1.05,resistance=.003*80/battery.capacity;
 battery.voltage=draw<0?clamp(13.5-draw*.006,13.5,14.4):clamp(ocv-draw*resistance,8,13);
 // A float-operated pump keeps its direct battery circuit; accessories are
 // switched separately and do not cut AUTO or the physical sensors/model.
}
