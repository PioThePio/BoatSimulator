import {voyageEvent} from './voyage-events.js';
// Additional flood response only; the existing mass model already adds 1 kg/L.
export function bilgeTrimAngle(spec,litres=0){return Math.min(.10,.18*Math.max(0,litres)/Math.max(1,spec.mass));}
export function floodElectricalRisk(b,surface=0){
 const catastrophic=(b.bilge?.driveLeak??0)>=.7&&b.engines.some(e=>e.propDamage>=85);
 return !!b.sunken||catastrophic&&(b.submersion??0)>.6&&surface>b.heave+b.spec.freeboard*.65;
}
export function applyFloodShort(b,surface=0){
 if(!b.electrics.floodFault&&!floodElectricalRisk(b,surface))return false;
 const first=!b.electrics.floodFault;b.electrics.floodFault=true;b.electrics.master=false;
 Object.assign(b.battery,{soc:0,voltage:0,current:0,loadCurrent:0,alternatorCurrent:0,loads:{}});
 for(const name of Object.keys(b.electrics.powered))b.electrics.powered[name]=false;
 for(const e of b.engines){e.key='off';e.n=e.rpm=e.thrust=e.gear=e.ventilation=0;e.flooded=true;}
 for(const end of ['bow','stern'])b.thrusters[end+'Actual']=b.thrusters[end+'Force']=0;
 b.bilge.running=false;b.bilge.outflow=0;
 if(first){voyageEvent(b,{type:'fault',message:'Zwarcie zalanej instalacji · całkowity zanik zasilania'});b.events.unshift({time:b.time,message:'ZWARCIE · zalana instalacja. Akumulator i elektronika odłączone · wymagany serwis.'});b.events.splice(12);}
 return true;
}
export function immersionReadings(b,surface=0){
 const mean=Math.max(0,b.spec.draft+surface-b.heave),stern=Math.max(0,mean+b.spec.length*.4*Math.sin(b.pitch)),bow=Math.max(0,mean-b.spec.length*.4*Math.sin(b.pitch));
 return{mean,stern,bow,below:!!b.sunken||b.heave+b.spec.freeboard<surface,deckWet:b.heave+b.spec.freeboard*.5<surface};
}
