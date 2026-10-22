import {bottomAt,environment,waveAt} from './world.js';
import {sampleHullWake} from './wake.js';
import {point} from './rigging.js';
export function waterMotionSamples(b,e){
 if(b.towRig?.boatLoaded&&b.towRig.secured)return[];
 const samples=[];
 for(const fraction of [-.4,0,.4]){
  const x=b.spec.length*fraction,p=point(b,x,0),keel=b.heave+x*Math.sin(b.pitch)-b.spec.draft;
  if(bottomAt(p.x,p.y).depth<=.01||keel>.04)continue;
  const current=environment(b.time,e,p.x,p.y).current,wave=waveAt(p.x,p.y,b.time,e),wake=sampleHullWake(b.wake??[],p.x,p.y,b.time);
  const water={x:current.x+.65*(wave.vx+wake.vx),y:current.y+.65*(wave.vy+wake.vy)},ground={x:b.vx-b.w*(p.y-b.y),y:b.vy+b.w*(p.x-b.x)};
  samples.push({fraction,p,ground,relative:{x:ground.x-water.x,y:ground.y-water.y},water});
 }
 return samples;
}
