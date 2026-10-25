import {rescueApproach} from './rescue-metrics.js';
export const PICKUP_LIMITS={reach:1.7,assuredSpeed:.55,lastChanceSpeed:1.4,retrySeconds:1.2,passExit:2.4};
const clamp=x=>Math.max(0,Math.min(1,x));
// Training envelope, not a real-world rescue standard. Actual point velocity
// includes yaw and target drift; an attempt never changes either body's forces.
export function pickupAssessment(b,o){
 if(!o||o.recovered)return{ok:false,canAttempt:false,chance:0,message:'Wybierz obiekt na wodzie.'};
 const q=rescueApproach(b,o),inReach=q.distance<=PICKUP_LIMITS.reach+.001;
 const t=clamp((q.relativeSpeed-.55)/(.85)),speedChance=1-t*t*(3-2*t),chance=inReach?speedChance*(q.neutral?1:.8):0;
 const cooldown=Math.max(0,PICKUP_LIMITS.retrySeconds-((b.time??0)-(o.lastAttemptAt??-Infinity)));
 const message=!inReach?'Podejdź burtą na mniej niż 1,7 m od obiektu.':cooldown>0?'Ponów próbę za '+cooldown.toFixed(1)+' s.':q.relativeSpeed>.55?`Próba możliwa · ${(chance*100).toFixed(0)}% szans · za szybko: ${(q.relativeSpeed*3.6).toFixed(2)} km/h względem obiektu.`:!q.neutral?'Można próbować na biegu · ryzyko niepowodzenia i kara 30 pkt. Zalecany N.':'Można podjąć obiekt.';
 return{...q,ok:inReach&&q.relativeSpeed<=.55,canAttempt:inReach&&cooldown===0,chance,message};
}
export function decidePickup(b,o,randomValue){
 const q=pickupAssessment(b,o),success=q.canAttempt&&Math.max(0,Math.min(.999999999,randomValue))<q.chance;
 const reasons=[];if(q.relativeSpeed>.55)reasons.push('za szybko względem obiektu');if(!q.neutral)reasons.push('napęd na biegu F/R');
 return{...q,success,reason:success?'podjęto':reasons.join(' · ')||q.message};
}
// Hysteresis creates one missed-pass event, not an event every simulation step.
// A throw drifting away from its own stationary boat is not a failed approach.
export function observeRescuePass(previous,reading,boatSpeed,time){
 let state=previous?{...previous}:null;
 if(!state&&reading.distance<=PICKUP_LIMITS.reach)state={enteredAt:time,minDistance:reading.distance,speed:reading.relativeSpeed,inGear:!reading.neutral,approached:false,attempted:false};
 if(!state)return{state:null,missed:null};
 if(reading.distance<state.minDistance){state.minDistance=reading.distance;state.speed=reading.relativeSpeed;}
 state.inGear||=!reading.neutral;state.approached||=reading.closingSpeed>.03&&boatSpeed>.05;
 if(reading.distance>PICKUP_LIMITS.passExit)return{state:null,missed:state.approached&&!state.attempted&&time-state.enteredAt>.01?state:null};
 return{state,missed:null};
}

export function failedAttemptCost(q,type){const speed=clamp((q.relativeSpeed-.55)/.85),proximity=clamp((1.7-q.distance)/1.7);return 3+(type==='missed'?6:5)*speed+(!q.neutral?3:0)+2*proximity;}
