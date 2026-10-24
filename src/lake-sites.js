import {fromAtlas,WORLD_DISTANCE_SCALE} from './zegrze.js';
// Interpreted geography, NOT surveyed geometry. Euzebia follows the supplied
// Rządza-mouth reference; Pilawa follows the supplied location map. Exact OSM/
// aerial verification is pending network access; do not present berths as real.
const centre=fromAtlas(840,553),scale=WORLD_DISTANCE_SCALE;
const contour=[[-65,-150],[-5,-190],[50,-168],[75,-105],[78,-32],[92,25],[60,85],[48,150],[5,178],[-42,150],[-60,90],[-83,25],[-80,-40],[-95,-95]];
const outline=contour.flatMap((p,i)=>{const a=contour[(i+contour.length-1)%contour.length],b=contour[(i+1)%contour.length],d=contour[(i+2)%contour.length];return Array.from({length:5},(_,j)=>{const t=j/5,f=k=>.5*(2*p[k]+(-a[k]+b[k])*t+(2*a[k]-5*p[k]+4*b[k]-d[k])*t*t+(-a[k]+3*p[k]-3*b[k]+d[k])*t*t*t);return{x:centre.x+f(0)*scale,y:centre.y+f(1)*scale};});});
export const EUZEBIA={...centre,id:'euzebia',name:'Wyspa Euzebia',rx:100*scale,ry:190*scale,outline,beachSectors:[[.15,1.8],[2.6,3.35]],interpreted:true};
EUZEBIA.bounds={left:Math.min(...outline.map(p=>p.x)),right:Math.max(...outline.map(p=>p.x)),top:Math.min(...outline.map(p=>p.y)),bottom:Math.max(...outline.map(p=>p.y))};
export const PILAWA_LOCATION={...fromAtlas(710,937),id:'pilawa',name:'Port Pilawa',interpreted:true};
// Physical SI dimensions remain uncompressed. All roots are independently
// attached to the existing bank, rather than scaling the piers themselves.
export function createPilawaSite(query){
 const anchor=query(PILAWA_LOCATION.x,PILAWA_LOCATION.y),cy=anchor.qy;
 const rootAt=y=>{let x=anchor.qx;for(let i=0;i<12;i++){const q=query(x,y);if(Math.abs(q.distance)<.0001)break;x-=q.distance/(Math.abs(q.nx)>.1?q.nx:-1);}return x;};
 const roots=[-42,-14,14,42].map(dy=>({x:rootAt(cy+dy),y:cy+dy})),west=Math.min(...roots.map(q=>q.x))-91,docks=[],bollards=[],traffic=[];
 for(const [row,root]of roots.entries()){
  const x=west+12,y=root.y;
  docks.push({id:'pilawa-pier-'+row,x,y:y-1.2,w:root.x-x+1.5,h:2.4,site:'pilawa'});
  // Docks are on the north and south sides of each fairway; clear entrance
  // stays to the west. Space between opposite bows is deliberately limited.
  for(let j=0;j<8;j++)for(const side of [-1,1]){const bx=x+8+j*7,by=y+side*1.2,id=`PIL-${row}-${j}-${side}`;bollards.push({id,x:bx,y:by,kind:'bollard',site:'pilawa',label:'Pilawa · poler '+(row+1)+'/'+(j+1)+(side<0?' N':' S')});}
  if(row<3)for(let j=0;j<7;j++){
   if(row===1&&j>4)continue;const type=['motor','sail','motor','pwc','sail','motor','motor'][(j+row)%7],length=type==='sail'?8.1:type==='pwc'?3.1:5.5+(j%2),beam=type==='sail'?2.5:type==='pwc'?1.2:2.25,a=Math.PI/2,px=x+8+j*7+3.5,py=y+1.2+length*.5+1.05;
   const buoyId=`PIL-B-${row}-${j}`;bollards.push({id:buoyId,x:px,y:py+length*.43+1.7,kind:'buoy',site:'pilawa',label:'Pilawa · boja dziobowa'});
   traffic.push({id:'pilawa-'+row+'-'+j,type,x:px,y:py,a,length,beam,mass:type==='sail'?2850:type==='pwc'?360:1250+(j%2)*350,site:'pilawa',ties:[['portStern',`PIL-${row}-${j+1}-1`],['starboardStern',`PIL-${row}-${j}-1`],['bow',buoyId]]});
  }
 }
 // Outer breakwater leaves a 17 m entrance between its two sections.
 docks.push({id:'pilawa-breakwater-n',x:west,y:cy-44,w:2.8,h:45,site:'pilawa'},{id:'pilawa-breakwater-s',x:west,y:cy+18,w:2.8,h:27,site:'pilawa'});
 const fuel={id:'pilawa-fuel',name:'ORLEN · Pilawa',x:west+72,y:cy+2,pumpX:west+70.6,pumpY:cy+1,alongMin:cy-10,alongMax:cy+11,maxGap:1.4};
 docks.push({id:'pilawa-fuel',x:fuel.x-2.8,y:cy-12,w:2.8,h:24,site:'pilawa',fuel:true});
 // Link the fuel finger to the middle pier (north end), no floating orphan.
 docks.push({id:'pilawa-fuel-access',x:fuel.x-2.8,y:cy-14,w:2.8,h:2.5,site:'pilawa'});
 for(const y of [cy-8,cy-2,cy+4,cy+10])bollards.push({id:'PIL-F-'+Math.round(y-cy),x:fuel.x,y,kind:'bollard',site:'pilawa',fuel: fuel.id,label:'ORLEN · Pilawa · poler'});
 for(const d of docks.filter(d=>d.w<4&&!d.fuel))for(let j=0;j<Math.floor(d.h/6);j++)bollards.push({id:d.id+'-'+j,x:d.x+d.w,y:d.y+3+j*6,kind:'bollard',site:'pilawa',label:'Pilawa · falochron'});
 const fenders=Array.from({length:5},(_,i)=>({x:fuel.x,y:fuel.alongMin+1+i*4,w:.22,h:.7,fender:true,id:'pilawa-fender-'+i}));
 return{anchor:{x:anchor.qx,y:cy},x:west,y:cy,docks,bollards,traffic,fuel,fenders,start:{x:west-17,y:cy+9,a:0},bounds:{left:west-5,right:Math.max(...roots.map(q=>q.x))+2,top:cy-48,bottom:cy+48}};
}
