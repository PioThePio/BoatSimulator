import {circleSolidHit} from './solid-geometry.js';
import {decidePickup,observeRescuePass,failedAttemptCost} from './rescue-attempts.js';
import {rescueApproach} from './rescue-metrics.js';
import {propulsionFlow} from './local-water.js';
import {sampleWakeTransport} from './wake.js';
import {wakeHistories} from './wave-field.js';
import {sampleBrakingWaves} from './braking-waves.js';
import {createRescue,RESCUE_TYPES,advanceRescueObject,pickupStatus} from './rescue.js';
import {environment,bottomAt,SOLIDS} from './world.js';
import {point} from './rigging.js';
import {sampleWater} from './wave-field.js';
import {rescueResult,rescueContactMeasurement,rescueEngineState} from './rescue-metrics.js';
import {voyageEvent} from './voyage-events.js';
export function throwRescue(fleet,b,kind='ring',side=1){
 fleet.rescue??=createRescue();const state=fleet.rescue,p=RESCUE_TYPES[kind];
 if(!p)return{ok:false,message:'Wybierz koło lub manekin treningowy.'};
 if(b.towRig?.boatLoaded||bottomAt(b.x,b.y).depth<=0)return{ok:false,message:'Obiekt ratunkowy można wyrzucić z pływającej łodzi.'};
 if(state.objects.filter(o=>!o.recovered).length>=12)return{ok:false,message:'Najpierw podejmij część obiektów (limit 12 na wodzie).'};
 const sign=side<0?-1:1,pos=point(b,0,sign*(b.spec.beam*.5+1.2)),c=Math.cos(b.a),s=Math.sin(b.a);
 if(bottomAt(pos.x,pos.y).depth<=0||SOLIDS.some(d=>circleSolidHit(pos,p.beam*.5,d)))return{ok:false,message:'Po tej stronie jest ląd lub pomost. Wybierz drugą burtę.'};
 const o={id:'rescue-'+state.nextId++,kind,...pos,a:b.a,vx:b.vx-sign*s*1.5,vy:b.vy+sign*c*1.5,heave:0,roll:0,thrownAt:fleet.time,recovered:false,contactAt:-10};
 state.objects=[...state.objects.filter(q=>!q.recovered),...state.objects.filter(q=>q.recovered).slice(-15),o];state.targetId=o.id;state.alarmSequence=(state.alarmSequence??0)+1;
 voyageEvent(b,{type:'sar',rescueId:o.id,message:'Ćwiczenie SAR · rozpoczęto · '+p.name});
 return{ok:true,object:o,message:p.name+' · wyrzucono z '+(sign<0?'lewej':'prawej')+' burty.'};
}
function recordAttempt(fleet,b,o,q,type='manual'){
 const attempt={time:fleet.time,objectId:o.id,boatId:b.id,kind:o.kind,type,success:!!q.success,reason:q.reason,distance:q.distance,relativeSpeed:q.relativeSpeed,enginesNeutral:q.neutral,enginesRunning:q.running,engines:q.engines};
 const state=fleet.rescue;state.attempts??=[];state.attempts.push(attempt);if(state.attempts.length>60)state.attempts.shift();state.lastAttempt=attempt;
 if(!attempt.success){attempt.penalty=failedAttemptCost(q,type);o.attemptPenalty=Math.min(30,(o.attemptPenalty??0)+attempt.penalty);if(type==='missed')o.missedPasses=(o.missedPasses??0)+1;else o.failedAttempts=(o.failedAttempts??0)+1;
  voyageEvent(b,{type:'sar_attempt',rescueId:o.id,attempt,message:`SAR · nieudana próba${type==='missed'?' / minięcie':''} · ${q.reason} · ${(q.relativeSpeed*3.6).toFixed(2)} km/h · ${q.distance.toFixed(2)} m od burty · ${q.neutral?'N':'F/R'}`});}
 return attempt;
}
export function recoverRescue(fleet,b,id,{random=Math.random}={}){
 const o=fleet.rescue?.objects.find(o=>o.id===id),status=pickupStatus(b,o);if(!status.canAttempt)return{ok:false,message:status.message};
 const decision=decidePickup(b,o,random());o.lastAttemptAt=b.time;o.encounters??={};o.encounters[b.id]??={enteredAt:fleet.time,minDistance:status.distance,speed:status.relativeSpeed,inGear:!status.neutral,approached:false};o.encounters[b.id].attempted=true;recordAttempt(fleet,b,o,decision);
 if(!decision.success)return{ok:false,attempted:true,message:'Nie udało się podjąć · '+decision.reason+`. Szansa ${(decision.chance*100).toFixed(0)}%. Zwolnij i spróbuj ponownie.`};
 const result=rescueResult(b,o,fleet.time);o.result=result;o.recovered=true;o.recoveredAt=fleet.time;o.elapsed=result.elapsed;fleet.rescue.lastResult=result;fleet.rescue.recovered++;
 fleet.rescue.targetId=fleet.rescue.objects.find(q=>!q.recovered)?.id??null;
 voyageEvent(b,{type:'sar',rescueId:o.id,result,message:`Ćwiczenie SAR · podjęto ${RESCUE_TYPES[o.kind].name} · ${result.score}/100 · ${result.elapsed.toFixed(1)} s · podjęcie ${(result.pickupSpeed*3.6).toFixed(2)} km/h · kontakt szac. ${Math.round(result.peakForce)} N · biegi ${result.enginesNeutral?'N':'F/R'} · pracujących silników ${result.enginesRunning} · nieudanych prób ${o.failedAttempts??0}, minięć ${o.missedPasses??0}`});
 return{ok:true,result,message:`Podjęto: ${RESCUE_TYPES[o.kind].name} · ${Math.round(o.elapsed)} s · wynik ${result.score}/100.`};
}
export function rescueStep(fleet,e,dt){
 const state=fleet.rescue??=createRescue(),world=fleet.boats[0];
 if(state.pending&&fleet.time>=state.pending.at){const p=state.pending,b=fleet.boats.find(q=>q.id===p.boatId);if(!b)state.pending=null;else{const r=throwRandomRescue(fleet,b,p.kind);if(r.ok)state.pending=null;else p.at=fleet.time+2;}}
 for(let i=0;i<state.objects.length;i++){
  let o=state.objects[i];if(o.recovered)continue;
  if(o.contactMetrics)for(const id of Object.keys(o.contactMetrics))if(!fleet.boats.some(b=>b.id===id))delete o.contactMetrics[id];
  const flow=environment(fleet.time,e,o.x,o.y),wave=sampleWater(world,o.x,o.y,e),floor=bottomAt(o.x,o.y);
  const jet=propulsionFlow(fleet.boats,o.x,o.y);for(const h of wakeHistories(world)){const d=sampleWakeTransport(h,o.x,o.y,fleet.time);jet.x+=d.x;jet.y+=d.y;}for(const h of [world.brakingWaves??[],...(world.wakeSources??[]).map(q=>q.braking??[])]){const d=sampleBrakingWaves(h,o.x,o.y,fleet.time);jet.x+=d.driftX;jet.y+=d.driftY;}
  flow.current={x:flow.current.x+jet.x,y:flow.current.y+jet.y};o.localFlow=Math.hypot(jet.x,jet.y);o.waveEncounter=Math.abs(wave.eta);
  Object.assign(o,advanceRescueObject(o,flow,wave,floor,dt));
  // Soft contact with hulls; a floating training object yields to the boat.
  for(const b of fleet.boats){if(Math.hypot(o.x-b.x,o.y-b.y)>b.spec.length+1)continue;const c=Math.cos(b.a),s=Math.sin(b.a),dx=o.x-b.x,dy=o.y-b.y,x=dx*c+dy*s,y=-dx*s+dy*c,r=RESCUE_TYPES[o.kind].beam*.5,rx=b.spec.length*.45,ry=b.spec.beam*.48,n=Math.hypot(x/(rx+r),y/(ry+r));if(n>=1)continue;
   const nx=n<.001?0:x/((rx+r)**2),ny=n<.001?1:y/((ry+r)**2),d=Math.hypot(nx,ny),wx=(c*nx-s*ny)/d,wy=(s*nx+c*ny)/d,depth=(1-n)*Math.min(rx+r,ry+r),rel=(o.vx-b.vx)*wx+(o.vy-b.vy)*wy;
   const hit=rescueContactMeasurement(b,o,{x:wx,y:wy},RESCUE_TYPES[o.kind].mass),id=b.id??'boat';o.contactMetrics??={};
   const old=o.contactMetrics[id],newEpisode=!old||fleet.time-old.lastAt>.35,metric=old??{contacts:0,peakForce:0,peakSpeed:0,inGear:false};
   if(newEpisode)metric.contacts++;metric.lastAt=fleet.time;metric.peakForce=Math.max(metric.peakForce,hit.force);metric.peakSpeed=Math.max(metric.peakSpeed,hit.speed);metric.inGear||=!rescueEngineState(b).neutral;o.contactMetrics[id]=metric;
   o.vx+=wx*Math.max(0,-rel+depth*3);o.vy+=wy*Math.max(0,-rel+depth*3);if(fleet.time-o.contactAt>2){state.contacts++;o.contactAt=fleet.time;}
  }
  // Only the occupied helm can miss the pickup click. Passive fleet/towed
  // bodies still collide and disturb the object, but cannot incur UI penalties.
  o.encounters??={};for(const id of Object.keys(o.encounters))if(id!==fleet.activeId)delete o.encounters[id];
  for(const b of fleet.boats){if(b.id!==fleet.activeId)continue;const reading=rescueApproach(b,o),observed=observeRescuePass(o.encounters[b.id],reading,Math.hypot(b.vx,b.vy),fleet.time);if(observed.state)o.encounters[b.id]=observed.state;else delete o.encounters[b.id];if(observed.missed){const m=observed.missed;recordAttempt(fleet,b,o,{...reading,distance:m.minDistance,relativeSpeed:m.speed,neutral:!m.inGear,success:false,reason:'nie naciśnięto Podejmij'+(m.speed>.55?' · za szybko':'')+(m.inGear?' · napęd na biegu':'')},'missed');}}
  for(const d of SOLIDS){const hit=circleSolidHit(o,RESCUE_TYPES[o.kind].beam*.5,d);if(hit){const{n,depth}=hit,rel=o.vx*n.x+o.vy*n.y;o.x+=n.x*depth;o.y+=n.y*depth;if(rel<0){o.vx-=rel*n.x;o.vy-=rel*n.y;}}}
 }
}

export function throwRandomRescue(fleet,b,kind='ring',random=Math.random){const side=random()<.5?-1:1,first=throwRescue(fleet,b,kind,side);return first.ok?first:throwRescue(fleet,b,kind,-side);}
export function scheduleRescue(fleet,b,kind='mob',random=Math.random){fleet.rescue??=createRescue();fleet.rescue.pending={kind,boatId:b.id,at:fleet.time+30+Math.max(0,Math.min(1,random()))*150};return fleet.rescue.pending;}
