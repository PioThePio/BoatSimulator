import {pickupAssessment} from './rescue-attempts.js';
import {validRescueResult} from './rescue-metrics.js';
// Training objects, not people/AI. SI units and physical seconds only.
export const RESCUE_TYPES={ring:{name:'Koło ratunkowe',mass:2.5,length:.8,beam:.8,draft:.05,windArea:.025},mob:{name:'Manekin MOB',mass:80,length:1.7,beam:.5,draft:.18,windArea:.06}};
export const createRescue=()=>({objects:[],nextId:1,recovered:0,contacts:0});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function advanceRescueObject(o,flow,wave,floor,dt){
 const p=RESCUE_TYPES[o.kind],mass=p.mass*1.7,wet=clamp((floor.depth+(wave.eta??0))/p.draft,0,1),next={...o};
 const wx=flow.wind.x-o.vx,wy=flow.wind.y-o.vy,windSpeed=Math.hypot(wx,wy),area=p.beam*p.draft;
 let vx=o.vx+(.5*1.225*.9*p.windArea*windSpeed*wx/mass+wave.ax*.42*wet)*dt,vy=o.vy+(.5*1.225*.9*p.windArea*windSpeed*wy/mass+wave.ay*.42*wet)*dt;
 const cx=flow.current.x+wave.vx*.85,cy=flow.current.y+wave.vy*.85,dx=vx-cx,dy=vy-cy,relative=Math.hypot(dx,dy),drag=.5*1000*.85*area*relative*wet/mass;
 vx=cx+dx/(1+drag*dt);vy=cy+dy/(1+drag*dt);
 const ground=1/(1+(1-wet)*12*dt);next.vx=vx*ground;next.vy=vy*ground;next.x+=next.vx*dt;next.y+=next.vy*dt;next.grounded=wet<.2;
 const rollTarget=clamp(Math.atan(wave.sy)*1.2,-.4,.4),heaveTarget=wave.eta*wet;
 next.heaveVelocity=(o.heaveVelocity??0)+(16*(heaveTarget-o.heave)-5*(o.heaveVelocity??0))*dt;next.heave=o.heave+next.heaveVelocity*dt;
 next.rollVelocity=(o.rollVelocity??0)+(9*(rollTarget-o.roll)-2*(o.rollVelocity??0))*dt;next.roll=o.roll+next.rollVelocity*dt;
 next.a+=clamp((wave.sx-wave.sy)*.15,-.25,.25)*dt;
 return next;
}
export const pickupStatus=pickupAssessment;
export function validRescueState(state){
 const finite=(x,lo=-1e8,hi=1e8)=>Number.isFinite(x)&&x>=lo&&x<=hi;
 const attempt=q=>q&&/^rescue-\d+$/.test(q.objectId)&&typeof q.boatId==='string'&&['ring','mob'].includes(q.kind)&&['manual','missed'].includes(q.type)&&finite(q.time,0)&&finite(q.distance,0)&&finite(q.relativeSpeed,0)&&typeof q.success==='boolean'&&typeof q.reason==='string'&&typeof q.enginesNeutral==='boolean'&&finite(q.enginesRunning,0,2)&&Array.isArray(q.engines)&&q.engines.length<=2&&(q.penalty===undefined||finite(q.penalty,0,30));
 const encounters=q=>q&&typeof q==='object'&&!Array.isArray(q)&&Object.keys(q).length<=8&&Object.values(q).every(v=>v&&['enteredAt','minDistance','speed'].every(k=>finite(v[k],0))&&['inGear','approached','attempted'].every(k=>typeof v[k]==='boolean'));
 const metrics=m=>m&&typeof m==='object'&&!Array.isArray(m)&&Object.keys(m).length<=8&&Object.values(m).every(q=>q&&finite(q.contacts,0)&&finite(q.peakForce,0)&&finite(q.peakSpeed,0)&&finite(q.lastAt,0)&&typeof q.inGear==='boolean');
 return state&&Array.isArray(state.objects)&&state.objects.length<=28&&Number.isInteger(state.nextId)&&state.nextId>0&&state.nextId<1e7&&finite(state.recovered,0,1e7)&&finite(state.contacts,0,1e7)
  &&(state.targetId==null||typeof state.targetId==='string'&&state.objects.some(o=>o.id===state.targetId))&&(!state.lastResult||validRescueResult(state.lastResult))
  &&(!state.attempts||Array.isArray(state.attempts)&&state.attempts.length<=60&&state.attempts.every(attempt))&&(!state.lastAttempt||attempt(state.lastAttempt))
  &&(state.alarmSequence===undefined||finite(state.alarmSequence,0,1e9))
  &&(!state.pending||(RESCUE_TYPES[state.pending.kind]&&typeof state.pending.boatId==='string'&&finite(state.pending.at,0)))
  &&new Set(state.objects.map(o=>o.id)).size===state.objects.length&&state.objects.every(o=>/^rescue-\d+$/.test(o.id)&&RESCUE_TYPES[o.kind]&&finite(o.x)&&finite(o.y)&&finite(o.a)&&finite(o.vx,-150,150)&&finite(o.vy,-150,150)&&finite(o.thrownAt,0)&&finite(o.heave,-5,5)&&finite(o.roll,-3,3)&&(o.failedAttempts===undefined||finite(o.failedAttempts,0,1e7))&&(o.missedPasses===undefined||finite(o.missedPasses,0,1e7))&&(o.lastAttemptAt===undefined||finite(o.lastAttemptAt,0))&&(!o.encounters||encounters(o.encounters))&&(o.attemptPenalty===undefined||finite(o.attemptPenalty,0,30))&&(!o.result||validRescueResult(o.result))&&(!o.contactMetrics||metrics(o.contactMetrics)));
}
