import {hullBoundary} from './hull-geometry.js';
export const FENDERS=[-1,1].flatMap(side=>[['Stern',-.42],['Mid',-.04],['Bow',.25]].map(([part,x])=>({id:(side<0?'port':'starboard')+part,x,y:side*.5,side})));
const cache=new Map();
export function fenderContactShape(g){const d=Math.max(0,g.length/2-g.radius);return[0,-d,d].map(t=>({...g,x:g.x-g.ny*t,y:g.y+g.nx*t}));}
export function fenderGeometry(spec){
 const key=[spec.length,spec.beam,spec.hullType].join('/');if(cache.has(key))return cache.get(key);
 const radius=Math.max(.09,Math.min(.22,spec.beam*.065)),gap=.018;
 const geometry=FENDERS.map(f=>{const edge=hullBoundary(spec,f.x*spec.length,f.side);return{...f,edge,x:edge.x+edge.nx*(radius+gap),y:edge.y+edge.ny*(radius+gap),nx:edge.nx,ny:edge.ny,radius,length:Math.max(.28,Math.min(.62,spec.length*.075)),workingCompression:radius*1.45,maxCompression:radius*1.9};});
 cache.set(key,geometry);return geometry;
}
