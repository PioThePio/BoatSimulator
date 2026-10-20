import {WORLD,ISLAND,DOCKS,BOLLARDS,BEACHES,islandOutline,islandRadius,shoreAt,bottomAt,environment,waveHeight,clamp} from './world.js';
import {point,cleat} from './rigging.js';
let wake=[],previousBoat=null,lastWake=0;
function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
function island(ctx,padding,color){path(ctx,islandOutline(padding));ctx.fillStyle=color;ctx.fill();}
export function propWashCount(engine){return Math.abs(engine.thrust)>5?1+Math.floor(clamp((engine.n-.23)/.77,0,1)*5):0;}
export function renderWorld(ctx,state){
 const {boat:b,env,width,height,zoom,follow,overview,manualCenter,selected}=state;
 const base=Math.min(width/140,height/80);
 const scale=overview?Math.min((width-40)/600,(height-40)/400):base*zoom;
 const halfX=width/(2*scale),halfY=height/(2*scale);
 const tracked={x:halfX>300?304:clamp(b.x,4+halfX-3,604-halfX+3),y:halfY>200?204:clamp(b.y,4+halfY-3,404-halfY+3)};
 const camera=overview?{x:304,y:204}:!follow&&manualCenter?manualCenter:tracked;
 const bounds={left:camera.x-width/(2*scale),right:camera.x+width/(2*scale),top:camera.y-height/(2*scale),bottom:camera.y+height/(2*scale)};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#d4e6e4';ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 const visible=(x,y,pad=4)=>x>bounds.left-pad&&x<bounds.right+pad&&y>bounds.top-pad&&y<bounds.bottom+pad;
 // Sparse anchored surface features replace the metre grid. They make translation legible.
 const H=waveHeight(env),speed=.07+H*.6,angle=(env.waveDirection??90)*Math.PI/180,nx=Math.sin(angle),ny=-Math.cos(angle);
 const textureStep=Math.max(5,22/scale);
 for(let y=Math.floor(bounds.top/textureStep)*textureStep;y<bounds.bottom+textureStep;y+=textureStep)for(let x=Math.floor(bounds.left/textureStep)*textureStep;x<bounds.right+textureStep;x+=textureStep){
  const seed=Math.sin(x*12.9898+y*78.233)*43758.5453,part=seed-Math.floor(seed),phase=(b.time*speed+part*4)%4;
  const px=x+part*4.7+nx*phase,py=y+part*4.8+ny*phase;if(shoreAt(px,py).land)continue;
  ctx.strokeStyle=part>.55?'#eaf2e9':'#b3cecd';ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(px-.7,py);ctx.bezierCurveTo(px-.2,py-.12,px+.2,py+.12,px+.7,py);ctx.stroke();
 }
 // Shallows, shoreline, beaches and a central island all share the collision geometry.
 ctx.fillStyle='#c1d9cc';ctx.fillRect(4,4,600,7);ctx.fillRect(4,397,600,7);ctx.fillRect(4,4,7,400);ctx.fillRect(597,4,7,400);
 for(const beach of BEACHES){ctx.fillStyle='#d5dfc8';if(beach.edge==='north')ctx.fillRect(beach.from,4,beach.to-beach.from,12);if(beach.edge==='west')ctx.fillRect(4,beach.from,12,beach.to-beach.from);if(beach.edge==='south')ctx.fillRect(beach.from,392,beach.to-beach.from,12);}
 island(ctx,13,'#b8d5c9');island(ctx,6,'#cbdcc5');
 ctx.fillStyle='#b6c9a6';ctx.fillRect(-1000,-1000,2600,1004);ctx.fillRect(-1000,4,1004,400);ctx.fillRect(604,4,1000,400);ctx.fillRect(-1000,404,2600,1000);
 island(ctx,0,'#b6c9a6');
 for(const beach of BEACHES){ctx.fillStyle='#e5d3a8';if(beach.edge==='north')ctx.fillRect(beach.from,-6,beach.to-beach.from,10);if(beach.edge==='west')ctx.fillRect(-6,beach.from,10,beach.to-beach.from);if(beach.edge==='south')ctx.fillRect(beach.from,404,beach.to-beach.from,10);}
 const arc=[];for(let i=0;i<=45;i++){const a=.3+2.5*i/45,r=islandRadius(a);arc.push({x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r});}for(let i=45;i>=0;i--){const a=.3+2.5*i/45,r=islandRadius(a)-5;arc.push({x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r});}path(ctx,arc);ctx.fillStyle='#e5d3a8';ctx.fill();
 // Submerged rock patches mark stony shores; collision severity comes from the shared bed material.
 const rocks=[];for(let i=0;i<42;i++)rocks.push({x:77+i*12.2,y:5.5+(i%4)*.45});for(let i=0;i<32;i++){const a=-Math.PI+i*Math.PI/32,r=islandRadius(a)+1.4;rocks.push({x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r});}
 for(const [i,q]of rocks.entries()){if(!visible(q.x,q.y)||bottomAt(q.x,q.y).material!=='rock')continue;ctx.beginPath();ctx.ellipse(q.x,q.y,.32+(i%3)*.12,.22+(i%2)*.09,i*.7,0,Math.PI*2);ctx.fillStyle=i%2?'#879c92':'#9eaea2';ctx.fill();ctx.strokeStyle='#b8c7ba';ctx.lineWidth=.05;ctx.stroke();}
 // Secluded wooded patches, drawn at fixed world positions.
 for(let i=0;i<85;i++){const a=i*2.39996,r=5+Math.sqrt(i/85)*29,x=ISLAND.x+Math.cos(a)*r,y=ISLAND.y+Math.sin(a)*r*.6;if(!visible(x,y))continue;ctx.beginPath();ctx.arc(x,y,1.7+(i%3)*.4,0,Math.PI*2);ctx.fillStyle=i%2?'#9cb58c':'#91ab82';ctx.fill();}
 for(const d of DOCKS){if(!visible(d.x,d.y,30))continue;ctx.fillStyle='#73908722';ctx.fillRect(d.x+.3,d.y+.4,d.w,d.h);ctx.fillStyle=b.dockDamage>=100?'#9e8273':'#bda783';ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle='#9f8b70';ctx.lineWidth=.07;ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.beginPath();if(d.w>d.h){for(let x=d.x+.5;x<d.x+d.w;x+=.65){ctx.moveTo(x,d.y);ctx.lineTo(x,d.y+d.h);}}else for(let y=d.y+.5;y<d.y+d.h;y+=.65){ctx.moveTo(d.x,y);ctx.lineTo(d.x+d.w,y);}ctx.stroke();}
 ctx.font='1.2px system-ui';ctx.fillStyle='#718b71';ctx.fillText('WYSPA SOSNOWA',ISLAND.x-11,ISLAND.y+2);
 for(const q of BOLLARDS){if(!visible(q.x,q.y))continue;
  if(q.kind==='tree'){ctx.fillStyle='#7b6a47';ctx.beginPath();ctx.arc(q.x,q.y,.32,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7f9d70';for(const [dx,dy,r]of [[-.7,-.7,.85],[.7,-.5,.9],[0,.6,1]]){ctx.beginPath();ctx.arc(q.x+dx,q.y+dy,r,0,Math.PI*2);ctx.fill();}}
  ctx.beginPath();ctx.arc(q.x,q.y,q===selected?.34:.22,0,Math.PI*2);ctx.fillStyle=q===selected?'#bd7541':'#d3a34b';ctx.fill();ctx.strokeStyle='#7b6943';ctx.lineWidth=.07;ctx.stroke();if(scale>2.5||q===selected){ctx.font=`bold ${Math.max(.9,9/scale)}px system-ui`;ctx.fillStyle='#47634c';ctx.fillText(q.id,q.x+.45,q.y-.45);}
 }
 // Water displaced by bow, keel and stern retains its world position as the boat moves.
 if(previousBoat!==b){wake=[];lastWake=b.time;previousBoat=b;}
 const water=environment(b.time,env).current;
 if(b.time-lastWake>.12){
  lastWake=b.time;for(const x of [-.38,0,.38])for(const y of [-.50,.50]){
   const p=point(b,b.spec.length*x,b.spec.beam*y),vx=b.vx-b.w*(p.y-b.y)-water.x,vy=b.vy+b.w*(p.x-b.x)-water.y,speed=Math.hypot(vx,vy);
   if(speed>.08)wake.push({x:p.x,y:p.y,t:b.time,angle:Math.atan2(vy,vx),size:Math.min(.45,.12+speed*.06)});
  }
 }
 wake=wake.filter(p=>b.time-p.t<4).slice(-240);
 for(const p of wake){const age=b.time-p.t,x=p.x+water.x*age,y=p.y+water.y*age;ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);ctx.strokeStyle=`rgba(250,255,246,${.6*(1-age/4)})`;ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(-p.size,-p.size*(1+age*.2));ctx.quadraticCurveTo(p.size*.3,0,-p.size,p.size*(1+age*.2));ctx.stroke();ctx.restore();}
 // Local velocities show bow and stern moving in opposite directions during rotation.
 for(const x of [-.4,0,.4]){
  const p=point(b,b.spec.length*x,0),vx=b.vx-b.w*(p.y-b.y)-water.x,vy=b.vy+b.w*(p.x-b.x)-water.y,v=Math.hypot(vx,vy);
  if(v<.035)continue;
  const unit={x:vx/v,y:vy/v},perp={x:-unit.y,y:unit.x},advance=(b.time*Math.max(.15,v))%.65;
  const width=b.spec.beam*(x===0?.56:.38);
  for(const side of [-1,1]){const q={x:p.x+perp.x*width*side-unit.x*advance,y:p.y+perp.y*width*side-unit.y*advance};ctx.strokeStyle='#f6fff3';ctx.lineWidth=.10;ctx.beginPath();ctx.moveTo(q.x-unit.x*.45-perp.x*.18,q.y-unit.y*.45-perp.y*.18);ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-unit.x*.45+perp.x*.18,q.y-unit.y*.45+perp.y*.18);ctx.stroke();}
 }
 for(const r of b.ropes){const p=cleat(b,r.end),q=BOLLARDS[r.bollard],d=Math.hypot(p.x-q.x,p.y-q.y),sag=Math.min(.7,Math.max(0,r.length-d));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+sag,(p.y+q.y)/2+sag,q.x,q.y);ctx.strokeStyle=r.tension>4000?'#b4563f':'#967138';ctx.lineWidth=.10;ctx.stroke();}
 const anchor=b.anchor;if(anchor.mode!=='stowed'&&!anchor.broken){const p=cleat(b,'bow');ctx.setLineDash([.2,.18]);ctx.strokeStyle='#727c78';ctx.lineWidth=.1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(anchor.x,anchor.y);ctx.stroke();ctx.setLineDash([]);ctx.font='1.25px system-ui';ctx.fillStyle='#476761';ctx.fillText('⚓',anchor.x-.45,anchor.y+.4);}
 drawBoat(ctx,b);
 ctx.restore();
 const metres=overview?50:5;ctx.strokeStyle='#4f756d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,height-52);ctx.lineTo(22+metres*scale,height-52);ctx.moveTo(22,height-56);ctx.lineTo(22,height-49);ctx.moveTo(22+metres*scale,height-56);ctx.lineTo(22+metres*scale,height-49);ctx.stroke();ctx.fillStyle='#4f756d';ctx.font='10px system-ui';ctx.fillText(metres+' m',24,height-60);
 return{scale,camera,bounds};
}
function drawBoat(ctx,b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(b.spec.length/5.5,b.spec.beam/2.1*Math.cos(b.roll));
 ctx.fillStyle=`rgba(23,63,61,${.12+Math.abs(b.heave)*.15})`;ctx.beginPath();ctx.ellipse(.2,.23+b.heave*.8,3,1.18,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#548f9190';ctx.lineWidth=.18;ctx.beginPath();ctx.moveTo(-2.7,0);ctx.lineTo(2.8,0);ctx.stroke();
 ctx.beginPath();ctx.moveTo(2.75,0);ctx.bezierCurveTo(1.8,-1.05,-.5,-1.15,-2.55,-.95);ctx.lineTo(-2.55,.95);ctx.bezierCurveTo(-.5,1.15,1.8,1.05,2.75,0);ctx.fillStyle=b.damage>=100?'#d0aaa0':'#faf9f1';ctx.fill();ctx.strokeStyle='#2f5754';ctx.lineWidth=.1;ctx.stroke();
 ctx.fillStyle='#c9b08a';ctx.fillRect(-1.75,-.68,2.05,1.36);ctx.fillStyle='#ebeee4';ctx.fillRect(-1.5,-.55,.4,1.1);ctx.fillStyle='#567d7b';ctx.fillRect(.1,-.7,.58,1.4);ctx.fillStyle='#d0dfda';ctx.fillRect(.18,-.57,.25,1.14);ctx.fillStyle='#eee8d8';ctx.fillRect(-.8,-.52,.65,.43);ctx.fillRect(-.8,.09,.65,.43);
 for(const engine of b.engines){
  ctx.save();ctx.translate(-2.6,engine.y*2.1/b.spec.beam);ctx.rotate(-b.actualSteer);ctx.fillStyle=engine.propDamage>=70?'#a96852':'#294d4d';ctx.fillRect(-.55,-.23,.65,.46);ctx.strokeStyle='#71928c';ctx.lineWidth=.08;ctx.strokeRect(-.55,-.23,.65,.46);
  const bars=b.enginesRaised?0:propWashCount(engine),dir=engine.gear>=0?-1:1;
  if(bars){ctx.strokeStyle='#f7fff3';ctx.lineWidth=.13;for(let i=0;i<bars;i++){const pulse=(b.time*2)%1,dist=.85+(i+pulse)*.37;ctx.beginPath();ctx.moveTo(dir*dist,-.16-i*.045);ctx.lineTo(dir*dist,.16+i*.045);ctx.stroke();}}
  if(b.enginesRaised){ctx.strokeStyle='#d2a44f';ctx.beginPath();ctx.moveTo(-.6,-.3);ctx.lineTo(.1,.3);ctx.stroke();}ctx.restore();
 }
 if(b.fenders)for(const x of [-1.2,.9])for(const y of [-1.02,1.02]){ctx.fillStyle='#e8ae67';ctx.beginPath();ctx.roundRect(x-.2,y-.13,.4,.26,.12);ctx.fill();ctx.strokeStyle='#a4773f';ctx.lineWidth=.045;ctx.stroke();}
 ctx.strokeStyle='#5c8a88';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-2,Math.sin(b.roll)*3);ctx.lineTo(1.5,Math.sin(b.roll)*3);ctx.stroke();ctx.fillStyle='#d5a64f';for(const x of [-2.05,2.05]){ctx.beginPath();ctx.arc(x,0,.1,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function renderMinimap(canvas,b,view){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/600,sy=h/400;
 c.clearRect(0,0,w,h);c.fillStyle='#d0e3df';c.fillRect(0,0,w,h);c.save();c.scale(sx,sy);c.translate(-4,-4);c.strokeStyle='#96ae88';c.lineWidth=8;c.strokeRect(4,4,600,400);island(c,0,'#a8c093');
 c.strokeStyle='#6b8f7a';c.lineWidth=1/sx;c.strokeRect(view.bounds.left,view.bounds.top,view.bounds.right-view.bounds.left,view.bounds.bottom-view.bounds.top);
 c.save();c.translate(b.x,b.y);c.rotate(b.a);c.fillStyle='#b96f3d';c.beginPath();c.moveTo(11,0);c.lineTo(-7,-6);c.lineTo(-7,6);c.closePath();c.fill();c.restore();c.restore();
}
