import {environment} from './world.js';
import {point} from './rigging.js';
export function currentShear(b,e,center){
 if(!e.spatialEffects||Math.hypot(center.x,center.y)<.001)return null;
 const old=b.currentShear;
 if(!old||b.time>=old.at){const fore=point(b,b.spec.length*.4,0),aft=point(b,-b.spec.length*.4,0);b.currentShear={at:b.time+.05,fore:environment(b.time,e,fore.x,fore.y).current,aft:environment(b.time,e,aft.x,aft.y).current};}
 const q=b.currentShear,c=Math.cos(b.a),s=Math.sin(b.a),side=p=>-(p.x-center.x)*s+(p.y-center.y)*c;
 return{fore:side(q.fore),aft:side(q.aft)};
}
