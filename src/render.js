import {LAKE,REEDS,FUEL_STATION,FUEL_FENDERS,SERVICE_STATION,BUILDINGS,WORLD,ISLAND,ISLANDS,BRIDGES,REMOTE_HARBORS,MAP_LABELS,DOCKS,BOLLARDS,BEACHES,islandOutline,islandRadius,shoreAt,bottomAt,environment,waveHeight,clamp} from './world.js';
import {waterMotionSamples} from './boat-effects.js';
import {drawParking,drawTowRig} from './render-towing.js';
import {drawHullWake} from './wake.js';
import {mooringPoint} from './marina.js';
import {FENDERS,HULL_SECTIONS,impactPaint} from './impacts.js';
import {point,cleat,cleatLocal,CLEATS} from './rigging.js';
function drawTerrain(ctx){
 ctx.fillStyle='#aec59b';ctx.fillRect(WORLD.left,WORLD.top,WORLD.right-WORLD.left,WORLD.bottom-WORLD.top);
 path(ctx,LAKE);ctx.fillStyle='#94bfc0';ctx.fill();ctx.save();ctx.clip();
 for(const [width,color]of [[380,'#a1c9c6'],[150,'#b4d1c6'],[45,'#c8d8b9'],[8,'#dadab7']]){path(ctx,LAKE);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
 for(const q of ISLANDS){path(ctx,islandOutline(12,q));ctx.fillStyle='#d9d8b1';ctx.fill();path(ctx,islandOutline(0,q));ctx.fillStyle='#9bb58a';ctx.fill();}
 ctx.restore();
}
export function mapProjection(width,height){const scale=Math.min(width/(WORLD.right-WORLD.left),height/(WORLD.bottom-WORLD.top));return{scale,x:(width-(WORLD.right-WORLD.left)*scale)/2,y:(height-(WORLD.bottom-WORLD.top)*scale)/2};}
export function vehicleLookAhead(r){return(r.gear==='R'?-1:r.gear==='D'?1:0)*Math.min(28,10+Math.hypot(r.car.vx,r.car.vy)*1.2);}
function drawBridges(ctx,scale){
 for(const q of BRIDGES){
  ctx.strokeStyle=q.dam?'#8b978b':'#a3aaa0';ctx.lineWidth=q.width;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(q.a.x,q.a.y);ctx.lineTo(q.b.x,q.b.y);ctx.stroke();
  ctx.strokeStyle='#e9ebd8';ctx.lineWidth=.35;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
  for(const t of q.piers){const x=q.a.x+(q.b.x-q.a.x)*t,y=q.a.y+(q.b.y-q.a.y)*t;ctx.fillStyle='#617b73';ctx.fillRect(x-2.2,y-3.5,4.4,7);}
  const x=(q.a.x+q.b.x)/2,y=(q.a.y+q.b.y)/2;ctx.font=`${Math.max(2,9/scale)}px system-ui`;ctx.fillStyle='#557365';ctx.fillText(q.name+(scale>.3&&!q.dam?' · prześwit '+q.clearance+' m':''),x+q.width,y-q.width);
 }
}
let wake=[],previousBoat=null,lastWake=0;
function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
function island(ctx,padding,color){path(ctx,islandOutline(padding));ctx.fillStyle=color;ctx.fill();}
export function propWashCount(engine){return Math.abs(engine.thrust)>5?1+Math.floor(clamp((engine.n-.23)/.77,0,1)*5):0;}
export function propFoamIntensity(en){
 if(en.key!=='running'||en.gear===0||en.n<=.1||en.immersion<=.01)return 0;
 const foam=Math.max(en.ventilation,Math.max(0,en.trim-.78)*3);
 return foam>.10?foam:0;
}
export function renderWorld(ctx,state){
 const {boat:b,env,width,height,zoom,follow,overview,manualCenter,selected}=state;
 const focus=state.focus??b,base=Math.min(width/140,height/80);
 const scale=overview?Math.min((width-30)/(WORLD.right-WORLD.left),(height-30)/(WORLD.bottom-WORLD.top)):base*zoom*(focus.cameraZoom??1);
 const halfX=width/(2*scale),halfY=height/(2*scale);
 const middle={x:(WORLD.left+WORLD.right)/2,y:(WORLD.top+WORLD.bottom)/2};
 const track=p=>({x:2*halfX>WORLD.right-WORLD.left?middle.x:clamp(p.x,WORLD.left+halfX,WORLD.right-halfX),y:2*halfY>WORLD.bottom-WORLD.top?middle.y:clamp(p.y,WORLD.top+halfY,WORLD.bottom-halfY)});
 const tracked=track(b),ref=state.centerReference??b,refTracked=track(ref),blend=Math.exp(-Math.hypot(b.x-ref.x,b.y-ref.y)/16);
 const initialOffset={x:(ref.x-refTracked.x)*blend,y:(ref.y-refTracked.y)*blend};
 const lead=state.focus&&state.towRig?vehicleLookAhead(state.towRig):0;
 const camera=overview?middle:!follow&&manualCenter?{...manualCenter}:state.focus?{x:focus.x+Math.cos(focus.a)*lead,y:focus.y+Math.sin(focus.a)*lead}:{x:tracked.x+initialOffset.x,y:tracked.y+initialOffset.y};
 if(state.screenShift)camera.x=b.x+state.screenShift/scale;
 const bounds={left:camera.x-width/(2*scale),right:camera.x+width/(2*scale),top:camera.y-height/(2*scale),bottom:camera.y+height/(2*scale)};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#aec59b';ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 const visible=(x,y,pad=4)=>x>bounds.left-pad&&x<bounds.right+pad&&y>bounds.top-pad&&y<bounds.bottom+pad;
 drawTerrain(ctx);drawBridges(ctx,scale);
 drawParking(ctx);
 // Small shore settlement and a concrete slip next to the service fingers.
 for(const house of BUILDINGS){
  if(!visible(house.x,house.y,20))continue;
  ctx.fillStyle='#68807130';ctx.fillRect(house.x+.5,house.y+.6,house.w,house.h);
  ctx.fillStyle=house.roof;ctx.fillRect(house.x,house.y,house.w,house.h);ctx.strokeStyle='#65796a';ctx.lineWidth=.12;ctx.strokeRect(house.x,house.y,house.w,house.h);
  ctx.strokeStyle='#edf0db88';ctx.beginPath();ctx.moveTo(house.x+.5,house.y+house.h/2);ctx.lineTo(house.x+house.w-.5,house.y+house.h/2);ctx.stroke();
  ctx.fillStyle='#dfe8d3';for(let i=1;i<4;i++)ctx.fillRect(house.x+house.w*i/5,house.y+house.h-.9,.7,.5);
  if(house.service){ctx.font='bold 1.35px system-ui';ctx.fillStyle='#edf3de';ctx.fillText('SERWIS',house.x+2,house.y+house.h*.65);}
 }
 const slip=SERVICE_STATION.slip;
 if(visible(slip.x,slip.y,30)){
  const concrete=ctx.createLinearGradient(0,slip.waterY,0,slip.y+slip.h);concrete.addColorStop(0,'#aeb8a5');concrete.addColorStop(1,'#a5c3b9');ctx.fillStyle=concrete;ctx.fillRect(slip.x,slip.y,slip.w,slip.h);ctx.strokeStyle='#849889';ctx.lineWidth=.12;
  for(let y=slip.y+.6;y<slip.y+slip.h;y+=.8){ctx.beginPath();ctx.moveTo(slip.x,y);ctx.lineTo(slip.x+slip.w,y);ctx.stroke();}
  ctx.strokeStyle='#74887e';ctx.lineWidth=.18;for(const x of [slip.x+1.8,slip.x+slip.w-1.8]){ctx.beginPath();ctx.moveTo(x,slip.y);ctx.lineTo(x,slip.y+slip.h);ctx.stroke();}
  ctx.font='bold 1.3px system-ui';ctx.fillStyle='#486c60';ctx.fillText('SLIP',121,34);ctx.fillText('SERWIS · CUMUJ',133,42);
 }
 // Sparse anchored surface features replace the metre grid. They make translation legible.
 const H=waveHeight(env,b.time),speed=.07+H*.6,angle=(env.waveDirection??90)*Math.PI/180,nx=Math.sin(angle),ny=-Math.cos(angle);
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
 for(const q of MAP_LABELS){if(!overview&&!visible(q.x,q.y,100))continue;ctx.font=`${Math.max(1.4,overview?10/scale:0)}px system-ui`;ctx.fillStyle='#5d7c69';ctx.fillText(q.name,q.x,q.y);}if(overview){ctx.fillStyle='#d0a14a';for(const q of REMOTE_HARBORS){ctx.beginPath();ctx.arc(q.x,q.y,3/scale,0,Math.PI*2);ctx.fill();}}
 ctx.fillStyle='#93692c';ctx.fillRect(FUEL_STATION.pumpX-.45,FUEL_STATION.pumpY-.55,.9,1.1);ctx.font='1.1px system-ui';ctx.fillText('⛽',FUEL_STATION.pumpX-.5,FUEL_STATION.pumpY-1);ctx.fillStyle='#d5bf75';ctx.fillRect(FUEL_STATION.x-.45,FUEL_STATION.alongMin,.4,FUEL_STATION.alongMax-FUEL_STATION.alongMin);ctx.save();ctx.translate(FUEL_STATION.x-1.3,FUEL_STATION.y+5);ctx.rotate(-Math.PI/2);ctx.font='bold .9px system-ui';ctx.fillStyle='#72613d';ctx.fillText('PALIWO · CUMUJ BURTĄ',0,0);ctx.restore();
 if(overview){ctx.font=`${10/scale}px system-ui`;ctx.fillStyle='#8c753d';ctx.fillText('⛽ Paliwo',FUEL_STATION.x+40,FUEL_STATION.y+40);ctx.fillStyle='#456d55';ctx.fillText('Port główny · slip',0,100);}
 for(const f of FUEL_FENDERS){const hit=b.lastImpact?.target===f.id&&b.time-b.lastImpact.time<1.6;ctx.fillStyle=hit?'#e2b66b':'#3b5751';ctx.beginPath();ctx.roundRect(f.x,f.y,f.w,f.h,.10);ctx.fill();}
 for(let index=0;index<BOLLARDS.length;index++){const q=mooringPoint(b,index),isSelected=index===selected;if(!visible(q.x,q.y)||q.trailer&&b.towRig?.postBroken)continue;
  if(q.kind==='tree'){ctx.fillStyle='#7b6a47';ctx.beginPath();ctx.arc(q.x,q.y,.32,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7f9d70';for(const [dx,dy,r]of [[-.7,-.7,.85],[.7,-.5,.9],[0,.6,1]]){ctx.beginPath();ctx.arc(q.x+dx,q.y+dy,r,0,Math.PI*2);ctx.fill();}}
  ctx.beginPath();ctx.arc(q.x,q.y,q.kind==='buoy'?.45:isSelected?.34:.22,0,Math.PI*2);ctx.fillStyle=isSelected?'#bd7541':'#d3a34b';ctx.fill();ctx.strokeStyle='#7b6943';ctx.lineWidth=.07;ctx.stroke();if(!q.trailer&&isSelected){ctx.font=`bold ${Math.max(.9,9/scale)}px system-ui`;ctx.fillStyle='#47634c';ctx.fillText(q.id,q.x+.45,q.y-.45);}
 }
 // Point velocities relative to local water drive every hull ripple.
 if(previousBoat!==b){wake=[];lastWake=b.time;previousBoat=b;}
 const samples=waterMotionSamples(b,env);
 if(samples.length)drawHullWake(ctx,b.wake,b.time);
 if(samples.length&&b.time-lastWake>.22){
  lastWake=b.time;
  for(const q of samples){const vx=q.relative.x,vy=q.relative.y,speed=Math.hypot(vx,vy);if(speed<.045)continue;
   const a=Math.atan2(vy,vx),nx=-Math.sin(a),ny=Math.cos(a);
   for(const side of [-1,1]){const x=q.p.x+nx*b.spec.beam*.48*side,y=q.p.y+ny*b.spec.beam*.48*side;if(bottomAt(x,y).depth>.01)wake.push({x,y,t:b.time,angle:a,current:q.water,size:Math.min(.4,.10+speed*.05),opacity:Math.min(.5,.15+speed*.15)});}
  }
 }
 wake=samples.length?wake.filter(p=>b.time-p.t<3).slice(-200):[];
 for(const p of wake){const age=b.time-p.t,x=p.x+p.current.x*age,y=p.y+p.current.y*age;if(bottomAt(x,y).depth<=.01)continue;ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);ctx.strokeStyle=`rgba(250,255,246,${p.opacity*(1-age/3)})`;ctx.lineWidth=.06;ctx.beginPath();ctx.moveTo(-p.size,-p.size*(1+age*.2));ctx.quadraticCurveTo(p.size*.3,0,-p.size,p.size*(1+age*.2));ctx.stroke();ctx.restore();}
 // Short oblique wavelets travel down-flow relative to the hull. No arrowheads
 // or assumed forward direction: a stationary hull in still water emits none.
 for(const q of samples){
  const vx=q.relative.x,vy=q.relative.y,speed=Math.hypot(vx,vy);if(speed<.025)continue;
  const angle=Math.atan2(vy,vx),ux=vx/speed,uy=vy/speed,nx=-uy,ny=ux;
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const phase=(b.time*speed*.65+i/3)%1,distance=b.spec.beam*(.52+phase*.32);
   const x=q.p.x+nx*distance*side-ux*phase*.7,y=q.p.y+ny*distance*side-uy*phase*.7;
   if(bottomAt(x,y).depth<=.01)continue;
   ctx.save();ctx.translate(x,y);ctx.rotate(angle+side*.6);
   ctx.strokeStyle=`rgba(248,255,244,${Math.min(.4,.12+speed*.15)*Math.sin(phase*Math.PI)})`;ctx.lineWidth=.055;
   ctx.beginPath();ctx.moveTo(-.22,-.06);ctx.quadraticCurveTo(0,.05,.22,-.06);ctx.stroke();ctx.restore();
  }
 }
 for(const r of b.ropes){const p=cleat(b,r.end),q=mooringPoint(b,r.bollard),d=Math.hypot(p.x-q.x,p.y-q.y),sag=Math.min(.7,Math.max(0,r.length-d));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+sag,(p.y+q.y)/2+sag,q.x,q.y);const load=clamp(r.tension/b.spec.lineBreak,0,1);ctx.strokeStyle=`rgb(${Math.round(147+load*48)},${Math.round(119-load*48)},${Math.round(66-load*5)})`;ctx.lineWidth=.10;ctx.stroke();}
 const anchor=b.anchor;if(anchor.mode!=='stowed'&&!anchor.broken){const p=cleat(b,'bow');ctx.setLineDash([.2,.18]);ctx.strokeStyle='#727c78';ctx.lineWidth=.1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(anchor.x,anchor.y);ctx.stroke();ctx.setLineDash([]);ctx.font='1.25px system-ui';ctx.fillStyle='#476761';ctx.fillText('⚓',anchor.x-.45,anchor.y+.4);}
 if(env.traffic)for(const q of b.traffic){
  ctx.strokeStyle='#968262';ctx.lineWidth=.08;
  for(const r of q.ropes){const p=cleat(q,r.end),end=mooringPoint(b,r.bollard),d=Math.hypot(p.x-end.x,p.y-end.y),slack=Math.min(.4,Math.max(0,r.length-d));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+end.x)/2+slack,(p.y+end.y)/2+slack,end.x,end.y);ctx.stroke();}
  const bob=1+clamp(q.heave*.18,-.04,.04);
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(bob,bob);ctx.rotate(q.a);ctx.scale(1,Math.cos(q.roll));ctx.fillStyle=q.type==='pwc'?'#ddae62':'#e8e9dc';ctx.strokeStyle='#597d75';ctx.lineWidth=.09;ctx.beginPath();ctx.moveTo(q.length*.5,0);ctx.quadraticCurveTo(q.length*.2,-q.beam*.6,-q.length*.47,-q.beam*.45);ctx.lineTo(-q.length*.47,q.beam*.45);ctx.quadraticCurveTo(q.length*.2,q.beam*.6,q.length*.5,0);ctx.fill();ctx.stroke();ctx.fillStyle='#729697';ctx.fillRect(-q.length*.2,-q.beam*.3,q.length*.35,q.beam*.6);if(q.type==='sail'){ctx.strokeStyle='#635f4e';ctx.beginPath();ctx.moveTo(-q.length*.4,0);ctx.lineTo(q.length*.55,0);ctx.stroke();ctx.fillStyle='#f8f3df';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-q.length*.35,q.beam*.3);ctx.lineTo(-q.length*.35,-q.beam*.3);ctx.fill();}ctx.fillStyle='#d5a64f';for(const end of Object.keys(CLEATS)){const p=cleatLocal(q.spec,end);ctx.beginPath();ctx.arc(p.x,p.y,.09,0,Math.PI*2);ctx.fill();}ctx.restore();
 }
 drawTowRig(ctx,state.towRig,b);drawBoat(ctx,b);
 const bow=cleat(b,'bow');ctx.fillStyle='#cfb56d';ctx.beginPath();ctx.arc(bow.x,bow.y,.22,0,Math.PI*2);ctx.fill();
 ctx.restore();
 const metres=overview?1000:scale<1?100:5;ctx.strokeStyle='#4f756d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,height-52);ctx.lineTo(22+metres*scale,height-52);ctx.moveTo(22,height-56);ctx.lineTo(22,height-49);ctx.moveTo(22+metres*scale,height-56);ctx.lineTo(22+metres*scale,height-49);ctx.stroke();ctx.fillStyle='#4f756d';ctx.font='10px system-ui';ctx.fillText(metres+' m',24,height-60);
 return{scale,camera,bounds};
}
function drawBoat(ctx,b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(b.spec.length/5.5,b.spec.beam/2.1*Math.cos(b.roll));
 const visualHeave=b.towRig?.boatLoaded&&b.towRig.secured?0:Math.min(.7,b.heave);
 ctx.fillStyle=`rgba(23,63,61,${b.towRig?.boatLoaded&&b.towRig.secured?.05:.12+Math.abs(visualHeave)*.15})`;ctx.beginPath();ctx.ellipse(.2,.23+visualHeave*.8,3,1.18,0,0,Math.PI*2);ctx.fill();
 const bob=1+clamp(visualHeave*.18,-.04,.04);ctx.scale(bob,bob);
 ctx.strokeStyle='#548f9190';ctx.lineWidth=.18;ctx.beginPath();ctx.moveTo(-2.7,0);ctx.lineTo(2.8,0);ctx.stroke();
 ctx.beginPath();if(b.spec.hullType==='flat'){ctx.roundRect(-2.75,-.95,5.5,1.9,.35);}else{ctx.moveTo(2.75,0);ctx.bezierCurveTo(1.8,-1.05,-.5,-1.15,-2.75,-.95);ctx.lineTo(-2.75,.95);ctx.bezierCurveTo(-.5,1.15,1.8,1.05,2.75,0);}ctx.fillStyle=b.damage>=100?'#d0aaa0':b.spec.color;ctx.fill();ctx.strokeStyle='#2f5754';ctx.lineWidth=.1;ctx.stroke();
 for(const [zone,points]of Object.entries(HULL_SECTIONS)){
  const paint=impactPaint(b,zone);if(!paint.color)continue;
  ctx.save();ctx.globalAlpha=paint.flash>0?.4+.6*paint.flash:.35+.5*paint.damage/100;ctx.strokeStyle=paint.color;ctx.lineWidth=paint.flash>0?.23:.13;ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();
 }
 if(b.spec.hullType==='rib'){ctx.strokeStyle='#718c87';ctx.lineWidth=.30;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-2.6,side*.85);ctx.quadraticCurveTo(1.2,side*1.18,2.5,0);ctx.stroke();}}if(b.spec.jet){ctx.fillStyle='#364e4d';ctx.beginPath();ctx.ellipse(-.4,0,1.3,.55,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d4d5ba';ctx.fillRect(.5,-.6,.18,1.2);}else{
 ctx.fillStyle='#c9b08a';ctx.fillRect(-1.75,-.68,2.05,1.36);ctx.fillStyle='#ebeee4';ctx.fillRect(-1.5,-.55,.4,1.1);ctx.fillStyle='#567d7b';ctx.fillRect(.1,-.7,.58,1.4);ctx.fillStyle='#d0dfda';ctx.fillRect(.18,-.57,.25,1.14);ctx.fillStyle='#eee8d8';ctx.fillRect(-.8,-.52,.65,.43);ctx.fillRect(-.8,.09,.65,.43);
 if(['cabin','cruiser'].includes(b.spec.profile)){ctx.fillStyle='#e8ece2';ctx.fillRect(-.1,-.77,1.6,1.54);ctx.fillStyle='#699393';ctx.fillRect(.9,-.65,.3,1.3);}}
 for(const engine of b.engines){
  if(b.spec.air){ctx.save();ctx.translate(-1.8,0);ctx.strokeStyle='#4b6255';ctx.lineWidth=.12;ctx.beginPath();ctx.ellipse(0,0,.36,.99,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=.045;for(const y of [-.75,-.4,0,.4,.75]){ctx.beginPath();ctx.moveTo(-.26,y);ctx.lineTo(.26,y);ctx.stroke();}const phase=engine.key==='running'?b.time*(9+engine.n*30):.5;ctx.strokeStyle='#6d7e63';ctx.lineWidth=.12;for(let i=0;i<3;i++){const a=phase+i*Math.PI*2/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*.2,Math.sin(a)*.88);ctx.stroke();}for(const side of [-1,1]){ctx.save();ctx.translate(-.8,side*.5);ctx.rotate(-b.actualSteer);ctx.fillStyle='#70856a';ctx.fillRect(-.35,-.06,.6,.12);ctx.restore();}ctx.restore();continue;}
  ctx.save();ctx.translate(-2.6,engine.y*2.1/b.spec.beam);ctx.rotate(b.spec.propulsion==='inboard'?0:-b.actualSteer);ctx.strokeStyle=engine.propDamage>=70?'#a96852':'#41675f';ctx.lineWidth=.14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(.02,0);ctx.lineTo(-.52,0);ctx.moveTo(-.39,-.15);ctx.lineTo(-.39,.15);ctx.stroke();
  const bars=b.enginesRaised?0:propWashCount(engine),dir=engine.gear>=0?-1:1;
  if(bars){ctx.strokeStyle='#f7fff3';ctx.lineWidth=.13;for(let i=0;i<bars;i++){const pulse=(b.time*2)%1,dist=.85+(i+pulse)*.37;ctx.beginPath();ctx.moveTo(dir*dist,-.16-i*.045);ctx.lineTo(dir*dist,.16+i*.045);ctx.stroke();}}
  const foam=propFoamIntensity(engine);if(foam){ctx.strokeStyle='#ffffffbb';ctx.lineWidth=.14;for(let i=0;i<15;i++){const age=(b.time*2+i*.13)%1.6,spread=.15+age*.4;ctx.beginPath();ctx.arc(-.7-age*(1.8+foam),Math.sin(i*2.4)*spread,.07+age*.09,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(-.6,0);ctx.quadraticCurveTo(-1.5,-.5*foam,-2.8-foam,-.25);ctx.stroke();}
  if(b.spec.propulsion==='inboard'){ctx.save();ctx.translate(-.65,0);ctx.rotate(-b.actualSteer);ctx.strokeStyle='#b4c7b7';ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(-.4,0);ctx.lineTo(.15,0);ctx.stroke();ctx.restore();}if(b.enginesRaised){ctx.strokeStyle='#d2a44f';ctx.beginPath();ctx.moveTo(-.6,-.3);ctx.lineTo(.1,.3);ctx.stroke();}ctx.restore();
 }
 for(const [end,x] of [['bow',2.05],['stern',-2.05]]){const power=b.thrusters[end+'Actual'];if(Math.abs(power)<.05)continue;ctx.strokeStyle='#f8fff0';ctx.lineWidth=.13;const dir=-Math.sign(power);for(let i=0;i<4;i++){const d=(i+(b.time*4)%1)*.28;ctx.beginPath();ctx.moveTo(x-.15,dir*(1.05+d));ctx.lineTo(x+.15,dir*(1.05+d));ctx.stroke();}}
 if(b.fenders)for(const f of FENDERS){const x=f.x*5.5,y=f.y*2.1,paint=impactPaint(b,f.id,true);ctx.fillStyle=paint.color??'#e8ae67';ctx.beginPath();ctx.roundRect(x-.2,y-.13,.4,.26,.12);ctx.fill();ctx.strokeStyle=paint.flash>0?paint.color:'#a4773f';ctx.lineWidth=paint.flash>0?.12:.045;ctx.stroke();}
 ctx.strokeStyle='#5c8a88';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-2,Math.sin(b.roll)*3);ctx.lineTo(1.5,Math.sin(b.roll)*3);ctx.stroke();ctx.fillStyle='#d5a64f';for(const end of Object.keys(CLEATS)){const p=cleatLocal(b.spec,end);ctx.beginPath();ctx.arc(p.x*5.5/b.spec.length,p.y*2.1/b.spec.beam,.08,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function renderMinimap(canvas,b,view){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=mapProjection(w,h),scale=p.scale;
 c.clearRect(0,0,w,h);c.fillStyle='#aec59b';c.fillRect(0,0,w,h);c.save();c.translate(p.x,p.y);c.scale(scale,scale);c.translate(-WORLD.left,-WORLD.top);drawTerrain(c);
 c.lineWidth=1/scale;for(const q of BRIDGES){c.strokeStyle=q.dam?'#8e785d':'#789385';c.beginPath();c.moveTo(q.a.x,q.a.y);c.lineTo(q.b.x,q.b.y);c.stroke();}
 c.fillStyle='#607e65';for(const q of [{x:80,y:15},...REMOTE_HARBORS]){c.fillRect(q.x-2/scale,q.y-2/scale,4/scale,4/scale);}
 c.fillStyle='#c39d4b';c.beginPath();c.arc(FUEL_STATION.x,FUEL_STATION.y,3/scale,0,Math.PI*2);c.fill();
 c.strokeStyle='#6b8f7a';c.lineWidth=1/scale;c.strokeRect(view.bounds.left,view.bounds.top,view.bounds.right-view.bounds.left,view.bounds.bottom-view.bounds.top);
 c.save();c.translate(b.x,b.y);c.rotate(b.a);c.fillStyle='#b96f3d';c.beginPath();c.moveTo(5/scale,0);c.lineTo(-3/scale,-2.5/scale);c.lineTo(-3/scale,2.5/scale);c.closePath();c.fill();c.restore();c.restore();
}
