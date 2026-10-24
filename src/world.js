import {makeNavigationMarks,hazardBottom} from './navigation-marks.js';
import {euzebiaBeachWeight,euzebiaSlope} from './island-approach.js';
import {ZEGRZE_BOUNDS,ZEGRZE_SHORE,ZEGRZE_ISLANDS,BRIDGES,REMOTE_HARBORS,FUEL_LOCATION,MAP_LABELS,fromAtlas,WORLD_DISTANCE_SCALE} from './zegrze.js';
import {createShoreQuery} from './shore-geometry.js';
import {weatherAt} from './weather.js';
import {mirrorPoint,mirrorVector,wallDistance} from './wave-reflections.js';
import {EUZEBIA,createPilawaSite} from './lake-sites.js';
export {weatherAt} from './weather.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export {BRIDGES,REMOTE_HARBORS,MAP_LABELS,fromGeo,toGeo,METRES_PER_MAP_PIXEL} from './zegrze.js';
export const WORLD=ZEGRZE_BOUNDS,LAKE=ZEGRZE_SHORE,ISLAND=ZEGRZE_ISLANDS[0],ISLANDS=[...ZEGRZE_ISLANDS];
const islandQueries=new Map();
const lakeQuery=createShoreQuery(LAKE);
export function islandRadius(a,q=ISLAND){return(1+.075*Math.sin(3*a)+.035*Math.cos(5*a))/Math.hypot(Math.cos(a)/q.rx,Math.sin(a)/q.ry);}
export function islandOutline(padding=0,q=ISLAND){if(q.outline)return q.outline.map(p=>{const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);return{x:p.x+padding*dx/d,y:p.y+padding*dy/d};});return Array.from({length:80},(_,i)=>{const a=i*Math.PI/40,r=islandRadius(a,q)+padding;return{x:q.x+Math.cos(a)*r,y:q.y+Math.sin(a)*r};});}
const rz=fromAtlas(951,576);
export function canalAt(x){return{y:rz.y-(x-rz.x)*.08,slope:-.08,halfWidth:28*WORLD_DISTANCE_SCALE};}
// Original small marina, extended along the same shore with two extra piers.
export const DOCKS=[{x:6,y:10,w:23,h:2.8},{x:17,y:12.8,w:2.8,h:17},{x:29,y:10,w:2.8,h:16},
 {x:31.8,y:10,w:78.2,h:2.8},{x:49,y:12.8,w:2.8,h:20},{x:70,y:12.8,w:2.8,h:24},
 {x:4,y:190,w:14,h:1.5},{x:17,y:185,w:1.4,h:13},{x:328,y:260,w:1.6,h:25},{x:328,y:283.5,w:15,h:1.6},
 {x:110,y:10,w:9.5,h:2.8,service:true},{x:118,y:12.8,w:1.5,h:18.2,service:true},{x:130.5,y:7,w:1.5,h:33,service:true}];
// These four legacy piers belonged to the old fictional lake. Anchor their
// rigid assemblies to the actual beach/island, never scale their dimensions.
const beachPierBank=lakeQuery(...Object.values(fromAtlas(525,881)));
Object.assign(DOCKS[6],{x:beachPierBank.qx-1,y:beachPierBank.qy-12,name:'Pomost plażowy',site:'beach'});
Object.assign(DOCKS[7],{x:beachPierBank.qx-1,y:beachPierBank.qy-12,site:'beach'});
const islandPierBank={x:ISLAND.x,y:ISLAND.y+islandRadius(Math.PI/2)};
Object.assign(DOCKS[8],{x:islandPierBank.x-.8,y:islandPierBank.y-1,name:'Pomost przy wyspie',site:'island'});
Object.assign(DOCKS[9],{x:islandPierBank.x-.8,y:islandPierBank.y+22.5,site:'island'});
export const SERVICE_STATION={x:132,y:14,w:14,h:25,slip:{x:121,y:-8,w:7,h:44,waterY:7.5,angle:8},start:{x:134,y:24,a:-Math.PI/2}};
export const PARKING={x:101,y:-48,w:64,h:40};
export const SERVICE_BAYS=[{id:1,x:141,y:-44,w:8,h:30},{id:2,x:152,y:-44,w:8,h:30}];
export const PARKING_SPACES=[104,110,116,131,136].map(x=>({x,y:-45,w:4.7,h:15}));
export const SAND_PRACTICE={x:174,y:-43,w:16,h:29};
export function setSlipAngle(value){SERVICE_STATION.slip.angle=clamp(Number(value)||8,4,18);}
export function slipDepth(x,y){const r=SERVICE_STATION.slip;return(y-r.waterY)*Math.tan(r.angle*Math.PI/180);}
export const BUILDINGS=[{x:12,y:-5,w:8,h:6,roof:'#b28365'},{x:35,y:-4,w:7,h:6,roof:'#a18c72'},{x:53,y:-5,w:8,h:7,roof:'#b38c6c'},{x:76,y:-5,w:9,h:6,roof:'#8e9d8a'},{x:142,y:-3,w:13,h:7,roof:'#839a92',service:true}];
// Keep each building fully on land after geographic compression.
for(const house of BUILDINGS)for(let i=0;i<8;i++){const points=[[0,0],[house.w,0],[0,house.h],[house.w,house.h]].map(([dx,dy])=>lakeQuery(house.x+dx,house.y+dy)),worst=points.reduce((a,b)=>a.distance>b.distance?a:b);if(worst.distance<-.5)break;house.x-=worst.nx*(worst.distance+.6);house.y-=worst.ny*(worst.distance+.6);}
// Floating fingers: 25 cm beam, triangular brace only at the hinge, 5 m spacing.
export const YBOOMS=Array.from({length:6},(_,i)=>({id:i,x1:76+i*5,y1:12.8,x2:76+i*5,y2:22.8,width:.25,length:10,a:Math.PI/2}));
export const BUOY_SLIPS=[35.5,41,46.5].map((x,i)=>({x,y:26,id:`B${i+1}`}));
for(const q of REMOTE_HARBORS){const bank=lakeQuery(q.x,q.y);q.x=bank.qx;q.y=bank.qy;}
const harborDocks=REMOTE_HARBORS.map(q=>q.direction==='east'?{x:q.x-2,y:q.y,w:q.length,h:1.8}:q.direction==='west'?{x:q.x-q.length+2,y:q.y,w:q.length,h:1.8}:q.direction==='south'?{x:q.x,y:q.y-2,w:1.8,h:q.length}:{x:q.x,y:q.y-q.length+2,w:1.8,h:q.length});
DOCKS.push(...harborDocks);
const fuelPier={x:FUEL_LOCATION.x-48,y:FUEL_LOCATION.y-8,w:2.8,h:30};DOCKS.push(fuelPier,{x:fuelPier.x+fuelPier.w,y:fuelPier.y,w:48,h:1.6});
// Physical access paths for the main quay and separate east service finger.
DOCKS.push({x:80,y:3.5,w:1.8,h:7,access:true},{x:130.5,y:3.5,w:1.5,h:4,service:true,access:true});
export const FUEL_STATION={x:fuelPier.x+fuelPier.w,y:fuelPier.y+16,pumpX:fuelPier.x+1.4,pumpY:fuelPier.y+14,alongMin:fuelPier.y+4,alongMax:fuelPier.y+28,maxGap:1.4};
export const FUEL_FENDERS=Array.from({length:5},(_,id)=>({x:FUEL_STATION.x,y:FUEL_STATION.alongMin+1+id*4.5,w:.22,h:.7,fender:true,id:'fuel-fender-'+id}));
export const BRIDGE_SOLIDS=BRIDGES.flatMap(q=>q.dam?[{id:q.id,x:Math.min(q.a.x,q.b.x)-q.width/2,y:Math.min(q.a.y,q.b.y),w:Math.max(q.width,Math.abs(q.b.x-q.a.x)),h:Math.max(q.width,Math.abs(q.b.y-q.a.y))}]:q.piers.map((t,i)=>({id:q.id+'-pier-'+i,x:q.a.x+(q.b.x-q.a.x)*t-2.2,y:q.a.y+(q.b.y-q.a.y)*t-3.5,w:4.4,h:7})));
export const SOLIDS=[...DOCKS,...FUEL_FENDERS,...BUILDINGS,...BRIDGE_SOLIDS,
 {x:WORLD.left-24,y:WORLD.top-24,w:WORLD.right-WORLD.left+48,h:12},{x:WORLD.left-24,y:WORLD.top-12,w:12,h:WORLD.bottom-WORLD.top+48},{x:WORLD.left-12,y:WORLD.bottom+12,w:WORLD.right-WORLD.left+36,h:12},{x:WORLD.right+12,y:WORLD.top-12,w:12,h:WORLD.bottom-WORLD.top+48}];
export const BEACHES=[{...fromAtlas(525,881),r:145*WORLD_DISTANCE_SCALE,name:'Dzika Plaża · Nieporęt'},{...fromAtlas(345,609),r:180*WORLD_DISTANCE_SCALE,name:'Plaża Wieliszew'},{...fromAtlas(764,858),r:120*WORLD_DISTANCE_SCALE,name:'Białobrzegi'}];
export const REEDS=[{x:fromAtlas(954,371).x-20,y:fromAtlas(954,371).y-10,r:85},{...fromAtlas(991,568),r:40},{...fromAtlas(650,1005),r:20},{...fromAtlas(1080,250),r:40}];
export const SHOALS=[{...fromAtlas(1005,225),rx:95*WORLD_DISTANCE_SCALE,ry:55*WORLD_DISTANCE_SCALE,drop:4.5},{...fromAtlas(894,577),rx:55*WORLD_DISTANCE_SCALE,ry:26*WORLD_DISTANCE_SCALE,drop:4.6},{...fromAtlas(1160,245),rx:120*WORLD_DISTANCE_SCALE,ry:38*WORLD_DISTANCE_SCALE,drop:4.4}];
const islandTree=a=>{const r=islandRadius(a)-1.2;return{x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r};};
const docksPoints=DOCKS.filter((d,i)=>i>=3&&!d.service).flatMap((d,i)=>d.w>d.h?Array.from({length:Math.max(2,Math.floor(d.w/6))},(_,j)=>({x:d.x+1+j*(d.w-2)/Math.max(1,Math.floor(d.w/6)-1),y:d.y+d.h})):Array.from({length:Math.max(2,Math.floor(d.h/6))},(_,j)=>({x:d.x+d.w,y:d.y+1+j*(d.h-2)/Math.max(1,Math.floor(d.h/6)-1)})));
export const BOLLARDS=[...[[12,12.8],[17,18],[17,25],[19.8,28],[29,17],[29,23],[25,12.8]].map(([x,y],i)=>({x,y,kind:'bollard',id:`P${i+1}`,label:`Poler ${i+1}`})),
 ...[{x:BEACHES[0].x-.3,y:BEACHES[0].y+.5},{x:BEACHES[0].x+29.7,y:BEACHES[0].y+.5},{x:132,y:1},{x:165,y:1},islandTree(1.0),islandTree(1.65),{x:BEACHES[2].x+4,y:BEACHES[2].y},{x:BEACHES[1].x,y:BEACHES[1].y+4}].map((p,i)=>({...p,kind:'tree',id:`D${i+1}`,label:`Drzewo ${i+1}`})),
 ...docksPoints.map((p,i)=>({...p,kind:'bollard',id:`P${i+8}`,label:`Poler ${i+8}`})),
 ...[16,22,28].flatMap((y,i)=>[119.5,130.5].map((x,j)=>({x,y,kind:'bollard',id:`R${i+1}${j?'P':'L'}`,label:`Serwis · poler ${i+1} ${j?'P':'L'}`}))),
 ...BUOY_SLIPS.flatMap((q,i)=>[-1,1].map(side=>({x:q.x+side*1.2,y:12.8,kind:'bollard',id:`S${i+1}${side<0?'L':'P'}`,label:`Stanowisko ${i+1} · ${side<0?'lewa':'prawa'} knaga`}))),
 ...YBOOMS.flatMap((q,i)=>[.22,.92].map(fraction=>({x:q.x1,y:q.y1+q.length*fraction,boom:i,fraction,kind:'bollard',id:`Y${i+1}${fraction<.5?'A':'B'}`,label:`Y-bom ${i+1} · ${fraction<.5?'nasada':'koniec'}`}))),
 ...[...BUOY_SLIPS,{x:64,y:38,id:'B4'}].map(q=>({...q,kind:'buoy',label:`Boja ${q.id.slice(1)}`})),
 {x:124.5,y:-19,kind:'bollard',id:'PRZ',trailer:true,label:'Przyczepa · poler dziobowy'}];
for(const tree of BOLLARDS.filter(q=>q.kind==='tree')){for(let i=0;i<4;i++){const s=shoreAt(tree.x,tree.y);if(s.distance< -1.4)break;tree.x-=s.nx*(s.distance+1.45);tree.y-=s.ny*(s.distance+1.45);}}
export const TRAFFIC=[{id:0,type:'motor',x:35.5,y:18.8,a:Math.PI/2,length:5.2,beam:2.1,mass:1100,ties:[['portStern','S1P'],['starboardStern','S1L'],['bow','B1']]},
 {id:1,type:'sail',x:88.5,y:18.3,a:Math.PI/2,length:7.8,beam:2.3,mass:2600,ties:[['portStern','Y4A'],['starboardStern','Y3A'],['portBow','Y4B'],['starboardBow','Y3B']]},
 {id:2,type:'pwc',x:98.5,y:16.7,a:Math.PI/2,length:3.2,beam:1.2,mass:380,ties:[['portStern','Y6A'],['starboardStern','Y5A'],['portBow','Y6B'],['starboardBow','Y5B']]}];
export const polygonShore=lakeQuery;
export function shoreAt(x,y){
 const lake=lakeQuery(x,y);let best={distance:lake.distance,nx:lake.nx,ny:lake.ny,qx:lake.qx,qy:lake.qy,edge:'lake',along:0};
 for(const q of ISLANDS){
  if(q.outline){const box=q.bounds,dx=Math.max(box.left-x,0,x-box.right),dy=Math.max(box.top-y,0,y-box.bottom);if((dx||dy)&&(best.distance<=0||Math.hypot(dx,dy)>=best.distance))continue;
   const hit=islandQueries.get(q.id)(x,y);if(-hit.distance<best.distance)best={distance:-hit.distance,nx:-hit.nx,ny:-hit.ny,qx:hit.qx,qy:hit.qy,edge:'island',along:Math.atan2(y-q.y,x-q.x),island:q.id};
  }else{const a=Math.atan2(y-q.y,x-q.x),d=Math.hypot(x-q.x,y-q.y)-islandRadius(a,q);if(d<best.distance)best={distance:d,nx:Math.cos(a),ny:Math.sin(a),edge:'island',along:a};}
 }
 const canal=canalAt(x),inRzadza=x>rz.x-500&&x<rz.x+2600&&Math.abs(y-canal.y)<100;
 if(inRzadza&&best.edge==='lake')best.edge='canal';
 const beach=best.island==='euzebia'?euzebiaBeachWeight(best.along)>.05:best.edge==='island'&&best.along>.3&&best.along<2.8||BEACHES.some(q=>Math.hypot(x-q.x,y-q.y)<q.r);
 return{...best,beach,land:best.distance<1e-7};
}
// Additional faces are moorable wherever water is accessible. No map labels
// are needed; their identifiers appear only after selection.
for(const [index,d]of DOCKS.entries()){
 const horizontal=d.w>d.h,count=Math.max(2,Math.floor((horizontal?d.w:d.h)/6));
 for(let j=0;j<count;j++)for(const side of [0,1]){
  const t=(j+.5)/count,x=horizontal?d.x+d.w*t:d.x+d.w*side,y=horizontal?d.y+d.h*side:d.y+d.h*t;
  if(polygonShore(x,y).distance<.2)continue;
  BOLLARDS.push({x,y,kind:'bollard',id:`M${index+1}${side?'P':'L'}-${j+1}`,label:`${d.service?'Serwis':REMOTE_HARBORS[index-13]?.name??'Pomost'} · poler ${j+1}`,service:d.service&&Math.abs(x-132)<.1});
 }
}
for(const y of [16,22,28,34,38])BOLLARDS.push({x:132,y,kind:'bollard',id:'SER'+y,label:'Serwis przy slipie · '+y,service:true});
const beachTree=BOLLARDS.find(q=>q.id==='D1'),beachNormal=shoreAt(beachTree.x,beachTree.y);
export const MAP_STARTS={retrieve:{x:125,y:22,a:-Math.PI/2},beach:{x:beachTree.x+beachNormal.nx*7.45,y:beachTree.y+beachNormal.ny*7.45,a:Math.atan2(-beachNormal.ny,-beachNormal.nx)},island:{x:ISLAND.x,y:ISLAND.y+ISLAND.ry+30,a:Math.PI},canal:{x:rz.x,y:rz.y,a:0},fuel:{x:FUEL_STATION.x+2,y:FUEL_STATION.y,a:Math.PI/2}};
// Append-only additions: never shift legacy bollard indices stored in sessions.
ISLANDS.push(EUZEBIA);islandQueries.set(EUZEBIA.id,createShoreQuery(EUZEBIA.outline));
export {EUZEBIA};
export const PILAWA=createPilawaSite(lakeQuery);
DOCKS.push(...PILAWA.docks);SOLIDS.push(...PILAWA.docks,...PILAWA.fenders);BOLLARDS.push(...PILAWA.bollards);TRAFFIC.push(...PILAWA.traffic);
export const FUEL_STATIONS=[FUEL_STATION,PILAWA.fuel];
export const ALL_FUEL_FENDERS=[...FUEL_FENDERS,...PILAWA.fenders];
for(const [i,a]of [.55,1.05,1.55,2.85,3.08].entries()){
 let p={x:EUZEBIA.x+Math.cos(a)*EUZEBIA.rx*2,y:EUZEBIA.y+Math.sin(a)*EUZEBIA.ry*2};
 const hit=islandQueries.get(EUZEBIA.id)(p.x,p.y);p={x:hit.qx+hit.nx*1.5,y:hit.qy+hit.ny*1.5};
 for(let j=0;j<4;j++){const q=islandQueries.get(EUZEBIA.id)(p.x,p.y);if(q.distance>1.45)break;p.x+=q.nx*(1.6-q.distance);p.y+=q.ny*(1.6-q.distance);}
 BOLLARDS.push({...p,id:'EUZ-D'+(i+1),kind:'tree',label:'Euzebia · drzewo '+(i+1),site:'euzebia'});
}
for(const id of ['EUZ-D4','EUZ-D5']){const tree=BOLLARDS.find(q=>q.id===id),n=shoreAt(tree.x,tree.y);REEDS.push({x:tree.x+n.nx*5,y:tree.y+n.ny*5,r:7,shallow:true});}
MAP_STARTS.pilawa=PILAWA.start;MAP_STARTS.euzebia={x:EUZEBIA.x-EUZEBIA.rx-35,y:EUZEBIA.y,a:Math.PI/2};
export function bottomAt(x,y){
 const shore=shoreAt(x,y),dist=shore.distance,slope=shore.island==='euzebia'?euzebiaSlope(shore.along):shore.beach?.085:shore.edge==='canal'?.65:.21*(1+.28*Math.sin(x*.027)+.16*Math.cos(y*.041));
 const basin=shore.edge==='canal'?3.2:8.5;
 let depth=dist>=0?basin*(1-Math.exp(-dist*slope/basin)):dist*(shore.beach?.07:.32);
 if(dist>=0){for(const s of SHOALS)depth-=s.drop*Math.exp(-((x-s.x)**2/s.rx**2+(y-s.y)**2/s.ry**2));depth=Math.max(.015,depth+.10*Math.sin(x*.13)*Math.sin(y*.16)*clamp(dist/12,0,1));}
 // Pilawa's maintained basin is dredged, with a short blend at the bank.
 const pb=PILAWA.bounds;if(dist>0&&x>pb.left&&x<pb.right&&y>pb.top&&y<pb.bottom){const blend=clamp(dist/5,0,1)*clamp(Math.min(x-pb.left,pb.right-x,y-pb.top,pb.bottom-y)/4,0,1);depth+=Math.max(0,2.7-depth)*blend;}
 const ramp=SERVICE_STATION.slip;
 // A level yard and its approach meet the dry end of the slip. Shore-distance
 // elevation used to put the parked trailer on an unintended slope.
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
 // A maintained harbour has a dredged basin. The smooth apron lies outside
 // the ramp and never changes the dry yard or the axle/ramp transition.
 if(dist>0&&x>0&&x<150&&y>7&&y<70){const basin=smooth((x-0)/4)*smooth((150-x)/5)*smooth((y-7)/3)*(1-smooth((y-45)/25))*smooth((dist-1)/4);depth+=Math.max(0,2.7+.18*Math.sin(x*.07)-depth)*basin;}
 const yardDepth=(ramp.y-ramp.waterY)*Math.tan(ramp.angle*Math.PI/180);
 // The entire parking apron is flat. Outside it, shoulders blend into the
 // shore; at the ramp entrance even its edges meet the SAME elevation.
 const yard=smooth((x-93)/3)*smooth((197-x)/3)*smooth((y+57)/3)*(1-smooth((y-ramp.y)/12));
 depth=yard===1?yardDepth:depth+(yardDepth-depth)*yard;
 if(x>ramp.x-3&&x<ramp.x+ramp.w+3&&y>=ramp.y&&y<ramp.y+ramp.h){
  const across=smooth((x-ramp.x+3)/3)*smooth((ramp.x+ramp.w+3-x)/3);
  const end=1-smooth((y-(ramp.y+ramp.h-5))/5);
  depth+=(slipDepth(x,y)-depth)*across*end;
 }
 const material=x>ramp.x&&x<ramp.x+ramp.w&&y>=ramp.y&&y<ramp.y+ramp.h?'rock':shore.beach?'sand':(shore.edge==='island'&&shore.along<0)||x>73&&x<220&&y>-15&&y<40?'rock':shore.distance>50?'mud':'sand';
 return hazardBottom(x,y,{depth,material,name:{sand:'piasek',mud:'muł',rock:'kamienie'}[material],holding:{sand:28,mud:12,rock:3}[material],shoreDistance:dist,land:shore.land,beach:shore.beach});
}
export function bottomGradient(x,y){const d=.12;return{x:(bottomAt(x+d,y).depth-bottomAt(x-d,y).depth)/(2*d),y:(bottomAt(x,y+d).depth-bottomAt(x,y-d).depth)/(2*d)};}
export function reedDensityAt(x,y){if(shoreAt(x,y).land)return 0;return REEDS.reduce((v,r)=>Math.max(v,clamp(1-Math.hypot(x-r.x,y-r.y)/r.r,0,1)),0);}
export function environment(t,e={},x=null,y=null){
 const weather=weatherAt(t,e),a=weather.windDirection*Math.PI/180,c=weather.currentDirection*Math.PI/180;
 let wind={x:Math.sin(a)*weather.windSpeed,y:-Math.cos(a)*weather.windSpeed},current={x:Math.sin(c)*weather.currentSpeed,y:-Math.cos(c)*weather.currentSpeed},shelter=1;
 if(e.spatialEffects&&x!==null){
  const wx=Math.sin(a),wy=-Math.cos(a),dx=x-ISLAND.x,dy=y-ISLAND.y,down=dx*wx+dy*wy,side=-dx*wy+dy*wx;
  if(down>0)shelter-=.70*Math.exp(-Math.max(0,down-70)/160)*Math.exp(-((side/75)**2));
  const shore=shoreAt(x,y);if(shore.edge==='canal')shelter*=.45;
  for(const d of DOCKS){const px=x-(d.x+d.w/2),py=y-(d.y+d.h/2),back=px*wx+py*wy,lateral=Math.abs(-px*wy+py*wx);if(back>0&&back<18&&lateral<Math.max(d.w,d.h)*.5)shelter*=.90;}
  wind={x:wind.x*shelter,y:wind.y*shelter};
  const V=Math.hypot(current.x,current.y);
  if(V>0){
   const normal=current.x*shore.nx+current.y*shore.ny,block=.8*Math.exp(-Math.max(0,shore.distance)/7);
   current.x-=normal*shore.nx*block;current.y-=normal*shore.ny*block;
   if(shore.edge==='canal'){const canal=canalAt(x),flow=(Math.sin(c)+canal.slope*(-Math.cos(c)))*V*1.65;current={x:flow/Math.sqrt(1+canal.slope**2),y:flow*canal.slope/Math.sqrt(1+canal.slope**2)};}
   else{const ux=Math.sin(c),uy=-Math.cos(c),behind=dx*ux+dy*uy,across=-dx*uy+dy*ux;if(behind>45){const wake=.6*Math.exp(-(behind-45)/120)*Math.exp(-((across/55)**2));current.x*=1-wake;current.y*=1-wake;const swirl=.20*V*Math.sin(t*.13+behind*.05)*wake;current.x+=-uy*swirl;current.y+=ux*swirl;}}
   for(const d of DOCKS){const px=clamp(x,d.x,d.x+d.w),py=clamp(y,d.y,d.y+d.h),rx=x-px,ry=y-py,dist=Math.hypot(rx,ry);if(dist>0&&dist<7){const q=.17*V*(1-dist/7)*Math.sin(t*.2+d.x);current.x+=-ry/dist*q;current.y+=rx/dist*q;}}
  }
 }
 const dry=x!==null&&bottomAt(x,y).depth<=0;
 if(dry)current={x:0,y:0};
 return{wind,current,shelter,waveScale:dry?0:.4+.6*shelter};
}
export function waveHeight(e,t=0){return e.autoWaves?Math.min(.55,.004*weatherAt(t,e).windSpeed**2):(e.waveHeight??0);}
let dockReflectionFaces;
function staticReflectionFaces(){
 if(dockReflectionFaces)return dockReflectionFaces;
 dockReflectionFaces=DOCKS.flatMap((d,i)=>[
  ['L',{x:d.x,y:d.y},{x:d.x,y:d.y+d.h},-1,0],['R',{x:d.x+d.w,y:d.y},{x:d.x+d.w,y:d.y+d.h},1,0],
  ['T',{x:d.x,y:d.y},{x:d.x+d.w,y:d.y},0,-1],['B',{x:d.x,y:d.y+d.h},{x:d.x+d.w,y:d.y+d.h},0,1]
 ].map(([side,a,b,nx,ny])=>({id:'dock'+i+side,a,b,nx,ny,coefficient:d.service?.64:.56,dx:b.x-a.x,dy:b.y-a.y,length2:(b.x-a.x)**2+(b.y-a.y)**2})));
 return dockReflectionFaces;
}
export function reflectionFacesNear(x,y,radius=70){
 const p={x,y},faces=[];
 for(const f of staticReflectionFaces()){
  const {a,dx,dy,length2}=f,u=clamp(((x-a.x)*dx+(y-a.y)*dy)/length2,0,1),distance=Math.hypot(x-a.x-u*dx,y-a.y-u*dy);
  if(distance<radius&&wallDistance(p,f)>.001)faces.push({...f,distance});
 }
 faces.sort((a,b)=>a.distance-b.distance);faces.splice(4);
 const s=shoreAt(x,y);
 if(s.distance>0&&s.distance<radius){const q={x:x-s.nx*s.distance,y:y-s.ny*s.distance},half=65;
  faces.push({id:'shore',a:{x:q.x-s.ny*half,y:q.y+s.nx*half},b:{x:q.x+s.ny*half,y:q.y-s.nx*half},nx:s.nx,ny:s.ny,coefficient:s.beach?.08:q.x>0&&q.x<165&&Math.abs(q.y-4)<3?.62:.34,distance:s.distance});
 }
 return faces;
}
export function waveAt(x,y,t,e){
 if(bottomAt(x,y).depth<=0)return{eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0,direction:{x:0,y:0}};
 const H=waveHeight(e,t)*(e.spatialEffects?environment(t,e,x,y).waveScale:1),a=(e.waveDirection??e.windDirection??90)*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)};let eta=0,sx=0,sy=0,vx=0,vy=0,ax=0,ay=0;
 const h=Math.max(.4,bottomAt(x,y).depth),faces=H>0?reflectionFacesNear(x,y,24):[];
 for(const [weight,period,phase,offset]of [[.65,2.8,0,0],[.25,1.9,1.7,.32],[.1,3.9,3.2,-.4]]){
  const omega=2*Math.PI/period;let k=omega*omega/9.81;for(let i=0;i<5;i++)k=omega*omega/(9.81*Math.tanh(k*3));
  const nx=Math.sin(a+offset),ny=-Math.cos(a+offset),A=H*.5*weight,theta=k*(x*nx+y*ny)-omega*t+phase,co=Math.cos(theta),si=Math.sin(theta),orb=A*omega/Math.tanh(Math.max(.2,k*h));
  eta+=A*co;sx-=A*k*si*nx;sy-=A*k*si*ny;vx+=orb*co*nx;vy+=orb*co*ny;ax+=orb*omega*si*nx;ay+=orb*omega*si*ny;
  for(const f of faces){
   const incident=nx*f.nx+ny*f.ny;if(incident>=-.08)continue;
   const reflected=mirrorVector({x:nx,y:ny},f),d=wallDistance({x,y},f),travel=d/(-incident);
   const hit={x:x-reflected.x*travel,y:y-reflected.y*travel},dx=f.b.x-f.a.x,dy=f.b.y-f.a.y,u=((hit.x-f.a.x)*dx+(hit.y-f.a.y)*dy)/(dx*dx+dy*dy);
   if(u<0||u>1)continue;
   const p=mirrorPoint({x,y},f),theta=k*(p.x*nx+p.y*ny)-omega*t+phase,g=f.coefficient*Math.exp(-travel/30),co=Math.cos(theta)*g,si=Math.sin(theta)*g;
   eta+=A*co;sx-=A*k*si*reflected.x;sy-=A*k*si*reflected.y;vx+=orb*co*reflected.x;vy+=orb*co*reflected.y;ax+=orb*omega*si*reflected.x;ay+=orb*omega*si*reflected.y;
  }
 }
 return {eta,sx,sy,vx,vy,ax,ay,direction:n};
}

export const MAP_POIS=[
 {id:'port',name:'Port główny',x:80,y:20,priority:5},
 {id:'slip',name:'Slip',x:124.5,y:24,priority:4},
 {id:'service',name:'Serwis',x:140,y:25,priority:4},
 {id:'fuel',name:'⛽ Paliwo',x:FUEL_STATION.x,y:FUEL_STATION.y,priority:5},
 ...DOCKS.filter(d=>d.name).map((d,i)=>({id:'pier-'+i,name:d.name,x:d.x+d.w/2,y:d.y+d.h/2,priority:3})),
 ...REMOTE_HARBORS.map(q=>({id:'harbor-'+q.id,name:'Port · '+q.name,x:q.x,y:q.y,priority:3})),
 ...ISLANDS.map((q,i)=>({id:q.id??'island-'+i,name:q.name??'Wyspa '+(i+1),x:q.x,y:q.y,priority:q.id?4:2})),
 {id:'pilawa',name:'Port Pilawa',x:PILAWA.x+35,y:PILAWA.y,priority:5},
 {id:'pilawa-fuel',name:'⛽ ORLEN · Pilawa',x:PILAWA.fuel.x,y:PILAWA.fuel.y,priority:5},
 ...MAP_LABELS.map((q,i)=>({id:'town-'+i,...q,priority:1}))];

export const NAV_MARKS=makeNavigationMarks(shoreAt);
