import {point,inverseMass,impulse} from './rigging.js';
import {recordImpact} from './impacts.js';
export {fenderGeometry} from './fender-geometry.js';
export function beginFenderStep(b){b.fenderContacts??={};for(const q of Object.values(b.fenderContacts)){q.compression=0;q.force=0;q.bottomed=false;}}
export function fenderContact(b,g,{n,depth,otherVelocity={x:0,y:0},otherInverse=()=>0,react=()=>{},target='dock'},dt,notify=()=>{}){
 if(depth<=0)return;
 const p=point(b,g.x,g.y),arm={x:p.x-b.x-n.x*g.radius,y:p.y-b.y-n.y*g.radius};
 const relative={x:b.vx-b.w*arm.y-otherVelocity.x,y:b.vy+b.w*arm.x-otherVelocity.y},vn=relative.x*n.x+relative.y*n.y;
 const inv=inverseMass(b,n,arm)+otherInverse(n),effective=1/inv,k=12000*(g.radius/.14)**.8,c=1.05*Math.sqrt(k*effective),compression=Math.min(depth,g.workingCompression);
 // Implicit spring/damper avoids an explosive explicit contact at 120 Hz.
 const force=Math.min(k*g.workingCompression*1.45,Math.max(0,(k*compression-(c+k*dt)*vn)/(1+(c*dt+k*dt*dt)*inv))),j=force*dt;
 impulse(b,n,j,arm);react(n,-j);
 const tangent={x:-n.y,y:n.x},vt=relative.x*tangent.x+relative.y*tangent.y,invT=inverseMass(b,tangent,arm)+otherInverse(tangent);
 const friction=-Math.sign(vt)*Math.min(Math.abs(vt)/invT,j*.035);impulse(b,tangent,friction,arm);react(tangent,-friction);
 b.fenderContacts??={};const q=b.fenderContacts[g.id]??={compression:0,force:0};q.compression=Math.max(q.compression,Math.min(depth,g.maxCompression));q.force=Math.max(q.force,force);q.bottomed=depth>=g.maxCompression;q.target=target;
 // The fender absorbs this contact. Only a later, real hull contact may charge
 // the residual collision energy; do not also charge hull/dock damage here.
 if(vn<-.025)recordImpact(b,{arm,speed:-vn,effective,protectedContact:true,fender:g.id,target,dock:false,damage:0},notify);
 return{force,compression:depth,bottomed:q.bottomed};
}
