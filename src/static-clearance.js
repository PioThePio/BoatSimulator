import {nearbySolids} from './solid-index.js';
import {closestSolidPoint} from './solid-geometry.js';
import {hullContactSamples} from './hull-geometry.js';
import {fenderGeometry,fenderContactShape} from './fender-geometry.js';
const cache=new WeakMap();
// Conservative gap certificate. Translation + maximum rotational displacement
// must fit inside the last exact clearance; otherwise inspect geometry again.
export function clearOfStaticSolids(b,solids){
 const S=b.spec,radius=S.length/2+S.beam/2+1,old=cache.get(b),shape=S.length+'/'+S.beam+'/'+S.hullType+'/'+b.fenders;
 if(old&&old.solids===solids&&old.count===solids.length&&old.shape===shape){const moved=Math.hypot(b.x-old.x,b.y-old.y)+2*radius*Math.abs(Math.sin((b.a-old.a)/2));if(moved+1e-8<old.margin)return true;}
 const indices=nearbySolids(solids,b.x,b.y,radius+1.001),samples=[...hullContactSamples(S),...(b.fenders?fenderGeometry(S).flatMap(g=>fenderContactShape(g)):[])],c=Math.cos(b.a),s=Math.sin(b.a);
 let margin=1;
 for(const p of samples){const x=b.x+c*p.x-s*p.y,y=b.y+s*p.x+c*p.y;for(const i of indices){const q=closestSolidPoint(solids[i],x,y);margin=Math.min(margin,Math.hypot(x-q.x,y-q.y)-p.radius);if(margin<=1e-8){cache.delete(b);return false;}}}
 cache.set(b,{x:b.x,y:b.y,a:b.a,margin,shape,solids,count:solids.length});return true;
}
