import {LAKE,REEDS,FUEL_STATION,WORLD,ISLAND,DOCKS,BOLLARDS,BEACHES,islandOutline,islandRadius,shoreAt,bottomAt,environment,waveHeight,clamp} from './world.js';
import {recordHullWake,drawHullWake} from './wake.js';
import {mooringPoint} from './marina.js';
import {point,cleat,cleatLocal,CLEATS} from './rigging.js';
let terrain=null;
function terrainImage(){
 if(terrain)return terrain;terrain=document.createElement('canvas');terrain.width=608;terrain.height=408;const c=terrain.getContext('2d'),im=c.createImageData(608,408);
 const stops=[[0,[218,218,183]],[.4,[200,216,185]],[1,[184,211,196]],[2,[172,207,199]],[4,[161,201,198]],[8.5,[148,191,192]]];
 for(let y=0;y<408;y++)for(let x=0;x<608;x++){const q=bottomAt(x,y),shore=shoreAt(x,y),d=q.depth;let rgb;
 if(d<0)rgb=shore.beach?[229,211,168]:[174,197,155];else{let j=1;while(j<stops.length-1&&d>stops[j][0])j++;const [lo,low]=stops[j-1],[hi,high]=stops[j],t=clamp((d-lo)/(hi-lo),0,1);rgb=low.map((v,k)=>v+(high[k]-v)*t);}
 const i=(y*608+x)*4;for(let j=0;j<3;j++)im.data[i+j]=rgb[j];im.data[i+3]=255;}c.putImageData(im,0,0);return terrain;
}
let hullWake=[],wake=[],previousBoat=null,lastWake=0;
function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
function island(ctx,padding,color){path(ctx,islandOutline(padding));ctx.fillStyle=color;ctx.fill();}
export function propWashCount(engine){return Math.abs(engine.thrust)>5?1+Math.floor(clamp((engine.n-.23)/.77,0,1)*5):0;}
export function renderWorld(ctx,state){
 const {boat:b,env,width,height,zoom,follow,overview,manualCenter,selected}=state;
 const base=Math.min(width/140,height/80);
 const scale=overview?Math.min((width-40)/600,(height-40)/400):base*zoom*(b.cameraZoom??1);
 const halfX=width/(2*scale),halfY=height/(2*scale);
 const tracked={x:halfX>300?304:clamp(b.x,4+halfX-3,604-halfX+3),y:halfY>200?204:clamp(b.y,4+halfY-3,404-halfY+3)};
 const ref=state.centerReference??b,refTracked={x:halfX>300?304:clamp(ref.x,4+halfX-3,604-halfX+3),y:halfY>200?204:clamp(ref.y,4+halfY-3,404-halfY+3)},blend=Math.exp(-Math.hypot(b.x-ref.x,b.y-ref.y)/16);
 const initialOffset={x:(ref.x-refTracked.x)*blend,y:(ref.y-refTracked.y)*blend};
 const camera=overview?{x:304,y:204}:!follow&&manualCenter?manualCenter:{x:tracked.x+initialOffset.x,y:tracked.y+initialOffset.y};
 const bounds={left:camera.x-width/(2*scale),right:camera.x+width/(2*scale),top:camera.y-height/(2*scale),bottom:camera.y+height/(2*scale)};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#aec59b';ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 const visible=(x,y,pad=4)=>x>bounds.left-pad&&x<bounds.right+pad&&y>bounds.top-pad&&y<bounds.bottom+pad;
 ctx.drawImage(terrainImage(),0,0,608,408);
 // Sparse anchored surface features replace the metre grid. They make translation legible.
 const H=waveHeight(env),speed=.07+H*.6,angle=(env.waveDirection??90)*Math.PI/180,nx=Math.sin(angle),ny=-Math.cos(angle);
 const textureStep=Math.max(5,22/scale);
 for(let y=Math.floor(bounds.top/textureStep)*textureStep;y<bounds.bottom+textureStep;y+=textureStep)for(let x=Math.floor(bounds.left/textureStep)*textureStep;x<bounds.right+textureStep;x+=textureStep){
  const seed=Math.sin(x*12.9898+y*78.233)*43758.5453,part=seed-Math.floor(seed),phase=(b.time*speed+part*4)%4;
  const px=x+part*4.7+nx*phase,py=y+part*4.8+ny*phase;if(shoreAt(px,py).land)continue;
  const curl=(.10+H*.22)*Math.sin(b.time*1.15+part*Math.PI*2),sway=.06*Math.sin(b.time*.8+part*11);
  ctx.strokeStyle=part>.55?'#eaf2e9':'#b3cecd';ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(px-.7,py+sway);ctx.bezierCurveTo(px-.28,py-.12+curl,px+.25,py+.12-curl,px+.7,py-sway);ctx.stroke();
 }
 // Trees remain on dry land; reeds are traversable water vegetation.
 for(let i=0;i<145;i++){const a=i*2.39996,r=8+Math.sqrt(i/145)*66,x=ISLAND.x+Math.cos(a)*r,y=ISLAND.y+Math.sin(a)*r*.78;if(!visible(x,y)||!shoreAt(x,y).land)continue;ctx.beginPath();ctx.arc(x,y,1.7+(i%3)*.4,0,Math.PI*2);ctx.fillStyle=i%2?'#9cb58c':'#91ab82';ctx.fill();}
 for(const r of REEDS){if(!visible(r.x,r.y,r.r))continue;ctx.strokeStyle='#6b9769';ctx.lineWidth=.13;for(let i=0;i<110;i++){const a=i*2.39996,rad=Math.sqrt(i/110)*r.r,x=r.x+Math.cos(a)*rad,y=r.y+Math.sin(a)*rad;if(shoreAt(x,y).land)continue;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.2*Math.sin(b.time*.6+i),y-.65);ctx.stroke();}}
 if(state.showTrail&&state.trail?.length){ctx.strokeStyle='#dc9554aa';ctx.lineWidth=.14;ctx.setLineDash([.5,.35]);ctx.beginPath();state.trail.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.setLineDash([]);}
 for(const q of b.booms){
  if(!visible(q.x1,q.y1,15))continue;
  ctx.save();ctx.translate(q.x1,q.y1);ctx.rotate(q.a);
  ctx.fillStyle='#5b747955';ctx.fillRect(q.length*.82,-.33,.72,.66);
  ctx.fillStyle='#bac7bc';ctx.fillRect(0,-q.width/2,q.length,q.width);ctx.strokeStyle='#728980';ctx.lineWidth=.06;ctx.strokeRect(0,-q.width/2,q.length,q.width);
  ctx.beginPath();ctx.moveTo(0,-.7);ctx.lineTo(1.7,-q.width/2);ctx.moveTo(0,.7);ctx.lineTo(1.7,q.width/2);ctx.stroke();
  ctx.fillStyle='#e4e6ce';ctx.fillRect(0,-.20,1.4,.40);ctx.restore();
 }
 for(const d of DOCKS){if(!visible(d.x,d.y,30))continue;ctx.fillStyle='#73908722';ctx.fillRect(d.x+.3,d.y+.4,d.w,d.h);ctx.fillStyle=b.dockDamage>=100?'#9e8273':'#bda783';ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle='#9f8b70';ctx.lineWidth=.07;ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.beginPath();if(d.w>d.h){for(let x=d.x+.5;x<d.x+d.w;x+=.65){ctx.moveTo(x,d.y);ctx.lineTo(x,d.y+d.h);}}else for(let y=d.y+.5;y<d.y+d.h;y+=.65){ctx.moveTo(d.x,y);ctx.lineTo(d.x+d.w,y);}ctx.stroke();}
 ctx.font='1.2px system-ui';ctx.fillStyle='#718b71';ctx.fillText('PRZESMYK SOSNOWY',ISLAND.x-12,ISLAND.y-9);
 ctx.fillStyle='#93692c';ctx.fillRect(FUEL_STATION.pumpX-.45,FUEL_STATION.pumpY-.55,.9,1.1);ctx.font='1.1px system-ui';ctx.fillText('⛽',FUEL_STATION.pumpX-.5,FUEL_STATION.pumpY-1);ctx.strokeStyle='#ad8d53';ctx.setLineDash([.4,.3]);ctx.lineWidth=.06;ctx.beginPath();ctx.arc(FUEL_STATION.x,FUEL_STATION.y,FUEL_STATION.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 for(let index=0;index<BOLLARDS.length;index++){const q=mooringPoint(b,index),isSelected=index===selected;if(!visible(q.x,q.y))continue;
  if(q.kind==='tree'){ctx.fillStyle='#7b6a47';ctx.beginPath();ctx.arc(q.x,q.y,.32,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7f9d70';for(const [dx,dy,r]of [[-.7,-.7,.85],[.7,-.5,.9],[0,.6,1]]){ctx.beginPath();ctx.arc(q.x+dx,q.y+dy,r,0,Math.PI*2);ctx.fill();}}
  ctx.beginPath();ctx.arc(q.x,q.y,q.kind==='buoy'?.45:isSelected?.34:.22,0,Math.PI*2);ctx.fillStyle=isSelected?'#bd7541':'#d3a34b';ctx.fill();ctx.strokeStyle='#7b6943';ctx.lineWidth=.07;ctx.stroke();if(scale>2.5||isSelected){ctx.font=`bold ${Math.max(.9,9/scale)}px system-ui`;ctx.fillStyle='#47634c';ctx.fillText(q.id,q.x+.45,q.y-.45);}
 }
 // Water displaced by bow, keel and stern retains its world position as the boat moves.
 if(previousBoat!==b){hullWake=[];wake=[];lastWake=b.time;previousBoat=b;}
 const water=environment(b.time,env,b.x,b.y).current;
 recordHullWake(hullWake,b,water);drawHullWake(ctx,hullWake,b.time);
 if(b.time-lastWake>.18){
  lastWake=b.time;for(const x of [-.38,0,.38])for(const y of [-.50,.50]){
   const p=point(b,b.spec.length*x,b.spec.beam*y),vx=b.vx-b.w*(p.y-b.y)-water.x,vy=b.vy+b.w*(p.x-b.x)-water.y,speed=Math.hypot(vx,vy);
   if(speed>.15)wake.push({x:p.x,y:p.y,t:b.time,angle:Math.atan2(vy,vx),size:Math.min(.45,.12+speed*.06)});
  }
 }
 wake=wake.filter(p=>b.time-p.t<4).slice(-240);
 for(const p of wake){const age=b.time-p.t,x=p.x+water.x*age,y=p.y+water.y*age;ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);ctx.strokeStyle=`rgba(250,255,246,${.6*(1-age/4)})`;ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(-p.size,-p.size*(1+age*.2));ctx.quadraticCurveTo(p.size*.3,0,-p.size,p.size*(1+age*.2));ctx.stroke();ctx.restore();}
 // Local velocities show bow and stern moving in opposite directions during rotation.
 for(const x of [-.4,0,.4]){
  const p=point(b,b.spec.length*x,0),vx=b.vx-b.w*(p.y-b.y)-water.x,vy=b.vy+b.w*(p.x-b.x)-water.y,v=Math.hypot(vx,vy);
  if(v<.12)continue;
  const unit={x:vx/v,y:vy/v},perp={x:-unit.y,y:unit.x},advance=(b.time*Math.max(.15,v))%.65;
  const width=b.spec.beam*(x===0?.56:.38);
  for(const side of [-1,1]){const q={x:p.x+perp.x*width*side-unit.x*advance,y:p.y+perp.y*width*side-unit.y*advance};ctx.strokeStyle='#f6fff3';ctx.lineWidth=.10;ctx.beginPath();ctx.moveTo(q.x-unit.x*.45-perp.x*.18,q.y-unit.y*.45-perp.y*.18);ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-unit.x*.45+perp.x*.18,q.y-unit.y*.45+perp.y*.18);ctx.stroke();}
 }
 for(const r of b.ropes){const p=cleat(b,r.end),q=mooringPoint(b,r.bollard),d=Math.hypot(p.x-q.x,p.y-q.y),sag=Math.min(.7,Math.max(0,r.length-d));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+sag,(p.y+q.y)/2+sag,q.x,q.y);const load=clamp(r.tension/b.spec.lineBreak,0,1);ctx.strokeStyle=`rgb(${Math.round(147+load*48)},${Math.round(119-load*48)},${Math.round(66-load*5)})`;ctx.lineWidth=.10;ctx.stroke();}
 const anchor=b.anchor;if(anchor.mode!=='stowed'&&!anchor.broken){const p=cleat(b,'bow');ctx.setLineDash([.2,.18]);ctx.strokeStyle='#727c78';ctx.lineWidth=.1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(anchor.x,anchor.y);ctx.stroke();ctx.setLineDash([]);ctx.font='1.25px system-ui';ctx.fillStyle='#476761';ctx.fillText('⚓',anchor.x-.45,anchor.y+.4);}
 if(env.traffic)for(const q of b.traffic){
  ctx.strokeStyle='#968262';ctx.lineWidth=.08;
  for(const r of q.ropes){const p=cleat(q,r.end),end=mooringPoint(b,r.bollard),d=Math.hypot(p.x-end.x,p.y-end.y),slack=Math.min(.4,Math.max(0,r.length-d));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+end.x)/2+slack,(p.y+end.y)/2+slack,end.x,end.y);ctx.stroke();}
  const bob=1+clamp(q.heave*.18,-.04,.04);
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(bob,bob);ctx.rotate(q.a);ctx.scale(1,Math.cos(q.roll));ctx.fillStyle=q.type==='pwc'?'#ddae62':'#e8e9dc';ctx.strokeStyle='#597d75';ctx.lineWidth=.09;ctx.beginPath();ctx.moveTo(q.length*.5,0);ctx.quadraticCurveTo(q.length*.2,-q.beam*.6,-q.length*.47,-q.beam*.45);ctx.lineTo(-q.length*.47,q.beam*.45);ctx.quadraticCurveTo(q.length*.2,q.beam*.6,q.length*.5,0);ctx.fill();ctx.stroke();ctx.fillStyle='#729697';ctx.fillRect(-q.length*.2,-q.beam*.3,q.length*.35,q.beam*.6);if(q.type==='sail'){ctx.strokeStyle='#635f4e';ctx.beginPath();ctx.moveTo(-q.length*.4,0);ctx.lineTo(q.length*.55,0);ctx.stroke();ctx.fillStyle='#f8f3df';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-q.length*.35,q.beam*.3);ctx.lineTo(-q.length*.35,-q.beam*.3);ctx.fill();}ctx.fillStyle='#d5a64f';for(const end of Object.keys(CLEATS)){const p=cleatLocal(q.spec,end);ctx.beginPath();ctx.arc(p.x,p.y,.09,0,Math.PI*2);ctx.fill();}ctx.restore();
 }
 drawBoat(ctx,b);
 const bow=cleat(b,'bow');ctx.fillStyle='#cfb56d';ctx.beginPath();ctx.arc(bow.x,bow.y,.22,0,Math.PI*2);ctx.fill();
 ctx.restore();
 const metres=overview?50:5;ctx.strokeStyle='#4f756d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,height-52);ctx.lineTo(22+metres*scale,height-52);ctx.moveTo(22,height-56);ctx.lineTo(22,height-49);ctx.moveTo(22+metres*scale,height-56);ctx.lineTo(22+metres*scale,height-49);ctx.stroke();ctx.fillStyle='#4f756d';ctx.font='10px system-ui';ctx.fillText(metres+' m',24,height-60);
 return{scale,camera,bounds};
}
function drawBoat(ctx,b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(b.spec.length/5.5,b.spec.beam/2.1*Math.cos(b.roll));
 ctx.fillStyle=`rgba(23,63,61,${.12+Math.abs(b.heave)*.15})`;ctx.beginPath();ctx.ellipse(.2,.23+b.heave*.8,3,1.18,0,0,Math.PI*2);ctx.fill();
 const bob=1+clamp(b.heave*.18,-.04,.04);ctx.scale(bob,bob);
 ctx.strokeStyle='#548f9190';ctx.lineWidth=.18;ctx.beginPath();ctx.moveTo(-2.7,0);ctx.lineTo(2.8,0);ctx.stroke();
 ctx.beginPath();ctx.moveTo(2.75,0);ctx.bezierCurveTo(1.8,-1.05,-.5,-1.15,-2.75,-.95);ctx.lineTo(-2.75,.95);ctx.bezierCurveTo(-.5,1.15,1.8,1.05,2.75,0);ctx.fillStyle=b.damage>=100?'#d0aaa0':b.spec.color;ctx.fill();ctx.strokeStyle='#2f5754';ctx.lineWidth=.1;ctx.stroke();
 if(b.spec.jet){ctx.fillStyle='#364e4d';ctx.beginPath();ctx.ellipse(-.4,0,1.3,.55,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d4d5ba';ctx.fillRect(.5,-.6,.18,1.2);}else{
 ctx.fillStyle='#c9b08a';ctx.fillRect(-1.75,-.68,2.05,1.36);ctx.fillStyle='#ebeee4';ctx.fillRect(-1.5,-.55,.4,1.1);ctx.fillStyle='#567d7b';ctx.fillRect(.1,-.7,.58,1.4);ctx.fillStyle='#d0dfda';ctx.fillRect(.18,-.57,.25,1.14);ctx.fillStyle='#eee8d8';ctx.fillRect(-.8,-.52,.65,.43);ctx.fillRect(-.8,.09,.65,.43);
 if(['cabin','cruiser'].includes(b.spec.profile)){ctx.fillStyle='#e8ece2';ctx.fillRect(-.1,-.77,1.6,1.54);ctx.fillStyle='#699393';ctx.fillRect(.9,-.65,.3,1.3);}}
 for(const engine of b.engines){
  ctx.save();ctx.translate(-2.6,engine.y*2.1/b.spec.beam);ctx.rotate(-b.actualSteer);ctx.fillStyle=engine.propDamage>=70?'#a96852':'#294d4d';ctx.fillRect(-.55,-.23,.65,.46);ctx.strokeStyle='#71928c';ctx.lineWidth=.08;ctx.strokeRect(-.55,-.23,.65,.46);
  const bars=b.enginesRaised?0:propWashCount(engine),dir=engine.gear>=0?-1:1;
  if(bars){ctx.strokeStyle='#f7fff3';ctx.lineWidth=.13;for(let i=0;i<bars;i++){const pulse=(b.time*2)%1,dist=.85+(i+pulse)*.37;ctx.beginPath();ctx.moveTo(dir*dist,-.16-i*.045);ctx.lineTo(dir*dist,.16+i*.045);ctx.stroke();}}
  if(engine.ventilation>.10||engine.trim>.78&&engine.key==='running'&&engine.n>.3){const foam=Math.max(engine.ventilation,Math.max(0,engine.trim-.78)*3);ctx.strokeStyle='#ffffffbb';ctx.lineWidth=.14;for(let i=0;i<15;i++){const age=(b.time*2+i*.13)%1.6,spread=.15+age*.4;ctx.beginPath();ctx.arc(-.7-age*(1.8+foam),Math.sin(i*2.4)*spread,.07+age*.09,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(-.6,0);ctx.quadraticCurveTo(-1.5,-.5*foam,-2.8-foam,-.25);ctx.stroke();}
  if(b.enginesRaised){ctx.strokeStyle='#d2a44f';ctx.beginPath();ctx.moveTo(-.6,-.3);ctx.lineTo(.1,.3);ctx.stroke();}ctx.restore();
 }
 for(const [end,x] of [['bow',2.05],['stern',-2.05]]){const power=b.thrusters[end+'Actual'];if(Math.abs(power)<.05)continue;ctx.strokeStyle='#f8fff0';ctx.lineWidth=.13;const dir=-Math.sign(power);for(let i=0;i<4;i++){const d=(i+(b.time*4)%1)*.28;ctx.beginPath();ctx.moveTo(x-.15,dir*(1.05+d));ctx.lineTo(x+.15,dir*(1.05+d));ctx.stroke();}}
 if(b.fenders)for(const x of [-1.2,.9])for(const y of [-1.02,1.02]){ctx.fillStyle='#e8ae67';ctx.beginPath();ctx.roundRect(x-.2,y-.13,.4,.26,.12);ctx.fill();ctx.strokeStyle='#a4773f';ctx.lineWidth=.045;ctx.stroke();}
 ctx.strokeStyle='#5c8a88';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-2,Math.sin(b.roll)*3);ctx.lineTo(1.5,Math.sin(b.roll)*3);ctx.stroke();ctx.fillStyle='#d5a64f';for(const end of Object.keys(CLEATS)){const p=cleatLocal(b.spec,end);ctx.beginPath();ctx.arc(p.x*5.5/b.spec.length,p.y*2.1/b.spec.beam,.08,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function renderMinimap(canvas,b,view){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/600,sy=h/400;
 c.clearRect(0,0,w,h);c.drawImage(terrainImage(),0,0,w,h);c.save();c.scale(sx,sy);c.translate(-4,-4);
 c.strokeStyle='#6b8f7a';c.lineWidth=1/sx;c.strokeRect(view.bounds.left,view.bounds.top,view.bounds.right-view.bounds.left,view.bounds.bottom-view.bounds.top);
 c.save();c.translate(b.x,b.y);c.rotate(b.a);c.fillStyle='#b96f3d';c.beginPath();c.moveTo(11,0);c.lineTo(-7,-6);c.lineTo(-7,6);c.closePath();c.fill();c.restore();c.restore();
}
