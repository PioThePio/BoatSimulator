import {clamp} from './world.js';
export const BILGE_PUMPS={tender:32,flat:32,rib:50,runabout:50,cabin:95,cruiser:126,pwc:32,swamp:32}; // nominal L/min at 12 V
export function deckIngressRate(b){
 if(b.sunken||b.grounded||b.towRig?.boatLoaded||(b.wetFraction??1)<.7)return 0;
 const speed=Math.hypot(b.telemetry?.surge??0,b.telemetry?.sway??0),fast=clamp((speed-3)/5,0,1);
 const turn=clamp((Math.abs((b.telemetry?.surge??0)*b.w)/9.81-.12)/.45,0,1);
 const heel=clamp((Math.abs(b.roll)-.16)/.18,0,1),sideWave=clamp(((b.encounter?.crossSlope??0)-.07)/.18,0,1);
 const overtop=clamp(((b.encounter?.eta??0)-b.heave-b.spec.freeboard*.65)/.25,0,1);
 // A fraction of spray/deck water reaches the bilge, not a fictitious hull hole.
 // Closed cabin hulls and sealed PWCs admit less. Upper bound: 2.4 L/min.
 const closure=b.spec.jet?.08:['cabin','displacement'].includes(b.spec.hullType)?.35:1;
 return Math.min(.04,closure*(fast*(turn*.018+heel*.012+sideWave*.010)+overtop*.025));
}
export function createBilge(spec){const capacity=Math.max(100,spec.length*spec.beam*55),pumpRate=BILGE_PUMPS[spec.profile]??32;return{litres:0,capacity,pumpRate,pumpAmps:4.5*Math.sqrt(pumpRate/32),autoOnLitres:Math.min(15,capacity*.05),autoOffLitres:Math.min(3,capacity*.01),level:0,manual:false,auto:true,autoRunning:false,running:false,inflow:0,outflow:0,driveLeak:0,alarm:false};}
export function bilgeStep(b,dt){
 const q=b.bilge;if(!q)return;
 // Derive level from the physical water amount before checking the float.
 // AUTO is a real float switch, starting early enough to catch a small leak.
 q.level=clamp(q.litres/q.capacity,0,1);
 // Blade abrasion does not puncture a hull. Structural damage and a severe
 // drive/seal impact can admit water; the latter is recorded at the collision.
 const bottom=Object.values(b.bottomDamage??{}).reduce((sum,v)=>sum+v,0);
 const breach=Math.max(0,b.damage-18)*.000025+Math.max(0,bottom-8)*.00006+q.driveLeak*.00035;
 const head=Math.max(.03,b.spec.draft-q.level*b.spec.draft*.55);
 const supported=b.grounded||b.towRig?.boatLoaded&&b.towRig.secured;
 const wet=b.launchMotion?(b.wetFraction??0):supported?clamp((-b.heave+b.spec.draft)/b.spec.draft,0,1):1;
 q.leakInflow=.62*breach*Math.sqrt(2*9.81*head)*1000*wet; // m² × m/s → L/s
 q.deckInflow=deckIngressRate(b)*wet;q.inflow=q.leakInflow+q.deckInflow;
 q.leakTotal=(q.leakTotal??0)+q.leakInflow*dt;q.deckTotal=(q.deckTotal??0)+q.deckInflow*dt;
 if(q.litres>=q.autoOnLitres)q.autoRunning=true;else if(q.litres<=q.autoOffLitres)q.autoRunning=false;
 q.running=b.electrics?.master!==false&&(q.manual||q.auto&&q.autoRunning&&q.litres>.01)&&b.battery.soc>.02;
 q.outflow=q.running?Math.min(q.litres/dt,q.pumpRate/60*clamp(b.battery.voltage/12,0,1)):0;
 q.litres=clamp(q.litres+(q.inflow-q.outflow)*dt,0,q.capacity);q.level=q.litres/q.capacity;
 const alarm=q.level>=.5;
 if(alarm&&!q.alarm){b.events.unshift({time:b.time,message:'UWAGA — WODA W ZĘZIE · włącz pompę i wracaj do serwisu.'});b.events.splice(12);}
 q.alarm=alarm;
}
