import {attachmentNames} from './attachment-points.js';
import {cleat,cleatLocal,CLEATS} from './rigging.js';
import {mooringPoint} from './marina.js';
import {hullOutline} from './hull-geometry.js';
import {drawFenders} from './render-fenders.js';
import {clamp} from './world.js';
export function drawUnpowered(ctx,b){
 const S=b.spec,kind=b.fleetKind,bob=1+clamp(b.heave*.18,-.04,.04);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(bob,bob*Math.cos(b.roll));ctx.globalAlpha*=1-.7*(b.submersion??0);
 ctx.fillStyle=S.color;ctx.strokeStyle='#456a60';ctx.lineWidth=.07;
 if(kind==='banana'){ctx.beginPath();ctx.ellipse(0,0,S.length*.5,S.beam*.42,0,0,Math.PI*2);ctx.fill();ctx.stroke();for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(-.3,side*S.beam*.36,S.length*.35,.11,0,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.strokeStyle='#a17c31';for(const x of [-1,0,1]){ctx.beginPath();ctx.moveTo(x,-.18);ctx.lineTo(x,.18);ctx.stroke();}}
 else if(kind==='mat'){ctx.beginPath();ctx.roundRect(-S.length*.5,-S.beam*.5,S.length,S.beam,.4);ctx.fill();ctx.stroke();ctx.fillStyle='#d8d5a1';ctx.beginPath();ctx.ellipse(0,0,S.length*.30,S.beam*.30,0,0,Math.PI*2);ctx.fill();}
 else{const shape=hullOutline(S);ctx.beginPath();shape.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=kind==='barge'?'#717e6f':'#7d9d8a';ctx.beginPath();ctx.roundRect(-S.length*.32,-S.beam*.29,S.length*.61,S.beam*.58,.15);ctx.fill();
  if(kind==='barge'){ctx.strokeStyle='#c0c3a8';for(let x=-3;x<3.5;x+=1){ctx.beginPath();ctx.moveTo(x,-1);ctx.lineTo(x,1);ctx.stroke();}}
  else{ctx.fillStyle='#ded8bb';for(const x of [-.2,.7])ctx.fillRect(x,-S.beam*.35,.12,S.beam*.7);if(S.manual&&b.occupied){const effort=Math.abs(b.throttle),phase=effort>.001?b.time*3:0,reach=.7+.3*Math.sin(phase)*effort;ctx.strokeStyle='#9b7947';ctx.lineWidth=.065;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,side*S.beam*.25);ctx.lineTo(-.5+Math.sin(phase)*.15*effort,side*(S.beam*.5+reach));ctx.stroke();}}}
 }
 for(const end of Object.keys(attachmentNames(b))){const p=cleatLocal(S,end);ctx.fillStyle=end==='stern'||end==='towCenter'?'#152f2b':'#d5a64f';ctx.beginPath();ctx.arc(p.x,p.y,end==='stern'||end==='towCenter'?.19:.12,0,Math.PI*2);ctx.fill();}drawFenders(ctx,b);ctx.restore();
}
export function drawFleet(ctx,fleet,active,drawBoat,visible,scale,overview){
 if(!fleet)return;
 for(const r of fleet.tows){if(r.broken)continue;const a=fleet.boats.find(b=>b.id===r.from),b=fleet.boats.find(b=>b.id===r.to),p=cleat(a,r.fromEnd),q=cleat(b,r.toEnd),d=Math.hypot(p.x-q.x,p.y-q.y),slack=Math.min(1.8,Math.max(0,r.length-d)*.4),load=clamp(r.tension/r.strength,0,1);ctx.strokeStyle=load>.85?'#c85b3e':load>.45?'#ab7942':'#dfc386';ctx.lineWidth=Math.max(.08,1.3/scale);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+slack,(p.y+q.y)/2+slack,q.x,q.y);ctx.stroke();if(!overview&&scale>3){ctx.font=`${10/scale}px system-ui`;ctx.fillStyle='#456658';ctx.fillText((r.tension/1000).toFixed(1)+' kN',(p.x+q.x)/2,(p.y+q.y)/2-.3);}}
 for(const b of fleet.boats){if(b===active||!visible(b.x,b.y,b.spec.length))continue;
  for(const r of b.ropes){const p=cleat(b,r.end),q=mooringPoint(b,r.bollard);if(!q)continue;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=r.tension>b.spec.lineBreak*.85?'#b66340':'#b9955b';ctx.lineWidth=.1;ctx.stroke();}
  const a=b.anchor;if(a.mode!=='stowed'&&!a.broken){const p=cleat(b,'bow');ctx.strokeStyle='#7d8e7f';ctx.setLineDash([.2,.18]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.setLineDash([]);}
  drawBoat(ctx,b);if(overview){ctx.fillStyle='#a46d33';ctx.beginPath();ctx.arc(b.x,b.y,3.2/scale,0,Math.PI*2);ctx.fill();}
  if(!overview&&scale>3){ctx.font=`${10/scale}px system-ui`;ctx.fillStyle='#355f50';ctx.textAlign='center';ctx.fillText(b.name,b.x,b.y-b.spec.beam*.7-10/scale);ctx.textAlign='start';}
 }
}
