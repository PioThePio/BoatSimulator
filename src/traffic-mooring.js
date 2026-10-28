import {cleat} from './rigging.js';
import {mooringPoint} from './marina.js';
import {attachmentNames} from './attachment-points.js';
export function trafficAt(boats,p){return boats.find(q=>{const dx=p.x-q.x,dy=p.y-q.y,c=Math.cos(q.a),s=Math.sin(q.a);return Math.abs(dx*c+dy*s)<q.spec.length*.53&&Math.abs(-dx*s+dy*c)<Math.max(.6,q.spec.beam*.65);});}
export function tieTraffic(world,q,end,bollard){
 if(!attachmentNames(q)[end])return{ok:false,message:'Ta łódź nie ma tego mocowania.'};
 const p=cleat(q,end),target=mooringPoint(world,bollard),distance=Math.hypot(target.x-p.x,target.y-p.y);
 if(distance>8)return{ok:false,message:'Poler poza zasięgiem · maks. 8 m.'};
 q.ropes=q.ropes.filter(r=>r.end!==end);q.ropes.push({end,bollard,length:Math.max(.3,distance+.12),tension:0});delete q.restPose;return{ok:true,message:'Cuma założona · łódź pozostaje w swoim miejscu.'};
}
export function untieTraffic(q,end){q.ropes=q.ropes.filter(r=>r.end!==end);delete q.restPose;}
