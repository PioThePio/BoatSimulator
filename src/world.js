import {weatherAt} from './weather.js';
export {weatherAt} from './weather.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const WORLD={left:4,top:4,right:604,bottom:404};
export const LAKE=[{x:4,y:4},{x:100,y:4},{x:135,y:9},{x:185,y:5},{x:230,y:18},{x:300,y:8},{x:360,y:20},{x:420,y:5},{x:488,y:15},{x:548,y:9},{x:592,y:35},{x:604,y:90},{x:585,y:142},{x:600,y:200},{x:576,y:260},{x:590,y:318},{x:552,y:370},{x:510,y:396},{x:460,y:404},{x:400,y:388},{x:340,y:400},{x:280,y:379},{x:230,y:397},{x:180,y:382},{x:120,y:397},{x:65,y:377},{x:20,y:345},{x:5,y:290},{x:20,y:245},{x:4,y:205},{x:4,y:125},{x:12,y:92},{x:4,y:48}];
export const ISLAND={x:304,y:204,rx:82,ry:64};
export function islandRadius(a){return(1+.075*Math.sin(3*a)+.035*Math.cos(5*a))/Math.hypot(Math.cos(a)/ISLAND.rx,Math.sin(a)/ISLAND.ry);}
export function islandOutline(padding=0){return Array.from({length:120},(_,i)=>{const a=i*Math.PI/60,r=islandRadius(a)+padding;return{x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r};});}
export function canalAt(x){return{y:204+9*Math.sin((x-304)/25),slope:.36*Math.cos((x-304)/25),halfWidth:6.5};}
// Original small marina, extended along the same shore with two extra piers.
export const DOCKS=[{x:6,y:10,w:23,h:2.8},{x:17,y:12.8,w:2.8,h:17},{x:29,y:10,w:2.8,h:16},
 {x:31.8,y:10,w:78.2,h:2.8},{x:49,y:12.8,w:2.8,h:20},{x:70,y:12.8,w:2.8,h:24},
 {x:4,y:190,w:14,h:1.5},{x:17,y:185,w:1.4,h:13},{x:328,y:260,w:1.6,h:25},{x:328,y:283.5,w:15,h:1.6}];
// Floating fingers: 25 cm beam, triangular brace only at the hinge, 5 m spacing.
export const YBOOMS=Array.from({length:6},(_,i)=>({id:i,x1:76+i*5,y1:12.8,x2:76+i*5,y2:22.8,width:.25,length:10,a:Math.PI/2}));
export const BUOY_SLIPS=[35.5,41,46.5].map((x,i)=>({x,y:26,id:`B${i+1}`}));
export const FUEL_STATION={x:51.8,y:20,pumpX:50.4,pumpY:18,alongMin:15,alongMax:28,maxGap:1.4};
export const FUEL_FENDERS=[16,18.5,21,23.5,26].map((y,id)=>({x:51.8,y:y-.35,w:.22,h:.7,fender:true,id:'fuel-fender-'+id}));
export const SOLIDS=[...DOCKS,...FUEL_FENDERS,{x:-45,y:-45,w:700,h:20},{x:-45,y:-25,w:20,h:480},{x:-25,y:434,w:680,h:20},{x:634,y:-25,w:20,h:480}];
export const BEACHES=[{edge:'north',from:105,to:190,name:'Plaża Północna'},{edge:'west',from:125,to:205,name:'Plaża Sosnowa'},{edge:'south',from:420,to:520,name:'Plaża Południowa'}];
export const REEDS=[{x:25,y:245,r:10},{x:190,y:375,r:13},{x:550,y:345,r:12},{x:278,y:268,r:9}];
export const SHOALS=[{x:91,y:64,rx:16,ry:12,drop:7.1},{x:440,y:285,rx:42,ry:26,drop:7.8},{x:420,y:120,rx:25,ry:19,drop:7.6},{x:115,y:290,rx:24,ry:17,drop:7.4}];
const islandTree=a=>{const r=islandRadius(a)-1.2;return{x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r};};
const docksPoints=DOCKS.slice(3).flatMap((d,i)=>d.w>d.h?Array.from({length:Math.max(2,Math.floor(d.w/6))},(_,j)=>({x:d.x+1+j*(d.w-2)/Math.max(1,Math.floor(d.w/6)-1),y:d.y+d.h})):Array.from({length:Math.max(2,Math.floor(d.h/6))},(_,j)=>({x:d.x+d.w,y:d.y+1+j*(d.h-2)/Math.max(1,Math.floor(d.h/6)-1)})));
export const BOLLARDS=[...[[12,12.8],[17,18],[17,25],[19.8,28],[29,17],[29,23],[25,12.8]].map(([x,y],i)=>({x,y,kind:'bollard',id:`P${i+1}`,label:`Poler ${i+1}`})),
 ...[{x:2.8,y:147},{x:2.6,y:173},{x:132,y:6.8},{x:165,y:6},islandTree(1.0),islandTree(1.65),{x:452,y:405.2},{x:489,y:405.2}].map((p,i)=>({...p,kind:'tree',id:`D${i+1}`,label:`Drzewo ${i+1}`})),
 ...docksPoints.map((p,i)=>({...p,kind:'bollard',id:`P${i+8}`,label:`Poler ${i+8}`})),
 ...BUOY_SLIPS.flatMap((q,i)=>[-1,1].map(side=>({x:q.x+side*1.2,y:12.8,kind:'bollard',id:`S${i+1}${side<0?'L':'P'}`,label:`Stanowisko ${i+1} · ${side<0?'lewa':'prawa'} knaga`}))),
 ...YBOOMS.flatMap((q,i)=>[.22,.92].map(fraction=>({x:q.x1,y:q.y1+q.length*fraction,boom:i,fraction,kind:'bollard',id:`Y${i+1}${fraction<.5?'A':'B'}`,label:`Y-bom ${i+1} · ${fraction<.5?'nasada':'koniec'}`}))),
 ...[...BUOY_SLIPS,{x:64,y:38,id:'B4'}].map(q=>({...q,kind:'buoy',label:`Boja ${q.id.slice(1)}`}))];
export const TRAFFIC=[{id:0,type:'motor',x:35.5,y:18.8,a:Math.PI/2,length:5.2,beam:2.1,mass:1100,ties:[['portStern','S1P'],['starboardStern','S1L'],['bow','B1']]},
 {id:1,type:'sail',x:88.5,y:18.3,a:Math.PI/2,length:7.8,beam:2.3,mass:2600,ties:[['portStern','Y4A'],['starboardStern','Y3A'],['portBow','Y4B'],['starboardBow','Y3B']]},
 {id:2,type:'pwc',x:98.5,y:16.7,a:Math.PI/2,length:3.2,beam:1.2,mass:380,ties:[['portStern','Y6A'],['starboardStern','Y5A'],['portBow','Y6B'],['starboardBow','Y5B']]}];
export function polygonShore(x,y){
 let inside=false,best=Infinity,qx=0,qy=0;
 for(let i=0,j=LAKE.length-1;i<LAKE.length;j=i++){
  const a=LAKE[j],b=LAKE[i];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1),px=a.x+t*dx,py=a.y+t*dy,d=(x-px)**2+(y-py)**2;
  if(d<best){best=d;qx=px;qy=py;}
 }
 const d=Math.sqrt(best),sign=inside?1:-1;return{distance:sign*d,qx,qy,nx:d>0?sign*(x-qx)/d:0,ny:d>0?sign*(y-qy)/d:1};
}
export function shoreAt(x,y){
 const lake=polygonShore(x,y),a=Math.atan2(y-204,x-304),radial=Math.hypot(x-304,y-204)-islandRadius(a),canal=canalAt(x),canalD=(canal.halfWidth-Math.abs(y-canal.y))/Math.sqrt(1+canal.slope**2);
 const islandD=Math.max(radial,canalD),isCanal=canalD>radial&&radial<0;
 if(islandD<lake.distance){
  const normal=isCanal?{x:Math.sign(y-canal.y)*canal.slope,y:-Math.sign(y-canal.y)}:{x:Math.cos(a),y:Math.sin(a)},norm=Math.hypot(normal.x,normal.y)||1;
  return{distance:islandD,edge:isCanal?'canal':'island',along:a,beach:!isCanal&&a>.3&&a<2.8,land:islandD<0,nx:normal.x/norm,ny:normal.y/norm};
 }
 const edge=lake.qx<35?'west':lake.qy<35?'north':lake.qy>350?'south':'east',along=edge==='west'?lake.qy:lake.qx;
 return{distance:lake.distance,edge,along,beach:BEACHES.some(b=>b.edge===edge&&along>=b.from-6&&along<=b.to+6),land:lake.distance<0,nx:lake.nx,ny:lake.ny};
}
export function bottomAt(x,y){
 const shore=shoreAt(x,y),dist=shore.distance,slope=shore.beach?.085:shore.edge==='canal'?.65:.24;
 const basin=shore.edge==='canal'?2.8:8.5;
 let depth=dist>=0?basin*(1-Math.exp(-dist*slope/basin)):dist*(shore.beach?.07:.32);
 if(dist>=0){for(const s of SHOALS)depth-=s.drop*Math.exp(-((x-s.x)**2/s.rx**2+(y-s.y)**2/s.ry**2));depth=Math.max(.015,depth+.10*Math.sin(x*.13)*Math.sin(y*.16)*clamp(dist/12,0,1));}
 const material=shore.beach?'sand':(shore.edge==='island'&&shore.along<0)||x>73&&y<40?'rock':x>113?'mud':'sand';
 return{depth,material,name:{sand:'piasek',mud:'muł',rock:'kamienie'}[material],holding:{sand:28,mud:12,rock:3}[material],shoreDistance:dist,land:shore.land,beach:shore.beach};
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
 return{wind,current,shelter,waveScale:.4+.6*shelter};
}
export function waveHeight(e,t=0){return e.autoWaves?Math.min(.55,.004*weatherAt(t,e).windSpeed**2):(e.waveHeight??0);}
export function waveAt(x,y,t,e){
 const H=waveHeight(e,t)*(e.spatialEffects?environment(t,e,x,y).waveScale:1),a=(e.waveDirection??e.windDirection??90)*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)};let eta=0,sx=0,sy=0,vx=0,vy=0,ax=0,ay=0;
 const h=Math.max(.4,bottomAt(x,y).depth);
 for(const [weight,period,phase,offset]of [[.65,2.8,0,0],[.25,1.9,1.7,.32],[.1,3.9,3.2,-.4]]){
  const omega=2*Math.PI/period;let k=omega*omega/9.81;for(let i=0;i<5;i++)k=omega*omega/(9.81*Math.tanh(k*3));
  const nx=Math.sin(a+offset),ny=-Math.cos(a+offset),A=H*.5*weight,theta=k*(x*nx+y*ny)-omega*t+phase,co=Math.cos(theta),si=Math.sin(theta),orb=A*omega/Math.tanh(Math.max(.2,k*h));
  eta+=A*co;sx-=A*k*si*nx;sy-=A*k*si*ny;vx+=orb*co*nx;vy+=orb*co*ny;ax+=orb*omega*si*nx;ay+=orb*omega*si*ny;
 }
 return {eta,sx,sy,vx,vy,ax,ay,direction:n};
}
