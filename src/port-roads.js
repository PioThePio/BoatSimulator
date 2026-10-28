import {BRIDGES,projectNieporet} from './zegrze.js';
const bridge=BRIDGES.find(q=>q.id==='zegrze');
const coast=[[-520,260],[-700,500],[-850,800],[-730,1000],[-450,1120],[-250,1243]].map(([x,y])=>({x,y}));
export function roundRoad(points,radius=20){
 if(points.length<3)return points;const out=[points[0]];
 for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],before=Math.hypot(b.x-a.x,b.y-a.y),after=Math.hypot(c.x-b.x,c.y-b.y),d=Math.min(radius,before*.35,after*.35),p={x:b.x+(a.x-b.x)*d/before,y:b.y+(a.y-b.y)*d/before},q={x:b.x+(c.x-b.x)*d/after,y:b.y+(c.y-b.y)*d/after};out.push(p);for(let j=1;j<=8;j++){const t=j/8,u=1-t;out.push({x:u*u*p.x+2*u*t*b.x+t*t*q.x,y:u*u*p.y+2*u*t*b.y+t*t*q.y});}}
 out.push(points.at(-1));return out;
}
const bridgeLength=Math.hypot(bridge.b.x-bridge.a.x,bridge.b.y-bridge.a.y),ux=(bridge.b.x-bridge.a.x)/bridgeLength,uy=(bridge.b.y-bridge.a.y)/bridgeLength,approach={x:bridge.a.x-ux*45,y:bridge.a.y-uy*45},departure={x:bridge.b.x+ux*45,y:bridge.b.y+uy*45};
export const PORT_ROADS=[{id:'yard-exit',width:8,points:roundRoad([{x:124.5,y:-91},{x:124.5,y:-155},{x:22,y:-155},{x:-47,y:-72},approach,bridge.a])},
 {id:'zegrze-crossing',width:8,bridge:true,deckWidth:bridge.width,points:[bridge.a,bridge.b]},
 {id:'south-ports',width:8,points:roundRoad([bridge.b,departure,...coast],35)}];
const canalBridge=BRIDGES.find(q=>q.id==='nieporet'),west=canalBridge.b,east=canalBridge.a;
PORT_ROADS.push({id:'canal-west-access',width:8,points:roundRoad([coast.at(-1),{x:-270,y:1350},{x:-270,y:1450},{x:-175,y:1453},west],25)},
 {id:'canal-road-crossing',width:8,bridge:true,deckWidth:canalBridge.width,points:[west,east]},
 {id:'eastern-marinas',width:8,points:roundRoad([east,{x:20,y:1465},{x:120,y:1472},...[[21.0406,52.432],[21.0425,52.434],[21.0431,52.436],[21.0435,52.438]].map(p=>{const q=projectNieporet(p);return{x:q.x+90,y:q.y};})],30)});
PORT_ROADS.push({id:'wild-slip-access',width:5,material:'gravel',points:roundRoad([{x:227,y:-54},{x:249,y:-44},{x:249,y:-31}],9)});
const segments=PORT_ROADS.flatMap(road=>road.points.slice(1).map((b,i)=>{const a=road.points[i],dx=b.x-a.x,dy=b.y-a.y;return{road,a,dx,dy,length2:dx*dx+dy*dy,half:(road.deckWidth??road.width)/2,left:Math.min(a.x,b.x)-40,right:Math.max(a.x,b.x)+40,top:Math.min(a.y,b.y)-40,bottom:Math.max(a.y,b.y)+40};}));
const roadGrid=new Map(),CELL=64;
for(const q of segments)for(let y=Math.floor(q.top/CELL);y<=Math.floor(q.bottom/CELL);y++)for(let x=Math.floor(q.left/CELL);x<=Math.floor(q.right/CELL);x++){const key=x+','+y;if(!roadGrid.has(key))roadGrid.set(key,[]);roadGrid.get(key).push(q);}
export function roadAt(x,y){let best=null;for(const q of roadGrid.get(Math.floor(x/CELL)+','+Math.floor(y/CELL))??[]){if(x<q.left||x>q.right||y<q.top||y>q.bottom)continue;const t=Math.max(0,Math.min(1,((x-q.a.x)*q.dx+(y-q.a.y)*q.dy)/q.length2)),distance=Math.hypot(x-q.a.x-q.dx*t,y-q.a.y-q.dy*t);const flat=q.road.bridge?0:10,shoulder=q.road.bridge?2:24;if(q.road.bridge&&distance<=q.half)return{...q.road,distance,blend:1};if(distance<q.half+flat+shoulder&&(!best||distance<best.distance))best={...q.road,distance,blend:Math.max(0,Math.min(1,(q.half+flat+shoulder-distance)/shoulder))};}return best;}
