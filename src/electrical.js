import {clamp} from './world.js';

export const ELECTRICAL_LOADS={starter:110,ignition:1.2,navigationLights:.65,gps:.35,sonar:.70,instruments:.55};
export const STARTER_LIMITS={minimumSOC:.08,minimumVoltage:10,minimumRPM:185,timeout:3};
export function createElectrics(){return{master:true,thrusters:true,navigationLights:false,gps:true,sonar:true,instruments:true,powered:{navigationLights:false,gps:true,sonar:true,instruments:true}};}
export function alternatorCurrent(en){return en.key==='running'?12+22*clamp((en.rpm-750)/4750,0,1):0;}
export function batteryOpenVoltage(soc){
 const points=[[0,10.6],[.1,11.8],[.25,12],[.5,12.2],[.75,12.45],[1,12.75]],s=clamp(soc,0,1);
 for(let i=1;i<points.length;i++){const [a,x]=points[i-1],[b,y]=points[i];if(s<=b)return x+(y-x)*(s-a)/(b-a);}
 return 12.75;
}
export function batteryResistance(battery){return .003*80/battery.capacity*(1+8*(1-clamp(battery.soc,0,1))**4);}
export function loadedBatteryVoltage(battery,current){return clamp(batteryOpenVoltage(battery.soc)-Math.max(0,current)*batteryResistance(battery),8,13);}
export function enforceMainPower(b){
 if(b.electrics?.master!==false)return;
 for(const en of b.engines){en.key='off';en.rpm=en.thrust=en.gear=en.ventilation=0;}
 for(const end of ['bow','stern'])b.thrusters[end+'Actual']=b.thrusters[end+'Force']=0;
 b.bilge.running=false;b.bilge.outflow=0;
}
export function setMainPower(b,on){b.electrics.master=!!on;enforceMainPower(b);electricalStep(b,0);}
export function electricalStep(b,dt,thrusterAmps=0){
 const battery=b.battery,devices=b.electrics,master=devices.master!==false;
 enforceMainPower(b);
 const availableAlternator=master?b.engines.reduce((sum,en)=>sum+alternatorCurrent(en),0):0;
 const available=master&&(battery.soc>.001&&battery.voltage>9.5||availableAlternator>2);
 const loads={ignition:master&&b.engines.some(en=>en.key!=='off')?ELECTRICAL_LOADS.ignition:0,
  starter:master?b.engines.filter(en=>en.key==='starting').length*ELECTRICAL_LOADS.starter:0,
  thrusters:master&&devices.thrusters!==false?thrusterAmps:0,bilge:master&&b.bilge.running?b.bilge.pumpAmps:0};
 for(const name of ['navigationLights','gps','sonar','instruments']){devices.powered[name]=!!(devices[name]&&available);loads[name]=devices.powered[name]?ELECTRICAL_LOADS[name]:0;}
 const demand=Object.values(loads).reduce((a,v)=>a+v,0);
 // The regulator supplies consumers, then tapers charging at the very top of SOC.
 const supply=Math.min(availableAlternator,demand+availableAlternator*clamp((1-battery.soc)/.01,0,1)),draw=demand-supply;
 battery.loads=loads;battery.loadCurrent=demand;battery.alternatorCurrent=supply;battery.current=draw;
 battery.soc=clamp(battery.soc-draw/3600/battery.capacity*dt,0,1);
 battery.voltage=availableAlternator>=demand&&availableAlternator>0?clamp(13.5-draw*.006,13.5,14.4):loadedBatteryVoltage(battery,draw);
}
