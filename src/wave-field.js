import {waveAt,reflectionFacesNear} from './world.js';
import {sampleWakeField} from './wake.js';
// Emitter-independent registry; future vessels register histories, not NPC logic.
export function registerWakeSource(world,id,history){world.wakeSources??=[];const prior=world.wakeSources.find(q=>q.id===id);if(prior)prior.history=history;else world.wakeSources.push({id,history});}
export function wakeHistories(world){return[world.wake??[],...(world.wakeSources??[]).map(q=>q.history)];}
export function sampleWorldWake(world,x,y,time=world.time,faces=null){
 const out={eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0},histories=wakeHistories(world);if(!histories.some(h=>h.length>1))return out;
 faces??=reflectionFacesNear(x,y);
 for(const history of histories){if(history.length<2)continue;const w=sampleWakeField(history,x,y,time,faces);for(const key of Object.keys(out))out[key]+=w[key];}
 return out;
}
export function sampleWater(world,x,y,e={},faces=null){const water=waveAt(x,y,world.time,e),wake=sampleWorldWake(world,x,y,world.time,faces);for(const key of Object.keys(wake))water[key]+=wake[key];return{...water,wake};}
