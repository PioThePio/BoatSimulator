import {LAKE,REEDS,FUEL_STATION,FUEL_FENDERS,SERVICE_STATION,BUILDINGS,WORLD,ISLAND,ISLANDS,BRIDGES,REMOTE_HARBORS,MAP_LABELS,DOCKS,BOLLARDS,BEACHES,islandOutline,islandRadius,shoreAt,bottomAt,environment,waveHeight,reflectionFacesNear,clamp} from './world.js';
import {waterMotionSamples} from './boat-effects.js';
import {drawParking,drawTowRig} from './render-towing.js';
import {drawHullWake,drawReflectedWake} from './wake.js';
import {mooringPoint} from './marina.js';
import {FENDERS,HULL_SECTIONS,impactPaint} from './impacts.js';
import {point,cleat,cleatLocal,CLEATS} from './rigging.js';
import {towView,minimapProjection} from './camera.js';
import {placeMapLabels} from './map-labels.js';
import {mirrorVector} from './wave-reflections.js';
export {vehicleLookAhead,minimapProjection} from './camera.js';
function drawTerrain(ctx){
 ctx.fillStyle='#aec59b';ctx.fillRect(WORLD.left,WORLD.top,WORLD.right-WORLD.left,WORLD.bottom-WORLD.top);
 for(const q of BEACHES){ctx.beginPath();ctx.ellipse(q.x,q.y,q.r,q.r*.75,0,0,Math.PI*2);ctx.fillStyle='#e0ce9f';ctx.fill();}
 path(ctx,LAKE);ctx.fillStyle='#8bb5c0';ctx.fill();ctx.save();ctx.clip();
 for(const [width,color]of [[180,'#92bdc5'],[70,'#a0c8cb'],[22,'#afd0ce'],[4,'#bfd9d1']]){path(ctx,LAKE);ctx.lineJoin='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
 const harbour=ctx.createRadialGradient(78,28,15,78,28,95);harbour.addColorStop(0,'#7dabb750');harbour.addColorStop(1,'#7dabb700');ctx.fillStyle=harbour;ctx.beginPath();ctx.ellipse(78,28,95,60,0,0,Math.PI*2);ctx.fill();
 for(const q of ISLANDS){path(ctx,islandOutline(10,q));ctx.fillStyle='#afd0ce';ctx.fill();path(ctx,islandOutline(0,q));ctx.fillStyle='#e0ce9f';ctx.fill();path(ctx,islandOutline(-4,q));ctx.fillStyle='#9bb58a';ctx.fill();}
 ctx.restore();
}
export function mapProjection(width,height){const scale=Math.min(width/(WORLD.right-WORLD.left),height/(WORLD.bottom-WORLD.top));return{scale,x:(width-(WORLD.right-WORLD.left)*scale)/2,y:(height-(WORLD.bottom-WORLD.top)*scale)/2};}
function drawBridges(ctx,scale){
 for(const q of BRIDGES){
  ctx.strokeStyle=q.dam?'#8b978b':'#a3aaa0';ctx.lineWidth=q.width;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(q.a.x,q.a.y);ctx.lineTo(q.b.x,q.b.y);ctx.stroke();
  ctx.strokeStyle='#e9ebd8';ctx.lineWidth=.35;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
  for(const t of q.piers){const x=q.a.x+(q.b.x-q.a.x)*t,y=q.a.y+(q.b.y-q.a.y)*t;ctx.fillStyle='#617b73';ctx.fillRect(x-2.2,y-3.5,4.4,7);}
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
export function propSurfaceIntensity(b,en){
 if(b.spec.air||en.key!=='running'||!en.gear||en.immersion<=.01||b.sunken)return 0;
 return clamp(((en.burst??0)*.85+clamp((en.opposingFlow??0)/3,0,1)*en.n**2+propFoamIntensity(en)) * Math.min(1,en.immersion*2),0,1.5);
}
export function coolingWaterIntensity(b,en){
 return b.spec.air||en.key!=='running'||b.sunken||en.immersion<=.01?0:clamp(en.cooling??0,0,1);
}
// Draw water before the hull: reverse wash passes beneath it, emerging alongside.
function drawDriveWater(ctx,b){
 if(b.spec.air)return;
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);
 for(const [index,en]of b.engines.entries()){
  const cool=coolingWaterIntensity(b,en),side=index%2?-1:1;
  if(cool){const x=-b.spec.length*.30,y=side*b.spec.beam*.46;ctx.strokeStyle='#dff6edbb';ctx.lineWidth=.035+.025*cool;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-.15,side*(b.spec.beam*.5+.20),x-.3,side*(b.spec.beam*.5+.30));ctx.stroke();const pulse=(b.time*2.3+index*.31)%1;ctx.strokeStyle='#eef9e580';ctx.lineWidth=.025;ctx.beginPath();ctx.ellipse(x-.3,side*(b.spec.beam*.5+.30),.05+pulse*.16,.025+pulse*.08,0,0,Math.PI*2);ctx.stroke();}
  if(en.key!=='running'||!en.gear||en.immersion<=.01||b.sunken)continue;
  ctx.save();ctx.translate(b.spec.engineLever,en.y);ctx.rotate(b.spec.propulsion==='inboard'?0:-b.actualSteer);
  const direction=en.gear>0?-1:1,reverse=en.gear<0,power=clamp(Math.abs(en.thrust)/3500,0,1),foam=propSurfaceIntensity(b,en);
  // Attached, ordinary prop wash is a smooth moving ribbon, not bubble circles.
  if(Math.abs(en.thrust)>5){ctx.strokeStyle=`rgba(235,250,242,${.12+.35*power})`;ctx.lineWidth=.05+.07*power;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,side*.12);ctx.bezierCurveTo(direction*.5,side*(.13+.06*Math.sin(b.time*5)),direction*(.7+power),side*(reverse?b.spec.beam*.65:.22),direction*(1.1+2*power),side*(reverse?b.spec.beam*.68:.26+power*.18));ctx.stroke();}}
  if(foam>.03){ctx.strokeStyle=`rgba(255,255,245,${Math.min(.85,.25+foam*.4)})`;ctx.lineWidth=.045+.025*foam;for(let i=0;i<Math.ceil(foam*15);i++){const age=(b.time*(1.2+power)+i*.137)%1,spread=.08+age*.45;ctx.beginPath();ctx.ellipse(direction*(.12+age*(.9+power*2)),reverse?(i%2?1:-1)*(.12+b.spec.beam*.62*(1-Math.exp(-age*6))):Math.sin(i*2.4)*spread,.03+age*.09,.025+age*.05,0,0,Math.PI*2);ctx.stroke();}}
  ctx.restore();
 }ctx.restore();
}
function drawDeckWater(ctx,b){
 const level=b.bilge?.level??0;if(level<.08)return;
 ctx.save();ctx.beginPath();ctx.moveTo(2.75,0);ctx.bezierCurveTo(1.8,-1.05,-.5,-1.15,-2.75,-.95);ctx.lineTo(-2.75,.95);ctx.bezierCurveTo(-.5,1.15,1.8,1.05,2.75,0);ctx.clip();
 const submerged=b.submersion??0;ctx.fillStyle=`rgba(69,145,165,${.22+.55*submerged})`;ctx.fillRect(-2.8,-1.15,5.6*clamp(level*1.25,0,1),2.3);
 ctx.strokeStyle='#d7f0e6bb';ctx.lineWidth=.04;for(let i=0;i<6;i++){const x=-2.5+i*.78,y=Math.sin(b.time*1.7+i)*.13;ctx.beginPath();ctx.moveTo(x,-.5+y);ctx.quadraticCurveTo(x+.2,-.7-y,x+.4,-.5+y);ctx.stroke();}ctx.restore();
}
function drawPositionMarker(ctx,b,view,width,height,label=true){
 const x=width/2+(b.x-view.camera.x)*view.scale,y=height/2+(b.y-view.camera.y)*view.scale;
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#f5f7e9ee';ctx.strokeStyle='#c3682d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,label?10:6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.rotate(b.a);ctx.fillStyle='#b55d27';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
}
function drawMapNames(ctx,state,view){
 const {width,height,overview,boat:b}=state,project=q=>({x:width/2+(q.x-view.camera.x)*view.scale,y:height/2+(q.y-view.camera.y)*view.scale});
 const names=MAP_LABELS.map(q=>({...project(q),text:q.name,priority:1}));
 for(const q of BRIDGES)names.push({...project({x:(q.a.x+q.b.x)/2,y:(q.a.y+q.b.y)/2}),text:q.name,priority:2});
 names.push({...project({x:124,y:22}),text:overview?'Port główny · slip':'Slip · serwis',priority:4},{...project(FUEL_STATION),text:'⛽ Paliwo',priority:3});
 if(overview)names.push({...project(b),text:'TWOJA ŁÓDŹ',priority:10});
 if(Number.isInteger(state.selected)){const q=mooringPoint(b,state.selected);if(!q.trailer)names.push({...project(q),text:q.id,priority:9});}
 const blocked=state.labelBlocked??[{x:0,y:0,w:width,h:100},{x:width-130,y:85,w:130,h:115},...(!overview?[{x:0,y:height-185,w:205,h:185},{x:width-145,y:height-145,w:145,h:145}]:[])];
 ctx.save();ctx.font='10px system-ui';ctx.textBaseline='top';
 for(const q of placeMapLabels(names,t=>ctx.measureText(t).width,width,height,blocked)){
  ctx.fillStyle=q.priority>=3?'#f4f6e6ee':'#eff3e4b5';ctx.beginPath();ctx.roundRect(q.x,q.y,q.w,q.h,3);ctx.fill();ctx.fillStyle=q.priority===10?'#a55628':'#476b5b';ctx.fillText(q.text,q.x+4,q.y+2);
 }ctx.restore();
}
function drawSurfaceFlow(ctx,b,e,bounds,scale){
 const flow=environment(b.time,e,b.x,b.y),wind=Math.hypot(flow.wind.x,flow.wind.y),current=Math.hypot(flow.current.x,flow.current.y),spacing=Math.max(12,70/scale);
 if(wind<2&&current<.03)return;
 for(let y=Math.floor(bounds.top/spacing)*spacing;y<bounds.bottom;y+=spacing)for(let x=Math.floor(bounds.left/spacing)*spacing;x<bounds.right;x+=spacing){
  const seed=(Math.sin(x*17.23+y*51.71)*43758.5)%1,age=(b.time*.12+Math.abs(seed)*7)%7;
  if(wind>2){const nx=flow.wind.x/wind,ny=flow.wind.y/wind,px=x+nx*age*2,py=y+ny*age*2;if(!shoreAt(px,py).land){const length=.5+wind*.11;ctx.strokeStyle=`rgba(237,247,237,${clamp((wind-2)/24,0,.38)})`;ctx.lineWidth=.04+wind*.006;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+nx*length*.6-ny*.15,py+ny*length*.6+nx*.15,px+nx*length,py+ny*length);ctx.stroke();}}
  if(current>.03){const a=(b.time+Math.abs(seed)*14)%14,px=x+flow.current.x*a,py=y+flow.current.y*a;if(shoreAt(px,py).land)continue;ctx.strokeStyle='#cdebe7bb';ctx.lineWidth=.10;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-flow.current.x*.6,py-flow.current.y*.6);ctx.stroke();ctx.beginPath();ctx.arc(px,py,.06+.08*current,0,Math.PI*2);ctx.stroke();}
 }
}
function drawReflectedWeather(ctx,b,e,faces){
 const H=waveHeight(e,b.time);if(H<=0)return;
 const a=(e.waveDirection??e.windDirection??90)*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)},omega=2*Math.PI/2.8;
 let k=omega*omega/9.81;for(let i=0;i<5;i++)k=omega*omega/(9.81*Math.tanh(k*3));
 for(const f of faces){
  const incident=n.x*f.nx+n.y*f.ny;if(incident>=-.08)continue;
  const r=mirrorVector(n,f),dx=f.b.x-f.a.x,dy=f.b.y-f.a.y,length=Math.hypot(dx,dy);
  for(let along=1;along<length;along+=3){
   const x=f.a.x+dx*along/length,y=f.a.y+dy*along/length,phase=k*(x*n.x+y*n.y)-omega*b.time;
   const first=Math.ceil(phase/(2*Math.PI));
   for(let crest=first;crest<first+3;crest++){
    const d=(crest*2*Math.PI-phase)/(-k*incident);if(d>18)continue;
    const px=x+f.nx*d,py=y+f.ny*d;if(bottomAt(px,py).depth<=0)continue;
    ctx.strokeStyle=`rgba(235,251,240,${Math.min(.45,H*f.coefficient*2)*Math.exp(-d/30)})`;ctx.lineWidth=.08;
    ctx.beginPath();ctx.moveTo(px-r.y*.8,py+r.x*.8);ctx.quadraticCurveTo(px+.08*r.x,py+.08*r.y,px+r.y*.8,py-r.x*.8);ctx.stroke();
   }
  }
 }
}
export function renderWorld(ctx,state){
 const {boat:b,env,width,height,zoom,follow,overview,manualCenter,selected}=state;
 const focus=state.focus??b,base=Math.min(width/140,height/80);
 const rigView=state.focus&&state.towRig?towView(state.towRig,b,width,height,base*zoom):null;
 const scale=overview?Math.min((width-30)/(WORLD.right-WORLD.left),(height-30)/(WORLD.bottom-WORLD.top)):rigView?.scale??base*zoom*(focus.cameraZoom??1);
 const halfX=width/(2*scale),halfY=height/(2*scale);
 const middle={x:(WORLD.left+WORLD.right)/2,y:(WORLD.top+WORLD.bottom)/2};
 const track=p=>({x:2*halfX>WORLD.right-WORLD.left?middle.x:clamp(p.x,WORLD.left+halfX,WORLD.right-halfX),y:2*halfY>WORLD.bottom-WORLD.top?middle.y:clamp(p.y,WORLD.top+halfY,WORLD.bottom-halfY)});
 const tracked=track(b),ref=state.centerReference??b,refTracked=track(ref),blend=Math.exp(-Math.hypot(b.x-ref.x,b.y-ref.y)/16);
 const initialOffset={x:(ref.x-refTracked.x)*blend,y:(ref.y-refTracked.y)*blend};
 const camera=overview?middle:!follow&&manualCenter?{...manualCenter}:rigView?rigView.camera:{x:tracked.x+initialOffset.x,y:tracked.y+initialOffset.y};
 if(state.screenShift)camera.x=b.x+state.screenShift/scale;
 const bounds={left:camera.x-width/(2*scale),right:camera.x+width/(2*scale),top:camera.y-height/(2*scale),bottom:camera.y+height/(2*scale)};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#aec59b';ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 const visible=(x,y,pad=4)=>x>bounds.left-pad&&x<bounds.right+pad&&y>bounds.top-pad&&y<bounds.bottom+pad;
 drawTerrain(ctx);
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
 if(b.wake.length){drawHullWake(ctx,b.wake,b.time);drawReflectedWake(ctx,b.wake,b.time,reflectionFacesNear(camera.x,camera.y));}
 if(!overview)drawSurfaceFlow(ctx,b,env,bounds,scale);
 if(!overview)drawReflectedWeather(ctx,b,env,reflectionFacesNear(camera.x,camera.y,40));
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
 if(overview){ctx.fillStyle='#d0a14a';for(const q of REMOTE_HARBORS){ctx.beginPath();ctx.arc(q.x,q.y,3/scale,0,Math.PI*2);ctx.fill();}}
 ctx.fillStyle='#93692c';ctx.fillRect(FUEL_STATION.pumpX-.45,FUEL_STATION.pumpY-.55,.9,1.1);ctx.font='1.1px system-ui';ctx.fillText('⛽',FUEL_STATION.pumpX-.5,FUEL_STATION.pumpY-1);ctx.fillStyle='#d5bf75';ctx.fillRect(FUEL_STATION.x-.45,FUEL_STATION.alongMin,.4,FUEL_STATION.alongMax-FUEL_STATION.alongMin);ctx.save();ctx.translate(FUEL_STATION.x-1.3,FUEL_STATION.y+5);ctx.rotate(-Math.PI/2);ctx.font='bold .9px system-ui';ctx.fillStyle='#72613d';ctx.fillText('PALIWO · CUMUJ BURTĄ',0,0);ctx.restore();

 for(const f of FUEL_FENDERS){const hit=b.lastImpact?.target===f.id&&b.time-b.lastImpact.time<1.6;ctx.fillStyle=hit?'#e2b66b':'#3b5751';ctx.beginPath();ctx.roundRect(f.x,f.y,f.w,f.h,.10);ctx.fill();}
 for(let index=0;index<BOLLARDS.length;index++){const q=mooringPoint(b,index),isSelected=index===selected;if(!visible(q.x,q.y)||q.trailer&&b.towRig?.postBroken)continue;
  if(q.kind==='tree'){ctx.fillStyle='#7b6a47';ctx.beginPath();ctx.arc(q.x,q.y,.32,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7f9d70';for(const [dx,dy,r]of [[-.7,-.7,.85],[.7,-.5,.9],[0,.6,1]]){ctx.beginPath();ctx.arc(q.x+dx,q.y+dy,r,0,Math.PI*2);ctx.fill();}}
  ctx.beginPath();ctx.arc(q.x,q.y,q.kind==='buoy'?.45:isSelected?.34:.22,0,Math.PI*2);ctx.fillStyle=isSelected?'#bd7541':'#d3a34b';ctx.fill();ctx.strokeStyle='#7b6943';ctx.lineWidth=.07;ctx.stroke();
 }
 // Point velocities relative to local water drive every hull ripple.
 if(previousBoat!==b){wake=[];lastWake=b.time;previousBoat=b;}
 const samples=waterMotionSamples(b,env);
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
 drawBridges(ctx,scale);
 const bow=cleat(b,'bow');ctx.fillStyle='#cfb56d';ctx.beginPath();ctx.arc(bow.x,bow.y,.22,0,Math.PI*2);ctx.fill();
 ctx.restore();
 const metres=overview?1000:scale<1?100:5;ctx.strokeStyle='#4f756d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(22,height-52);ctx.lineTo(22+metres*scale,height-52);ctx.moveTo(22,height-56);ctx.lineTo(22,height-49);ctx.moveTo(22+metres*scale,height-56);ctx.lineTo(22+metres*scale,height-49);ctx.stroke();ctx.fillStyle='#4f756d';ctx.font='10px system-ui';ctx.fillText(metres+' m',24,height-60);
 const result={scale,camera,bounds};drawMapNames(ctx,state,result);if(overview)drawPositionMarker(ctx,b,result,width,height);return result;
}
function drawBoat(ctx,b){
 drawDriveWater(ctx,b);
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(b.spec.length/5.5,b.spec.beam/2.1*Math.cos(b.roll));ctx.globalAlpha*=1-.7*(b.submersion??0);
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
  // The separate, visible rudder belongs only to a fixed shaft drive.
  if(b.spec.propulsion==='inboard'){ctx.save();ctx.translate(-2.9,engine.y*2.1/b.spec.beam);ctx.rotate(-b.actualSteer);ctx.fillStyle='#477e83';ctx.strokeStyle='#eff6dc';ctx.lineWidth=.055;ctx.beginPath();ctx.roundRect(-.40,-.12,.62,.24,.06);ctx.fill();ctx.stroke();ctx.restore();}
 }
 for(const [end,x] of [['bow',2.05],['stern',-2.05]]){const power=b.thrusters[end+'Actual'];if(Math.abs(power)<.05)continue;ctx.strokeStyle='#f8fff0';ctx.lineWidth=.13;const dir=-Math.sign(power);for(let i=0;i<4;i++){const d=(i+(b.time*4)%1)*.28;ctx.beginPath();ctx.moveTo(x-.15,dir*(1.05+d));ctx.lineTo(x+.15,dir*(1.05+d));ctx.stroke();}}
 if(b.fenders)for(const f of FENDERS){const x=f.x*5.5,y=f.y*2.1,paint=impactPaint(b,f.id,true);ctx.fillStyle=paint.color??'#e8ae67';ctx.beginPath();ctx.roundRect(x-.2,y-.13,.4,.26,.12);ctx.fill();ctx.strokeStyle=paint.flash>0?paint.color:'#a4773f';ctx.lineWidth=paint.flash>0?.12:.045;ctx.stroke();}
 drawDeckWater(ctx,b);
 ctx.strokeStyle='#5c8a88';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-2,Math.sin(b.roll)*3);ctx.lineTo(1.5,Math.sin(b.roll)*3);ctx.stroke();ctx.fillStyle='#d5a64f';for(const end of Object.keys(CLEATS)){const p=cleatLocal(b.spec,end);ctx.beginPath();ctx.arc(p.x*5.5/b.spec.length,p.y*2.1/b.spec.beam,.08,0,Math.PI*2);ctx.fill();}ctx.restore();
}
export function renderMinimap(canvas,b,view){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=minimapProjection(w,h,b),scale=p.scale;
 c.clearRect(0,0,w,h);c.fillStyle='#aec59b';c.fillRect(0,0,w,h);c.save();c.scale(scale,scale);c.translate(-p.left,-p.top);drawTerrain(c);
 c.lineWidth=1/scale;for(const q of BRIDGES){c.strokeStyle=q.dam?'#8e785d':'#789385';c.beginPath();c.moveTo(q.a.x,q.a.y);c.lineTo(q.b.x,q.b.y);c.stroke();}
 c.fillStyle='#607e65';for(const q of [{x:80,y:15},...REMOTE_HARBORS])c.fillRect(q.x-2/scale,q.y-2/scale,4/scale,4/scale);
 c.fillStyle='#c39d4b';c.beginPath();c.arc(FUEL_STATION.x,FUEL_STATION.y,3/scale,0,Math.PI*2);c.fill();
 c.strokeStyle='#f5f7df';c.lineWidth=1.2/scale;c.strokeRect(view.bounds.left,view.bounds.top,view.bounds.right-view.bounds.left,view.bounds.bottom-view.bounds.top);
 c.restore();drawPositionMarker(c,b,{scale,camera:{x:p.left+w/scale/2,y:p.top+h/scale/2}},w,h,false);c.font='12px system-ui';c.fillStyle='#355f5a';c.fillText('OKOLICA · 3,5 km',7,h-7);return p;
}
