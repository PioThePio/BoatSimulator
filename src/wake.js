import {point} from './rigging.js';
// Advected snapshots leave diverging wave fronts on the travelled path, including turns.
export function recordHullWake(history,b,current){
 const vx=b.vx-current.x,vy=b.vy-current.y,speed=Math.hypot(vx,vy),ahead=vx*Math.cos(b.a)+vy*Math.sin(b.a);
 if(ahead>2&&(!history.length||b.time-history[history.length-1].time>=.14)){
  const p=point(b,-b.spec.length*.49,0),nx=-vy/speed,ny=vx/speed;
  history.push({x:p.x,y:p.y,nx,ny,time:b.time,currentX:current.x,currentY:current.y,spread:Math.min(4.5,speed*.25),width:b.spec.beam*.45});
 }
 while(history.length&&(b.time-history[0].time>6||history.length>55))history.shift();
}
export function wakeEdges(sample,time,factor=1){
 const age=Math.max(0,time-sample.time),width=sample.width+sample.spread*age*factor;
 const x=sample.x+sample.currentX*age,y=sample.y+sample.currentY*age;
 return[-1,1].map(side=>({x:x+side*sample.nx*width,y:y+side*sample.ny*width}));
}
export function drawHullWake(ctx,history,time){
 for(const factor of [.72,1])for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i],age=time-b.time,opacity=Math.max(0,1-age/6)*(.30+factor*.25);
  if(b.time-a.time>.5)continue;
  const from=wakeEdges(a,time,factor),to=wakeEdges(b,time,factor);
  ctx.strokeStyle=`rgba(249,255,245,${opacity})`;ctx.lineWidth=factor===1?.16:.09;
  for(let side=0;side<2;side++){ctx.beginPath();ctx.moveTo(from[side].x,from[side].y);ctx.lineTo(to[side].x,to[side].y);ctx.stroke();}
 }
}
