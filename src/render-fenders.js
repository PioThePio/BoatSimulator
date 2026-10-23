import {fenderGeometry} from './fender-geometry.js';
import {impactPaint} from './impacts.js';
// Called in the hull's local SI frame, matching the contact solver exactly.
export function drawFenders(ctx,b){
 if(!b.fenders)return;
 for(const g of fenderGeometry(b.spec)){
  const compression=Math.min(g.radius*1.9,b.fenderContacts?.[g.id]?.compression??0),r=Math.max(g.radius*.05,g.radius-compression/2),paint=impactPaint(b,g.id,true);
  ctx.save();ctx.translate(g.x-g.nx*compression/2,g.y-g.ny*compression/2);ctx.rotate(Math.atan2(g.ny,g.nx)-Math.PI/2);
  ctx.fillStyle=paint.color??'#e8ae67';ctx.strokeStyle=paint.flash>0?paint.color:'#a4773f';ctx.lineWidth=paint.flash>0?.065:.028;
  ctx.beginPath();ctx.roundRect(-g.length/2,-r,g.length,2*r,Math.min(r,g.length/2));ctx.fill();ctx.stroke();ctx.restore();
 }
}
