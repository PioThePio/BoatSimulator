import {createShoreQuery} from './shore-geometry.js';
import {fromGeo,WORLD_DISTANCE_SCALE} from './zegrze.js';
import {EUZEBIA_REFERENCE,PILAWA_REFERENCE,PILAWA_COAST} from './site-geography-data.js';
import {pierSegment,solidPoint} from './solid-geometry.js';
// Published OSM/PRNG outline. Geographic distances follow the world's 50% scale.
const outline=EUZEBIA_REFERENCE.coordinates.slice(0,-1).map(([lon,lat])=>fromGeo(lat,lon));
const bounds={left:Math.min(...outline.map(p=>p.x)),right:Math.max(...outline.map(p=>p.x)),top:Math.min(...outline.map(p=>p.y)),bottom:Math.max(...outline.map(p=>p.y))};
export const EUZEBIA={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2,id:'euzebia',name:'Wyspa Euzebia',rx:(bounds.right-bounds.left)/2,ry:(bounds.bottom-bounds.top)/2,outline,bounds,beachSectors:[[.15,1.8],[2.6,3.35]],interpreted:false,source:'https://www.openstreetmap.org/way/193668247'};
const fuelGeo={lat:52.4358481,lon:21.0412369},origin=fromGeo(fuelGeo.lat,fuelGeo.lon);
// The marina is one unscaled physical assembly, like the main port. Compress
// its location, retain SI pier widths/lengths and navigable berth clearances.
const project=([lon,lat])=>{const p=fromGeo(lat,lon);return{x:origin.x+(p.x-origin.x)/WORLD_DISTANCE_SCALE,y:origin.y+(p.y-origin.y)/WORLD_DISTANCE_SCALE};};
const coast=PILAWA_COAST.slice(0,160).map(project),landOutline=[...coast,{x:origin.x+20,y:origin.y+110},{x:origin.x+350,y:origin.y+110},{x:origin.x+350,y:origin.y-330}];
export const PILAWA_LAND={id:'pilawa-bank',outline:landOutline,bounds:{left:Math.min(...landOutline.map(p=>p.x)),right:Math.max(...landOutline.map(p=>p.x)),top:Math.min(...landOutline.map(p=>p.y)),bottom:Math.max(...landOutline.map(p=>p.y))}};
export const PILAWA_LOCATION={...project([21.04205,52.43755]),id:'pilawa',name:'Port Pilawa',interpreted:false};
const average=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
export function createPilawaSite(){
 const bank=createShoreQuery(PILAWA_LAND.outline);
 const data=new Map(PILAWA_REFERENCE.map(q=>[q.id,q.coordinates])),definitions=[['1436002665',0,1,3,4],['1189735603',0,5,6,7],['455457239',0,3,5,10],['455457237',0,5,6,7],['455457240',3,8,4,5],['455457238',0,4,2,3]],docks=[],bollards=[],traffic=[],extraBollards=[];
 const piers=definitions.map(([id,a,b,c,d],row)=>{const q=data.get(id),root=project(average(q[a],q[b])),tip=project(average(q[c],q[d])),pier=pierSegment(root,tip,2.4,{id:'pilawa-pier-'+row,site:'pilawa',sourceWay:id});docks.push(pier);return pier;});
 for(const pier of piers){const root=solidPoint(pier,-pier.pose.length/2,0),q=bank(root.x,root.y),land={x:q.qx+q.nx*.5,y:q.qy+q.ny*.5};docks.push(pierSegment(land,root,2.4,{id:pier.id+'-access',site:'pilawa',access:true}));}
 // Preserve the order and identifiers of all existing saved attachment points.
 for(let row=0;row<4;row++){
  const pier=piers[row],L=pier.pose.length;
  for(let j=0;j<8;j++)for(const side of[-1,1])bollards.push({...solidPoint(pier,-L/2+(j+.5)*L/8,side*1.2),id:`PIL-${row}-${j}-${side}`,kind:'bollard',site:'pilawa',legacyRotation:pier.pose.a,label:`Pilawa · pomost ${row+1} / ${j+1}${side<0?' N':' S'}`});
  if(row<3)for(let j=0;j<7;j++){
   if(row===1&&j>4)continue;const type=['motor','sail','motor','pwc','sail','motor','motor'][(j+row)%7],length=type==='sail'?8.1:type==='pwc'?3.1:5.5+j%2,beam=type==='sail'?2.5:type==='pwc'?1.2:2.25,a=pier.pose.a+Math.PI/2;
   const p=solidPoint(pier,-L/2+(j+1)*L/8,1.2+length*.5+1.05),buoyId=`PIL-B-${row}-${j}`,along=length*.43+1.7;
   bollards.push({id:buoyId,x:p.x+Math.cos(a)*along,y:p.y+Math.sin(a)*along,kind:'buoy',site:'pilawa',legacyRotation:pier.pose.a,label:'Pilawa · boja dziobowa'});
   traffic.push({id:'pilawa-'+row+'-'+j,type,...p,a,length,beam,mass:type==='sail'?2850:type==='pwc'?360:1250+(j%2)*350,site:'pilawa',ties:[['portStern',`PIL-${row}-${j+1}-1`],['starboardStern',`PIL-${row}-${j}-1`],['bow',buoyId]]});
  }
 }
 // Straight SI segments follow the real angles, including the T-head and outer
 // floating breakwater. Their AABBs are only for culling, never collision shapes.
 docks.push(pierSegment(project([21.04172,52.43666]),project([21.041836,52.436575]),2.4,{id:'pilawa-t-head',site:'pilawa'}));
 const q=data.get('974972779'),root=project(average(q[9],q[10])),tip=project(average(q[5],q[6])),mid={x:root.x+(tip.x-root.x)*.65,y:root.y+(tip.y-root.y)*.65};
 const breakwaters=[pierSegment(root,mid,4,{id:'pilawa-breakwater-n',site:'pilawa'}),pierSegment(mid,tip,4,{id:'pilawa-breakwater-s',site:'pilawa'})];docks.push(...breakwaters);
 const fuel={id:'pilawa-fuel',name:'ORLEN · Pilawa',x:origin.x+8,y:origin.y,pumpX:origin.x+1,pumpY:origin.y,alongMin:origin.y-9,alongMax:origin.y+9,maxGap:1.4};
 docks.push({id:'pilawa-fuel',x:fuel.x-2.8,y:fuel.alongMin-1,w:2.8,h:20,site:'pilawa',fuel:true});
 for(const dy of[-8,-2,4,10])bollards.push({id:'PIL-F-'+dy,x:fuel.x,y:origin.y+dy,kind:'bollard',site:'pilawa',fuel:fuel.id,label:'ORLEN · Pilawa · poler'});
 for(const [i,p]of breakwaters.entries())for(let j=0;j<(i?4:7);j++)bollards.push({...solidPoint(p,-p.pose.length/2+(j+.5)*p.pose.length/(i?4:7),2),id:p.id+'-'+j,kind:'bollard',site:'pilawa',legacyRotation:p.pose.a-Math.PI/2,label:'Pilawa · falochron'});
 for(let row=4;row<piers.length;row++)for(let j=0;j<6;j++)for(const side of[-1,1])extraBollards.push({...solidPoint(piers[row],-piers[row].pose.length/2+(j+.5)*piers[row].pose.length/6,side*1.2),id:`PIL-EX-${row}-${j}-${side}`,kind:'bollard',site:'pilawa',label:'Pilawa · pomost '+(row+1)});
 const fenders=Array.from({length:5},(_,i)=>({x:fuel.x,y:fuel.alongMin+1+i*4,w:.22,h:.7,fender:true,id:'pilawa-fender-'+i}));
 const start=project([21.04205,52.43785]),bounds={left:origin.x-35,right:origin.x+175,top:origin.y-220,bottom:origin.y+75};
 return{...PILAWA_LOCATION,anchor:{x:origin.x,y:origin.y},docks,bollards,extraBollards,traffic,fuel,fenders,start:{...start,a:Math.PI/2},bounds,route:[start,{x:start.x,y:origin.y-70},{x:origin.x+55,y:origin.y-58},{x:origin.x+16,y:origin.y-15}],source:'https://www.openstreetmap.org/way/871129082'};
}
