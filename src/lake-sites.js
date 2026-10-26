import {fromGeo,projectNieporet as project} from './zegrze.js';
import {EUZEBIA_REFERENCE} from './site-geography-data.js';
import {NIEPORET_REFERENCE as REFERENCE} from './nieporet-reference.js';
import {localAttachment} from './attachment-points.js';
import {pierSegment,solidPoint,circleSolidHit} from './solid-geometry.js';
import {fuelPoint} from './fuel-geometry.js';
// Published OSM/PRNG outline. Geographic distances follow the world's 50% scale.
const outline=EUZEBIA_REFERENCE.coordinates.slice(0,-1).map(([lon,lat])=>fromGeo(lat,lon));
const bounds={left:Math.min(...outline.map(p=>p.x)),right:Math.max(...outline.map(p=>p.x)),top:Math.min(...outline.map(p=>p.y)),bottom:Math.max(...outline.map(p=>p.y))};
export const EUZEBIA={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2,id:'euzebia',name:'Wyspa Euzebia',rx:(bounds.right-bounds.left)/2,ry:(bounds.bottom-bounds.top)/2,outline,bounds,beachSectors:[[.15,1.8],[2.6,3.35]],interpreted:false,source:'https://www.openstreetmap.org/way/193668247'};
const origin=project([21.0412369,52.4358481]);
const average=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const feature=id=>REFERENCE.features[id];
function connectBank(docks,bank,pier){const p=solidPoint(pier,-pier.pose.length/2,0),q=bank(p.x,p.y);if(q.distance>.15)docks.push(pierSegment({x:q.qx-q.nx*.5,y:q.qy-q.ny*.5},p,pier.pose.width,{id:pier.id+'-access',site:pier.site,access:true}));}
export function createNieporetSite(bank){
 const data=new Map(Object.entries(REFERENCE.features)),definitions=[['1436002665',0,1,3,4],['1189735603',0,5,6,7],['455457239',0,3,5,10],['455457237',0,5,6,7],['455457240',3,8,4,5],['455457238',0,4,2,3]],docks=[],bollards=[],traffic=[],extraBollards=[];
 const piers=definitions.map(([id,a,b,c,d],row)=>{const q=data.get(id),root=project(average(q[a],q[b])),tip=project(average(q[c],q[d])),pier=pierSegment(root,tip,2.1,{id:'nieporet-pier-'+row,site:'nieporet',sourceWay:id});docks.push(pier);connectBank(docks,bank,pier);return pier;});
 // Preserve the order and identifiers of all existing saved attachment points.
 for(let row=0;row<4;row++){
  const pier=piers[row],L=pier.pose.length;
  for(let j=0;j<8;j++)for(const side of[-1,1])bollards.push({...solidPoint(pier,-L/2+(j+.5)*L/8,side*1.05),id:`PIL-${row}-${j}-${side}`,kind:'bollard',site:'nieporet',legacyRotation:pier.pose.a,label:`Nieporęt · pomost ${row+1} / ${j+1}${side<0?' N':' S'}`});
  if(row<3)for(let j=0;j<7;j++){
   if(row===1&&j>4)continue;const type=['motor','sail','motor','pwc','sail','motor','motor'][(j+row)%7],length=type==='sail'?8.1:type==='pwc'?3.1:5.5+j%2,beam=type==='sail'?2.5:type==='pwc'?1.2:2.25,a=pier.pose.a+Math.PI/2;
   const p=solidPoint(pier,-L/2+(j+1)*L/8,1.2+length*.5+1.05),buoyId=`PIL-B-${row}-${j}`,along=length*.43+1.7;
   bollards.push({id:buoyId,x:p.x+Math.cos(a)*along,y:p.y+Math.sin(a)*along,kind:'buoy',site:'nieporet',legacyRotation:pier.pose.a,label:'Nieporęt · boja dziobowa'});
   traffic.push({id:'pilawa-'+row+'-'+j,type,...p,a,length,beam,mass:type==='sail'?2850:type==='pwc'?360:1250+(j%2)*350,site:'nieporet',ties:[['portStern',`PIL-${row}-${j+1}-1`],['starboardStern',`PIL-${row}-${j}-1`],['bow',buoyId]]});
  }
 }
 // Straight SI segments follow the real angles, including the T-head and outer
 // floating breakwater. Their AABBs are only for culling, never collision shapes.
 docks.push(pierSegment(project([21.04172,52.43666]),project([21.041836,52.436575]),2.1,{id:'nieporet-t-head',site:'nieporet'}));
 const q=data.get('974972779'),root=project(average(q[9],q[10])),tip=project(average(q[5],q[6])),mid={x:root.x+(tip.x-root.x)*.65,y:root.y+(tip.y-root.y)*.65};
 // The thin northern shield is land in the common shore polygon, not a second
 // overlapping dock. These virtual segments only preserve old attachment IDs.
 const breakwaters=[pierSegment(root,mid,4,{id:'pilawa-breakwater-n'}),pierSegment(mid,tip,4,{id:'pilawa-breakwater-s'})];
 const bankAtFuel=bank(origin.x,origin.y),{nx,ny}=bankAtFuel,tx=-ny,ty=nx;
 const fuel={id:'pilawa-fuel',name:'ORLEN na wodzie · Port Nieporęt',x:bankAtFuel.qx+nx*2.4,y:bankAtFuel.qy+ny*2.4,pumpX:bankAtFuel.qx+nx*.7,pumpY:bankAtFuel.qy+ny*.7,alongMin:origin.y-9,alongMax:origin.y+9,maxGap:1.4,frame:{tx,ty,nx,ny,halfLength:9}};
 docks.push(pierSegment(fuelPoint(fuel,-10,-1.4),fuelPoint(fuel,10,-1.4),2.8,{id:'nieporet-fuel',site:'nieporet',fuel:true}));
 for(const [i,along]of[-8,-2,4,8].entries())bollards.push({id:'PIL-F-'+[-8,-2,4,10][i],...fuelPoint(fuel,along),kind:'bollard',site:'nieporet',fuel:fuel.id,label:'ORLEN · Nieporęt · poler'});
 for(const [i,p]of breakwaters.entries())for(let j=0;j<(i?4:7);j++){const v=solidPoint(p,-p.pose.length/2+(j+.5)*p.pose.length/(i?4:7),2),q=bank(v.x,v.y);bollards.push({x:q.qx-q.nx*.15,y:q.qy-q.ny*.15,id:p.id+'-'+j,kind:'bollard',site:'nieporet',shoreMooring:true,legacyRotation:p.pose.a-Math.PI/2,label:'Nieporęt · osłona'});}
 for(let row=4;row<piers.length;row++)for(let j=0;j<6;j++)for(const side of[-1,1])extraBollards.push({...solidPoint(piers[row],-piers[row].pose.length/2+(j+.5)*piers[row].pose.length/6,side*1.05),id:`PIL-EX-${row}-${j}-${side}`,kind:'bollard',site:'nieporet',label:'Nieporęt · pomost '+(row+1)});
 // Narrow berth fingers share the main pier's pose; their spacing leaves hull
 // clearance. Counts are simplified from the satellite, not inferred from boats.
 for(const [row,p]of piers.entries())for(const side of row===2?[1]:[-1,1])for(let j=0;j<(row<4?8:6);j++){const count=row<4?8:6,x=-p.pose.length/2+(j+.5)*p.pose.length/count;docks.push(pierSegment(solidPoint(p,x,side*1.05),solidPoint(p,x,side*(1.05+8)),.45,{id:`nieporet-finger-${row}-${side}-${j}`,site:'nieporet',finger:true,floating:true}));}
 const long=feature('711114031'),east=pierSegment(project(long[1]),project(long[0]),2.2,{id:'nieporet-east-main',site:'nieporet',sourceWay:'711114031'});docks.push(east);connectBank(docks,bank,east);
 for(let j=0;j<14;j++)for(const side of[-1,1]){const x=-east.pose.length/2+(j+.5)*east.pose.length/14;docks.push(pierSegment(solidPoint(east,x,side*1.1),solidPoint(east,x,side*8.8),.45,{id:`nieporet-east-finger-${side}-${j}`,site:'nieporet',finger:true,floating:true}));extraBollards.push({...solidPoint(east,x,side*1.1),kind:'bollard',site:'nieporet',id:`NIE-E-${j}-${side}`,label:'Nieporęt · pomost wschodni'});}
 // Short shore piers visible in the recesses; use mapped paths rather than
 // treating white boat silhouettes as additional concrete structures.
 for(const id of ['1202630071','1202630072']){const q=feature(id);for(let i=0;i<q.length-1;i++)docks.push(pierSegment(project(q[i]),project(q[i+1]),1.2,{id:`nieporet-cove-${id}-${i}`,site:'nieporet',sourceWay:id}));}
 const fenders=Array.from({length:5},(_,i)=>pierSegment(fuelPoint(fuel,-8+i*4,.11),fuelPoint(fuel,-8+i*4+.7,.11),.22,{fender:true,id:'pilawa-fender-'+i}));
 const start=project([21.0419,52.4378]),bounds={left:origin.x-90,right:origin.x+180,top:origin.y-230,bottom:origin.y+85};
 return{...project([21.0422,52.43635]),id:'nieporet',name:'Port Nieporęt',anchor:{x:origin.x,y:origin.y},docks,bollards,extraBollards,traffic,fuel,fenders,start:{...start,a:Math.PI/2},bounds,route:[start,{x:origin.x+43,y:origin.y-130},{x:origin.x+55,y:origin.y-90},{x:origin.x+50,y:origin.y-55},{x:origin.x+48,y:origin.y-28},fuelPoint(fuel,0,14)],source:'https://www.openstreetmap.org/way/871129083'};
}

export function createPilawaSite(bank){
 const docks=[],bollards=[],traffic=[],props={site:'pilawa'},q=feature('1052289092');
 const segment=(id,a,b,width,more={})=>{const d=pierSegment(project(a),project(b),width,{id,...props,...more});docks.push(d);return d;};
 const main=segment('pilawa-cross-main',average(q[0],q[21]),average(q[12],q[13]),2.1,{sourceWay:'1052289092'});connectBank(docks,bank,main);
 segment('pilawa-cross-n',average(q[14],q[17]),average(q[15],q[16]),1.5,{finger:true});
 segment('pilawa-cross-s1',average(q[4],q[7]),average(q[5],q[6]),1.7,{finger:true});
 segment('pilawa-cross-s2',average(q[8],q[11]),average(q[9],q[10]),1.5,{finger:true});
 const s=feature('1052289095');segment('pilawa-south',average(s[1],s[2]),average(s[0],s[3]),2.4,{sourceWay:'1052289095'});
 const f=feature('1052289097');segment('pilawa-south-short',average(f[1],f[2]),average(f[0],f[3]),1.5,{sourceWay:'1052289097'});
 // A clearly visible short northern jetty is absent from OSM. Its 7 m centre
 // line is estimated from the satellite after matching the common shore.
 segment('pilawa-north-short',[21.043704,52.43896],[21.043605,52.438956],1.2,{estimated:true});
 for(const d of docks)if(!d.access){const count=Math.max(2,Math.floor(d.pose.length/5));for(let i=0;i<count;i++)for(const side of[-1,1])bollards.push({...solidPoint(d,-d.pose.length/2+(i+.5)*d.pose.length/count,side*d.pose.width/2),id:`PILAWA-${d.id}-${i}-${side}`,kind:'bollard',...props,label:'Pilawa · poler'});}
 const p=project([21.04391,52.43872]);
 for(const [i,[type,L,B]]of [['sail',7.4,2.4],['motor',5.5,2.1],['pwc',3.1,1.2]].entries()){
  let selected;
  for(const d of docks.filter(q=>!q.finger&&!q.access))for(const side of[-1,1])for(const fraction of[.25,.5,.75]){const pose={...solidPoint(d,(fraction-.5)*d.pose.length,side*(d.pose.width/2+B/2+.7)),a:d.pose.a},c=Math.cos(pose.a),s=Math.sin(pose.a),sample=(x,y)=>({x:pose.x+c*x-s*y,y:pose.y+s*x+c*y});if([[-L/2,-B/2],[-L/2,B/2],[L/2,-B/2],[L/2,B/2]].some(([x,y])=>bank(...Object.values(sample(x,y))).distance<.25))continue;const radius=B/2;if([-L/2+radius,0,L/2-radius].some(x=>docks.some(q=>circleSolidHit(sample(x,0),radius+.1,q))))continue;if(traffic.some(q=>Math.hypot(q.x-pose.x,q.y-pose.y)<(L+q.length)/2+1))continue;selected=pose;break;}
  if(!selected)continue;const nearby=bollards.map(q=>({q,d:Math.hypot(q.x-selected.x,q.y-selected.y)})).sort((a,b)=>a.d-b.d),side=(-Math.sin(selected.a)*(nearby[0].q.x-selected.x)+Math.cos(selected.a)*(nearby[0].q.y-selected.y))<0?'port':'starboard',used=new Set(),ties=[];
  for(const end of[side+'Bow',side+'Stern']){const p=localAttachment({length:L,beam:B},end),c=Math.cos(selected.a),s=Math.sin(selected.a),x=selected.x+c*p.x-s*p.y,y=selected.y+s*p.x+c*p.y,target=nearby.filter(v=>!used.has(v.q.id)).sort((a,b)=>Math.hypot(a.q.x-x,a.q.y-y)-Math.hypot(b.q.x-x,b.q.y-y))[0].q;ties.push([end,target.id]);used.add(target.id);}
  // A fore spring limits sliding along the quay; two breast lines alone let
  // a parallel yacht swing a long way without stretching either rope.
  ties.push([side+'Bow',ties[1][1]],[side+'Stern',ties[0][1]]);
  traffic.push({id:'pilawa-berth-'+i,type,...selected,length:L,beam:B,mass:type==='sail'?2400:type==='motor'?1100:350,site:'pilawa',ties});
 }
 const start=project([21.04361,52.43937]),bounds={left:p.x-85,right:p.x+30,top:start.y-25,bottom:p.y+125};
 return{...project([21.0435,52.4383]),id:'pilawa',name:'Port Pilawa',docks,bollards,traffic,start:{...start,a:Math.PI/2},bounds,route:[start,project([21.04345,52.43905]),project([21.0434,52.43875]),project([21.04358,52.43848])],source:'https://www.openstreetmap.org/way/871129082'};
}
