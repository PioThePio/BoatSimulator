import {RESCUE_TYPES} from './rescue.js';
import {selectedRescue,rescueApproach} from './rescue-metrics.js';
export function drawRescue(ctx,fleet,scale,overview,boat){
 const target=selectedRescue(fleet);
 if(target&&boat){const approach=rescueApproach(boat,target);ctx.save();ctx.strokeStyle='#c36628';ctx.lineWidth=1.5/scale;ctx.setLineDash([6/scale,4/scale]);ctx.beginPath();ctx.moveTo(approach.point.x,approach.point.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#c36628';const angle=Math.atan2(target.y-boat.y,target.x-boat.x),size=6/scale;ctx.translate(target.x,target.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-size,-size*.5);ctx.lineTo(-size,size*.5);ctx.closePath();ctx.fill();ctx.restore();}
 for(const o of fleet?.rescue?.objects??[]){if(o.recovered)continue;const p=RESCUE_TYPES[o.kind];ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a);ctx.scale(1+Math.max(-.06,Math.min(.06,o.heave*.12)),Math.cos(o.roll));ctx.strokeStyle='#4b766d';ctx.lineWidth=.06;
  ctx.fillStyle='#ed7e30';if(o.kind==='ring'){ctx.beginPath();ctx.arc(0,0,.4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#acd4cc';ctx.beginPath();ctx.arc(0,0,.23,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff6df';ctx.lineWidth=.15;for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*.24,Math.sin(a)*.24);ctx.lineTo(Math.cos(a)*.39,Math.sin(a)*.39);ctx.stroke();}}
  else{ctx.fillStyle='#f2cfa0';ctx.beginPath();ctx.arc(.65,0,.18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e87e35';ctx.beginPath();ctx.roundRect(-.35,-.25,.8,.5,.15);ctx.fill();ctx.strokeStyle='#244f53';ctx.lineWidth=.16;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-.25,side*.13);ctx.lineTo(-.85,side*.18);ctx.stroke();}}
  ctx.restore();if(overview||scale<4){ctx.strokeStyle='#cf642b';ctx.lineWidth=1.5/scale;ctx.beginPath();ctx.arc(o.x,o.y,6/scale,0,Math.PI*2);ctx.stroke();}if(!overview&&scale>3){ctx.font=`${10/scale}px system-ui`;ctx.fillStyle='#94532b';ctx.fillText(p.name,o.x+.7,o.y-.7);}
 }
}
