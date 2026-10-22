import {clamp,bottomAt,waveAt} from './world.js';
import {sampleHullWake} from './wake.js';
// One control, two mechanisms: 0–40% power trim; 40–100% shallow-water tilt.
export const TRIM_STOPS=[0,.05,.10,.15,.20,.25,.30,.35,.40,.50,.60,.70,.80,.90,1];
export function trimStep(value,direction){return direction>0?(TRIM_STOPS.find(v=>v>value+.00001)??1):([...TRIM_STOPS].reverse().find(v=>v<value-.00001)??0);}
export function trimAngle(value){const t=clamp(value,0,1);return(t<=.4?-4+t*40:12+(t-.4)*110)*Math.PI/180;}
export function driveGeometry(b,en,env={}){
 const S=b.spec;if(S.air){const localX=-S.length*.38,localY=0,c=Math.cos(b.a),s=Math.sin(b.a),x=b.x+c*localX,y=b.y+s*localX,floor=bottomAt(x,y),mountZ=b.heave+S.freeboard*.5+localX*Math.sin(b.pitch),radius=S.beam*.38,propZ=mountZ+radius;return{x,y,localX,localY,mountX:localX,mountZ,shaft:radius,radius,verticalRadius:radius,angle:0,surface:0,floor,propZ,propDepth:-propZ,immersed:0,intake:1,clearance:floor.depth+mountZ};}
 const t=b.enginesRaised?1:en.trim,angle=S.jet||S.propulsion==='inboard'?0:trimAngle(t);
 const radius=S.jet?.08:.13+.00013*en.hp,mountX=-S.length*(S.jet?.28:.51),baseMount=S.freeboard*.35+.12;
 const mountHeight=S.jet?0:baseMount-(S.draft-S.referenceDraft);
 const shaft=S.jet?S.draft+.03-radius:baseMount+S.referenceDraft+.22-radius;
 const localX=mountX-shaft*Math.sin(angle),localY=en.y;
 const c=Math.cos(b.a),s=Math.sin(b.a),x=b.x+c*localX-s*localY,y=b.y+s*localX+c*localY;
 const surface=waveAt(x,y,b.time,env).eta+sampleHullWake(b.wake??[],x,y,b.time).eta,floor=bottomAt(x,y);
 const mountZ=mountHeight+b.heave+.09*b.planing+mountX*Math.sin(b.pitch)+localY*Math.sin(b.roll);
 const propZ=mountZ-shaft*Math.cos(angle),verticalRadius=Math.max(.015,radius*Math.cos(angle));
 const propDepth=surface-propZ,ratio=clamp(propDepth/verticalRadius,-1,1);
 const immersed=.5+(Math.asin(ratio)+ratio*Math.sqrt(Math.max(0,1-ratio*ratio)))/Math.PI;
 const intakeZ=propZ+(S.jet?0:.15)*Math.cos(angle),intake=clamp((surface-intakeZ)/.08,0,1);
 return{x,y,localX,localY,mountX,mountZ,shaft,radius,verticalRadius,angle,surface,floor,propZ,propDepth,immersed,intake,clearance:floor.depth+propZ-verticalRadius};
}
export function anchorAdvice(b,env={}){
 const anchor=b.anchor,at=anchor.mode==='stowed'?{x:b.x+Math.cos(b.a)*b.spec.length*.39,y:b.y+Math.sin(b.a)*b.spec.length*.39}:anchor;
 const depth=Math.max(0,bottomAt(at.x,at.y).depth),height=Math.max(.2,depth+.65+b.heave);
 const scope=(env.windMax??env.windSpeed??0)>=7||(env.currentMax??env.currentSpeed??0)>=.5||(env.waveHeight??0)>=.35?7:5;
 const required=Math.ceil(height*scope),length=Math.min(anchor.reserve,required);
 return{depth,height,scope,required,length,limited:required>anchor.reserve};
}
